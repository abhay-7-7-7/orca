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
        """
        Fetch real marine weather data.
        Prioritizes Copernicus Marine Service for waves, currents, and sea level;
        falls back to Open-Meteo Marine + Weather API.
        """
        settings = get_settings()

        if bbox is None:
            # Default: Indian coastal waters per CLAUDE.md §4
            bbox = BoundingBox(min_lat=6.0, max_lat=23.0, min_lon=68.0, max_lon=92.0)

        lat = kwargs.get("lat")
        lon = kwargs.get("lon")

        # 1. Try Copernicus Marine (Primary waves + currents + sea level)
        if settings.has_copernicus_credentials:
            try:
                import asyncio
                data = await asyncio.wait_for(
                    self._fetch_copernicus_weather(settings, bbox, lat, lon),
                    timeout=20.0,
                )
                if data and data.conditions:
                    logger.info(
                        "Fetched %d conditions from Copernicus Marine Service (waves + currents)",
                        len(data.conditions),
                    )
                    return data
            except Exception as exc:
                logger.warning(
                    "Copernicus Marine weather fetch failed or timed out: %s — falling back to Open-Meteo",
                    exc,
                )

        # 2. Fallback to Open-Meteo
        return await self._fetch_open_meteo(settings, bbox, lat, lon)

    async def _fetch_copernicus_weather(
        self,
        settings,
        bbox: BoundingBox,
        lat: float | None = None,
        lon: float | None = None,
    ) -> MarineWeatherData:
        """Fetch waves, surface currents, and sea level from Copernicus Marine."""
        import asyncio
        from datetime import datetime, timedelta
        import copernicusmarine

        if lat is not None and lon is not None:
            q_min_lat = max(bbox.min_lat, float(lat) - 0.25)
            q_max_lat = min(bbox.max_lat, float(lat) + 0.25)
            q_min_lon = max(bbox.min_lon, float(lon) - 0.25)
            q_max_lon = min(bbox.max_lon, float(lon) + 0.25)
        else:
            q_min_lat, q_max_lat = bbox.min_lat, bbox.max_lat
            q_min_lon, q_max_lon = bbox.min_lon, bbox.max_lon

        now = datetime.utcnow()
        start_time = (now - timedelta(days=1)).strftime("%Y-%m-%dT00:00:00")
        end_time = now.strftime("%Y-%m-%dT%H:%M:%S")

        loop = asyncio.get_running_loop()

        def _query_copernicus():
            # A. Waves
            ds_wav = copernicusmarine.open_dataset(
                dataset_id="cmems_mod_glo_wav_anfc_0.083deg_PT3H-i",
                username=settings.effective_copernicus_username,
                password=settings.effective_copernicus_password,
                minimum_longitude=float(q_min_lon),
                maximum_longitude=float(q_max_lon),
                minimum_latitude=float(q_min_lat),
                maximum_latitude=float(q_max_lat),
                start_datetime=start_time,
                end_datetime=end_time,
            )

            # B. Surface currents
            ds_cur = copernicusmarine.open_dataset(
                dataset_id="cmems_mod_glo_phy_anfc_merged-uv_PT1H-i",
                username=settings.effective_copernicus_username,
                password=settings.effective_copernicus_password,
                minimum_longitude=float(q_min_lon),
                maximum_longitude=float(q_max_lon),
                minimum_latitude=float(q_min_lat),
                maximum_latitude=float(q_max_lat),
                start_datetime=start_time,
                end_datetime=end_time,
            )

            # C. Sea level anomaly
            try:
                ds_sl = copernicusmarine.open_dataset(
                    dataset_id="cmems_mod_glo_phy_anfc_merged-sl_PT1H-i",
                    username=settings.effective_copernicus_username,
                    password=settings.effective_copernicus_password,
                    minimum_longitude=float(q_min_lon),
                    maximum_longitude=float(q_max_lon),
                    minimum_latitude=float(q_min_lat),
                    maximum_latitude=float(q_max_lat),
                    start_datetime=start_time,
                    end_datetime=end_time,
                )
            except Exception:
                ds_sl = None

            return ds_wav, ds_cur, ds_sl

        ds_wav, ds_cur, ds_sl = await loop.run_in_executor(None, _query_copernicus)

        def _extract_conditions():
            wav_slice = ds_wav["VHM0"].isel(time=-1)
            vhm0 = wav_slice.values
            vtm02 = ds_wav["VTM02"].isel(time=-1).values if "VTM02" in ds_wav else None
            swell = ds_wav["VHM0_SW1"].isel(time=-1).values if "VHM0_SW1" in ds_wav else None
            lats = wav_slice.coords["latitude"].values
            lons = wav_slice.coords["longitude"].values

            # Currents
            uo_vals = ds_cur["uo"].isel(depth=0).isel(time=-1).values if "uo" in ds_cur else None
            vo_vals = ds_cur["vo"].isel(depth=0).isel(time=-1).values if "vo" in ds_cur else None

            # Sea level
            sl_vals = None
            if ds_sl is not None:
                sl_var = "sea_surface_height" if "sea_surface_height" in ds_sl else "total_sea_level"
                if sl_var in ds_sl:
                    sl_vals = ds_sl[sl_var].isel(depth=0).isel(time=-1).values

            conditions = []
            step = 1 if len(lats) <= 20 else max(1, len(lats) // 15)

            for i in range(0, len(lats), step):
                lat_val = float(lats[i])
                for j in range(0, len(lons), step):
                    lon_val = float(lons[j])
                    wh = float(vhm0[i, j]) if not np.isnan(vhm0[i, j]) else 0.0
                    wp = float(vtm02[i, j]) if (vtm02 is not None and not np.isnan(vtm02[i, j])) else 6.0
                    sw = float(swell[i, j]) if (swell is not None and not np.isnan(swell[i, j])) else round(wh * 0.6, 2)

                    # Currents calculation
                    c_speed = 0.0
                    c_dir = 0.0
                    if uo_vals is not None and vo_vals is not None:
                        u = float(uo_vals[i, j]) if (i < uo_vals.shape[0] and j < uo_vals.shape[1] and not np.isnan(uo_vals[i, j])) else 0.0
                        v = float(vo_vals[i, j]) if (i < vo_vals.shape[0] and j < vo_vals.shape[1] and not np.isnan(vo_vals[i, j])) else 0.0
                        c_speed = float(np.sqrt(u**2 + v**2) * 1.94384)
                        c_dir = float((np.degrees(np.arctan2(u, v)) + 360) % 360)

                    # Sea level anomaly
                    sl = None
                    if sl_vals is not None and i < sl_vals.shape[0] and j < sl_vals.shape[1]:
                        raw_sl = float(sl_vals[i, j])
                        if not np.isnan(raw_sl):
                            sl = round(raw_sl, 3)

                    # Approximate wind from wave conditions (WMO empirical relation)
                    wind_speed = round(float(wh * 12.0), 1)

                    conditions.append(
                        MarineConditions(
                            lat=round(lat_val, 3),
                            lon=round(lon_val, 3),
                            wave_height_m=round(wh, 2),
                            wind_speed_kmh=wind_speed,
                            wind_direction_deg=0.0,
                            swell_height_m=round(sw, 2),
                            wave_period_s=round(wp, 1),
                            sea_state=_classify_sea_state(wh),
                            current_speed_knots=round(c_speed, 2),
                            current_direction_deg=round(c_dir, 1),
                            sea_level_anomaly_m=sl,
                            temperature_celsius=28.0,
                        )
                    )

            max_wave = max((c.wave_height_m for c in conditions), default=0.0)
            max_wind = max((c.wind_speed_kmh for c in conditions), default=0.0)

            return MarineWeatherData(
                conditions=conditions,
                max_wave_height_m=max_wave,
                max_wind_speed_kmh=max_wind,
                overall_sea_state=_classify_sea_state(max_wave),
                source="Copernicus Marine Service (cmems_mod_glo_wav + cmems_mod_glo_phy)",
                forecast_hours=24,
            )

        return await loop.run_in_executor(None, _extract_conditions)

    async def _fetch_open_meteo(
        self,
        settings,
        bbox: BoundingBox,
        lat: float | None = None,
        lon: float | None = None,
    ) -> MarineWeatherData:
        """Fallback: Fetch weather data from Open-Meteo."""
        if lat is not None and lon is not None:
            points = [GeoPoint(lat=float(lat), lon=float(lon))]
        else:
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
            logger.warning("No Open-Meteo weather fetched — using mock")
            return await self._fetch_mock(bbox)

        max_wave = max(c.wave_height_m for c in conditions)
        max_wind = max(c.wind_speed_kmh for c in conditions)

        return MarineWeatherData(
            conditions=conditions,
            max_wave_height_m=max_wave,
            max_wind_speed_kmh=max_wind,
            overall_sea_state=_classify_sea_state(max_wave),
            source="Open-Meteo Marine + Weather API",
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
