"""
PFZ (Potential Fishing Zone) synthesis models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class PFZCandidate(BaseModel):
    """A single candidate Potential Fishing Zone."""

    zone_id: str
    centroid: GeoPoint
    polygon: list[GeoPoint] = Field(
        default_factory=list,
        description="Boundary polygon vertices (GeoJSON-compatible)",
    )
    score: float = Field(..., ge=0, le=1, description="Composite PFZ quality score (0-1)")
    sst_gradient_magnitude: float = Field(
        ..., description="SST gradient magnitude at the front (°C/km)"
    )
    mean_sst_celsius: float = 0.0
    mean_chl_a_mg_m3: float = Field(..., description="Mean Chlorophyll-a in mg/m³")
    area_km2: float = 0.0
    confidence: str = "medium"  # "high", "medium", "low"
    methodology_note: str = (
        "SST thermal front detection + chlorophyll concentration threshold, "
        "reproducing INCOIS PFZ methodology from raw OISST + OC-CCI data"
    )


class PFZSynthesisData(BaseModel):
    """PFZ synthesis output — ranked candidate fishing zones."""

    candidates: list[PFZCandidate] = Field(default_factory=list)
    total_candidates: int = 0
    analysis_bbox: Optional[str] = None
    sst_gradient_threshold: float = Field(
        default=0.5, description="SST gradient threshold used (°C over ~10km)"
    )
    chlorophyll_threshold: float = Field(
        default=0.3, description="Minimum Chl-a concentration (mg/m³)"
    )
    date: Optional[str] = None
    methodology: str = (
        "Candidate PFZ zones identified by: (1) computing SST gradient magnitude "
        "from OISST data, (2) identifying thermal fronts where gradient exceeds threshold, "
        "(3) filtering by chlorophyll-a concentration above minimum, "
        "(4) clustering adjacent qualifying cells, (5) scoring by gradient strength × Chl-a."
    )
