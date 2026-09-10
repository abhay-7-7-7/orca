"""
Land mask and maritime passage utilities for Indian waters.

Provides geometric point-in-polygon checks to strictly prevent
marine routing algorithms from crossing peninsular India, Sri Lanka,
and coastal landmasses.
"""

from __future__ import annotations

import math
from typing import Sequence
from backend.models.common import GeoPoint

# ── Peninsular India Coastal Boundary Polygon ─────────────────────────────────
# Ordered clockwise/counter-clockwise enclosing mainland India south of 25°N.
# Points represent the actual coastal perimeter.
INDIA_PENINSULA_POLYGON: list[tuple[float, float]] = [
    (24.5, 68.2),   # Kutch NW
    (23.3, 68.5),   # Kutch W
    (22.8, 69.1),   # Gulf of Kutch North
    (22.4, 70.0),   # Gulf of Kutch Inner
    (22.5, 69.1),   # Dwarka
    (21.6, 69.6),   # Porbandar
    (20.7, 70.9),   # Diu / Veraval
    (21.0, 72.0),   # Gulf of Khambhat West
    (21.7, 72.3),   # Bhavnagar
    (22.2, 72.6),   # Khambhat inner
    (21.6, 72.7),   # Bharuch
    (21.1, 72.8),   # Surat
    (20.4, 72.8),   # Daman
    (19.8, 72.8),   # Palghar
    (18.9, 72.8),   # Mumbai (Colaba)
    (18.3, 72.9),   # Alibaug
    (17.0, 73.3),   # Ratnagiri
    (15.9, 73.6),   # Malvan
    (15.5, 73.7),   # Goa (Panaji)
    (14.8, 74.1),   # Karwar
    (14.3, 74.4),   # Bhatkal
    (13.3, 74.7),   # Udupi
    (12.9, 74.8),   # Mangalore
    (12.0, 75.2),   # Kannur
    (11.2, 75.8),   # Kozhikode
    (10.8, 75.9),   # Ponnani
    (10.0, 76.2),   # Kochi (Fort Kochi coast)
    (9.5, 76.3),    # Alappuzha
    (8.9, 76.55),   # Kollam (Neendakara)
    (8.4, 76.95),   # Thiruvananthapuram (Vizhinjam)
    (8.08, 77.55),  # Kanyakumari (Cape Comorin southern tip)
    (8.2, 77.7),    # Kudankulam
    (8.8, 78.15),   # Thoothukudi (Tuticorin coast)
    (9.1, 78.4),    # Vembar
    (9.28, 79.15),  # Mandapam / Rameswaram
    (9.8, 79.0),    # Palk Strait inner
    (10.3, 79.85),  # Point Calimere
    (10.8, 79.85),  # Nagapattinam
    (11.9, 79.8),   # Puducherry
    (13.1, 80.3),   # Chennai
    (14.4, 80.1),   # Nellore
    (16.2, 81.15),  # Machilipatnam
    (17.7, 83.25),  # Visakhapatnam
    (19.3, 84.9),   # Gopalpur
    (20.3, 86.6),   # Paradip
    (21.8, 87.5),   # Digha
    (22.5, 88.4),   # Haldia / Kolkata
    (24.5, 88.5),   # Bengal inland
    (25.0, 88.0),   # North limit East
    (25.0, 68.2),   # North limit West
]

# ── Sri Lanka Boundary Polygon ────────────────────────────────────────────────
SRI_LANKA_POLYGON: list[tuple[float, float]] = [
    (9.8, 80.2),
    (9.0, 80.9),
    (8.5, 81.3),
    (7.7, 81.7),
    (7.0, 81.8),
    (6.3, 81.3),
    (5.9, 80.5),
    (6.0, 80.2),
    (6.9, 79.8),
    (8.0, 79.8),
    (8.8, 79.8),
    (9.5, 80.0),
    (9.8, 80.2),
]

# Strategic maritime routing waypoints around Cape Comorin / South India
OFFSHORE_SOUTH_PASSAGE = [
    GeoPoint(lat=7.95, lon=77.0),   # Offshore SW Arabian Sea approach
    GeoPoint(lat=7.80, lon=77.55),  # South of Cape Comorin (deep water)
    GeoPoint(lat=7.95, lon=78.10),  # Offshore SE Gulf of Mannar approach
]


def _point_in_polygon(lat: float, lon: float, poly: list[tuple[float, float]]) -> bool:
    """Ray-casting algorithm to test if (lat, lon) is inside a polygon."""
    inside = False
    n = len(poly)
    p1_lat, p1_lon = poly[0]
    for i in range(1, n + 1):
        p2_lat, p2_lon = poly[i % n]
        if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
            if lon <= max(p1_lon, p2_lon):
                if p1_lat != p2_lat:
                    xinters = (lat - p1_lat) * (p2_lon - p1_lon) / (p2_lat - p1_lat) + p1_lon
                    if p1_lon == p2_lon or lon <= xinters:
                        inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon
    return inside


def is_land(lat: float, lon: float, buffer_deg: float = 0.0) -> bool:
    """
    Check if coordinates fall on mainland India or Sri Lanka.

    Returns True if on land, False if in open water / navigable sea.
    """
    if _point_in_polygon(lat, lon, INDIA_PENINSULA_POLYGON):
        return True
    if _point_in_polygon(lat, lon, SRI_LANKA_POLYGON):
        return True
    return False


def line_crosses_land(p1: GeoPoint, p2: GeoPoint, samples: int = 25) -> bool:
    """Sample points along the line segment to check if it cuts through land."""
    for s in range(1, samples):
        frac = s / samples
        lat = p1.lat + frac * (p2.lat - p1.lat)
        lon = p1.lon + frac * (p2.lon - p1.lon)
        if is_land(lat, lon):
            return True
    return False


def get_maritime_corridor_waypoints(origin: GeoPoint, destination: GeoPoint) -> list[GeoPoint]:
    """
    If a direct line between origin and destination crosses the Indian landmass
    (such as Kochi on the west coast to Thoothukudi on the east coast),
    route through the southern deepwater passage around Cape Comorin.
    """
    # Check if crossing peninsular India from west coast to east coast or vice versa
    is_west_to_east = origin.lon < 77.4 and destination.lon > 77.6 and (origin.lat > 8.3 or destination.lat > 8.3)
    is_east_to_west = origin.lon > 77.6 and destination.lon < 77.4 and (origin.lat > 8.3 or destination.lat > 8.3)

    if is_west_to_east or is_east_to_west or line_crosses_land(origin, destination):
        # Build passage via south of Cape Comorin
        if is_west_to_east:
            return [
                GeoPoint(lat=min(origin.lat, 8.8), lon=min(origin.lon, 76.2)),
                GeoPoint(lat=8.0, lon=76.8),
                GeoPoint(lat=7.75, lon=77.55),
                GeoPoint(lat=8.1, lon=78.2),
                GeoPoint(lat=destination.lat, lon=destination.lon),
            ]
        elif is_east_to_west:
            return [
                GeoPoint(lat=min(origin.lat, 8.8), lon=max(origin.lon, 78.2)),
                GeoPoint(lat=8.1, lon=78.2),
                GeoPoint(lat=7.75, lon=77.55),
                GeoPoint(lat=8.0, lon=76.8),
                GeoPoint(lat=destination.lat, lon=destination.lon),
            ]

    return [origin, destination]
