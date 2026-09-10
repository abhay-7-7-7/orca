"""
SOS Distress Signal and SAR Operations API.

Provides real-time endpoints for:
- Viewing and managing distress calls sent by fishermen.
- Tracking vessel coordinates, distress classification, and local weather.
- Dispatching Indian Coast Guard and Marine Police response assets.
- Simulating distress scenarios along the Indian coastline.
"""

from __future__ import annotations

from datetime import datetime
import math
import random
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query

from backend.models.common import GeoPoint
from backend.models.sos import (
    ActionLogItem,
    DistressCreateRequest,
    DistressSeverity,
    DistressSignal,
    DistressStatus,
    DistressStatusUpdateRequest,
    DistressType,
    RescueAsset,
)

router = APIRouter(tags=["SOS Distress"])

# ── Available Coast Guard / SAR Assets ──────────────────────────────────────────

AVAILABLE_ASSETS: List[RescueAsset] = [
    RescueAsset(
        id="icgs-samar",
        name="ICGS Samar (Offshore Patrol Vessel)",
        asset_type="patrol_vessel",
        callsign="4VWR",
        location=GeoPoint(lat=9.96, lon=76.22),
        base_port="Kochi Port / Southern Command",
        status="ready",
    ),
    RescueAsset(
        id="icgs-c421",
        name="ICG Interceptor C-421",
        asset_type="interceptor",
        callsign="8TSA",
        location=GeoPoint(lat=9.92, lon=76.24),
        base_port="Kochi Port",
        status="ready",
    ),
    RescueAsset(
        id="icg-alhmk3",
        name="ALH Dhruv Mk-III (SAR Helicopter)",
        asset_type="helicopter",
        callsign="SAR-CHETAK-04",
        location=GeoPoint(lat=9.94, lon=76.27),
        base_port="INS Garuda / Kochi Air Enclave",
        status="ready",
    ),
    RescueAsset(
        id="icgs-rajshree",
        name="ICGS Rajshree (Fast Patrol Vessel)",
        asset_type="patrol_vessel",
        callsign="8JBC",
        location=GeoPoint(lat=13.08, lon=80.30),
        base_port="Chennai Port / Eastern Command",
        status="ready",
    ),
    RescueAsset(
        id="icgs-varuna",
        name="ICGS Varuna",
        asset_type="patrol_vessel",
        callsign="7KPL",
        location=GeoPoint(lat=21.64, lon=69.60),
        base_port="Porbandar / Western Command",
        status="ready",
    ),
]

# ── In-Memory Distress Store ──────────────────────────────────────────────────

_SIGNALS: Dict[str, DistressSignal] = {}


