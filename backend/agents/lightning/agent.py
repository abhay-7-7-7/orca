"""
Lightning Agent — Blitzortung community network integration.

Uses approved community wrapper (not direct scraping, per Blitzortung ToS).
Data is "not for protection of life or property" — used as a precaution
nudge only.

IMPORTANT: Currently defaults to mock mode since Blitzortung access
method needs to be confirmed with the user.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta

import numpy as np

from backend.agents import AgentBase
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint
from backend.models.lightning import LightningCluster, LightningData

logger = get_logger(__name__)


class LightningAgent(AgentBase[LightningData]):
    """
    Lightning detection agent via Blitzortung community network.

    Update cadence: 5 minutes (near-real-time).
    Default: mock mode until Blitzortung wrapper is configured.
    """

    agent_name = "lightning"
    update_cadence_seconds = 300  # 5 minutes

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> LightningData:
        """
        Fetch live lightning data.

        TODO: Integrate with approved Blitzortung MQTT bridge
        (e.g., blitzortung-api or Home Assistant's blitzortung wrapper).
        """
        raise NotImplementedError(
            "Live Blitzortung integration not yet configured. "
            "Set MOCK_LIGHTNING=true or provide wrapper library configuration."
        )

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> LightningData:
        """
        Generate synthetic lightning cluster data.

        Models typical pre-monsoon/monsoon lightning patterns
        over the Indian Ocean.
        """
        if bbox is None:
            bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

        np.random.seed(int(datetime.utcnow().timestamp()) % 1000)
        now = datetime.utcnow()

        # Generate 2-5 clusters in the region
        num_clusters = np.random.randint(2, 6)
        clusters = []

        for i in range(num_clusters):
            center_lat = np.random.uniform(bbox.min_lat + 2, bbox.max_lat - 2)
            center_lon = np.random.uniform(bbox.min_lon + 2, bbox.max_lon - 2)
            age_minutes = float(np.random.exponential(30))
            strike_count = int(np.random.randint(5, 50))
            radius_km = float(np.random.uniform(10, 50))
            intensity = float(np.random.uniform(10, 80))

            if age_minutes < 15:
                risk = "high"
            elif age_minutes < 45:
                risk = "moderate"
            else:
                risk = "low"

            clusters.append(
                LightningCluster(
                    cluster_id=f"LC-{uuid.uuid4().hex[:6].upper()}",
                    center=GeoPoint(
                        lat=round(center_lat, 4),
                        lon=round(center_lon, 4),
                    ),
                    radius_km=round(radius_km, 1),
                    strike_count=strike_count,
                    last_strike_time=(now - timedelta(minutes=age_minutes)).strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    ),
                    intensity_mean_ka=round(intensity, 1),
                    age_minutes=round(age_minutes, 1),
                    risk_level=risk,
                )
            )

        total_strikes = sum(c.strike_count for c in clusters)

        return LightningData(
            clusters=clusters,
            total_strikes_1h=total_strikes,
            source="MOCK — synthetic lightning clusters (Blitzortung not yet configured)",
        )

    def get_lightning_cost(
        self, lat: float, lon: float, data: LightningData | None = None
    ) -> float:
        """
        Calculate routing cost penalty due to lightning proximity.

        Time-decaying: recent clusters are penalized more.
        """
        if data is None or not data.clusters:
            return 0.0

        max_cost = 0.0
        point = GeoPoint(lat=lat, lon=lon)

        for cluster in data.clusters:
            dist_km = self._haversine_km(point, cluster.center)

            if dist_km < cluster.radius_km:
                # Inside the cluster
                time_decay = max(0.1, 1.0 - cluster.age_minutes / 60.0)
                cost = 30.0 * time_decay
                max_cost = max(max_cost, cost)
            elif dist_km < cluster.radius_km * 3:
                # Near the cluster
                proximity = 1.0 - (dist_km - cluster.radius_km) / (cluster.radius_km * 2)
                time_decay = max(0.1, 1.0 - cluster.age_minutes / 60.0)
                cost = 15.0 * proximity * time_decay
                max_cost = max(max_cost, cost)

        return max_cost

    @staticmethod
    def _haversine_km(p1: GeoPoint, p2: GeoPoint) -> float:
        R = 6371.0
        lat1, lat2 = math.radians(p1.lat), math.radians(p2.lat)
        dlat = math.radians(p2.lat - p1.lat)
        dlon = math.radians(p2.lon - p1.lon)
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Singleton ───────────────────────────────────────────────────────────

_instance: LightningAgent | None = None


def get_lightning_agent() -> LightningAgent:
    global _instance
    if _instance is None:
        _instance = LightningAgent()
    return _instance
