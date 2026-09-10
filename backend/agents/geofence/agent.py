"""
Geofence Agent — EEZ, MPA, and bathymetry boundary checks.

Loads static boundary data (MarineRegions EEZ shapefiles, WDPA MPAs,
GEBCO bathymetry) at initialization and provides fast point-in-polygon
and proximity queries.

Data sources:
- MarineRegions EEZ v12 (shapefile in data/eez_boundaries/) — no auth
- ProtectedPlanet/WDPA (shapefile in data/mpa/ or pywdpa API) — optional API token
- GEBCO bathymetry (GeoTIFF in data/bathymetry/ or WMS) — no auth
"""

from __future__ import annotations

import math
from typing import Optional

import numpy as np

from backend.agents import AgentBase
from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint
from backend.models.geofence import (
    BathymetryInfo,
    EEZInfo,
    GeofenceCheckResponse,
    GeofenceData,
    MPAInfo,
)

logger = get_logger(__name__)


class GeofenceAgent(AgentBase[GeofenceData]):
    """
    Geofence agent — checks positions against EEZ, MPA, and bathymetry data.

    Static data is loaded once at startup and kept in memory.
    """

    agent_name = "geofence"
    update_cadence_seconds = 86400  # Daily (static data, only reload if files change)

    def __init__(self):
        super().__init__()
        self._eez_loaded = False
        self._mpa_loaded = False
        self._bathymetry_loaded = False

        # Simplified boundary representations for the hackathon
        # In production, these would be geopandas GeoDataFrames with spatial indices
        self._indian_eez_bbox = BoundingBox(
            min_lat=6.0, max_lat=23.5, min_lon=68.0, max_lon=97.5
        )
        # Key maritime boundaries (simplified polygons for demo)
        self._imbl_zones: list[dict] = []
        self._mpa_zones: list[dict] = []

    async def initialize(self) -> None:
        """Load static boundary data from disk."""
        settings = get_settings()

        # Try to load EEZ shapefile
        eez_path = settings.resolve_data_path(settings.eez_data_path)
        try:
            await self._load_eez_data(eez_path)
        except Exception as exc:
            logger.warning("Could not load EEZ data from %s: %s — using defaults", eez_path, exc)
            self._setup_default_boundaries()
            self._eez_loaded = True

        # Try to load MPA data
        mpa_path = settings.resolve_data_path(settings.mpa_data_path)
        try:
            await self._load_mpa_data(mpa_path)
        except Exception as exc:
            logger.warning("Could not load MPA data from %s: %s — using defaults", mpa_path, exc)
            self._setup_default_mpas()
            self._mpa_loaded = True

        self._bathymetry_loaded = True  # Use synthetic depth for now

    async def _load_eez_data(self, path) -> None:
        """Attempt to load EEZ shapefiles using geopandas."""
        import glob
        shapefiles = glob.glob(str(path / "*.shp"))
        if not shapefiles:
            raise FileNotFoundError(f"No shapefiles found in {path}")

        import geopandas as gpd
        self._eez_gdf = gpd.read_file(shapefiles[0])
        self._eez_loaded = True
        logger.info("Loaded EEZ data: %d features", len(self._eez_gdf))

    async def _load_mpa_data(self, path) -> None:
        """Attempt to load MPA shapefiles."""
        import glob
        shapefiles = glob.glob(str(path / "*.shp"))
        if not shapefiles:
            raise FileNotFoundError(f"No shapefiles found in {path}")

        import geopandas as gpd
        self._mpa_gdf = gpd.read_file(shapefiles[0])
        self._mpa_loaded = True
        logger.info("Loaded MPA data: %d features", len(self._mpa_gdf))

    def _setup_default_boundaries(self) -> None:
        """Set up simplified Indian maritime boundaries for demo."""
        # Simplified IMBL zones (Sri Lanka, Pakistan, Bangladesh maritime boundaries)
        self._imbl_zones = [
            {
                "name": "India-Sri Lanka Maritime Boundary",
                "boundary_lat_range": (5.5, 13.0),
                "boundary_lon": 80.0,  # Simplified: east of this in the south approaches SL waters
            },
            {
                "name": "India-Pakistan Maritime Boundary",
                "boundary_lat_range": (20.0, 24.0),
                "boundary_lon": 66.5,  # Simplified: west of this approaches Pakistan waters
            },
        ]

    def _setup_default_mpas(self) -> None:
        """Set up known Indian MPAs for demo."""
        self._mpa_zones = [
            {
                "name": "Gulf of Mannar Marine National Park",
                "center": GeoPoint(lat=9.15, lon=79.1),
                "radius_km": 30.0,
                "no_take": True,
            },
            {
                "name": "Mahatma Gandhi Marine National Park (Wandoor)",
                "center": GeoPoint(lat=11.58, lon=92.62),
                "radius_km": 15.0,
                "no_take": True,
            },
            {
                "name": "Gulf of Kutch Marine National Park",
                "center": GeoPoint(lat=22.45, lon=69.35),
                "radius_km": 25.0,
                "no_take": False,
            },
            {
                "name": "Malvan Marine Sanctuary",
                "center": GeoPoint(lat=16.06, lon=73.45),
                "radius_km": 5.0,
                "no_take": True,
            },
        ]

    def check_point(self, point: GeoPoint) -> GeofenceCheckResponse:
        """
        Check a single point against all geofence boundaries.

        Returns a complete GeofenceCheckResponse with EEZ membership,
        MPA conflicts, bathymetry, and composite safety flag.
        """
        warnings: list[str] = []

        # ── EEZ check ───────────────────────────────────────────────
        in_indian_eez = self._indian_eez_bbox.contains(point)
        nearest_boundary_km = self._estimate_boundary_distance(point)

        eez_info = None
        if in_indian_eez:
            eez_info = EEZInfo(
                name="Indian Exclusive Economic Zone",
                sovereign="India",
                iso_3="IND",
                area_km2=2_305_143.0,
            )
        else:
            warnings.append(
                f"Point ({point.lat:.2f}, {point.lon:.2f}) is OUTSIDE Indian EEZ"
            )

        if nearest_boundary_km < 20.0:
            warnings.append(
                f"Within {nearest_boundary_km:.1f}km of EEZ/IMBL boundary — exercise caution"
            )

        # ── MPA check ───────────────────────────────────────────────
        mpa_conflicts: list[MPAInfo] = []
        in_mpa = False
        for mpa in self._mpa_zones:
            dist = self._haversine_km(point, mpa["center"])
            if dist <= mpa["radius_km"]:
                in_mpa = True
                mpa_info = MPAInfo(
                    name=mpa["name"],
                    designation="Marine National Park",
                    area_km2=math.pi * mpa["radius_km"] ** 2,
                    no_take=mpa["no_take"],
                )
                mpa_conflicts.append(mpa_info)
                if mpa["no_take"]:
                    warnings.append(f"Inside no-take MPA: {mpa['name']}")
                else:
                    warnings.append(f"Inside MPA (restricted activity): {mpa['name']}")

        # ── Bathymetry (synthetic for hackathon) ────────────────────
        depth = self._estimate_depth(point)
        is_navigable = depth < -3.0  # At least 3m deep
        bathymetry = BathymetryInfo(depth_m=depth, is_navigable=is_navigable)

        if not is_navigable:
            warnings.append(f"Shallow water ({abs(depth):.1f}m) — may not be navigable")

        # ── Composite safety ────────────────────────────────────────
        is_safe = in_indian_eez and not any(m.no_take for m in mpa_conflicts) and is_navigable

        return GeofenceCheckResponse(
            point=point,
            in_indian_eez=in_indian_eez,
            eez=eez_info,
            nearest_eez_boundary_km=nearest_boundary_km,
            mpa_conflicts=mpa_conflicts,
            in_mpa=in_mpa,
            bathymetry=bathymetry,
            is_safe=is_safe,
            warnings=warnings,
        )

    def check_path(self, path: list[GeoPoint]) -> list[GeofenceCheckResponse]:
        """Check every waypoint in a path."""
        return [self.check_point(p) for p in path]

    def get_cell_cost(self, lat: float, lon: float) -> float:
        """
        Get routing cost for a grid cell based on geofence constraints.

        Returns:
        - ``float('inf')`` for no-go zones (outside EEZ, no-take MPA, too shallow)
        - Elevated cost near boundaries (graduated penalty)
        - 0.0 for unrestricted cells
        """
        point = GeoPoint(lat=lat, lon=lon)
        check = self.check_point(point)

        if not check.in_indian_eez:
            return float("inf")
        if any(m.no_take for m in check.mpa_conflicts):
            return float("inf")
        if check.bathymetry and not check.bathymetry.is_navigable:
            return float("inf")

        # Graduated cost near boundaries
        cost = 0.0
        if check.nearest_eez_boundary_km < 50.0:
            # Exponential penalty: gets very expensive within 10km
            cost += max(0, 50.0 - check.nearest_eez_boundary_km) ** 2 / 100.0

        return cost

    # ── AgentBase interface ─────────────────────────────────────────

    async def _fetch_live(self, bbox: BoundingBox | None = None, **kwargs) -> GeofenceData:
        """Live mode: use loaded shapefile data."""
        if not self._eez_loaded:
            await self.initialize()

        return GeofenceData(
            eez_boundaries_loaded=self._eez_loaded,
            mpa_boundaries_loaded=self._mpa_loaded,
            bathymetry_loaded=self._bathymetry_loaded,
            indian_eez_available=True,
            total_mpas=len(self._mpa_zones),
        )

    async def _fetch_mock(self, bbox: BoundingBox | None = None, **kwargs) -> GeofenceData:
        """Mock mode: use default simplified boundaries."""
        if not self._eez_loaded:
            self._setup_default_boundaries()
            self._setup_default_mpas()
            self._eez_loaded = True
            self._mpa_loaded = True
            self._bathymetry_loaded = True

        return GeofenceData(
            eez_boundaries_loaded=True,
            mpa_boundaries_loaded=True,
            bathymetry_loaded=True,
            indian_eez_available=True,
            total_mpas=len(self._mpa_zones),
        )

    # ── Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _haversine_km(p1: GeoPoint, p2: GeoPoint) -> float:
        """Haversine distance between two points in km."""
        R = 6371.0
        lat1, lat2 = math.radians(p1.lat), math.radians(p2.lat)
        dlat = math.radians(p2.lat - p1.lat)
        dlon = math.radians(p2.lon - p1.lon)
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _estimate_boundary_distance(self, point: GeoPoint) -> float:
        """Estimate distance to nearest EEZ boundary (simplified)."""
        # Distance to the bbox edges of the Indian EEZ
        bbox = self._indian_eez_bbox
        distances = [
            abs(point.lat - bbox.min_lat) * 111.0,  # ~111km per degree lat
            abs(point.lat - bbox.max_lat) * 111.0,
            abs(point.lon - bbox.min_lon) * 111.0 * math.cos(math.radians(point.lat)),
            abs(point.lon - bbox.max_lon) * 111.0 * math.cos(math.radians(point.lat)),
        ]
        return min(distances) if self._indian_eez_bbox.contains(point) else 0.0

    @staticmethod
    def _estimate_depth(point: GeoPoint) -> float:
        """
        Synthetic depth estimation for the hackathon.

        Uses a simple model: deeper further from coast, with some variation.
        In production, this would read from GEBCO GeoTIFF.
        """
        # Very rough: Indian coastline runs roughly along certain longitudes
        # This is a placeholder — real bathymetry would use GEBCO data
        coast_distance = min(
            abs(point.lon - 72.0),  # West coast (approximate)
            abs(point.lon - 80.0) * 0.5,  # East coast tip
            abs(point.lat - 22.0) * 0.3,  # Northern Gujarat coast
        )
        # Approximate depth: 0m at coast, deepening offshore
        base_depth = -coast_distance * 50.0  # Very rough
        # Add some sinusoidal variation
        variation = 20.0 * math.sin(point.lat * 3.0) * math.cos(point.lon * 2.0)
        depth = min(base_depth + variation, -1.0)  # Always at least 1m deep offshore
        return round(depth, 1)


# ── Module-level singleton ──────────────────────────────────────────────

_instance: GeofenceAgent | None = None


def get_geofence_agent() -> GeofenceAgent:
    """Get or create the geofence agent singleton."""
    global _instance
    if _instance is None:
        _instance = GeofenceAgent()
    return _instance
