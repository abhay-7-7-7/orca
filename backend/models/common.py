"""
Common Pydantic models shared across all agents and modules.

These are the building blocks — every agent response wraps its
domain-specific data in ``AgentResponse[T]``.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field


# ── Enums ───────────────────────────────────────────────────────────────


class AgentStatus(str, Enum):
    """Status of an individual agent."""

    OK = "ok"  # Live data fetched successfully
    MOCK = "mock"  # Running on synthetic/mock data
    UNAVAILABLE = "unavailable"  # Agent cannot provide data (missing key, service down)
    ERROR = "error"  # Agent encountered an error during fetch


# ── Geo primitives ──────────────────────────────────────────────────────


class GeoPoint(BaseModel):
    """A geographic point (WGS84)."""

    lat: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    lon: float = Field(..., ge=-180, le=180, description="Longitude in degrees")


class BoundingBox(BaseModel):
    """Axis-aligned geographic bounding box."""

    min_lat: float = Field(..., ge=-90, le=90)
    max_lat: float = Field(..., ge=-90, le=90)
    min_lon: float = Field(..., ge=-180, le=180)
    max_lon: float = Field(..., ge=-180, le=180)

    def contains(self, point: GeoPoint) -> bool:
        return (
            self.min_lat <= point.lat <= self.max_lat
            and self.min_lon <= point.lon <= self.max_lon
        )


class GridCell(BaseModel):
    """A single cell in a lat/lon raster grid."""

    lat: float
    lon: float
    resolution: float = Field(default=0.1, description="Cell size in degrees")


# ── Generic agent response wrapper ─────────────────────────────────────

T = TypeVar("T")


class AgentResponse(BaseModel, Generic[T]):
    """
    Standard wrapper for every agent's output.

    ``status`` is ALWAYS set — a missing/failing agent never silently
    returns empty data that could be mistaken for "no hazards found."
    """

    status: AgentStatus
    agent_name: str
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    error_detail: Optional[str] = None
    is_mock: bool = False

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


# ── Health endpoint models ──────────────────────────────────────────────


class AgentHealthInfo(BaseModel):
    """Health info for a single agent."""

    name: str
    status: AgentStatus
    last_fetch: Optional[datetime] = None
    error: Optional[str] = None
    is_mock: bool = False


class HealthReport(BaseModel):
    """Overall system health — reports per-agent status."""

    status: str = "ok"  # "ok", "degraded", "down"
    agents: list[AgentHealthInfo] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
