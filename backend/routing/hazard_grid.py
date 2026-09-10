"""
Hazard-cost grid — the live cost overlay for routing.

Layer 2 of the routing engine: builds a lat/lon raster grid
where each cell's traversal cost reflects live hazard data from
the fusion layer.

Cost components:
- Wave/wind: base traversal cost scaling with height/speed
- Cyclone proximity: steep exponential penalty
- Lightning proximity: moderate, time-decaying penalty
- MPA/EEZ boundary: infinite cost (hard no-go)
- Bathymetry: infinite cost for too-shallow cells
"""

from __future__ import annotations

import math
from typing import Optional

import numpy as np

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint

logger = get_logger(__name__)


class HazardGrid:
    """
    A lat/lon raster grid with per-cell hazard costs.

    Each cell stores the current cost of traversing it, computed
    from the fusion layer's world state.
    """

    def __init__(
        self,
        bbox: BoundingBox,
        resolution: float | None = None,
        apply_land_mask: bool = False,
    ):
        settings = get_settings()
        self.resolution = resolution or settings.grid_resolution
        self.bbox = bbox

        # Build grid coordinates
        self.lats = np.arange(bbox.min_lat, bbox.max_lat + self.resolution, self.resolution)
        self.lons = np.arange(bbox.min_lon, bbox.max_lon + self.resolution, self.resolution)
        self.ny = len(self.lats)
        self.nx = len(self.lons)

        # Cost grid — initialized to base cost (1.0 = open water, no hazard)
        self.cost_grid = np.ones((self.ny, self.nx), dtype=np.float64)

        if apply_land_mask:
            self.apply_land_costs()

        # Component grids for debugging/explanation
        self.wave_cost = np.zeros((self.ny, self.nx))
        self.wind_cost = np.zeros((self.ny, self.nx))
        self.current_cost = np.zeros((self.ny, self.nx))
        self.current_speed_grid = np.zeros((self.ny, self.nx))
        self.current_dir_grid = np.zeros((self.ny, self.nx))
        self.cyclone_cost = np.zeros((self.ny, self.nx))
        self.lightning_cost = np.zeros((self.ny, self.nx))
        self.geofence_cost = np.zeros((self.ny, self.nx))

    def apply_land_costs(self) -> None:
        """Mark mainland and island land cells as impassable."""
        from backend.routing.land_mask import is_land
        for i in range(self.ny):
            lat_val = float(self.lats[i])
            for j in range(self.nx):
                lon_val = float(self.lons[j])
                if is_land(lat_val, lon_val):
                    self.cost_grid[i, j] = float("inf")

    def lat_to_idx(self, lat: float) -> int:
        """Convert latitude to grid row index."""
        idx = int(round((lat - self.bbox.min_lat) / self.resolution))
        return max(0, min(self.ny - 1, idx))

    def lon_to_idx(self, lon: float) -> int:
        """Convert longitude to grid column index."""
        idx = int(round((lon - self.bbox.min_lon) / self.resolution))
        return max(0, min(self.nx - 1, idx))

    def idx_to_lat(self, idx: int) -> float:
        """Convert grid row index to latitude."""
        return float(self.lats[max(0, min(self.ny - 1, idx))])

    def idx_to_lon(self, idx: int) -> float:
        """Convert grid column index to longitude."""
        return float(self.lons[max(0, min(self.nx - 1, idx))])

    def apply_wave_wind_costs(
        self,
        conditions: list[dict],
    ) -> None:
        """
        Apply wave/wind traversal costs.

        Cost formula:
        - wave_cost = (wave_height / 2.0)^2  — quadratic above 2m
        - wind_cost = max(0, wind_speed - 30)^1.5 / 100  — penalty above 30 km/h
        """
        for cond in conditions:
            lat, lon = cond.get("lat", 0), cond.get("lon", 0)
            i, j = self.lat_to_idx(lat), self.lon_to_idx(lon)

            wave_h = cond.get("wave_height_m", 0)
            wind_s = cond.get("wind_speed_kmh", 0)

            w_cost = (max(0, wave_h) / 2.0) ** 2
            wi_cost = max(0, wind_s - 30) ** 1.5 / 100.0

            self.wave_cost[i, j] = w_cost
            self.wind_cost[i, j] = wi_cost
            self.cost_grid[i, j] += w_cost + wi_cost

    def apply_current_costs(
        self,
        conditions: list[dict],
        vessel_heading_deg: float = 0.0,
        weight: float = 1.5,
    ) -> None:
        """
        Apply surface current traversal costs.

        Source: Copernicus Marine Service (cmems_mod_glo_phy_anfc_merged-uv_PT1H-i).

        Cost Formula (flagged per CLAUDE.md & implementation plan):
        - Opposing current: penalty = weight * (speed_knots / 1.5) * |cos(delta_theta)|
          (A 2.0 knot head-current adds +2.0 to traversal cost, comparable to moderate 2.5m waves)
        - Following current: slight speed bonus (up to -0.3 cost discount)
        - Cross current: drift penalty (0.3 * weight * speed_knots / 1.5)
        """
        for cond in conditions:
            lat, lon = cond.get("lat", 0), cond.get("lon", 0)
            i, j = self.lat_to_idx(lat), self.lon_to_idx(lon)

            speed_knots = float(cond.get("current_speed_knots", 0.0) or 0.0)
            dir_deg = float(cond.get("current_direction_deg", 0.0) or 0.0)

            self.current_speed_grid[i, j] = speed_knots
            self.current_dir_grid[i, j] = dir_deg

            if speed_knots > 0.3:
                delta_rad = math.radians(vessel_heading_deg - dir_deg)
                cos_delta = math.cos(delta_rad)
                speed_ratio = speed_knots / 1.5

                if cos_delta < -0.2:
                    # Head-current (opposing)
                    c_cost = weight * speed_ratio * abs(cos_delta)
                elif cos_delta > 0.3:
                    # Tail-current (following) — slight speed/fuel advantage
                    c_cost = -min(0.3, 0.2 * weight * speed_ratio * cos_delta)
                else:
                    # Cross-current — drift turbulence penalty
                    c_cost = 0.3 * weight * speed_ratio

                self.current_cost[i, j] = max(0.0, c_cost)
                self.cost_grid[i, j] = max(0.1, self.cost_grid[i, j] + c_cost)

    def apply_cyclone_costs(
        self,
        cyclones: list[dict],
    ) -> None:
        """
        Apply cyclone proximity penalties.

        - Inside eye (< 50km): infinite
        - Inside radius: steep exponential penalty
        - Extended zone (< 2x radius): moderate penalty
        """
        for cyclone in cyclones:
            center = cyclone.get("center", {})
            c_lat, c_lon = center.get("lat", 0), center.get("lon", 0)
            radius_km = cyclone.get("radius_km", 200)

            for i in range(self.ny):
                for j in range(self.nx):
                    lat, lon = self.idx_to_lat(i), self.idx_to_lon(j)
                    dist = _haversine_km(lat, lon, c_lat, c_lon)

                    if dist < 50.0:
                        self.cyclone_cost[i, j] = float("inf")
                        self.cost_grid[i, j] = float("inf")
                    elif dist < radius_km:
                        penalty = 100.0 * (1.0 - dist / radius_km) ** 2
                        self.cyclone_cost[i, j] = max(self.cyclone_cost[i, j], penalty)
                        self.cost_grid[i, j] += penalty
                    elif dist < radius_km * 2:
                        penalty = 20.0 * (1.0 - (dist - radius_km) / radius_km)
                        self.cyclone_cost[i, j] = max(self.cyclone_cost[i, j], penalty)
                        self.cost_grid[i, j] += penalty

    def apply_lightning_costs(
        self,
        clusters: list[dict],
    ) -> None:
        """Apply time-decaying lightning proximity penalties."""
        for cluster in clusters:
            center = cluster.get("center", {})
            c_lat, c_lon = center.get("lat", 0), center.get("lon", 0)
            radius_km = cluster.get("radius_km", 30)
            age_minutes = cluster.get("age_minutes", 60)

            time_decay = max(0.1, 1.0 - age_minutes / 60.0)

            for i in range(self.ny):
                for j in range(self.nx):
                    lat, lon = self.idx_to_lat(i), self.idx_to_lon(j)
                    dist = _haversine_km(lat, lon, c_lat, c_lon)

                    if dist < radius_km:
                        penalty = 30.0 * time_decay
                        self.lightning_cost[i, j] = max(self.lightning_cost[i, j], penalty)
                        self.cost_grid[i, j] += penalty
                    elif dist < radius_km * 3:
                        proximity = 1.0 - (dist - radius_km) / (radius_km * 2)
                        penalty = 15.0 * proximity * time_decay
                        self.lightning_cost[i, j] = max(self.lightning_cost[i, j], penalty)
                        self.cost_grid[i, j] += penalty

    def apply_geofence_costs(
        self,
        geofence_agent,
    ) -> None:
        """
        Apply geofence costs (EEZ boundary, MPAs, bathymetry).

        Hard no-go zones get infinite cost.
        """
        for i in range(self.ny):
            for j in range(self.nx):
                lat, lon = self.idx_to_lat(i), self.idx_to_lon(j)
                cost = geofence_agent.get_cell_cost(lat, lon)
                self.geofence_cost[i, j] = cost
                if math.isinf(cost):
                    self.cost_grid[i, j] = float("inf")
                else:
                    self.cost_grid[i, j] += cost

    def get_cell_cost(self, lat: float, lon: float) -> float:
        """Get the total traversal cost for a cell."""
        i, j = self.lat_to_idx(lat), self.lon_to_idx(lon)
        return float(self.cost_grid[i, j])

    def get_cost_breakdown(self, lat: float, lon: float) -> dict:
        """Get a detailed cost breakdown for a cell (for chatbot explanations)."""
        i, j = self.lat_to_idx(lat), self.lon_to_idx(lon)
        return {
            "total": float(self.cost_grid[i, j]),
            "base": 1.0,
            "wave": float(self.wave_cost[i, j]),
            "wind": float(self.wind_cost[i, j]),
            "current": float(self.current_cost[i, j]),
            "cyclone": float(self.cyclone_cost[i, j]),
            "lightning": float(self.lightning_cost[i, j]),
            "geofence": float(self.geofence_cost[i, j]),
        }


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two points in km."""
    R = 6371.0
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
