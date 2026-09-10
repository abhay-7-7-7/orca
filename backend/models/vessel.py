"""
Vessel tracking and fishing activity models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class VesselPosition(BaseModel):
    """AIS position report for a vessel."""

    mmsi: str
    name: str = ""
    lat: float
    lon: float
    course_deg: float = 0.0
    speed_knots: float = 0.0
    vessel_type: str = ""  # "fishing", "cargo", "tanker", etc.
    timestamp: str = ""
    flag_country: str = ""


class FishingEffort(BaseModel):
    """Fishing effort data for a grid cell (from GFW)."""

    lat: float
    lon: float
    fishing_hours: float = 0.0
    vessel_count: int = 0
    period: str = ""  # e.g., "last_7_days"
    source: str = "Global Fishing Watch"


class VesselAISData(BaseModel):
    """Combined vessel tracking + fishing effort data."""

    vessels: list[VesselPosition] = Field(default_factory=list)
    fishing_effort: list[FishingEffort] = Field(default_factory=list)
    total_vessels_in_view: int = 0
    total_fishing_vessels: int = 0
    source_ais: str = "AISstream.io"
    source_fishing: str = "Global Fishing Watch"
