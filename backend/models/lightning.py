"""
Lightning strike and cluster models.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class LightningStrike(BaseModel):
    """A single detected lightning strike."""

    lat: float
    lon: float
    timestamp: str
    intensity_ka: float = 0.0  # kiloamperes


class LightningCluster(BaseModel):
    """A cluster of recent lightning activity."""

    cluster_id: str
    center: GeoPoint
    radius_km: float
    strike_count: int
    last_strike_time: str
    intensity_mean_ka: float = 0.0
    age_minutes: float = 0.0  # Time since last strike
    risk_level: str = "low"  # "low", "moderate", "high"


class LightningData(BaseModel):
    """Lightning activity data for a region."""

    clusters: list[LightningCluster] = Field(default_factory=list)
    total_strikes_1h: int = 0
    nearest_cluster_km: float | None = None
    source: str = "Blitzortung (community lightning network)"
    disclaimer: str = (
        "Blitzortung data is 'not for protection of life or property.' "
        "Used as a precaution nudge only, not as a safety authority."
    )
