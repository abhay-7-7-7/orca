"""
Tide Agent — tide height and predictions.

Uses Open-Meteo for basic tide data. In production, NOAA CO-OPS
or Indian INCOIS tide tables would provide more accurate local data.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta

from backend.agents import AgentBase
from backend.core.logging import get_logger
from backend.models.common import BoundingBox
from backend.models.tide import TideData, TidePrediction

logger = get_logger(__name__)


class TideAgent(AgentBase[TideData]):
    """Tide height and prediction agent."""

    agent_name = "tide"
    update_cadence_seconds = 21600  # 6 hours

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> TideData:
        """Fetch tide data — currently falls back to tidal model."""
        # Open-Meteo doesn't have a dedicated tide API, so we use a
        # simple harmonic tidal model for the hackathon.
        lat = kwargs.get("lat", 9.9312)
        lon = kwargs.get("lon", 76.2673)
        return self._compute_tidal_model(float(lat), float(lon))

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> TideData:
        """Generate mock tide predictions using a simple harmonic model."""
        lat = kwargs.get("lat", 9.9312)  # Kochi
        lon = kwargs.get("lon", 76.2673)
        return self._compute_tidal_model(float(lat), float(lon))

    def _compute_tidal_model(self, lat: float, lon: float) -> TideData:
        """
        Simple harmonic tidal model.

        Uses M2 (principal lunar semidiurnal) and S2 (principal solar
        semidiurnal) constituents for a basic approximation.
        Real tide prediction uses 30+ harmonic constituents.
        """
        now = datetime.utcnow()
        predictions = []

        # M2 period: ~12.42 hours, S2 period: 12.00 hours
        m2_period_h = 12.42
        s2_period_h = 12.00

        # Amplitudes (rough averages for Indian coast)
        m2_amp = 0.5  # meters
        s2_amp = 0.2  # meters

        next_high = None
        next_low = None
        prev_height = None

        for hour_offset in range(49):  # 48 hours of predictions
            t = now + timedelta(hours=hour_offset)
            hours_since_epoch = (t - datetime(2000, 1, 1)).total_seconds() / 3600.0

            height = (
                m2_amp * math.cos(2 * math.pi * hours_since_epoch / m2_period_h)
                + s2_amp * math.cos(2 * math.pi * hours_since_epoch / s2_period_h)
            )
            height = round(height, 3)

            tide_type = ""
            if prev_height is not None:
                if len(predictions) >= 2:
                    prev_prev = predictions[-2].height_m
                    if prev_height > height and prev_height > prev_prev:
                        predictions[-1] = TidePrediction(
                            time=predictions[-1].time,
                            height_m=predictions[-1].height_m,
                            type="high",
                        )
                        if next_high is None:
                            next_high = predictions[-1]
                    elif prev_height < height and prev_height < prev_prev:
                        predictions[-1] = TidePrediction(
                            time=predictions[-1].time,
                            height_m=predictions[-1].height_m,
                            type="low",
                        )
                        if next_low is None:
                            next_low = predictions[-1]

            predictions.append(
                TidePrediction(
                    time=t.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    height_m=height,
                    type=tide_type,
                )
            )
            prev_height = height

        current_height = predictions[0].height_m if predictions else 0.0

        return TideData(
            station_name=f"Tidal model ({lat:.2f}°N, {lon:.2f}°E)",
            lat=lat,
            lon=lon,
            current_height_m=current_height,
            next_high_tide=next_high,
            next_low_tide=next_low,
            predictions=predictions[:24],  # Return 24 hours
            source="Harmonic tidal model (M2+S2) — demo approximation",
        )


# ── Singleton ───────────────────────────────────────────────────────────

_instance: TideAgent | None = None


def get_tide_agent() -> TideAgent:
    global _instance
    if _instance is None:
        _instance = TideAgent()
    return _instance
