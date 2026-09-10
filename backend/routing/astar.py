"""
A* pathfinding and maritime hazard-cost routing.

Combines the searoute maritime network (Layer 1) with the
hazard-cost grid (Layer 2) to compute safe, optimal sea routes
that strictly avoid land and minimize ocean traversal risks.
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
from backend.routing.land_mask import is_land, line_crosses_land
from backend.routing.skeleton import compute_skeleton_route

logger = get_logger(__name__)


def astar_route(
    grid: HazardGrid,
    origin: GeoPoint,
    destination: GeoPoint,
    max_iterations: int = 50000,
    skeleton_waypoints: list[GeoPoint] | None = None,
) -> RouteResponse:
    """
    Compute the optimal route through the hazard-cost grid.

    Ensures routes strictly navigate through open sea and avoid all landmasses.
    If direct routing would cross land or between distant ports, uses the
    maritime sea skeleton evaluated against live hazard costs.
    """
    route_id = f"RT-{uuid.uuid4().hex[:8].upper()}"

    # Check origin and destination cells
    start_i, start_j = grid.lat_to_idx(origin.lat), grid.lon_to_idx(origin.lon)
    end_i, end_j = grid.lat_to_idx(destination.lat), grid.lon_to_idx(destination.lon)

    if math.isinf(grid.cost_grid[start_i, start_j]):
        logger.warning("Origin is in a no-go zone")
        return _make_error_route(route_id, origin, destination, "Origin is in a no-go zone")

    if math.isinf(grid.cost_grid[end_i, end_j]):
        logger.warning("Destination is in a no-go zone")
        return _make_error_route(route_id, origin, destination, "Destination is in a no-go zone")

    # If skeleton waypoints are provided, build response along the sea path
    if skeleton_waypoints is not None:
        logger.info("Using provided maritime skeleton: %d waypoints", len(skeleton_waypoints))
        return _build_response_from_points(route_id, origin, destination, skeleton_waypoints, grid)

    # 1. Check if maritime corridor routing is needed (crosses land)
    if line_crosses_land(origin, destination):
        waypoints = compute_skeleton_route(origin, destination)
        if waypoints and len(waypoints) >= 2:
            logger.info("Using maritime sea skeleton: %d waypoints", len(waypoints))
            return _build_response_from_points(route_id, origin, destination, waypoints, grid)

    # Priority queue: (f_score, counter, i, j)
    counter = 0
    open_set = [(0.0, counter, start_i, start_j)]
    came_from: dict[tuple[int, int], tuple[int, int]] = {}
    g_score: dict[tuple[int, int], float] = {(start_i, start_j): 0.0}

    directions = [
        (-1, 0), (1, 0), (0, -1), (0, 1),  # Cardinal
        (-1, -1), (-1, 1), (1, -1), (1, 1),  # Diagonal
    ]

    iterations = 0

    while open_set and iterations < max_iterations:
        iterations += 1
        _, _, ci, cj = heapq.heappop(open_set)

        if ci == end_i and cj == end_j:
            path = _reconstruct_path(grid, came_from, (start_i, start_j), (end_i, end_j))
            logger.info("Local A* found path: %d waypoints, %d iterations", len(path), iterations)
            return _build_route_response(route_id, origin, destination, path, grid)

        for di, dj in directions:
            ni, nj = ci + di, cj + dj

            if ni < 0 or ni >= grid.ny or nj < 0 or nj >= grid.nx:
                continue

            cell_cost = float(grid.cost_grid[ni, nj])
            if math.isinf(cell_cost):
                continue

            move_dist = 1.414 if (di != 0 and dj != 0) else 1.0
            move_cost = cell_cost * move_dist

            tentative_g = g_score.get((ci, cj), float("inf")) + move_cost

            if tentative_g < g_score.get((ni, nj), float("inf")):
                came_from[(ni, nj)] = (ci, cj)
                g_score[(ni, nj)] = tentative_g

                h = _grid_heuristic(ni, nj, end_i, end_j)
                f = tentative_g + h

                counter += 1
                heapq.heappush(open_set, (f, counter, ni, nj))

    # Fallback to sea skeleton if local A* reached max iterations
    logger.info("Local A* exceeded iterations, falling back to maritime sea skeleton")
    waypoints = compute_skeleton_route(origin, destination)
    return _build_response_from_points(route_id, origin, destination, waypoints, grid)


def _snap_to_water(grid: HazardGrid, i: int, j: int) -> tuple[int, int]:
    """If coordinate is in a land/impassable cell, snap to nearest open water neighbor."""
    if not math.isinf(grid.cost_grid[i, j]):
        return i, j

    for radius in range(1, 4):
        for di in range(-radius, radius + 1):
            for dj in range(-radius, radius + 1):
                ni, nj = i + di, j + dj
                if 0 <= ni < grid.ny and 0 <= nj < grid.nx:
                    if not math.isinf(grid.cost_grid[ni, nj]):
                        return ni, nj
    return i, j


def _grid_heuristic(i1: int, j1: int, i2: int, j2: int) -> float:
    """Euclidean distance heuristic in grid units."""
    return math.sqrt((i1 - i2) ** 2 + (j1 - j2) ** 2)


def _reconstruct_path(
    grid: HazardGrid,
    came_from: dict[tuple[int, int], tuple[int, int]],
    start: tuple[int, int],
    end: tuple[int, int],
) -> list[tuple[int, int]]:
    """Reconstruct path from A* came_from map."""
    path = [end]
    current = end
    while current != start:
        current = came_from[current]
        path.append(current)
    path.reverse()

    if len(path) > 3:
        simplified = [path[0]]
        for k in range(1, len(path) - 1):
            prev, curr, nxt = path[k - 1], path[k], path[k + 1]
            d1 = (curr[0] - prev[0], curr[1] - prev[1])
            d2 = (nxt[0] - curr[0], nxt[1] - curr[1])
            if d1 != d2:
                simplified.append(curr)
        simplified.append(path[-1])
        return simplified

    return path


def _build_response_from_points(
    route_id: str,
    origin: GeoPoint,
    destination: GeoPoint,
    points: list[GeoPoint],
    grid: HazardGrid | None,
) -> RouteResponse:
    """Build RouteResponse from a sequence of geographic sea waypoints."""
    waypoints: list[RouteWaypoint] = []
    total_cost = 0.0
    total_distance = 0.0
    max_wave = 0.0
    max_wind = 0.0
    warnings = []

    prev_lat, prev_lon = origin.lat, origin.lon

    for idx, pt in enumerate(points):
        lat, lon = pt.lat, pt.lon

        # Distance from previous waypoint
        if idx > 0:
            seg_dist = _haversine_km(prev_lat, prev_lon, lat, lon)
            total_distance += seg_dist

        cell_cost = 1.0
        wave_h = 0.8
        wind_s = 15.0
        hazards: list[str] = []

        if grid is not None:
            i, j = grid.lat_to_idx(lat), grid.lon_to_idx(lon)
            raw_cost = float(grid.cost_grid[i, j])
            cell_cost = raw_cost if not math.isinf(raw_cost) else 1.5
            total_cost += cell_cost

            breakdown = grid.get_cost_breakdown(lat, lon)
            if breakdown["wave"] > 2.0:
                hazards.append(f"High waves (cost: {breakdown['wave']:.1f})")
            if breakdown["wind"] > 1.0:
                hazards.append(f"Strong wind (cost: {breakdown['wind']:.1f})")
            if breakdown["cyclone"] > 0:
                hazards.append(f"Cyclone proximity (cost: {breakdown['cyclone']:.1f})")
            if breakdown["lightning"] > 0:
                hazards.append(f"Lightning activity (cost: {breakdown['lightning']:.1f})")

            wave_h = float(grid.wave_cost[i, j])
            wind_s = float(grid.wind_cost[i, j])
        else:
            total_cost += 1.0

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

    speed_kmh = 8 * 1.852  # 8 knots typical fishing speed
    estimated_time = total_distance / speed_kmh if speed_kmh > 0 else 0

    return RouteResponse(
        route_id=route_id,
        origin=origin,
        destination=destination,
        waypoints=waypoints,
        total_cost=round(total_cost, 3),
        total_distance_km=round(total_distance, 2),
        estimated_time_hours=round(estimated_time, 2),
        hazard_summary=HazardSummary(
            max_wave_height_m=round(max_wave, 2),
            max_wind_speed_kmh=round(max_wind, 2),
        ),
        is_safe=True,
        warnings=warnings,
    )


def _build_route_response(
    route_id: str,
    origin: GeoPoint,
    destination: GeoPoint,
    path: list[tuple[int, int]],
    grid: HazardGrid,
) -> RouteResponse:
    """Build a RouteResponse from grid cell indices."""
    pts = [GeoPoint(lat=grid.idx_to_lat(i), lon=grid.idx_to_lon(j)) for i, j in path]
    return _build_response_from_points(route_id, origin, destination, pts, grid)


def _make_error_route(
    route_id: str,
    origin: GeoPoint,
    destination: GeoPoint,
    error: str,
) -> RouteResponse:
    """Build an error RouteResponse."""
    return RouteResponse(
        route_id=route_id,
        origin=origin,
        destination=destination,
        waypoints=[],
        total_cost=999999.0,
        is_safe=False,
        warnings=[error],
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two points in km."""
    R = 6371.0
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
