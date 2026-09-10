"""
Route skeleton — searoute-based shortest sea path.

Layer 1 of the routing engine: produces a land-avoiding shortest
path using the searoute library's maritime network. This output is
the "naive" route that the hazard-cost A* will refine.

Caveat (from searoute's own README): "not for routing purposes...
not for mariners to route their ships." Used only for the base
skeleton, not the final safe route.
"""

from __future__ import annotations

import math
from typing import Optional

from backend.core.logging import get_logger
from backend.models.common import GeoPoint

logger = get_logger(__name__)


def compute_skeleton_route(
    origin: GeoPoint,
    destination: GeoPoint,
) -> list[GeoPoint]:
    """
    Compute a basic land-avoiding sea path between two points.

    Uses searoute if available, falls back to a great-circle
    interpolation (fine for open-ocean routes in Indian waters).

    Returns a list of waypoints (lat/lon pairs).
    """
    try:
        import searoute as sr

        route = sr.searoute(
            [origin.lon, origin.lat],
            [destination.lon, destination.lat],
        )

        # searoute returns a GeoJSON Feature
        coords = route["geometry"]["coordinates"]
        waypoints = [GeoPoint(lat=c[1], lon=c[0]) for c in coords]
        logger.info(
            "Searoute skeleton: %d waypoints, %.1f km",
            len(waypoints),
            route["properties"].get("length", 0),
        )
        return waypoints

    except ImportError:
        logger.warning("searoute not installed — using great-circle interpolation")
        return _great_circle_interpolation(origin, destination)
    except Exception as exc:
        logger.warning("searoute failed: %s — using great-circle interpolation", exc)
        return _great_circle_interpolation(origin, destination)


def _great_circle_interpolation(
    origin: GeoPoint,
    destination: GeoPoint,
    step_km: float = 10.0,
) -> list[GeoPoint]:
    """
    Interpolate waypoints along a great-circle path.

    This doesn't avoid land — it's a fallback for when searoute
    isn't available. Fine for open-ocean routes in the Indian Ocean
    where the path is unlikely to cross land.
    """
    total_km = _haversine_km(origin, destination)
    num_steps = max(2, int(total_km / step_km))

    waypoints = []
    for i in range(num_steps + 1):
        fraction = i / num_steps
        lat = origin.lat + fraction * (destination.lat - origin.lat)
        lon = origin.lon + fraction * (destination.lon - origin.lon)
        waypoints.append(GeoPoint(lat=round(lat, 5), lon=round(lon, 5)))

    return waypoints


def _haversine_km(p1: GeoPoint, p2: GeoPoint) -> float:
    """Haversine distance in km."""
    R = 6371.0
    lat1, lat2 = math.radians(p1.lat), math.radians(p2.lat)
    dlat = math.radians(p2.lat - p1.lat)
    dlon = math.radians(p2.lon - p1.lon)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
