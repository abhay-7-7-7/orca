"""
Fusion layer models — the world-state store schema.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WorldStateCell(BaseModel):
    """A single cell in the world-state grid, holding fused data from all agents."""

    lat: float
    lon: float
    # Ocean surface
    sst_celsius: Optional[float] = None
    chlorophyll_mg_m3: Optional[float] = None
    pfz_score: float = 0.0
    # Weather
    wave_height_m: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    sea_state: str = ""
    # Hazards
    cyclone_risk: float = 0.0  # 0.0 = none, 1.0 = maximum
    lightning_risk: float = 0.0
    # Geofence
    in_indian_eez: Optional[bool] = None
    in_mpa: bool = False
    depth_m: Optional[float] = None
    # Composite
    routing_cost: float = 1.0
    is_navigable: bool = True
    last_updated: Optional[str] = None


class AgentTimestamp(BaseModel):
    """Tracks when each agent last provided data."""

    agent_name: str
    last_fetch: Optional[datetime] = None
    status: str = "pending"  # ok, mock, error, unavailable, pending
    is_mock: bool = False


class WorldState(BaseModel):
    """The fused world state — a grid of cells with all agent data merged."""

    cells: list[WorldStateCell] = Field(default_factory=list)
    agent_timestamps: list[AgentTimestamp] = Field(default_factory=list)
    grid_resolution_deg: float = 0.1
    bbox: Optional[str] = None
    last_full_refresh: Optional[datetime] = None


class WorldStateQuery(BaseModel):
    """Query parameters for reading the world state."""

    min_lat: float = 5.0
    max_lat: float = 25.0
    min_lon: float = 65.0
    max_lon: float = 100.0
    include_layers: list[str] = Field(
        default_factory=lambda: ["sst", "chlorophyll", "weather", "hazards", "geofence"]
    )
    resolution: float = 0.5  # Response grid resolution (can be coarser than internal)
