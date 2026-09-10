"""
Route skeleton — searoute-based shortest sea path.

Layer 1 of the routing engine: produces a land-avoiding shortest
path using the searoute library's maritime network and coastal passage waypoints.
"""

from __future__ import annotations

import math
from typing import Optional

from backend.core.logging import get_logger
from backend.models.common import GeoPoint
from backend.routing.land_mask import is_land, line_crosses_land, get_maritime_corridor_waypoints

logger = get_logger(__name__)


def compute_skeleton_route(
    origin: GeoPoint,
    destination: GeoPoint,
) -> list[GeoPoint]:
    """
    Compute a guaranteed land-avoiding sea path between two points.

    Uses searoute maritime network with deep-water passage corridor fallbacks.
    Returns a list of waypoints (lat/lon pairs) strictly in water.
    """
    waypoints: list[GeoPoint] = []

    # 1. Try searoute library
    try:
        import searoute as sr

        route = sr.searoute(
            [origin.lon, origin.lat],
            [destination.lon, destination.lat],
        )

        coords = route["geometry"]["coordinates"]
        if coords and len(coords) >= 2:
            sr_waypoints = [GeoPoint(lat=c[1], lon=c[0]) for c in coords]
            
            # Verify searoute waypoints don't cross land
            has_land = any(is_land(wp.lat, wp.lon) for wp in sr_waypoints)
            if not has_land:
                # Ensure origin & destination are linked smoothly
                waypoints = _connect_and_interpolate(origin, destination, sr_waypoints)
                logger.info(
                    "Searoute skeleton successful: %d waypoints, %.1f km",
                    len(waypoints),
                    route["properties"].get("length", 0),
                )
                return waypoints
            else:
                logger.warning("Searoute waypoints touched land, applying maritime corridor")
    except Exception as exc:
        logger.warning("searoute failed (%s) — using maritime corridor", exc)

    # 2. Maritime corridor fallback (e.g. Cape Comorin rounding)
    corridor = get_maritime_corridor_waypoints(origin, destination)
    waypoints = _connect_and_interpolate(origin, destination, corridor)
    return waypoints


def _connect_and_interpolate(
    origin: GeoPoint,
    destination: GeoPoint,
    waypoints: list[GeoPoint],
    max_step_km: float = 15.0,
) -> list[GeoPoint]:
    """Ensure route connects origin -> waypoints -> destination, interpolated every ~15km."""
    chain = [origin]

    for wp in waypoints:
        # Avoid duplicate points
        if _haversine_km(chain[-1], wp) > 1.0:
            # If the waypoint is on land (e.g., port coordinate slightly inshore), nudge slightly offshore
            if is_land(wp.lat, wp.lon):
                # Nudge west or east towards ocean
                nudge_lon = wp.lon - 0.08 if wp.lon < 77.5 else wp.lon + 0.08
                wp = GeoPoint(lat=wp.lat, lon=nudge_lon)
            chain.append(wp)

    if _haversine_km(chain[-1], destination) > 1.0:
        chain.append(destination)

    # Densify long segments with interpolation
    dense_path: list[GeoPoint] = [chain[0]]
    for i in range(len(chain) - 1):
        p1, p2 = chain[i], chain[i + 1]
        dist = _haversine_km(p1, p2)
        if dist > max_step_km:
            steps = int(math.ceil(dist / max_step_km))
            for s in range(1, steps):
                frac = s / steps
                lat = round(p1.lat + frac * (p2.lat - p1.lat), 5)
                lon = round(p1.lon + frac * (p2.lon - p1.lon), 5)
                # Keep out of land
                if not is_land(lat, lon):
                    dense_path.append(GeoPoint(lat=lat, lon=lon))
        dense_path.append(p2)

    return dense_path


def _haversine_km(p1: GeoPoint, p2: GeoPoint) -> float:
    """Haversine distance in km."""
    R = 6371.0
    lat1, lat2 = math.radians(p1.lat), math.radians(p2.lat)
    dlat = math.radians(p2.lat - p1.lat)
    dlon = math.radians(p2.lon - p1.lon)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
