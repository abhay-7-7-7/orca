"""
A* pathfinding on the hazard-cost grid.

Grid-based A* with Haversine heuristic — finds the optimal path
through the hazard-cost grid, avoiding no-go zones and minimizing
total traversal cost.

Falls back to the searoute skeleton if no valid path is found.
"""

from __future__ import annotations

import heapq
import math
import uuid
from typing import Optional

from backend.core.logging import get_logger
from backend.models.common import GeoPoint
from backend.models.routing import HazardSummary, RouteResponse, RouteWaypoint
from backend.routing.hazard_grid import HazardGrid

logger = get_logger(__name__)


def astar_route(
    grid: HazardGrid,
    origin: GeoPoint,
    destination: GeoPoint,
    max_iterations: int = 50000,
) -> RouteResponse:
    """
    Compute the optimal route through the hazard-cost grid using A*.

    Returns a RouteResponse with waypoints, costs, and hazard summary.
    """
    route_id = f"RT-{uuid.uuid4().hex[:8].upper()}"

    # Convert origin/destination to grid indices
    start_i, start_j = grid.lat_to_idx(origin.lat), grid.lon_to_idx(origin.lon)
    end_i, end_j = grid.lat_to_idx(destination.lat), grid.lon_to_idx(destination.lon)

    # Check if start/end are in no-go zones
    if math.isinf(grid.cost_grid[start_i, start_j]):
        logger.warning("Origin is in a no-go zone")
        return _make_error_route(route_id, origin, destination, "Origin is in a no-go zone")

    if math.isinf(grid.cost_grid[end_i, end_j]):
        logger.warning("Destination is in a no-go zone")
        return _make_error_route(route_id, origin, destination, "Destination is in a no-go zone")

    # A* search
    # Priority queue: (f_score, counter, i, j)
    counter = 0
    open_set = [(0.0, counter, start_i, start_j)]
    came_from: dict[tuple[int, int], tuple[int, int]] = {}
    g_score: dict[tuple[int, int], float] = {(start_i, start_j): 0.0}

    # 8-directional movement (including diagonals)
    directions = [
        (-1, 0), (1, 0), (0, -1), (0, 1),  # Cardinal
        (-1, -1), (-1, 1), (1, -1), (1, 1),  # Diagonal
    ]

    iterations = 0

    while open_set and iterations < max_iterations:
        iterations += 1
        _, _, ci, cj = heapq.heappop(open_set)

        if ci == end_i and cj == end_j:
            # Reconstruct path
            path = _reconstruct_path(grid, came_from, (start_i, start_j), (end_i, end_j))
            logger.info(
                "A* found path: %d waypoints, %d iterations",
                len(path), iterations,
            )
            return _build_route_response(route_id, origin, destination, path, grid)

        for di, dj in directions:
            ni, nj = ci + di, cj + dj

            # Bounds check
            if ni < 0 or ni >= grid.ny or nj < 0 or nj >= grid.nx:
                continue

            # Skip infinite-cost cells
            cell_cost = float(grid.cost_grid[ni, nj])
            if math.isinf(cell_cost):
                continue

            # Movement cost: cell cost × distance factor (diagonal = √2)
            move_dist = 1.414 if (di != 0 and dj != 0) else 1.0
            move_cost = cell_cost * move_dist

            tentative_g = g_score.get((ci, cj), float("inf")) + move_cost

            if tentative_g < g_score.get((ni, nj), float("inf")):
                came_from[(ni, nj)] = (ci, cj)
                g_score[(ni, nj)] = tentative_g

                # Heuristic: Haversine distance to destination (in grid units)
                h = _grid_heuristic(ni, nj, end_i, end_j)
                f = tentative_g + h

                counter += 1
                heapq.heappush(open_set, (f, counter, ni, nj))

    logger.warning("A* failed to find path in %d iterations", iterations)
    return _make_error_route(
        route_id, origin, destination,
        f"No safe path found (searched {iterations} cells)"
    )


def _grid_heuristic(i1: int, j1: int, i2: int, j2: int) -> float:
    """Euclidean distance heuristic in grid units (admissible for A*)."""
    return math.sqrt((i1 - i2) ** 2 + (j1 - j2) ** 2)


