"""
Cyclone/Disaster Alert Agent — GDACS feed parser.

Primary: GDACS RSS/GeoJSON (free, no auth, near-real-time).
Backup: IMD bulletin parsing (fragile HTML — GDACS is the reliable path).
"""

from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from datetime import datetime

from backend.agents import AgentBase
from backend.core.config import get_settings
from backend.core.http_client import get_http_client
from backend.core.logging import get_logger
from backend.models.common import BoundingBox, GeoPoint
from backend.models.cyclone import CycloneAlert, CycloneDisasterData, DisasterAlert

logger = get_logger(__name__)


class CycloneDisasterAgent(AgentBase[CycloneDisasterData]):
    """
    Fetches disaster alerts from GDACS, filtered to the Indian Ocean.

    Update cadence: 15 minutes.
    """

    agent_name = "cyclone_disaster"
    update_cadence_seconds = 900  # 15 minutes

    # Indian Ocean filter bbox
    _INDIAN_OCEAN_BBOX = BoundingBox(
        min_lat=-10.0, max_lat=30.0, min_lon=40.0, max_lon=105.0
    )

    async def _fetch_live(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> CycloneDisasterData:
        """Fetch disaster alerts from GDACS RSS feed."""
        settings = get_settings()
        client = get_http_client()
        filter_bbox = bbox or self._INDIAN_OCEAN_BBOX

        try:
            resp = await client.get(settings.gdacs_feed_url)
            resp.raise_for_status()
            xml_content = resp.text
        except Exception as exc:
            logger.error("GDACS feed fetch failed: %s", exc)
            raise

        return self._parse_gdacs_rss(xml_content, filter_bbox)

    def _parse_gdacs_rss(
        self, xml_content: str, bbox: BoundingBox
    ) -> CycloneDisasterData:
        """Parse GDACS RSS XML and filter to bounding box."""
        cyclones: list[CycloneAlert] = []
        other_alerts: list[DisasterAlert] = []

        try:
            root = ET.fromstring(xml_content)
            ns = {"gdacs": "http://www.gdacs.org", "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#"}

            for item in root.iter("item"):
                title = item.findtext("title", "")
                description = item.findtext("description", "")
                link = item.findtext("link", "")
                pub_date = item.findtext("pubDate", "")

                # Try to get coordinates
                lat_elem = item.find(".//geo:lat", ns)
                lon_elem = item.find(".//geo:long", ns)

                if lat_elem is None or lon_elem is None:
                    continue

                try:
                    lat = float(lat_elem.text or "0")
                    lon = float(lon_elem.text or "0")
                except (ValueError, TypeError):
                    continue

                # Filter by bbox
                point = GeoPoint(lat=lat, lon=lon)
                if not bbox.contains(point):
                    continue

                # Determine event type
                event_type_elem = item.find(".//gdacs:eventtype", ns)
                event_type = event_type_elem.text if event_type_elem is not None else ""

                severity_elem = item.find(".//gdacs:alertlevel", ns)
                severity = severity_elem.text if severity_elem is not None else "green"

                event_id_elem = item.find(".//gdacs:eventid", ns)
                event_id = event_id_elem.text if event_id_elem is not None else title[:20]

                if event_type == "TC":
                    # Tropical Cyclone
                    cyclones.append(
                        CycloneAlert(
                            event_id=str(event_id),
                            name=title,
                            center=point,
                            severity=severity.lower() if severity else "warning",
                            description=description,
                            source="GDACS",
                            url=link,
                            radius_km=200.0,  # Default estimate
                        )
                    )
                else:
                    other_alerts.append(
                        DisasterAlert(
                            event_id=str(event_id),
                            event_type=event_type or "UNKNOWN",
                            severity=severity.lower() if severity else "green",
                            title=title,
                            description=description,
                            center=point,
                            source="GDACS",
                            url=link,
                            published=pub_date,
                        )
                    )

        except ET.ParseError as exc:
            logger.error("Failed to parse GDACS RSS XML: %s", exc)

        return CycloneDisasterData(
            cyclones=cyclones,
            other_alerts=other_alerts,
            total_active_alerts=len(cyclones) + len(other_alerts),
        )

    async def _fetch_mock(
        self, bbox: BoundingBox | None = None, **kwargs
    ) -> CycloneDisasterData:
        """
        Return mock disaster data.

        In the common case (no active cyclone), returns empty.
        For demo purposes, can include a synthetic cyclone in the Bay of Bengal.
        """
        # For hackathon demo: include a moderate cyclone to show the system reacts
        include_demo_cyclone = kwargs.get("include_demo_cyclone", False)

        cyclones = []
        if include_demo_cyclone:
            cyclones.append(
                CycloneAlert(
                    event_id="MOCK-TC-001",
                    name="MOCK — Cyclone Demo (Bay of Bengal)",
                    category="Severe Cyclonic Storm",
                    center=GeoPoint(lat=15.0, lon=88.0),
                    radius_km=300.0,
                    max_wind_speed_kmh=120.0,
                    movement_speed_kmh=15.0,
                    movement_direction_deg=315.0,
                    forecast_track=[
                        GeoPoint(lat=15.5, lon=87.5),
                        GeoPoint(lat=16.0, lon=87.0),
                        GeoPoint(lat=16.5, lon=86.5),
                    ],
                    severity="warning",
                    description="MOCK cyclone for system demo",
                    source="MOCK",
                )
            )

        return CycloneDisasterData(
            cyclones=cyclones,
            other_alerts=[],
            total_active_alerts=len(cyclones),
            source="MOCK — no active alerts (or demo cyclone if requested)",
        )

    def get_cyclone_cost(self, lat: float, lon: float, data: CycloneDisasterData | None = None) -> float:
        """
        Calculate routing cost penalty due to cyclone proximity.

        Returns:
        - 0.0 if no cyclones nearby
        - Steep exponential penalty within cyclone radius
        - float('inf') within the eye/inner wall region
        """
        if data is None or not data.cyclones:
            return 0.0

        max_cost = 0.0
        point = GeoPoint(lat=lat, lon=lon)

        for cyclone in data.cyclones:
            dist_km = self._haversine_km(point, cyclone.center)

            if dist_km < 50.0:
                # Inside inner region — effectively impassable
                return float("inf")
            elif dist_km < cyclone.radius_km:
                # Inside cyclone influence zone — steep penalty
                normalized = dist_km / cyclone.radius_km
                cost = 100.0 * (1.0 - normalized) ** 2
                max_cost = max(max_cost, cost)
            elif dist_km < cyclone.radius_km * 2:
                # Extended influence zone — moderate penalty
                normalized = (dist_km - cyclone.radius_km) / cyclone.radius_km
                cost = 20.0 * (1.0 - normalized)
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

_instance: CycloneDisasterAgent | None = None


def get_cyclone_disaster_agent() -> CycloneDisasterAgent:
    global _instance
    if _instance is None:
        _instance = CycloneDisasterAgent()
    return _instance
