"""
Routing API routes — compute routes, check reroute, route status.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from backend.models.common import BoundingBox, GeoPoint
from backend.models.routing import RouteRequest, RouteResponse, RouteStatusResponse

router = APIRouter(tags=["routing"])

# In-memory route store (hackathon)
_active_routes: dict[str, RouteResponse] = {}


@router.post("/compute", response_model=RouteResponse)
async def compute_route(request: RouteRequest):
    """
    Compute an optimal route from origin to destination.

    Uses the hazard-cost A* algorithm with live data from the
    fusion layer. Falls back to searoute skeleton if hazard grid
    isn't available.
    """
    from backend.fusion.world_state import get_world_state_store
    from backend.routing.astar import astar_route
    from backend.routing.skeleton import compute_skeleton_route
    from backend.routing.hazard_grid import HazardGrid

    store = get_world_state_store()
    grid = store.get_hazard_grid()

    skeleton = compute_skeleton_route(request.origin, request.destination)

    if grid is None:
        # Build grid covering all skeleton waypoints with margin
        min_lat = max(4.0, min(w.lat for w in skeleton) - 0.8)
        max_lat = min(26.0, max(w.lat for w in skeleton) + 0.8)
        min_lon = max(65.0, min(w.lon for w in skeleton) - 0.8)
        max_lon = min(98.0, max(w.lon for w in skeleton) + 0.8)

        bbox = BoundingBox(min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon)
        grid = store.build_hazard_grid(bbox)

    route = astar_route(grid, request.origin, request.destination, skeleton_waypoints=skeleton)

    # Store route for reroute checks
    _active_routes[route.route_id] = route

    return route


@router.post("/reroute-check")
async def reroute_check(
    route_id: str,
    current_position_idx: int = 0,
):
    """
    Check if an active route needs rerouting due to changed conditions.
    """
    from backend.fusion.world_state import get_world_state_store
    from backend.routing.reroute import check_reroute

    if route_id not in _active_routes:
        return {"error": f"Route {route_id} not found", "needs_reroute": False}

    store = get_world_state_store()
    grid = store.get_hazard_grid()

    if grid is None:
        return {"error": "Hazard grid not available", "needs_reroute": False}

    route = _active_routes[route_id]
    event = check_reroute(route, grid, current_position_idx)

    if event and event.new_route:
        # Store the new route
        _active_routes[event.new_route.route_id] = event.new_route

    return {
        "route_id": route_id,
        "needs_reroute": event is not None,
        "reroute_event": event.model_dump() if event else None,
    }


@router.get("/status/{route_id}", response_model=RouteStatusResponse)
async def route_status(route_id: str):
    """Get the current status of an active route."""
    if route_id not in _active_routes:
        return RouteStatusResponse(route_id=route_id)

    route = _active_routes[route_id]
    return RouteStatusResponse(
        route_id=route_id,
        remaining_waypoints=len(route.waypoints),
        remaining_distance_km=route.total_distance_km,
        remaining_time_hours=route.estimated_time_hours,
        needs_reroute=False,
    )


@router.get("/skeleton")
async def skeleton_route(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
):
    """
    Compute a basic skeleton route (searoute, no hazard cost).

    Useful for visualization or as a comparison baseline.
    """
    from backend.routing.skeleton import compute_skeleton_route

    origin = GeoPoint(lat=origin_lat, lon=origin_lon)
    dest = GeoPoint(lat=dest_lat, lon=dest_lon)
    waypoints = compute_skeleton_route(origin, dest)

    return {
        "origin": origin.model_dump(),
        "destination": dest.model_dump(),
        "waypoints": [w.model_dump() for w in waypoints],
        "num_waypoints": len(waypoints),
        "algorithm": "searoute skeleton (no hazard cost)",
    }
