"""
Reroute logic — monitors active routes for condition degradation.

On every fusion-layer refresh, recomputes the cost of the remaining
path. If cost exceeds a threshold, triggers a reroute event and
computes a new path.
"""

from __future__ import annotations

from datetime import datetime

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.common import GeoPoint
from backend.models.routing import RerouteEvent, RouteResponse
from backend.routing.hazard_grid import HazardGrid
from backend.routing.astar import astar_route

logger = get_logger(__name__)


def check_reroute(
    current_route: RouteResponse,
    grid: HazardGrid,
    current_position_idx: int = 0,
) -> RerouteEvent | None:
    """
    Check if the current route needs rerouting due to changed conditions.

    Recomputes the cost of remaining waypoints using the current
    hazard grid. If the cost increase exceeds the configured threshold,
    triggers a reroute.

    Args:
        current_route: The active route being navigated
        grid: The current hazard-cost grid (refreshed by fusion layer)
        current_position_idx: Index of the current waypoint (how far along the route)

    Returns:
        A RerouteEvent if rerouting is needed, None otherwise.
    """
    settings = get_settings()
    threshold = settings.reroute_cost_threshold  # e.g., 0.5 = 50% increase

    remaining_waypoints = current_route.waypoints[current_position_idx:]
    if not remaining_waypoints:
        return None

    # Original remaining cost (from the original route computation)
    original_remaining_cost = sum(wp.cost for wp in remaining_waypoints)
    if original_remaining_cost <= 0:
        original_remaining_cost = 1.0  # Prevent division by zero

    # Current remaining cost (re-evaluated against updated hazard grid)
    current_remaining_cost = 0.0
    impassable = False
    trigger_reason = ""

    for wp in remaining_waypoints:
        cell_cost = grid.get_cell_cost(wp.lat, wp.lon)
        if cell_cost == float("inf"):
            impassable = True
            breakdown = grid.get_cost_breakdown(wp.lat, wp.lon)
            if breakdown["cyclone"] > 0:
                trigger_reason = f"Cyclone alert now affects waypoint ({wp.lat:.2f}, {wp.lon:.2f})"
            elif breakdown["geofence"] > 0:
                trigger_reason = f"Geofence violation at ({wp.lat:.2f}, {wp.lon:.2f})"
            elif breakdown["lightning"] > 0:
                trigger_reason = f"Lightning activity near ({wp.lat:.2f}, {wp.lon:.2f})"
            else:
                trigger_reason = f"No-go zone at ({wp.lat:.2f}, {wp.lon:.2f})"
            break
        current_remaining_cost += cell_cost

    if impassable:
        cost_increase_pct = float("inf")
    else:
        cost_increase_pct = (
            (current_remaining_cost - original_remaining_cost) / original_remaining_cost
        )

    # Check if reroute is needed
    if cost_increase_pct <= threshold and not impassable:
        return None

    if not trigger_reason:
        trigger_reason = (
            f"Route cost increased by {cost_increase_pct * 100:.1f}% "
            f"(threshold: {threshold * 100:.0f}%)"
        )

    logger.warning("Reroute triggered: %s", trigger_reason)

    # Compute new route from current position
    current_pos = remaining_waypoints[0]
    origin = GeoPoint(lat=current_pos.lat, lon=current_pos.lon)
    destination = current_route.destination

    new_route = astar_route(grid, origin, destination)

    return RerouteEvent(
        route_id=current_route.route_id,
        trigger="hazard_cost_increase",
        old_remaining_cost=round(original_remaining_cost, 3),
        new_remaining_cost=round(current_remaining_cost, 3),
        cost_increase_pct=round(cost_increase_pct * 100, 1) if not impassable else 999.9,
        reason=trigger_reason,
        new_route=new_route,
        timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
