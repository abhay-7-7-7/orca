"""
Vessel/AIS Agent — real-time vessel tracking and fishing effort.

Sources:
- AISstream.io (WebSocket, requires free API key)
- Global Fishing Watch API (REST, requires free non-commercial token)

Both require credentials — defaults to mock mode if not provided.
"""

from __future__ import annotations

import uuid
from datetime import datetime

import numpy as np

from backend.agents import AgentBase
from backend.core.config import get_settings
from backend.core.http_client import get_http_client
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint
from backend.models.vessel import FishingEffort, VesselAISData, VesselPosition

logger = get_logger(__name__)


class VesselAISAgent(AgentBase[VesselAISData]):
    """
    Vessel tracking via AIS + fishing effort from GFW.

    Default: mock mode (requires API keys for live data).
    """

    agent_name = "vessel_ais"
    update_cadence_seconds = 300  # 5 minutes

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> VesselAISData:
        """Fetch live vessel data from AISstream.io + GFW."""
        settings = get_settings()

        if not settings.aisstream_api_key:
            raise RuntimeError("AISstream API key not configured")

        # AISstream uses WebSocket — for the REST/polling approach,
        # we'd need to keep a WS connection in the background.
        # For the hackathon, we'll use a simplified REST-like approach
        # where the fusion scheduler maintains the WS connection.

        # For now, raise to trigger mock fallback
        raise NotImplementedError(
            "AISstream WebSocket integration requires background task setup. "
            "Use mock mode for initial development."
        )

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> VesselAISData:
        """Generate mock vessel positions and fishing effort."""
        if bbox is None:
            bbox = BoundingBox(min_lat=8.0, max_lat=15.0, min_lon=72.0, max_lon=80.0)

        np.random.seed(int(datetime.utcnow().timestamp()) % 1000)

        # Generate 15-30 mock vessels
        num_vessels = np.random.randint(15, 31)
        vessels = []
        fishing_count = 0

        vessel_types = ["fishing", "fishing", "fishing", "cargo", "tanker", "passenger"]
        names = [
            "Matsya Varuni", "Sea Harvest", "Blue Horizon", "Kerala Pride",
            "Ocean Star", "Bay Runner", "Coastal Queen", "Deep Fisher",
            "Malabar Express", "Cochin Trader", "Lakshadweep Star",
            "Arabian Pearl", "Goa Mariner", "Konkan Voyager", "Trivandrum Wave",
        ]

        for i in range(num_vessels):
            vtype = str(np.random.choice(vessel_types))
            if vtype == "fishing":
                fishing_count += 1

            vessels.append(
                VesselPosition(
                    mmsi=f"41900{np.random.randint(1000, 9999)}",
                    name=names[i % len(names)] if i < len(names) else f"Vessel-{i}",
                    lat=round(float(np.random.uniform(bbox.min_lat, bbox.max_lat)), 4),
                    lon=round(float(np.random.uniform(bbox.min_lon, bbox.max_lon)), 4),
                    course_deg=round(float(np.random.uniform(0, 360)), 1),
                    speed_knots=round(float(np.random.uniform(0, 12)), 1),
                    vessel_type=vtype,
                    timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    flag_country="IND",
                )
            )

        # Mock fishing effort hotspots
        fishing_effort = []
        for _ in range(5):
            fishing_effort.append(
                FishingEffort(
                    lat=round(float(np.random.uniform(bbox.min_lat, bbox.max_lat)), 2),
                    lon=round(float(np.random.uniform(bbox.min_lon, bbox.max_lon)), 2),
                    fishing_hours=round(float(np.random.uniform(10, 200)), 1),
                    vessel_count=int(np.random.randint(2, 15)),
                    period="last_7_days",
                    source="MOCK — Global Fishing Watch",
                )
            )

        return VesselAISData(
            vessels=vessels,
            fishing_effort=fishing_effort,
            total_vessels_in_view=num_vessels,
            total_fishing_vessels=fishing_count,
            source_ais="MOCK — AISstream.io",
            source_fishing="MOCK — Global Fishing Watch",
        )


# ── Singleton ───────────────────────────────────────────────────────────

_instance: VesselAISAgent | None = None


def get_vessel_ais_agent() -> VesselAISAgent:
    global _instance
    if _instance is None:
        _instance = VesselAISAgent()
    return _instance
