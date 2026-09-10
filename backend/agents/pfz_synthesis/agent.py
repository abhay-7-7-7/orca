"""
PFZ Synthesis Agent — computes candidate Potential Fishing Zones.

THE NOVEL PIECE: instead of scraping the INCOIS PFZ bulletin,
we reproduce the PFZ generation methodology from raw SST + Chlorophyll
data that we already fetch in the SST/Chlorophyll agent.

Methodology (public domain, matches INCOIS approach):
1. Compute SST gradient magnitude (Sobel filter on SST grid)
2. Identify thermal fronts (gradient > threshold)
3. Filter by chlorophyll concentration (Chl-a > threshold)
4. Cluster adjacent qualifying cells into candidate PFZ polygons
5. Score candidates by gradient strength × Chl-a concentration
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime
from typing import Optional

import numpy as np
from scipy import ndimage

from backend.agents import AgentBase
from backend.agents.sst_chlorophyll.agent import get_sst_chlorophyll_agent
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint
from backend.models.pfz import PFZCandidate, PFZSynthesisData
from backend.models.sst_chlorophyll import SSTChlorophyllData

logger = get_logger(__name__)


class PFZSynthesisAgent(AgentBase[PFZSynthesisData]):
    """
    Synthesizes PFZ candidates from raw SST and Chlorophyll data.

    Depends on the SST/Chlorophyll agent — does not call external APIs directly.
    """

    agent_name = "pfz_synthesis"
    update_cadence_seconds = 86400  # Daily (matches SST update cadence)

    # Configurable thresholds
    SST_GRADIENT_THRESHOLD = 0.5  # °C per ~10km — frontal boundary
    CHL_A_THRESHOLD = 0.3  # mg/m³ — minimum productivity signal
    MIN_CLUSTER_CELLS = 3  # Minimum cells to form a candidate zone

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> PFZSynthesisData:
        """
        Compute PFZ candidates from live SST + Chlorophyll data.
        """
        # Get data from the SST/Chlorophyll agent
        sst_agent = get_sst_chlorophyll_agent()
        sst_response = await sst_agent.fetch(bbox=bbox)

        if sst_response.data is None:
            raise RuntimeError("SST/Chlorophyll agent returned no data")

        return self._synthesize_pfz(sst_response.data, bbox)

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> PFZSynthesisData:
        """
        Compute PFZ candidates from mock SST + Chlorophyll data.
        """
        sst_agent = get_sst_chlorophyll_agent()
        sst_response = await sst_agent.fetch(bbox=bbox)

        if sst_response.data is None:
            # Generate standalone mock PFZ
            return self._generate_standalone_mock(bbox)

        return self._synthesize_pfz(sst_response.data, bbox)

    def _synthesize_pfz(
        self, ocean_data: SSTChlorophyllData, bbox: BoundingBox | None
    ) -> PFZSynthesisData:
        """
        Core PFZ synthesis algorithm.

        Steps:
        1. Build 2D SST and Chl-a arrays from point data
        2. Compute SST gradient magnitude (Sobel)
        3. Identify frontal cells (gradient > threshold AND Chl-a > threshold)
        4. Cluster adjacent cells into zones (connected-component labeling)
        5. Score and rank zones
        """
        if not ocean_data.sst_grid or not ocean_data.chlorophyll_grid:
            return PFZSynthesisData(
                candidates=[],
                total_candidates=0,
                date=datetime.utcnow().strftime("%Y-%m-%d"),
            )

        resolution = ocean_data.grid_resolution_deg

        # ── Step 1: Build 2D arrays ─────────────────────────────────
        sst_points = {
            (round(p.lat / resolution) * resolution, round(p.lon / resolution) * resolution): p.sst_celsius
            for p in ocean_data.sst_grid
        }
        chl_points = {
            (round(p.lat / resolution) * resolution, round(p.lon / resolution) * resolution): p.chl_a_mg_m3
            for p in ocean_data.chlorophyll_grid
        }

        if not sst_points:
            return PFZSynthesisData(candidates=[], total_candidates=0)

        # Get grid bounds
        all_lats = sorted(set(k[0] for k in sst_points))
        all_lons = sorted(set(k[1] for k in sst_points))

        if len(all_lats) < 3 or len(all_lons) < 3:
            return PFZSynthesisData(candidates=[], total_candidates=0)

        ny, nx = len(all_lats), len(all_lons)
        lat_to_idx = {lat: i for i, lat in enumerate(all_lats)}
        lon_to_idx = {lon: i for i, lon in enumerate(all_lons)}

        sst_array = np.full((ny, nx), np.nan)
        chl_array = np.full((ny, nx), np.nan)

        for (lat, lon), sst in sst_points.items():
            if lat in lat_to_idx and lon in lon_to_idx:
                sst_array[lat_to_idx[lat], lon_to_idx[lon]] = sst

        for (lat, lon), chl in chl_points.items():
            if lat in lat_to_idx and lon in lon_to_idx:
                chl_array[lat_to_idx[lat], lon_to_idx[lon]] = chl

        # ── Step 2: SST gradient (Sobel) ────────────────────────────
        # Replace NaN with local mean for gradient computation
        sst_filled = np.where(np.isnan(sst_array), np.nanmean(sst_array), sst_array)

        grad_y = ndimage.sobel(sst_filled, axis=0)  # dSST/dlat
        grad_x = ndimage.sobel(sst_filled, axis=1)  # dSST/dlon
        gradient_magnitude = np.sqrt(grad_y**2 + grad_x**2)

        # Scale gradient to approximate °C per ~10km
        # At ~0.25° resolution, 1 cell ≈ 25km, so Sobel output
        # already roughly corresponds to gradient per cell-width
        km_per_cell = resolution * 111.0  # approximate
        gradient_per_10km = gradient_magnitude / km_per_cell * 10.0

        # ── Step 3: Identify frontal cells ──────────────────────────
        is_front = gradient_per_10km > self.SST_GRADIENT_THRESHOLD

        # Apply chlorophyll filter
        chl_filled = np.where(np.isnan(chl_array), 0.0, chl_array)
        has_productivity = chl_filled > self.CHL_A_THRESHOLD

        # Candidate mask: both conditions met
        candidate_mask = is_front & has_productivity

        # ── Step 4: Cluster adjacent cells ──────────────────────────
        labeled_array, num_features = ndimage.label(candidate_mask)

        # ── Step 5: Score and build candidates ──────────────────────
        candidates: list[PFZCandidate] = []

        for cluster_id in range(1, num_features + 1):
            cluster_cells = np.where(labeled_array == cluster_id)

            if len(cluster_cells[0]) < self.MIN_CLUSTER_CELLS:
                continue

            # Extract cell coordinates and values
            cell_lats = [all_lats[i] for i in cluster_cells[0]]
            cell_lons = [all_lons[j] for j in cluster_cells[1]]
            cell_gradients = [float(gradient_per_10km[i, j]) for i, j in zip(cluster_cells[0], cluster_cells[1])]
            cell_chls = [float(chl_filled[i, j]) for i, j in zip(cluster_cells[0], cluster_cells[1])]
            cell_ssts = [float(sst_filled[i, j]) for i, j in zip(cluster_cells[0], cluster_cells[1])]

            # Centroid
            centroid_lat = float(np.mean(cell_lats))
            centroid_lon = float(np.mean(cell_lons))

            # Bounding polygon (convex hull approximation using min/max)
            min_lat, max_lat = min(cell_lats), max(cell_lats)
            min_lon, max_lon = min(cell_lons), max(cell_lons)
            half_res = resolution / 2
            polygon = [
                GeoPoint(lat=min_lat - half_res, lon=min_lon - half_res),
                GeoPoint(lat=min_lat - half_res, lon=max_lon + half_res),
                GeoPoint(lat=max_lat + half_res, lon=max_lon + half_res),
                GeoPoint(lat=max_lat + half_res, lon=min_lon - half_res),
                GeoPoint(lat=min_lat - half_res, lon=min_lon - half_res),  # Close polygon
            ]

            # Score: normalized gradient × normalized Chl-a
            mean_gradient = float(np.mean(cell_gradients))
            mean_chl = float(np.mean(cell_chls))
            mean_sst = float(np.mean(cell_ssts))

            # Normalize to 0–1 range
            grad_score = min(1.0, mean_gradient / 2.0)  # 2.0 °C/10km = max score
            chl_score = min(1.0, mean_chl / 3.0)  # 3.0 mg/m³ = max score
            composite_score = round(float(grad_score * 0.5 + chl_score * 0.5), 3)

            # Area
            area_km2 = len(cell_lats) * (resolution * 111.0) ** 2

            # Confidence
            if composite_score > 0.6:
                confidence = "high"
            elif composite_score > 0.3:
                confidence = "medium"
            else:
                confidence = "low"

            candidates.append(
                PFZCandidate(
                    zone_id=f"PFZ-{uuid.uuid4().hex[:8].upper()}",
                    centroid=GeoPoint(lat=round(centroid_lat, 4), lon=round(centroid_lon, 4)),
                    polygon=polygon,
                    score=composite_score,
                    sst_gradient_magnitude=round(mean_gradient, 4),
                    mean_sst_celsius=round(mean_sst, 2),
                    mean_chl_a_mg_m3=round(mean_chl, 3),
                    area_km2=round(area_km2, 1),
                    confidence=confidence,
                )
            )

        # Sort by score descending
        candidates.sort(key=lambda c: c.score, reverse=True)

        bbox_str = None
        if bbox:
            bbox_str = f"({bbox.min_lat}, {bbox.min_lon}) to ({bbox.max_lat}, {bbox.max_lon})"

        return PFZSynthesisData(
            candidates=candidates,
            total_candidates=len(candidates),
            analysis_bbox=bbox_str,
            sst_gradient_threshold=self.SST_GRADIENT_THRESHOLD,
            chlorophyll_threshold=self.CHL_A_THRESHOLD,
            date=datetime.utcnow().strftime("%Y-%m-%d"),
        )

    def _generate_standalone_mock(
        self, bbox: BoundingBox | None
    ) -> PFZSynthesisData:
        """Generate mock PFZ candidates without SST data dependency."""
        candidates = [
            PFZCandidate(
                zone_id="PFZ-MOCK-001",
                centroid=GeoPoint(lat=10.2, lon=75.8),
                polygon=[
                    GeoPoint(lat=10.0, lon=75.6),
                    GeoPoint(lat=10.0, lon=76.0),
                    GeoPoint(lat=10.4, lon=76.0),
                    GeoPoint(lat=10.4, lon=75.6),
                    GeoPoint(lat=10.0, lon=75.6),
                ],
                score=0.82,
                sst_gradient_magnitude=1.2,
                mean_sst_celsius=28.5,
                mean_chl_a_mg_m3=1.8,
                area_km2=450.0,
                confidence="high",
            ),
            PFZCandidate(
                zone_id="PFZ-MOCK-002",
                centroid=GeoPoint(lat=12.5, lon=74.2),
                polygon=[
                    GeoPoint(lat=12.3, lon=74.0),
                    GeoPoint(lat=12.3, lon=74.4),
                    GeoPoint(lat=12.7, lon=74.4),
                    GeoPoint(lat=12.7, lon=74.0),
                    GeoPoint(lat=12.3, lon=74.0),
                ],
                score=0.65,
                sst_gradient_magnitude=0.9,
                mean_sst_celsius=29.1,
                mean_chl_a_mg_m3=1.2,
                area_km2=320.0,
                confidence="medium",
            ),
            PFZCandidate(
                zone_id="PFZ-MOCK-003",
                centroid=GeoPoint(lat=8.5, lon=77.0),
                polygon=[
                    GeoPoint(lat=8.3, lon=76.8),
                    GeoPoint(lat=8.3, lon=77.2),
                    GeoPoint(lat=8.7, lon=77.2),
                    GeoPoint(lat=8.7, lon=76.8),
                    GeoPoint(lat=8.3, lon=76.8),
                ],
                score=0.55,
                sst_gradient_magnitude=0.7,
                mean_sst_celsius=28.8,
                mean_chl_a_mg_m3=0.9,
                area_km2=280.0,
                confidence="medium",
            ),
        ]

        return PFZSynthesisData(
            candidates=candidates,
            total_candidates=len(candidates),
            analysis_bbox="MOCK data — Indian west coast",
            date=datetime.utcnow().strftime("%Y-%m-%d"),
        )


# ── Singleton ───────────────────────────────────────────────────────────

_instance: PFZSynthesisAgent | None = None


def get_pfz_synthesis_agent() -> PFZSynthesisAgent:
    global _instance
    if _instance is None:
        _instance = PFZSynthesisAgent()
    return _instance
