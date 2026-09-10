"""
Routing models — request/response types for the routing engine.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class RouteRequest(BaseModel):
    """Request to compute a route."""

    origin: GeoPoint
    destination: GeoPoint  # Can be a PFZ centroid
    pfz_id: Optional[str] = None  # If routing to a specific PFZ candidate
    vessel_type: str = "fishing"
    avoid_mpas: bool = True
    max_wave_height_m: float = 4.0  # Vessel-specific threshold

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "origin": {"lat": 9.9312, "lon": 76.2673},
                    "destination": {"lat": 10.5, "lon": 75.5},
                }
            ]
        }


class RouteWaypoint(BaseModel):
    """A single waypoint along a computed route."""

    lat: float
    lon: float
    cost: float = 0.0
    cumulative_cost: float = 0.0
    distance_from_start_km: float = 0.0
    wave_height_m: float = 0.0
    wind_speed_kmh: float = 0.0
    hazards: list[str] = Field(default_factory=list)  # Human-readable hazard notes


class HazardSummary(BaseModel):
    """Summary of hazards encountered along a route."""

    max_wave_height_m: float = 0.0
    max_wind_speed_kmh: float = 0.0
    eez_crossings: int = 0
    mpa_near_misses: int = 0
    cyclone_proximity_km: Optional[float] = None
    lightning_clusters_near: int = 0


class RouteResponse(BaseModel):
    """Computed route with hazard analysis."""

    route_id: str
    origin: GeoPoint
    destination: GeoPoint
    waypoints: list[RouteWaypoint] = Field(default_factory=list)
    total_cost: float = 0.0
    total_distance_km: float = 0.0
    estimated_time_hours: float = 0.0
    hazard_summary: Optional[HazardSummary] = None
    is_safe: bool = True
    warnings: list[str] = Field(default_factory=list)
    algorithm: str = "A* with hazard-cost overlay"
    alternative_routes: list["RouteResponse"] = Field(default_factory=list)


class RerouteEvent(BaseModel):
    """Triggered when conditions degrade along the current route."""

    route_id: str
    trigger: str  # What caused the reroute
    old_remaining_cost: float
    new_remaining_cost: float
    cost_increase_pct: float
    reason: str
    new_route: Optional[RouteResponse] = None
    timestamp: str = ""


class RouteStatusResponse(BaseModel):
    """Current status of an active route."""

    route_id: str
    current_position: Optional[GeoPoint] = None
    remaining_waypoints: int = 0
    remaining_distance_km: float = 0.0
    remaining_time_hours: float = 0.0
    current_conditions: Optional[dict] = None
    needs_reroute: bool = False
    reroute_event: Optional[RerouteEvent] = None
