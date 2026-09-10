"""
Chatbot tools — functions the LLM can call to query live data.

Each tool wraps a fusion-layer or routing function.
The chatbot never calls raw external APIs — everything goes through
the same world-state the map uses.
"""

from __future__ import annotations

import json
from typing import Any

from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint

logger = get_logger(__name__)


# ── Tool definitions (for the LLM) ─────────────────────────────────

TOOLS = [
    {
        "name": "get_weather_at",
        "description": "Get current marine weather conditions (wave height, wind speed, sea state) at a specific location.",
        "parameters": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Latitude"},
                "lon": {"type": "number", "description": "Longitude"},
            },
            "required": ["lat", "lon"],
        },
    },
    {
        "name": "get_pfz_zones",
        "description": "Get Potential Fishing Zone candidates for a region. Returns ranked PFZ zones with scores based on SST gradient and chlorophyll concentration.",
        "parameters": {
            "type": "object",
            "properties": {
                "min_lat": {"type": "number", "description": "Minimum latitude of search area"},
                "max_lat": {"type": "number", "description": "Maximum latitude of search area"},
                "min_lon": {"type": "number", "description": "Minimum longitude of search area"},
                "max_lon": {"type": "number", "description": "Maximum longitude of search area"},
            },
            "required": ["min_lat", "max_lat", "min_lon", "max_lon"],
        },
    },
    {
        "name": "compute_route",
        "description": "Compute a safe route from origin to destination, accounting for live wave, wind, cyclone, lightning, and geofence hazards.",
        "parameters": {
            "type": "object",
            "properties": {
                "origin_lat": {"type": "number", "description": "Origin latitude"},
                "origin_lon": {"type": "number", "description": "Origin longitude"},
                "dest_lat": {"type": "number", "description": "Destination latitude"},
                "dest_lon": {"type": "number", "description": "Destination longitude"},
            },
            "required": ["origin_lat", "origin_lon", "dest_lat", "dest_lon"],
        },
    },
    {
        "name": "check_geofence",
        "description": "Check if a point is within the Indian EEZ, near any MPA, and its water depth.",
        "parameters": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Latitude"},
                "lon": {"type": "number", "description": "Longitude"},
            },
            "required": ["lat", "lon"],
        },
    },
    {
        "name": "get_active_alerts",
        "description": "Get active cyclone and disaster alerts in the Indian Ocean region.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_tide_info",
        "description": "Get tide predictions for a coastal location.",
        "parameters": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Latitude"},
                "lon": {"type": "number", "description": "Longitude"},
            },
            "required": ["lat", "lon"],
        },
    },
]


# ── Tool execution ──────────────────────────────────────────────────

