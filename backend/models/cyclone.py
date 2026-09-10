"""
Cyclone and disaster alert models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class CycloneAlert(BaseModel):
    """An active cyclone or tropical storm alert."""

    event_id: str
    name: str
    category: str = ""  # e.g., "Category 1", "Depression", "Severe Cyclonic Storm"
    center: GeoPoint
    radius_km: float = 0.0
    max_wind_speed_kmh: float = 0.0
    movement_speed_kmh: float = 0.0
    movement_direction_deg: float = 0.0
    forecast_track: list[GeoPoint] = Field(default_factory=list)
    source: str = "GDACS"
    severity: str = "warning"  # "watch", "warning", "alert"
    description: str = ""
    url: str = ""


class DisasterAlert(BaseModel):
    """A general disaster alert from GDACS."""

    event_id: str
    event_type: str  # "TC" (tropical cyclone), "EQ" (earthquake), "FL" (flood)
    severity: str  # "green", "orange", "red"
    title: str
    description: str = ""
    center: Optional[GeoPoint] = None
    affected_radius_km: float = 0.0
    source: str = "GDACS"
    url: str = ""
    published: str = ""


class CycloneDisasterData(BaseModel):
    """Combined cyclone and disaster alert data."""

    cyclones: list[CycloneAlert] = Field(default_factory=list)
    other_alerts: list[DisasterAlert] = Field(default_factory=list)
    total_active_alerts: int = 0
    nearest_cyclone_km: Optional[float] = None
    source: str = "GDACS (Global Disaster Alert and Coordination System)"
