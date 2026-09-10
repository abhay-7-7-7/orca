"""
SST & Chlorophyll models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SSTDataPoint(BaseModel):
    """SST value at a grid point."""

    lat: float
    lon: float
    sst_celsius: float = Field(..., description="Sea surface temperature in °C")


class ChlorophyllDataPoint(BaseModel):
    """Chlorophyll-a concentration at a grid point."""

    lat: float
    lon: float
    chl_a_mg_m3: float = Field(..., description="Chlorophyll-a in mg/m³")


class SSTChlorophyllData(BaseModel):
    """Combined SST and Chlorophyll grid data for a region."""

    sst_grid: list[SSTDataPoint] = Field(default_factory=list)
    chlorophyll_grid: list[ChlorophyllDataPoint] = Field(default_factory=list)
    sst_min: Optional[float] = None
    sst_max: Optional[float] = None
    chl_min: Optional[float] = None
    chl_max: Optional[float] = None
    grid_resolution_deg: float = 0.25
    source_sst: str = "NOAA OISST v5 (ERDDAP)"
    source_chlorophyll: str = "ESA OC-CCI v6 (ERDDAP)"
    date: Optional[str] = None