def _reconstruct_path(
    grid: HazardGrid,
    came_from: dict[tuple[int, int], tuple[int, int]],
    start: tuple[int, int],
    end: tuple[int, int],
) -> list[tuple[int, int]]:
    """Reconstruct the path from A* search results."""
    path = [end]
    current = end
    while current != start:
        current = came_from[current]
        path.append(current)
    path.reverse()

    # Simplify: remove intermediate points on straight segments
    if len(path) > 3:
        simplified = [path[0]]
        for k in range(1, len(path) - 1):
            prev, curr, nxt = path[k - 1], path[k], path[k + 1]
            # Keep point if direction changes
            d1 = (curr[0] - prev[0], curr[1] - prev[1])
            d2 = (nxt[0] - curr[0], nxt[1] - curr[1])
            if d1 != d2:
                simplified.append(curr)
        simplified.append(path[-1])
        return simplified

    return path


def _build_route_response(
    route_id: str,
    origin: GeoPoint,
    destination: GeoPoint,
    path: list[tuple[int, int]],
    grid: HazardGrid,
) -> RouteResponse:
    """Build a RouteResponse from the A* path."""
    waypoints = []
    total_cost = 0.0
    total_distance = 0.0
    max_wave = 0.0
    max_wind = 0.0
    warnings = []

    prev_lat, prev_lon = origin.lat, origin.lon

    for idx, (i, j) in enumerate(path):
        lat = grid.idx_to_lat(i)
        lon = grid.idx_to_lon(j)

        cell_cost = float(grid.cost_grid[i, j])
        total_cost += cell_cost

        # Distance from previous waypoint
        if idx > 0:
            seg_dist = _haversine_km(prev_lat, prev_lon, lat, lon)
            total_distance += seg_dist

        # Hazards at this point
        breakdown = grid.get_cost_breakdown(lat, lon)
        hazards = []
        if breakdown["wave"] > 2.0:
            hazards.append(f"High waves (cost: {breakdown['wave']:.1f})")
        if breakdown["wind"] > 1.0:
            hazards.append(f"Strong wind (cost: {breakdown['wind']:.1f})")
        if breakdown["cyclone"] > 0:
            hazards.append(f"Cyclone proximity (cost: {breakdown['cyclone']:.1f})")
        if breakdown["lightning"] > 0:
            hazards.append(f"Lightning activity (cost: {breakdown['lightning']:.1f})")
        if breakdown["geofence"] > 0:
            hazards.append(f"Near boundary (cost: {breakdown['geofence']:.1f})")

        wave_h = float(grid.wave_cost[i, j])
        wind_s = float(grid.wind_cost[i, j])
        max_wave = max(max_wave, wave_h)
        max_wind = max(max_wind, wind_s)

        waypoints.append(
            RouteWaypoint(
                lat=round(lat, 5),
                lon=round(lon, 5),
                cost=round(cell_cost, 3),
                cumulative_cost=round(total_cost, 3),
                distance_from_start_km=round(total_distance, 2),
                wave_height_m=round(wave_h, 2),
                wind_speed_kmh=round(wind_s, 2),
                hazards=hazards,
            )
        )
        prev_lat, prev_lon = lat, lon

    # Estimated time at average 8 knots (typical fishing vessel)
    speed_kmh = 8 * 1.852  # knots to km/h
    estimated_time = total_distance / speed_kmh if speed_kmh > 0 else 0

    hazard_summary = HazardSummary(
        max_wave_height_m=round(max_wave, 2),
        max_wind_speed_kmh=round(max_wind, 2),
    )

    return RouteResponse(
        route_id=route_id,
        origin=origin,
        destination=destination,
        waypoints=waypoints,
        total_cost=round(total_cost, 3),
        total_distance_km=round(total_distance, 2),
        estimated_time_hours=round(estimated_time, 2),
        hazard_summary=hazard_summary,
        is_safe=total_cost < float("inf"),
        warnings=warnings,
    )


def _make_error_route(
    route_id: str,
    origin: GeoPoint,
    destination: GeoPoint,
    error: str,
) -> RouteResponse:
    """Build an error RouteResponse when no valid path exists."""
    return RouteResponse(
        route_id=route_id,
        origin=origin,
        destination=destination,
        waypoints=[],
        total_cost=float("inf"),
        is_safe=False,
        warnings=[error],
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