async def execute_tool(name: str, arguments: dict) -> dict[str, Any]:
    """Execute a tool call and return its result as a dict."""
    try:
        if name == "get_weather_at":
            return await _get_weather_at(arguments["lat"], arguments["lon"])
        elif name == "get_pfz_zones":
            return await _get_pfz_zones(
                arguments["min_lat"], arguments["max_lat"],
                arguments["min_lon"], arguments["max_lon"],
            )
        elif name == "compute_route":
            return await _compute_route(
                arguments["origin_lat"], arguments["origin_lon"],
                arguments["dest_lat"], arguments["dest_lon"],
            )
        elif name == "check_geofence":
            return await _check_geofence(arguments["lat"], arguments["lon"])
        elif name == "get_active_alerts":
            return await _get_active_alerts()
        elif name == "get_tide_info":
            return await _get_tide_info(arguments["lat"], arguments["lon"])
        else:
            return {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        logger.error("Tool execution failed: %s — %s", name, exc)
        return {"error": str(exc)}


async def _get_weather_at(lat: float, lon: float) -> dict:
    from backend.fusion.world_state import get_world_state_store
    store = get_world_state_store()
    cell = store.get_cell(lat, lon)
    return {
        "lat": lat, "lon": lon,
        "wave_height_m": cell.wave_height_m,
        "wind_speed_kmh": cell.wind_speed_kmh,
        "sea_state": cell.sea_state,
        "sst_celsius": cell.sst_celsius,
        "cyclone_risk": cell.cyclone_risk,
        "lightning_risk": cell.lightning_risk,
    }


async def _get_pfz_zones(min_lat, max_lat, min_lon, max_lon) -> dict:
    from backend.fusion.world_state import get_world_state_store
    store = get_world_state_store()
    if store.pfz_data:
        candidates = [
            {
                "zone_id": c.zone_id,
                "centroid": {"lat": c.centroid.lat, "lon": c.centroid.lon},
                "score": c.score,
                "confidence": c.confidence,
                "mean_sst": c.mean_sst_celsius,
                "mean_chl_a": c.mean_chl_a_mg_m3,
                "area_km2": c.area_km2,
            }
            for c in store.pfz_data.candidates
        ]
        return {"candidates": candidates, "total": len(candidates)}
    return {"candidates": [], "total": 0, "note": "PFZ data not yet available"}


async def _compute_route(origin_lat, origin_lon, dest_lat, dest_lon) -> dict:
    from backend.fusion.world_state import get_world_state_store
    from backend.routing.astar import astar_route
    from backend.models.common import BoundingBox

    store = get_world_state_store()
    grid = store.get_hazard_grid()

    origin = GeoPoint(lat=origin_lat, lon=origin_lon)
    dest = GeoPoint(lat=dest_lat, lon=dest_lon)

    if grid:
        route = astar_route(grid, origin, dest)
    else:
        from backend.routing.skeleton import compute_skeleton_route
        waypoints = compute_skeleton_route(origin, dest)
        return {
            "waypoints": len(waypoints),
            "algorithm": "skeleton (no hazard data available)",
            "note": "Hazard grid not built yet — route does not account for live conditions",
        }

    return {
        "route_id": route.route_id,
        "total_distance_km": route.total_distance_km,
        "estimated_time_hours": route.estimated_time_hours,
        "total_cost": route.total_cost,
        "num_waypoints": len(route.waypoints),
        "is_safe": route.is_safe,
        "warnings": route.warnings,
    }


async def _check_geofence(lat: float, lon: float) -> dict:
    from backend.agents.geofence.agent import get_geofence_agent
    agent = get_geofence_agent()
    check = agent.check_point(GeoPoint(lat=lat, lon=lon))
    return {
        "in_indian_eez": check.in_indian_eez,
        "in_mpa": check.in_mpa,
        "mpa_names": [m.name for m in check.mpa_conflicts],
        "nearest_boundary_km": check.nearest_eez_boundary_km,
        "depth_m": check.bathymetry.depth_m if check.bathymetry else None,
        "is_safe": check.is_safe,
        "warnings": check.warnings,
    }


async def _get_active_alerts() -> dict:
    from backend.fusion.world_state import get_world_state_store
    store = get_world_state_store()
    if store.cyclone_data:
        cyclones = [
            {
                "name": c.name,
                "center": {"lat": c.center.lat, "lon": c.center.lon},
                "severity": c.severity,
                "radius_km": c.radius_km,
            }
            for c in store.cyclone_data.cyclones
        ]
        return {"cyclones": cyclones, "total_alerts": store.cyclone_data.total_active_alerts}
    return {"cyclones": [], "total_alerts": 0}


async def _get_tide_info(lat: float, lon: float) -> dict:
    from backend.fusion.world_state import get_world_state_store
    store = get_world_state_store()
    if store.tide_data:
        return {
            "station": store.tide_data.station_name,
            "current_height_m": store.tide_data.current_height_m,
            "next_high": store.tide_data.next_high_tide.model_dump() if store.tide_data.next_high_tide else None,
            "next_low": store.tide_data.next_low_tide.model_dump() if store.tide_data.next_low_tide else None,
        }
    return {"note": "Tide data not yet available"}
