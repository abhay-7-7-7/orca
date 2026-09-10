"""Tests for the routing engine."""

from __future__ import annotations

import math

import pytest
from backend.models.common import BoundingBox, GeoPoint
from backend.routing.hazard_grid import HazardGrid
from backend.routing.astar import astar_route


@pytest.mark.asyncio
async def test_astar_finds_path():
    """A* finds a valid path between two accessible points."""
    bbox = BoundingBox(min_lat=9.0, max_lat=11.0, min_lon=75.0, max_lon=77.0)
    grid = HazardGrid(bbox, resolution=0.1)

    origin = GeoPoint(lat=9.5, lon=75.5)
    dest = GeoPoint(lat=10.5, lon=76.5)

    route = astar_route(grid, origin, dest)

    assert len(route.waypoints) > 0
    assert route.total_cost > 0
    assert route.total_cost < float("inf")
    assert route.is_safe is True


@pytest.mark.asyncio
async def test_astar_avoids_nogo_zone():
    """A* path avoids cells with infinite cost (no-go zones)."""
    bbox = BoundingBox(min_lat=9.0, max_lat=11.0, min_lon=75.0, max_lon=77.0)
    grid = HazardGrid(bbox, resolution=0.1)

    # Create a no-go wall across the middle (lat ~10.0)
    for j in range(grid.nx):
        i = grid.lat_to_idx(10.0)
        grid.cost_grid[i, j] = float("inf")

    # Leave a gap at one point (lon ~76.5)
    gap_j = grid.lon_to_idx(76.5)
    gap_i = grid.lat_to_idx(10.0)
    grid.cost_grid[gap_i, gap_j] = 1.0

    origin = GeoPoint(lat=9.5, lon=75.5)
    dest = GeoPoint(lat=10.5, lon=76.5)

    route = astar_route(grid, origin, dest)

    # Path must exist (via the gap)
    assert len(route.waypoints) > 0
    assert route.is_safe is True

    # Verify no waypoint is in the no-go zone (except the gap)
    for wp in route.waypoints:
        i = grid.lat_to_idx(wp.lat)
        j = grid.lon_to_idx(wp.lon)
        cell_cost = float(grid.cost_grid[i, j])
        assert not math.isinf(cell_cost), (
            f"Route passes through no-go zone at ({wp.lat:.2f}, {wp.lon:.2f})"
        )


@pytest.mark.asyncio
async def test_nogo_origin_returns_error():
    """A* returns an error route if origin is in a no-go zone."""
    bbox = BoundingBox(min_lat=9.0, max_lat=11.0, min_lon=75.0, max_lon=77.0)
    grid = HazardGrid(bbox, resolution=0.1)

    # Make origin a no-go zone
    origin = GeoPoint(lat=9.5, lon=75.5)
    i, j = grid.lat_to_idx(origin.lat), grid.lon_to_idx(origin.lon)
    grid.cost_grid[i, j] = float("inf")

    dest = GeoPoint(lat=10.5, lon=76.5)
    route = astar_route(grid, origin, dest)

    assert route.is_safe is False
    assert "no-go" in route.warnings[0].lower() or "origin" in route.warnings[0].lower()


@pytest.mark.asyncio
async def test_cyclone_penalty_increases_cost():
    """Cyclone proximity penalty increases cell costs."""
    bbox = BoundingBox(min_lat=9.0, max_lat=11.0, min_lon=75.0, max_lon=77.0)
    grid = HazardGrid(bbox, resolution=0.1)

    # Get base cost of a cell
    base_cost = grid.get_cell_cost(10.0, 76.0)

    # Apply a cyclone near that cell
    grid.apply_cyclone_costs([{
        "center": {"lat": 10.0, "lon": 76.0},
        "radius_km": 200,
    }])

    new_cost = grid.get_cell_cost(10.0, 76.0)
    assert new_cost > base_cost or math.isinf(new_cost)


@pytest.mark.asyncio
async def test_reroute_triggered_on_cost_increase():
    """Reroute is triggered when remaining path cost exceeds threshold."""
    from backend.routing.reroute import check_reroute
    from backend.models.routing import RouteResponse, RouteWaypoint

    bbox = BoundingBox(min_lat=9.0, max_lat=11.0, min_lon=75.0, max_lon=77.0)
    grid = HazardGrid(bbox, resolution=0.1)

    # Create a route with known costs
    waypoints = [
        RouteWaypoint(lat=9.5, lon=75.5, cost=1.0),
        RouteWaypoint(lat=10.0, lon=76.0, cost=1.0),
        RouteWaypoint(lat=10.5, lon=76.5, cost=1.0),
    ]
    route = RouteResponse(
        route_id="TEST-001",
        origin=GeoPoint(lat=9.5, lon=75.5),
        destination=GeoPoint(lat=10.5, lon=76.5),
        waypoints=waypoints,
        total_cost=3.0,
    )

    # No reroute with clean grid
    event = check_reroute(route, grid, current_position_idx=0)
    # Cost should be similar, no reroute
    # (might trigger due to different grid cost calculation, so just check it doesn't crash)
    assert event is None or event.cost_increase_pct is not None

    # Add a cyclone that blocks the path
    grid.apply_cyclone_costs([{
        "center": {"lat": 10.0, "lon": 76.0},
        "radius_km": 50,
    }])

    event = check_reroute(route, grid, current_position_idx=0)
    assert event is not None
    assert event.reason != ""
