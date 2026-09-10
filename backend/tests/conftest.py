"""
Shared test fixtures.

All agents run in mock mode during tests so we don't hit
external APIs or burn free-tier quota.
"""

from __future__ import annotations

import os
import pytest

from backend.models.common import BoundingBox, GeoPoint


# Force all agents into mock mode for tests
@pytest.fixture(autouse=True)
def mock_all_agents(monkeypatch):
    """Set all mock flags to true for deterministic tests."""
    monkeypatch.setenv("MOCK_SST_CHLOROPHYLL", "true")
    monkeypatch.setenv("MOCK_MARINE_WEATHER", "true")
    monkeypatch.setenv("MOCK_CYCLONE_DISASTER", "true")
    monkeypatch.setenv("MOCK_LIGHTNING", "true")
    monkeypatch.setenv("MOCK_TIDE", "true")
    monkeypatch.setenv("MOCK_VESSEL_AIS", "true")
    monkeypatch.setenv("MOCK_GEOFENCE", "true")
    monkeypatch.setenv("MOCK_PFZ_SYNTHESIS", "true")
    monkeypatch.setenv("DEBUG", "false")

    # Clear cached settings so they reload with test env vars
    from backend.core.config import get_settings
    get_settings.cache_clear()

    yield

    get_settings.cache_clear()


@pytest.fixture
def indian_ocean_bbox():
    """Bounding box covering the Indian Ocean / Arabian Sea."""
    return BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)


@pytest.fixture
def kerala_coast_bbox():
    """Bounding box around Kerala coast."""
    return BoundingBox(min_lat=8.0, max_lat=13.0, min_lon=74.0, max_lon=78.0)


@pytest.fixture
def kochi_point():
    """Kochi harbor coordinates."""
    return GeoPoint(lat=9.9312, lon=76.2673)


@pytest.fixture
def offshore_point():
    """A point offshore (Lakshadweep Sea)."""
    return GeoPoint(lat=10.5, lon=73.0)
