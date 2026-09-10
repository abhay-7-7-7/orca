"""Tests for all 8 agents in mock mode."""

from __future__ import annotations

import pytest
from backend.models.common import AgentStatus, BoundingBox


@pytest.mark.asyncio
async def test_geofence_agent_mock(kerala_coast_bbox, kochi_point):
    """Geofence agent returns valid data in mock mode."""
    from backend.agents.geofence.agent import GeofenceAgent

    agent = GeofenceAgent()
    response = await agent.fetch(bbox=kerala_coast_bbox)

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert response.data.indian_eez_available is True

    # Point check
    check = agent.check_point(kochi_point)
    assert check.in_indian_eez is True
    assert check.is_safe is True


@pytest.mark.asyncio
async def test_geofence_outside_eez():
    """Points outside Indian EEZ are flagged."""
    from backend.agents.geofence.agent import GeofenceAgent
    from backend.models.common import GeoPoint

    agent = GeofenceAgent()
    await agent.fetch()

    # Point in the middle of the Atlantic
    atlantic = GeoPoint(lat=20.0, lon=-40.0)
    check = agent.check_point(atlantic)
    assert check.in_indian_eez is False
    assert check.is_safe is False


@pytest.mark.asyncio
async def test_sst_chlorophyll_agent_mock(kerala_coast_bbox):
    """SST/Chlorophyll agent returns valid grid data in mock mode."""
    from backend.agents.sst_chlorophyll.agent import SSTChlorophyllAgent

    agent = SSTChlorophyllAgent()
    response = await agent.fetch(bbox=kerala_coast_bbox)

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert len(response.data.sst_grid) > 0
    assert len(response.data.chlorophyll_grid) > 0
    assert response.data.sst_min is not None
    assert response.data.sst_max is not None


@pytest.mark.asyncio
async def test_pfz_synthesis_agent_mock(kerala_coast_bbox):
    """PFZ synthesis produces candidate zones from mock SST data."""
    from backend.agents.pfz_synthesis.agent import PFZSynthesisAgent

    agent = PFZSynthesisAgent()
    response = await agent.fetch(bbox=kerala_coast_bbox)

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert response.data.total_candidates >= 0
    # Candidates should have valid scores
    for candidate in response.data.candidates:
        assert 0 <= candidate.score <= 1
        assert candidate.centroid.lat != 0 or candidate.centroid.lon != 0
        assert len(candidate.polygon) >= 4  # At least a quadrilateral


@pytest.mark.asyncio
async def test_marine_weather_agent_mock(kerala_coast_bbox):
    """Marine weather agent returns conditions in mock mode."""
    from backend.agents.marine_weather.agent import MarineWeatherAgent

    agent = MarineWeatherAgent()
    response = await agent.fetch(bbox=kerala_coast_bbox)

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert len(response.data.conditions) > 0
    assert response.data.max_wave_height_m >= 0


@pytest.mark.asyncio
async def test_marine_weather_point_query():
    """Marine weather handles point queries."""
    from backend.agents.marine_weather.agent import MarineWeatherAgent

    agent = MarineWeatherAgent()
    response = await agent.fetch(lat=10.0, lon=76.0)

    assert response.data is not None
    assert len(response.data.conditions) >= 1


@pytest.mark.asyncio
async def test_tide_agent_mock():
    """Tide agent returns predictions in mock mode."""
    from backend.agents.tide.agent import TideAgent

    agent = TideAgent()
    response = await agent.fetch(lat=9.9312, lon=76.2673)

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert len(response.data.predictions) > 0
    assert response.data.current_height_m is not None


@pytest.mark.asyncio
async def test_cyclone_disaster_agent_mock():
    """Cyclone/disaster agent returns data in mock mode."""
    from backend.agents.cyclone_disaster.agent import CycloneDisasterAgent

    agent = CycloneDisasterAgent()
    response = await agent.fetch()

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None


@pytest.mark.asyncio
async def test_cyclone_with_demo_cyclone():
    """Demo cyclone mode shows a synthetic cyclone."""
    from backend.agents.cyclone_disaster.agent import CycloneDisasterAgent

    agent = CycloneDisasterAgent()
    response = await agent.fetch(include_demo_cyclone=True)

    assert response.data is not None
    assert len(response.data.cyclones) == 1
    assert "MOCK" in response.data.cyclones[0].event_id


@pytest.mark.asyncio
async def test_lightning_agent_mock():
    """Lightning agent returns cluster data in mock mode."""
    from backend.agents.lightning.agent import LightningAgent

    agent = LightningAgent()
    response = await agent.fetch()

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert len(response.data.clusters) > 0
    for cluster in response.data.clusters:
        assert cluster.risk_level in ("low", "moderate", "high")


@pytest.mark.asyncio
async def test_vessel_ais_agent_mock():
    """Vessel/AIS agent returns vessel data in mock mode."""
    from backend.agents.vessel_ais.agent import VesselAISAgent

    agent = VesselAISAgent()
    response = await agent.fetch()

    assert response.status in (AgentStatus.OK, AgentStatus.MOCK)
    assert response.data is not None
    assert response.data.total_vessels_in_view > 0
    assert len(response.data.vessels) > 0


@pytest.mark.asyncio
async def test_agent_never_silently_fails():
    """
    Verify that no agent returns status='ok' with empty data
    when it should report an error/unavailable status.

    This is the critical safety property: a missing/failing agent
    must surface as visible, never as 'no hazards found'.
    """
    from backend.agents.geofence.agent import GeofenceAgent
    from backend.agents.sst_chlorophyll.agent import SSTChlorophyllAgent
    from backend.agents.marine_weather.agent import MarineWeatherAgent
    from backend.agents.tide.agent import TideAgent
    from backend.agents.cyclone_disaster.agent import CycloneDisasterAgent
    from backend.agents.lightning.agent import LightningAgent
    from backend.agents.vessel_ais.agent import VesselAISAgent
    from backend.agents.pfz_synthesis.agent import PFZSynthesisAgent

    agents = [
        GeofenceAgent(),
        SSTChlorophyllAgent(),
        MarineWeatherAgent(),
        TideAgent(),
        CycloneDisasterAgent(),
        LightningAgent(),
        VesselAISAgent(),
        PFZSynthesisAgent(),
    ]

    for agent in agents:
        response = await agent.fetch()
        # Status must ALWAYS be set
        assert response.status is not None, f"{agent.agent_name} has no status"
        # If status is OK, data must not be None
        if response.status == AgentStatus.OK:
            assert response.data is not None, (
                f"{agent.agent_name} reported OK but data is None"
            )