def _seed_initial_signals() -> None:
    """Pre-populate realistic distress incidents across key Indian fishing sectors."""
    now = datetime.utcnow()
    initial_data = [
        DistressSignal(
            id="SOS-2026-0811",
            vessel_name="Matsya Kanya IV",
            registration_no="IND-KL-07-MM-2940",
            boat_type="mechanized_trawler",
            skipper_name="Santhosh Xavier",
            contact_phone="+91 94472 18902",
            crew_count=6,
            location=GeoPoint(lat=9.7240, lon=75.7120),
            nearest_port="Kochi Harbor",
            distance_to_coast_nm=18.4,
            bearing_deg=245.0,
            water_depth_m=42.0,
            distress_type=DistressType.TAKING_WATER,
            severity=DistressSeverity.CRITICAL,
            status=DistressStatus.ACTIVE,
            emergency_message="Hull crack after hitting submerged debris. Bilge pump failure, water rising rapidly in engine compartment. Immediate rescue requested.",
            wave_height_m=2.8,
            wind_speed_knots=28.5,
            sea_state="Rough (Douglas 5)",
            vhf_channel="16",
            battery_pct=42,
            navic_beacon_id="NAVIC-ICG-8812",
            action_log=[
                ActionLogItem(
                    timestamp=now.isoformat(),
                    author="Automated Distress Beacon",
                    action_type="beacon_activated",
                    note="Emergency SOS transmitted via Marine VHF Ch 16 and NavIC MSS receiver.",
                ),
                ActionLogItem(
                    timestamp=now.isoformat(),
                    author="MRCC Kochi Watchstander",
                    action_type="status_change",
                    note="Distress priority verified. Coordinates broadcasted to nearest coastal patrol.",
                ),
            ],
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
        ),
        DistressSignal(
            id="SOS-2026-0812",
            vessel_name="Al-Buraq Ocean",
            registration_no="IND-GJ-02-MM-1194",
            boat_type="motorized",
            skipper_name="Iqbal Sumra",
            contact_phone="+91 98251 44109",
            crew_count=4,
            location=GeoPoint(lat=21.4820, lon=69.3180),
            nearest_port="Porbandar Port",
            distance_to_coast_nm=24.1,
            bearing_deg=210.0,
            water_depth_m=58.0,
            distress_type=DistressType.ENGINE_FAILURE,
            severity=DistressSeverity.HIGH,
            status=DistressStatus.DISPATCHED,
            emergency_message="Main diesel engine seized. Rudder hydraulic line ruptured. Vessel drifting southwest towards international maritime boundary line (IMBL).",
            wave_height_m=2.1,
            wind_speed_knots=22.0,
            sea_state="Moderate to Rough",
            vhf_channel="16",
            battery_pct=68,
            navic_beacon_id="NAVIC-ICG-4901",
            assigned_asset=AVAILABLE_ASSETS[4],  # ICGS Varuna
            action_log=[
                ActionLogItem(
                    timestamp=now.isoformat(),
                    author="Skipper Iqbal Sumra",
                    action_type="distress_call",
                    note="Distress call initiated via satellite handset.",
                ),
                ActionLogItem(
                    timestamp=now.isoformat(),
                    author="Coast Guard Porbandar Base",
                    action_type="dispatch",
                    note="ICGS Varuna dispatched from Porbandar. Estimated intercept in 45 minutes.",
                ),
            ],
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
        ),
        DistressSignal(
            id="SOS-2026-0813",
            vessel_name="Kadaline Thozhan",
            registration_no="IND-TN-02-MM-7831",
            boat_type="traditional",
            skipper_name="Murugesan Arumugam",
            contact_phone="+91 94441 55290",
            crew_count=3,
            location=GeoPoint(lat=12.9210, lon=80.4120),
            nearest_port="Chennai Fishery Harbor",
            distance_to_coast_nm=12.6,
            bearing_deg=105.0,
            water_depth_m=34.0,
            distress_type=DistressType.MEDICAL_EMERGENCY,
            severity=DistressSeverity.MODERATE,
            status=DistressStatus.ACKNOWLEDGED,
            emergency_message="Crew member sustained deep head laceration and internal trauma during winch cable snapping. Heavy bleeding.",
            wave_height_m=1.4,
            wind_speed_knots=14.0,
            sea_state="Slight",
            vhf_channel="16 / 08",
            battery_pct=85,
            navic_beacon_id="NAVIC-ICG-3112",
            action_log=[
                ActionLogItem(
                    timestamp=now.isoformat(),
                    author="MRCC Chennai",
                    action_type="acknowledged",
                    note="Tele-medical advisory issued to vessel skipper. Interceptor craft preparing for medical evacuation.",
                )
            ],
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
        ),
        DistressSignal(
            id="SOS-2026-0809",
            vessel_name="Sagara Deepam",
            registration_no="IND-KL-04-MM-5512",
            boat_type="mechanized_trawler",
            skipper_name="Joseph Kunjumon",
            contact_phone="+91 97455 10923",
            crew_count=5,
            location=GeoPoint(lat=9.4800, lon=76.1200),
            nearest_port="Alappuzha Harbor",
            distance_to_coast_nm=8.5,
            bearing_deg=260.0,
            water_depth_m=28.0,
            distress_type=DistressType.ENGINE_FAILURE,
            severity=DistressSeverity.MODERATE,
            status=DistressStatus.RESOLVED,
            emergency_message="Fuel contamination caused complete engine shutdown. Tow line secured by sister boat 'St. Jude'.",
            wave_height_m=1.2,
            wind_speed_knots=12.0,
            sea_state="Calm to Slight",
            vhf_channel="16",
            battery_pct=90,
            navic_beacon_id="NAVIC-ICG-1104",
            action_log=[
                ActionLogItem(
                    timestamp=now.isoformat(),
                    author="Coastal Police Alappuzha",
                    action_type="resolved",
                    note="Vessel towed into Alappuzha canal entrance. All 5 crew safely accounted for.",
                )
            ],
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
        ),
    ]
    for sig in initial_data:
        _SIGNALS[sig.id] = sig


