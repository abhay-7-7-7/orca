"""Tests for the fusion world-state store."""

from __future__ import annotations

import pytest
from backend.models.common import AgentStatus, BoundingBox


@pytest.mark.asyncio
async def test_world_state_assembles_from_all_agents(kerala_coast_bbox):
    """World state correctly fuses data from all 8 mock agents."""
    from backend.fusion.world_state import WorldStateStore
    from backend.agents.geofence.agent import GeofenceAgent
    from backend.agents.sst_chlorophyll.agent import SSTChlorophyllAgent
    from backend.agents.marine_weather.agent import MarineWeatherAgent
    from backend.agents.cyclone_disaster.agent import CycloneDisasterAgent
    from backend.agents.lightning.agent import LightningAgent
    from backend.agents.tide.agent import TideAgent
    from backend.agents.vessel_ais.agent import VesselAISAgent
    from backend.agents.pfz_synthesis.agent import PFZSynthesisAgent

    store = WorldStateStore()

    # Initialize geofence
    geofence = GeofenceAgent()
    await geofence.fetch(bbox=kerala_coast_bbox)
    store.set_geofence_agent(geofence)
    store.update_agent_data("geofence", None, AgentStatus.MOCK, True)

    # Fetch and store data from all agents
    agents = [
        ("sst_chlorophyll", SSTChlorophyllAgent()),
        ("marine_weather", MarineWeatherAgent()),
        ("cyclone_disaster", CycloneDisasterAgent()),
        ("lightning", LightningAgent()),
        ("tide", TideAgent()),
        ("vessel_ais", VesselAISAgent()),
        ("pfz_synthesis", PFZSynthesisAgent()),
    ]

    for name, agent in agents:
        response = await agent.fetch(bbox=kerala_coast_bbox)
        store.update_agent_data(name, response.data, response.status, response.is_mock)

    # Build hazard grid
    grid = store.build_hazard_grid(kerala_coast_bbox)
    assert grid is not None
    assert grid.ny > 0
    assert grid.nx > 0

    # Query world state
    state = store.query(kerala_coast_bbox, resolution=1.0)
    assert len(state.cells) > 0
    assert len(state.agent_timestamps) > 0

    # Verify cells have fused data
    for cell in state.cells[:5]:
        assert cell.lat >= kerala_coast_bbox.min_lat
        assert cell.lon >= kerala_coast_bbox.min_lon
        assert cell.last_updated is not None


@pytest.mark.asyncio
async def test_stale_data_is_tracked():
    """Agent timestamps are correctly maintained."""
    from backend.fusion.world_state import WorldStateStore

    store = WorldStateStore()
    store.update_agent_data("test_agent", {"value": 42}, AgentStatus.OK, False)

    state = store.query(BoundingBox(min_lat=0, max_lat=1, min_lon=0, max_lon=1), resolution=999)
    timestamps = {t.agent_name: t for t in state.agent_timestamps}

    assert "test_agent" in timestamps
    assert timestamps["test_agent"].status == "ok"
    assert timestamps["test_agent"].last_fetch is not None
