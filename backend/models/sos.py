"""
SOS Distress Signal and Maritime Search & Rescue (SAR) models.

Used by the Maritime Authorities Admin Console (Indian Coast Guard / MRCC)
to track, triage, and respond to emergency signals triggered by fishermen.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

from backend.models.common import GeoPoint


class DistressType(str, Enum):
    """Classification of maritime emergency."""
    CAPSIZED = "capsized"
    TAKING_WATER = "taking_water"
    ENGINE_FAILURE = "engine_failure"
    FIRE = "fire"
    MEDICAL_EMERGENCY = "medical"
    CYCLONE_TRAPPED = "cyclone_trapped"
    COLLISION = "collision"
    MAN_OVERBOARD = "man_overboard"
    UNKNOWN = "unknown"


class DistressSeverity(str, Enum):
    """Urgency / threat level to human life."""
    CRITICAL = "critical"  # Immediate life threat (capsizing, fire, taking water)
    HIGH = "high"          # Severe hazard (engine lost in heavy seas, drifting into shipping lane)
    MODERATE = "moderate"  # Urgent assistance required (rudder failure, non-life-threatening medical)


class DistressStatus(str, Enum):
    """Operational life-cycle of a distress incident."""
    ACTIVE = "active"              # Unacknowledged or new distress signal
    ACKNOWLEDGED = "acknowledged"  # Seen and triaged by MRCC/Coast Guard operator
    DISPATCHED = "dispatched"      # Rescue asset (cutter, interceptor, helo) en-route
    ON_SCENE = "on_scene"          # Responders actively engaged in rescue/assist
    RESOLVED = "resolved"          # Vessel and crew safely evacuated or towed to harbor
    FALSE_ALARM = "false_alarm"    # Accidental activation or test beacon


class ActionLogItem(BaseModel):
    """Audit log entry for rescue coordination actions."""
    id: str = Field(default_factory=lambda: f"log-{int(datetime.utcnow().timestamp()*1000)}")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    author: str = Field(default="MRCC Operator")
    action_type: str = Field(description="status_change, dispatch, communication, note")
    note: str


class RescueAsset(BaseModel):
    """Coast Guard or maritime responder asset available for dispatch."""
    id: str
    name: str
    asset_type: str = Field(description="patrol_vessel, interceptor, helicopter, dornier, station")
    callsign: str
    location: GeoPoint
    base_port: str
    status: str = Field(default="ready", description="ready, dispatched, maintenance")
    eta_minutes: Optional[int] = None


class DistressSignal(BaseModel):
    """Comprehensive distress signal record for authorities."""
    id: str
    vessel_name: str
    registration_no: str
    boat_type: str = Field(default="mechanized_trawler", description="traditional, motorized, mechanized_trawler, gillnetter")
    skipper_name: str
    contact_phone: str
    crew_count: int = Field(ge=1)
    
    # Telemetry & Location
    location: GeoPoint
    nearest_port: str
    distance_to_coast_nm: float
    bearing_deg: Optional[float] = 0.0
    water_depth_m: Optional[float] = None
    
    # Emergency details
    distress_type: DistressType
    severity: DistressSeverity
    status: DistressStatus
    emergency_message: str
    
    # Local marine weather at location
    wave_height_m: Optional[float] = None
    wind_speed_knots: Optional[float] = None
    sea_state: Optional[str] = None
    
    # Equipment & Comms
    vhf_channel: str = "16"
    battery_pct: Optional[int] = 100
    navic_beacon_id: Optional[str] = None
    
    # Operational response
    assigned_asset: Optional[RescueAsset] = None
    action_log: List[ActionLogItem] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DistressCreateRequest(BaseModel):
    """Payload to trigger an emergency signal from vessel or simulator."""
    vessel_name: str
    registration_no: str
    boat_type: str = "mechanized_trawler"
    skipper_name: str
    contact_phone: str
    crew_count: int
    lat: float
    lon: float
    distress_type: DistressType
    severity: DistressSeverity = DistressSeverity.CRITICAL
    emergency_message: str
    nearest_port: Optional[str] = "Kochi Harbor"
    vhf_channel: Optional[str] = "16"
    wave_height_m: Optional[float] = 2.4
    wind_speed_knots: Optional[float] = 26.0


class DistressStatusUpdateRequest(BaseModel):
    """Payload to update an incident's status and record an action."""
    status: DistressStatus
    note: Optional[str] = None
    author: Optional[str] = "MRCC Watch Officer"
    assigned_asset_id: Optional[str] = None
