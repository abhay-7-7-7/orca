"""
Marine weather and wave condition models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class MarineConditions(BaseModel):
    """Weather and wave conditions at a point."""

    lat: float
    lon: float
    wave_height_m: float = Field(0.0, description="Significant wave height in meters")
    wind_speed_kmh: float = Field(0.0, description="Wind speed in km/h")
    wind_direction_deg: float = Field(0.0, description="Wind direction in degrees (from)")
    swell_height_m: float = 0.0
    wave_period_s: float = 0.0
    precipitation_mm: float = 0.0
    temperature_celsius: float = 0.0
    visibility_km: float = 10.0
    sea_state: str = "calm"  # calm, slight, moderate, rough, very_rough, high, phenomenal


class BuoyReading(BaseModel):
    """In-situ buoy observation (NOAA NDBC)."""

    station_id: str
    lat: float
    lon: float
    wave_height_m: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    water_temp_celsius: Optional[float] = None
    timestamp: Optional[str] = None


class MarineWeatherData(BaseModel):
    """Marine weather data for a region or point."""

    conditions: list[MarineConditions] = Field(default_factory=list)
    buoy_readings: list[BuoyReading] = Field(default_factory=list)
    max_wave_height_m: float = 0.0
    max_wind_speed_kmh: float = 0.0
    overall_sea_state: str = "calm"
    source: str = "Open-Meteo Marine + Weather API"
    forecast_hours: int = 24
