"""
Tide data models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class TidePrediction(BaseModel):
    """A single tide prediction point."""

    time: str
    height_m: float
    type: str = ""  # "high", "low", or empty for intermediate


class TideData(BaseModel):
    """Tide information for a location."""

    station_name: str = ""
    lat: float = 0.0
    lon: float = 0.0
    current_height_m: Optional[float] = None
    next_high_tide: Optional[TidePrediction] = None
    next_low_tide: Optional[TidePrediction] = None
    predictions: list[TidePrediction] = Field(default_factory=list)
    source: str = "Open-Meteo / NOAA tide prediction"
