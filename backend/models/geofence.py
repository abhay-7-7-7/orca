"""
Geofence models — EEZ, MPA, bathymetry, and boundary-check types.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class EEZInfo(BaseModel):
    """Information about an Exclusive Economic Zone."""

    name: str
    sovereign: str
    iso_3: str = ""
    area_km2: float = 0.0


class MPAInfo(BaseModel):
    """Information about a Marine Protected Area."""

    name: str
    designation: str = ""
    iucn_category: str = ""
    area_km2: float = 0.0
    no_take: bool = False  # True = fishing prohibited


class BathymetryInfo(BaseModel):
    """Depth information at a point."""

    depth_m: float = Field(..., description="Depth in meters (negative = below sea level)")
    is_navigable: bool = True  # False if too shallow for typical fishing vessels


class GeofenceCheckRequest(BaseModel):
    """Request to check a point or path against geofence boundaries."""

    point: Optional[GeoPoint] = None
    path: Optional[list[GeoPoint]] = None  # Check each segment

    class Config:
        json_schema_extra = {
            "examples": [
                {"point": {"lat": 10.0, "lon": 76.0}},
                {
                    "path": [
                        {"lat": 9.96, "lon": 76.27},
                        {"lat": 10.5, "lon": 75.5},
                    ]
                },
            ]
        }


class GeofenceCheckResponse(BaseModel):
    """Result of a geofence boundary check."""

    point: GeoPoint
    in_indian_eez: bool = False
    eez: Optional[EEZInfo] = None
    nearest_eez_boundary_km: float = Field(
        0.0, description="Distance to nearest EEZ boundary in km"
    )
    mpa_conflicts: list[MPAInfo] = Field(default_factory=list)
    in_mpa: bool = False
    bathymetry: Optional[BathymetryInfo] = None
    is_safe: bool = True  # Composite: in EEZ, not in no-take MPA, navigable depth
    warnings: list[str] = Field(default_factory=list)


class GeofencePathResponse(BaseModel):
    """Result of checking an entire path against geofence boundaries."""

    checks: list[GeofenceCheckResponse] = Field(default_factory=list)
    path_is_safe: bool = True
    violations: list[str] = Field(default_factory=list)


class GeofenceData(BaseModel):
    """Full geofence data for a region (used by fusion layer)."""

    eez_boundaries_loaded: bool = False
    mpa_boundaries_loaded: bool = False
    bathymetry_loaded: bool = False
    indian_eez_available: bool = False
    total_mpas: int = 0