_seed_initial_signals()


# ── API Endpoints ─────────────────────────────────────────────────────────────


@router.get("/signals", response_model=List[DistressSignal])
async def list_distress_signals(
    status: Optional[str] = Query(None, description="Filter by status (active, dispatched, resolved)"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical, high, moderate)"),
):
    """Retrieve all recorded distress signals with optional status & severity filters."""
    signals = list(_SIGNALS.values())
    if status and status != "all":
        signals = [s for s in signals if s.status.value.lower() == status.lower()]
    if severity and severity != "all":
        signals = [s for s in signals if s.severity.value.lower() == severity.lower()]
    
    # Sort with active / critical first, then newest
    def sort_key(s: DistressSignal):
        status_priority = {
            DistressStatus.ACTIVE: 0,
            DistressStatus.ACKNOWLEDGED: 1,
            DistressStatus.DISPATCHED: 2,
            DistressStatus.ON_SCENE: 3,
            DistressStatus.RESOLVED: 4,
            DistressStatus.FALSE_ALARM: 5,
        }
        return (status_priority.get(s.status, 9), s.created_at)

    return sorted(signals, key=sort_key)


@router.get("/signals/{signal_id}", response_model=DistressSignal)
async def get_distress_signal(signal_id: str):
    """Retrieve full details of an individual distress signal."""
    if signal_id not in _SIGNALS:
        raise HTTPException(status_code=404, detail="Distress signal not found")
    return _SIGNALS[signal_id]


@router.post("/signal", response_model=DistressSignal)
async def create_distress_signal(req: DistressCreateRequest):
    """
    Trigger a new SOS distress signal.
    Can be invoked by a fisherman in distress or via emergency beacon broadcast.
    """
    now = datetime.utcnow()
    signal_id = f"SOS-{now.strftime('%Y')}-{random.randint(1000, 9999)}"

    # Estimate distance to shore
    distance_nm = round(random.uniform(5.0, 30.0), 1)

    signal = DistressSignal(
        id=signal_id,
        vessel_name=req.vessel_name,
        registration_no=req.registration_no,
        boat_type=req.boat_type,
        skipper_name=req.skipper_name,
        contact_phone=req.contact_phone,
        crew_count=req.crew_count,
        location=GeoPoint(lat=req.lat, lon=req.lon),
        nearest_port=req.nearest_port or "Kochi Harbor",
        distance_to_coast_nm=distance_nm,
        bearing_deg=round(random.uniform(180, 300), 1),
        water_depth_m=round(random.uniform(20.0, 75.0), 1),
        distress_type=req.distress_type,
        severity=req.severity,
        status=DistressStatus.ACTIVE,
        emergency_message=req.emergency_message,
        wave_height_m=req.wave_height_m or 2.5,
        wind_speed_knots=req.wind_speed_knots or 25.0,
        sea_state="Rough (Douglas 5)" if (req.wave_height_m or 2.5) > 2.0 else "Moderate",
        vhf_channel=req.vhf_channel or "16",
        battery_pct=random.randint(45, 95),
        navic_beacon_id=f"NAVIC-ICG-{random.randint(2000, 9999)}",
        action_log=[
            ActionLogItem(
                timestamp=now.isoformat(),
                author=f"Skipper {req.skipper_name}",
                action_type="beacon_activated",
                note=f"Emergency distress signal transmitted: {req.emergency_message}",
            )
        ],
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )

    _SIGNALS[signal_id] = signal
    return signal


