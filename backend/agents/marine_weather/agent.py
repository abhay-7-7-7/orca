"""
Marine Weather Agent — waves, wind, and general conditions.

Primary source: Open-Meteo Marine + standard Weather APIs (JSON, no auth).
Cross-check: NOAA NDBC buoy data (sparse in Indian Ocean).
Optional: Copernicus Marine (if account provided).
"""

from __future__ import annotations

from datetime import datetime

import numpy as np

from backend.agents import AgentBase
from backend.core.config import get_settings
from backend.core.http_client import fetch_json
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint
from backend.models.marine_weather import (
    BuoyReading,
    MarineConditions,
    MarineWeatherData,
)

logger = get_logger(__name__)

# Sea state classification (WMO scale)
_SEA_STATE_THRESHOLDS = [
    (0.1, "calm"),
    (0.5, "slight"),
    (1.25, "moderate"),
    (2.5, "rough"),
    (4.0, "very_rough"),
    (6.0, "high"),
    (float("inf"), "phenomenal"),
]


def _classify_sea_state(wave_height_m: float) -> str:
    for threshold, state in _SEA_STATE_THRESHOLDS:
        if wave_height_m <= threshold:
            return state
    return "phenomenal"


class MarineWeatherAgent(AgentBase[MarineWeatherData]):
    """
    Fetches marine weather data from Open-Meteo (primary) and NDBC (cross-check).

    Update cadence: hourly (matches Open-Meteo's update cycle).
    """

    agent_name = "marine_weather"
    update_cadence_seconds = 3600  # 1 hour

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> MarineWeatherData:
        """Fetch real weather data from Open-Meteo."""
        settings = get_settings()

        if bbox is None:
            bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

        # Sample grid points within the bbox
        lat = kwargs.get("lat")
        lon = kwargs.get("lon")

        if lat is not None and lon is not None:
            # Point query
            points = [GeoPoint(lat=float(lat), lon=float(lon))]
        else:
            # Grid query: sample at ~2° intervals for manageable response size
            points = self._sample_grid_points(bbox, step=2.0)

        conditions = []
        for point in points:
            try:
                cond = await self._fetch_point_weather(settings, point)
                conditions.append(cond)
            except Exception as exc:
                logger.warning(
                    "Weather fetch failed for (%.2f, %.2f): %s",
                    point.lat, point.lon, exc,
                )

        if not conditions:
            raise RuntimeError("No weather data could be fetched")

        max_wave = max(c.wave_height_m for c in conditions)
        max_wind = max(c.wind_speed_kmh for c in conditions)

        return MarineWeatherData(
            conditions=conditions,
            max_wave_height_m=max_wave,
            max_wind_speed_kmh=max_wind,
            overall_sea_state=_classify_sea_state(max_wave),
        )

    async def _fetch_point_weather(
        self, settings, point: GeoPoint
    ) -> MarineConditions:
        """Fetch weather for a single point from Open-Meteo."""
        # Marine API (waves)
        marine_url = settings.open_meteo_marine_url
        marine_params = {
            "latitude": point.lat,
            "longitude": point.lon,
            "hourly": "wave_height,wind_wave_height,swell_wave_height,wave_period",
            "forecast_days": 1,
        }
        marine_data = await fetch_json(marine_url, params=marine_params)

        # Standard weather API (wind, precip)
        weather_url = settings.open_meteo_weather_url
        weather_params = {
            "latitude": point.lat,
            "longitude": point.lon,
            "hourly": "windspeed_10m,winddirection_10m,precipitation,temperature_2m",
            "forecast_days": 1,
        }
        weather_data = await fetch_json(weather_url, params=weather_params)

        # Parse the latest hour's data
        wave_height = self._get_latest_value(marine_data, "hourly", "wave_height")
        swell_height = self._get_latest_value(marine_data, "hourly", "swell_wave_height")
        wave_period = self._get_latest_value(marine_data, "hourly", "wave_period")
        wind_speed = self._get_latest_value(weather_data, "hourly", "windspeed_10m")
        wind_dir = self._get_latest_value(weather_data, "hourly", "winddirection_10m")
        precip = self._get_latest_value(weather_data, "hourly", "precipitation")
        temp = self._get_latest_value(weather_data, "hourly", "temperature_2m")

        return MarineConditions(
            lat=point.lat,
            lon=point.lon,
            wave_height_m=wave_height or 0.0,
            wind_speed_kmh=wind_speed or 0.0,
            wind_direction_deg=wind_dir or 0.0,
            swell_height_m=swell_height or 0.0,
            wave_period_s=wave_period or 0.0,
            precipitation_mm=precip or 0.0,
            temperature_celsius=temp or 0.0,
            sea_state=_classify_sea_state(wave_height or 0.0),
        )

    @staticmethod
    def _get_latest_value(data: dict, section: str, key: str) -> float | None:
        """Extract the latest (most recent past hour) value from Open-Meteo response."""
        try:
            values = data.get(section, {}).get(key, [])
            # Filter out None values from the end, get latest non-null
            for v in reversed(values):
                if v is not None:
                    return float(v)
        except (KeyError, IndexError, TypeError):
            pass
        return None

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> MarineWeatherData:
        """
        Return realistic mock marine weather for the Indian Ocean.

        Models typical monsoon/fair-weather patterns.
        """
        if bbox is None:
            bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

        np.random.seed(43)
        conditions = []

        lat = kwargs.get("lat")
        lon = kwargs.get("lon")

        if lat is not None and lon is not None:
            points = [GeoPoint(lat=float(lat), lon=float(lon))]
        else:
            points = self._sample_grid_points(bbox, step=2.0)

        for point in points:
            # Base wave height: higher in open ocean, lower near coast
            coast_factor = min(abs(point.lon - 73.0), abs(point.lon - 80.0)) / 10.0
            base_wave = 0.5 + coast_factor * 1.5
            wave_height = round(float(base_wave + np.random.normal(0, 0.3)), 2)
            wave_height = max(0.1, wave_height)

            # Wind: 10-25 km/h typical
            wind_speed = round(float(15.0 + np.random.normal(0, 5)), 1)
            wind_speed = max(2.0, wind_speed)

            conditions.append(
                MarineConditions(
                    lat=point.lat,
                    lon=point.lon,
                    wave_height_m=wave_height,
                    wind_speed_kmh=wind_speed,
                    wind_direction_deg=round(float(np.random.uniform(180, 270)), 0),
                    swell_height_m=round(float(wave_height * 0.6), 2),
                    wave_period_s=round(float(6 + np.random.normal(0, 1)), 1),
                    precipitation_mm=round(float(max(0, np.random.exponential(0.5))), 1),
                    temperature_celsius=round(float(28 + np.random.normal(0, 2)), 1),
                    sea_state=_classify_sea_state(wave_height),
                )
            )

        max_wave = max(c.wave_height_m for c in conditions) if conditions else 0.0
        max_wind = max(c.wind_speed_kmh for c in conditions) if conditions else 0.0

        return MarineWeatherData(
            conditions=conditions,
            max_wave_height_m=max_wave,
            max_wind_speed_kmh=max_wind,
            overall_sea_state=_classify_sea_state(max_wave),
            source="MOCK — synthetic Indian Ocean weather",
        )

    @staticmethod
    def _sample_grid_points(bbox: BoundingBox, step: float = 2.0) -> list[GeoPoint]:
        """Generate sample grid points within a bounding box."""
        points = []
        lat = bbox.min_lat
        while lat <= bbox.max_lat:
            lon = bbox.min_lon
            while lon <= bbox.max_lon:
                points.append(GeoPoint(lat=round(lat, 2), lon=round(lon, 2)))
                lon += step
            lat += step
        return points


# ── Singleton ───────────────────────────────────────────────────────────

_instance: MarineWeatherAgent | None = None


def get_marine_weather_agent() -> MarineWeatherAgent:
    global _instance
    if _instance is None:
        _instance = MarineWeatherAgent()
    return _instance
