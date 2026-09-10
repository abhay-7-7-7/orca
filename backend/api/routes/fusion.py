"""
Fusion API routes — world-state query endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.models.common import BoundingBox
from backend.models.fusion import WorldState, WorldStateQuery

router = APIRouter(tags=["fusion"])


@router.get("/world-state", response_model=WorldState)
async def get_world_state(
    min_lat: float = Query(8.0, description="Minimum latitude"),
    max_lat: float = Query(15.0, description="Maximum latitude"),
    min_lon: float = Query(72.0, description="Minimum longitude"),
    max_lon: float = Query(80.0, description="Maximum longitude"),
    resolution: float = Query(0.5, description="Grid resolution in degrees"),
):
    """
    Query the fused world state for a region.

    Returns a grid of cells with SST, chlorophyll, weather, hazards,
    and geofence data from all agents.
    """
    from backend.fusion.world_state import get_world_state_store

    store = get_world_state_store()
    bbox = BoundingBox(min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon)
    return store.query(bbox, resolution=resolution)


@router.get("/cell")
async def get_cell(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Get fused data for a single cell."""
    from backend.fusion.world_state import get_world_state_store

    store = get_world_state_store()
    return store.get_cell(lat, lon)


@router.get("/status")
async def fusion_status():
    """Get per-agent last-refresh timestamps and overall fusion status."""
    from backend.fusion.world_state import get_world_state_store

    store = get_world_state_store()
    state = store.query(
        BoundingBox(min_lat=0, max_lat=0, min_lon=0, max_lon=0),
        resolution=999,
    )
    return {
        "agent_timestamps": [t.model_dump() for t in state.agent_timestamps],
        "last_full_refresh": state.last_full_refresh,
        "hazard_grid_built": store.get_hazard_grid() is not None,
    }