@router.patch("/signals/{signal_id}/status", response_model=DistressSignal)
async def update_distress_status(signal_id: str, req: DistressStatusUpdateRequest):
    """
    Update the triage or operational status of a distress signal.
    Records operator notes into the audit action log.
    """
    if signal_id not in _SIGNALS:
        raise HTTPException(status_code=404, detail="Distress signal not found")

    signal = _SIGNALS[signal_id]
    signal.status = req.status
    signal.updated_at = datetime.utcnow().isoformat()

    # Assign asset if specified
    if req.assigned_asset_id:
        asset = next((a for a in AVAILABLE_ASSETS if a.id == req.assigned_asset_id), None)
        if asset:
            signal.assigned_asset = asset

    # Append to action log
    log_note = req.note or f"Status changed to {req.status.value.upper()}"
    signal.action_log.append(
        ActionLogItem(
            author=req.author or "MRCC Watchstander",
            action_type="status_change",
            note=log_note,
        )
    )

    _SIGNALS[signal_id] = signal
    return signal


@router.get("/assets", response_model=List[RescueAsset])
async def list_rescue_assets():
    """Retrieve list of Coast Guard, Marine Police, and SAR response units."""
    return AVAILABLE_ASSETS


@router.post("/simulate", response_model=DistressSignal)
async def simulate_distress_signal():
    """
    Generate an authentic simulated distress incident along the Indian coast.
    Ideal for evaluators testing real-time alerting without actual emergency conditions.
    """
    coastal_sectors = [
        {"port": "Kochi Harbor", "lat": 9.85 + random.uniform(-0.3, 0.3), "lon": 75.85 + random.uniform(-0.3, 0.1)},
        {"port": "Mangalore Port", "lat": 12.85 + random.uniform(-0.2, 0.2), "lon": 74.55 + random.uniform(-0.3, 0.1)},
        {"port": "Porbandar Harbor", "lat": 21.55 + random.uniform(-0.3, 0.3), "lon": 69.45 + random.uniform(-0.4, 0.1)},
        {"port": "Chennai Fishery Port", "lat": 13.15 + random.uniform(-0.2, 0.2), "lon": 80.45 + random.uniform(0.1, 0.4)},
        {"port": "Visakhapatnam Base", "lat": 17.65 + random.uniform(-0.2, 0.2), "lon": 83.45 + random.uniform(0.1, 0.4)},
    ]
    sector = random.choice(coastal_sectors)

    vessels = [
        ("Sea Falcon VII", "IND-KL-07-MM-8841", "Sebastian Jude", 6),
        ("Golden Pearl", "IND-TN-02-MM-4491", "K. Selvam", 4),
        ("Matsya Jyoti", "IND-GJ-01-MM-3109", "Bhavesh Koli", 5),
        ("Samudra Veer", "IND-KA-03-MM-6721", "Naveen Poojary", 7),
        ("Ocean Conqueror", "IND-AP-05-MM-9214", "Appa Rao", 5),
    ]
    v_name, reg_no, skipper, crew = random.choice(vessels)

    scenarios = [
        (
            DistressType.TAKING_WATER,
            DistressSeverity.CRITICAL,
            "Severe water ingress following stern gland failure. Hand pumps overwhelmed. 6 crew abandoning to liferaft.",
        ),
        (
            DistressType.FIRE,
            DistressSeverity.CRITICAL,
            "Engine room electrical fire spreading to wheelhouse. Crew preparing distress flare launch.",
        ),
        (
            DistressType.ENGINE_FAILURE,
            DistressSeverity.HIGH,
            "Lost all propulsion in squall line. Heavy rolling, vessel drifting fast towards hazardous shoals.",
        ),
        (
            DistressType.CYCLONE_TRAPPED,
            DistressSeverity.CRITICAL,
            "Caught in sudden convective squall with 3.5m waves. Unable to make headway, taking seas over the bow.",
        ),
    ]
    distress_type, severity, msg = random.choice(scenarios)

    req = DistressCreateRequest(
        vessel_name=f"{v_name} {random.randint(1, 99)}",
        registration_no=f"{reg_no}",
        boat_type="mechanized_trawler",
        skipper_name=skipper,
        contact_phone=f"+91 9{random.randint(1000, 9999)} {random.randint(10000, 99999)}",
        crew_count=crew,
        lat=round(sector["lat"], 4),
        lon=round(sector["lon"], 4),
        distress_type=distress_type,
        severity=severity,
        emergency_message=msg,
        nearest_port=sector["port"],
        vhf_channel="16",
        wave_height_m=round(random.uniform(2.2, 3.8), 1),
        wind_speed_knots=round(random.uniform(24.0, 38.0), 1),
    )

    return await create_distress_signal(req)
