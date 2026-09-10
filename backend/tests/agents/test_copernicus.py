"""
Tests for Copernicus Marine Service integration and graceful fallback.
"""

from __future__ import annotations

import pytest
from backend.core.config import get_settings
from backend.models.common import BoundingBox, GeoPoint
from backend.models.marine_weather import MarineConditions
from backend.routing.hazard_grid import HazardGrid


def test_copernicus_config():
    """Verify Copernicus Marine configuration and credential resolution."""
    settings = get_settings()
    assert hasattr(settings, "copernicusmarine_service_username")
    assert hasattr(settings, "copernicusmarine_service_password")
    assert hasattr(settings, "has_copernicus_credentials")
    assert settings.effective_copernicus_username != ""


def test_current_cost_hazard_grid():
    """Verify surface current costs apply correctly in HazardGrid."""
    bbox = BoundingBox(min_lat=9.0, max_lat=11.0, min_lon=75.0, max_lon=77.0)
    grid = HazardGrid(bbox, resolution=0.1)

    # Base cost starts at 1.0
    initial_cost = grid.get_cell_cost(10.0, 76.0)
    assert initial_cost == pytest.approx(1.0)

    # Opposing current (vessel heading North 0°, current flowing South 180°)
    conditions = [
        {
            "lat": 10.0,
            "lon": 76.0,
            "current_speed_knots": 2.0,
            "current_direction_deg": 180.0,
        }
    ]
    grid.apply_current_costs(conditions, vessel_heading_deg=0.0, weight=1.5)

    opposing_cost = grid.get_cell_cost(10.0, 76.0)
    assert opposing_cost > initial_cost, "Opposing current must increase traversal cost"

    breakdown = grid.get_cost_breakdown(10.0, 76.0)
    assert "current" in breakdown
    assert breakdown["current"] > 0.0


def test_sst_anomaly_safety_guard():
    """Ensure that SST anomaly dataset is NOT used for PFZ synthesis."""
    from backend.agents.sst_chlorophyll import agent as sst_agent_mod

    source_code = open(sst_agent_mod.__file__, "r", encoding="utf-8").read()
    assert "cmems_mod_glo_phy_anfc_0.083deg-sst-anomaly_P1D-m" not in source_code or (
        "DO NOT use" in source_code or "SAFETY CRITICAL" in source_code
    )
    # The active dataset ID must be thetao
    assert "cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i" in source_code


@pytest.mark.asyncio
async def test_sst_chlorophyll_copernicus_or_fallback():
    """Smoke test: sst_chlorophyll agent successfully produces valid SSTDataPoints."""
    from backend.agents.sst_chlorophyll.agent import get_sst_chlorophyll_agent

    agent = get_sst_chlorophyll_agent()
    bbox = BoundingBox(min_lat=9.0, max_lat=10.0, min_lon=75.5, max_lon=76.5)
    response = await agent.fetch(bbox=bbox)

    assert response.status.value in ("ok", "mock")
    assert response.data is not None
    assert len(response.data.sst_grid) > 0
    sample = response.data.sst_grid[0]
    assert 20.0 <= sample.sst_celsius <= 35.0, f"Unrealistic SST: {sample.sst_celsius}"


@pytest.mark.asyncio
async def test_marine_weather_copernicus_or_fallback():
    """Smoke test: marine_weather agent returns wave and current data."""
    from backend.agents.marine_weather.agent import get_marine_weather_agent

    agent = get_marine_weather_agent()
    bbox = BoundingBox(min_lat=9.0, max_lat=10.0, min_lon=75.5, max_lon=76.5)
    response = await agent.fetch(bbox=bbox)

    assert response.status.value in ("ok", "mock")
    assert response.data is not None
    assert len(response.data.conditions) > 0
    sample = response.data.conditions[0]
    assert hasattr(sample, "current_speed_knots")
    assert sample.wave_height_m >= 0.0
