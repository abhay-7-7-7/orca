"""
World State Store — the fusion layer's central data structure.

This is the single source of truth that the routing engine and
chatbot read from. Agents never talk to consumers directly —
everything flows through this store.

In-memory for the hackathon. Notes where Redis/TimescaleDB would go.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.common import AgentStatus, BoundingBox, GeoPoint
from backend.models.fusion import AgentTimestamp, WorldState, WorldStateCell
from backend.routing.hazard_grid import HazardGrid

logger = get_logger(__name__)


class WorldStateStore:
    """
    In-memory world-state store.

    Holds the latest data from each agent, fused into a unified grid.
    The routing engine and chatbot read from here.

    Production note: replace with Redis (for fast key-value) or
    TimescaleDB (for time-series) for persistence and horizontal scaling.
    """

    def __init__(self):
        self._settings = get_settings()
        self._agent_timestamps: dict[str, AgentTimestamp] = {}
        self._hazard_grid: HazardGrid | None = None

        # Cached agent data (latest fetch results)
        self._sst_data = None
        self._pfz_data = None
        self._weather_data = None
        self._cyclone_data = None
        self._lightning_data = None
        self._tide_data = None
        self._vessel_data = None
        self._geofence_agent = None

        self._last_full_refresh: datetime | None = None

    def update_agent_data(self, agent_name: str, data, status: AgentStatus, is_mock: bool = False):
        """Store the latest data from an agent."""
        self._agent_timestamps[agent_name] = AgentTimestamp(
            agent_name=agent_name,
            last_fetch=datetime.utcnow(),
            status=status.value,
            is_mock=is_mock,
        )

        # Store by agent type
        if agent_name == "sst_chlorophyll":
            self._sst_data = data
        elif agent_name == "pfz_synthesis":
            self._pfz_data = data
        elif agent_name == "marine_weather":
            self._weather_data = data
        elif agent_name == "cyclone_disaster":
            self._cyclone_data = data
        elif agent_name == "lightning":
            self._lightning_data = data
        elif agent_name == "tide":
            self._tide_data = data
        elif agent_name == "vessel_ais":
            self._vessel_data = data

        logger.debug("Updated agent data: %s (status=%s, mock=%s)", agent_name, status, is_mock)

    def set_geofence_agent(self, agent):
        """Store reference to the geofence agent (for cost queries)."""
        self._geofence_agent = agent

    def build_hazard_grid(self, bbox: BoundingBox | None = None) -> HazardGrid:
        """
        Build/rebuild the hazard-cost grid from current agent data.

        Called after agent refreshes to keep the routing layer current.
        """
        if bbox is None:
            bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

        grid = HazardGrid(bbox)

        # Apply wave/wind costs
        if self._weather_data and hasattr(self._weather_data, "conditions"):
            conditions = [
                {
                    "lat": c.lat,
                    "lon": c.lon,
                    "wave_height_m": c.wave_height_m,
                    "wind_speed_kmh": c.wind_speed_kmh,
                }
                for c in self._weather_data.conditions
            ]
            grid.apply_wave_wind_costs(conditions)

        # Apply cyclone costs
        if self._cyclone_data and hasattr(self._cyclone_data, "cyclones"):
            cyclones = [
                {
                    "center": {"lat": c.center.lat, "lon": c.center.lon},
                    "radius_km": c.radius_km,
                }
                for c in self._cyclone_data.cyclones
            ]
            grid.apply_cyclone_costs(cyclones)

        # Apply lightning costs
        if self._lightning_data and hasattr(self._lightning_data, "clusters"):
            clusters = [
                {
                    "center": {"lat": c.center.lat, "lon": c.center.lon},
                    "radius_km": c.radius_km,
                    "age_minutes": c.age_minutes,
                }
                for c in self._lightning_data.clusters
            ]
            grid.apply_lightning_costs(clusters)

        # Apply geofence costs
        if self._geofence_agent:
            grid.apply_geofence_costs(self._geofence_agent)

        self._hazard_grid = grid
        self._last_full_refresh = datetime.utcnow()
        logger.info("Hazard grid rebuilt (%dx%d cells)", grid.ny, grid.nx)

        return grid

    def get_hazard_grid(self) -> HazardGrid | None:
        """Get the current hazard grid."""
        return self._hazard_grid

    def query(self, bbox: BoundingBox, resolution: float = 0.5) -> WorldState:
        """
        Query the world state for a region.

        Resamples to the requested resolution for network efficiency.
        """
        import numpy as np

        cells = []
        lats = np.arange(bbox.min_lat, bbox.max_lat, resolution)
        lons = np.arange(bbox.min_lon, bbox.max_lon, resolution)

        for lat in lats:
            for lon in lons:
                cell = self._get_cell_data(float(lat), float(lon))
                cells.append(cell)

        return WorldState(
            cells=cells,
            agent_timestamps=list(self._agent_timestamps.values()),
            grid_resolution_deg=resolution,
            bbox=f"({bbox.min_lat}, {bbox.min_lon}) to ({bbox.max_lat}, {bbox.max_lon})",
            last_full_refresh=self._last_full_refresh,
        )

    def get_cell(self, lat: float, lon: float) -> WorldStateCell:
        """Get fused data for a single grid cell."""
        return self._get_cell_data(lat, lon)

    def _get_cell_data(self, lat: float, lon: float) -> WorldStateCell:
        """Build a WorldStateCell from all available agent data."""
        cell = WorldStateCell(
            lat=round(lat, 4),
            lon=round(lon, 4),
            last_updated=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

        # SST + Chlorophyll
        if self._sst_data:
            sst_val = self._find_nearest(self._sst_data.sst_grid, lat, lon, "sst_celsius")
            chl_val = self._find_nearest(self._sst_data.chlorophyll_grid, lat, lon, "chl_a_mg_m3")
            cell.sst_celsius = sst_val
            cell.chlorophyll_mg_m3 = chl_val

        # PFZ
        if self._pfz_data:
            for candidate in self._pfz_data.candidates:
                if (
                    abs(candidate.centroid.lat - lat) < 1.0
                    and abs(candidate.centroid.lon - lon) < 1.0
                ):
                    cell.pfz_score = max(cell.pfz_score, candidate.score)

        # Weather
        if self._weather_data:
            weather_val = self._find_nearest_weather(self._weather_data.conditions, lat, lon)
            if weather_val:
                cell.wave_height_m = weather_val.wave_height_m
                cell.wind_speed_kmh = weather_val.wind_speed_kmh
                cell.sea_state = weather_val.sea_state

        # Cyclone risk
        if self._cyclone_data:
            for cyclone in self._cyclone_data.cyclones:
                import math
                dist = self._haversine_km(lat, lon, cyclone.center.lat, cyclone.center.lon)
                if dist < cyclone.radius_km:
                    cell.cyclone_risk = max(cell.cyclone_risk, 1.0 - dist / cyclone.radius_km)

        # Lightning risk
        if self._lightning_data:
            for cluster in self._lightning_data.clusters:
                import math
                dist = self._haversine_km(lat, lon, cluster.center.lat, cluster.center.lon)
                if dist < cluster.radius_km * 2:
                    time_factor = max(0.1, 1.0 - cluster.age_minutes / 60.0)
                    risk = (1.0 - dist / (cluster.radius_km * 2)) * time_factor
                    cell.lightning_risk = max(cell.lightning_risk, risk)

        # Geofence
        if self._geofence_agent:
            check = self._geofence_agent.check_point(GeoPoint(lat=lat, lon=lon))
            cell.in_indian_eez = check.in_indian_eez
            cell.in_mpa = check.in_mpa
            if check.bathymetry:
                cell.depth_m = check.bathymetry.depth_m
                cell.is_navigable = check.bathymetry.is_navigable

        # Routing cost from hazard grid
        if self._hazard_grid:
            cell.routing_cost = self._hazard_grid.get_cell_cost(lat, lon)

        return cell

    @staticmethod
    def _find_nearest(grid_points, lat: float, lon: float, attr: str, max_dist_deg: float = 0.5):
        """Find the nearest grid point's value."""
        if not grid_points:
            return None
        best_val = None
        best_dist = float("inf")
        for point in grid_points:
            dist = abs(point.lat - lat) + abs(point.lon - lon)
            if dist < best_dist and dist < max_dist_deg:
                best_dist = dist
                best_val = getattr(point, attr, None)
        return best_val

    @staticmethod
    def _find_nearest_weather(conditions, lat: float, lon: float, max_dist_deg: float = 2.0):
        """Find the nearest weather condition."""
        if not conditions:
            return None
        best = None
        best_dist = float("inf")
        for cond in conditions:
            dist = abs(cond.lat - lat) + abs(cond.lon - lon)
            if dist < best_dist and dist < max_dist_deg:
                best_dist = dist
                best = cond
        return best

    @staticmethod
    def _haversine_km(lat1, lon1, lat2, lon2) -> float:
        import math
        R = 6371.0
        rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    # ── Properties for consumer access ──────────────────────────────

    @property
    def pfz_data(self):
        return self._pfz_data

    @property
    def weather_data(self):
        return self._weather_data

    @property
    def cyclone_data(self):
        return self._cyclone_data

    @property
    def lightning_data(self):
        return self._lightning_data

    @property
    def tide_data(self):
        return self._tide_data

    @property
    def vessel_data(self):
        return self._vessel_data

    @property
    def geofence_agent(self):
        return self._geofence_agent


# ── Module-level singleton ──────────────────────────────────────────────

_store: WorldStateStore | None = None


def get_world_state_store() -> WorldStateStore:
    """Get or create the world state store singleton."""
    global _store
    if _store is None:
        _store = WorldStateStore()
    return _store
