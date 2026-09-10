import { apiFetch, apiPost } from './api'
import {
  DistressSignal,
  DistressCreatePayload,
  DistressStatusUpdatePayload,
  RescueAsset,
} from '../types/sos'

const STORAGE_KEY = 'orca_distress_signals_v1'

const DEFAULT_RESCUE_ASSETS: RescueAsset[] = [
  {
    id: 'icgs-samar',
    name: 'ICGS Samar (Offshore Patrol Vessel)',
    asset_type: 'patrol_vessel',
    callsign: '4VWR',
    location: { lat: 9.96, lon: 76.22 },
    base_port: 'Kochi Port / Southern Command',
    status: 'ready',
    eta_minutes: 28,
  },
  {
    id: 'icgs-c421',
    name: 'ICG Interceptor C-421',
    asset_type: 'interceptor',
    callsign: '8TSA',
    location: { lat: 9.92, lon: 76.24 },
    base_port: 'Kochi Port',
    status: 'ready',
    eta_minutes: 18,
  },
  {
    id: 'icg-alhmk3',
    name: 'ALH Dhruv Mk-III (SAR Helicopter)',
    asset_type: 'helicopter',
    callsign: 'SAR-CHETAK-04',
    location: { lat: 9.94, lon: 76.27 },
    base_port: 'INS Garuda / Kochi Air Enclave',
    status: 'ready',
    eta_minutes: 12,
  },
  {
    id: 'icgs-rajshree',
    name: 'ICGS Rajshree (Fast Patrol Vessel)',
    asset_type: 'patrol_vessel',
    callsign: '8JBC',
    location: { lat: 13.08, lon: 80.30 },
    base_port: 'Chennai Port / Eastern Command',
    status: 'ready',
    eta_minutes: 35,
  },
  {
    id: 'icgs-varuna',
    name: 'ICGS Varuna',
    asset_type: 'patrol_vessel',
    callsign: '7KPL',
    location: { lat: 21.64, lon: 69.60 },
    base_port: 'Porbandar / Western Command',
    status: 'ready',
    eta_minutes: 42,
  },
]

const DEFAULT_SIGNALS: DistressSignal[] = [
  {
    id: 'SOS-2026-0811',
    vessel_name: 'Matsya Kanya IV',
    registration_no: 'IND-KL-07-MM-2940',
    boat_type: 'Mechanized Trawler (52 ft)',
    skipper_name: 'Santhosh Xavier',
    contact_phone: '+91 94472 18902',
    crew_count: 6,
    location: { lat: 9.724, lon: 75.712 },
    nearest_port: 'Kochi Harbor',
    distance_to_coast_nm: 18.4,
    bearing_deg: 245,
    water_depth_m: 42,
    distress_type: 'taking_water',
    severity: 'critical',
    status: 'active',
    emergency_message:
      'Hull breach after hitting submerged floating log. Bilge pump failing, water rising rapidly in engine bay. 6 crew readying life raft.',
    wave_height_m: 2.8,
    wind_speed_knots: 28.5,
    sea_state: 'Rough (Douglas 5)',
    vhf_channel: '16',
    battery_pct: 42,
    navic_beacon_id: 'NAVIC-ICG-8812',
    action_log: [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
        author: 'Distress Beacon / NavIC',
        action_type: 'beacon_activated',
        note: 'Emergency distress beacon activated via VHF Ch 16 & NavIC MSS frequency.',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
        author: 'MRCC Kochi Watchstander',
        action_type: 'status_change',
        note: 'Distress verified. High-priority alert broadcast to Kochi Southern Command sector.',
      },
    ],
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    id: 'SOS-2026-0812',
    vessel_name: 'Al-Buraq Ocean',
    registration_no: 'IND-GJ-02-MM-1194',
    boat_type: 'Motorized Craft (36 ft)',
    skipper_name: 'Iqbal Sumra',
    contact_phone: '+91 98251 44109',
    crew_count: 4,
    location: { lat: 21.482, lon: 69.318 },
    nearest_port: 'Porbandar Port',
    distance_to_coast_nm: 24.1,
    bearing_deg: 210,
    water_depth_m: 58,
    distress_type: 'engine_failure',
    severity: 'high',
    status: 'dispatched',
    emergency_message:
      'Main diesel engine seized. Hydraulic rudder line ruptured. Vessel drifting southwest in heavy swell towards IMBL.',
    wave_height_m: 2.1,
    wind_speed_knots: 22.0,
    sea_state: 'Moderate to Rough',
    vhf_channel: '16',
    battery_pct: 68,
    navic_beacon_id: 'NAVIC-ICG-4901',
    assigned_asset: DEFAULT_RESCUE_ASSETS[4],
    action_log: [
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
        author: 'Skipper Iqbal Sumra',
        action_type: 'distress_call',
        note: 'Distress call initiated via satellite emergency handset.',
      },
      {
        id: 'log-4',
        timestamp: new Date(Date.now() - 28 * 60000).toISOString(),
        author: 'Coast Guard Porbandar Base',
        action_type: 'dispatch',
        note: 'ICGS Varuna dispatched from Porbandar. Intercept estimated in 35 mins.',
      },
    ],
    created_at: new Date(Date.now() - 42 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 60000).toISOString(),
  },
  {
    id: 'SOS-2026-0813',
    vessel_name: 'Kadaline Thozhan',
    registration_no: 'IND-TN-02-MM-7831',
    boat_type: 'Fiberglass Gillnetter',
    skipper_name: 'Murugesan Arumugam',
    contact_phone: '+91 94441 55290',
    crew_count: 3,
    location: { lat: 12.921, lon: 80.412 },
    nearest_port: 'Chennai Fishery Harbor',
    distance_to_coast_nm: 12.6,
    bearing_deg: 105,
    water_depth_m: 34,
    distress_type: 'medical',
    severity: 'moderate',
    status: 'acknowledged',
    emergency_message:
      'Crew deckhand sustained deep head trauma and fracture during winch wire rupture. Unconscious, breathing shallow.',
    wave_height_m: 1.4,
    wind_speed_knots: 14.0,
    sea_state: 'Slight',
    vhf_channel: '16 / 08',
    battery_pct: 88,
    navic_beacon_id: 'NAVIC-ICG-3112',
    action_log: [
      {
        id: 'log-5',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        author: 'MRCC Chennai',
        action_type: 'acknowledged',
        note: 'Emergency tele-medical instructions relayed to vessel master. Interceptor ready on standby.',
      },
    ],
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'SOS-2026-0809',
    vessel_name: 'Sagara Deepam',
    registration_no: 'IND-KL-04-MM-5512',
    boat_type: 'Mechanized Trawler',
    skipper_name: 'Joseph Kunjumon',
    contact_phone: '+91 97455 10923',
    crew_count: 5,
    location: { lat: 9.48, lon: 76.12 },
    nearest_port: 'Alappuzha Harbor',
    distance_to_coast_nm: 8.5,
    bearing_deg: 260,
    water_depth_m: 28,
    distress_type: 'engine_failure',
    severity: 'moderate',
    status: 'resolved',
    emergency_message:
      'Fuel contamination shutdown. Tow line secured by companion fishing boat St. Jude and Coastal Police craft.',
    wave_height_m: 1.2,
    wind_speed_knots: 12.0,
    sea_state: 'Calm to Slight',
    vhf_channel: '16',
    battery_pct: 92,
    navic_beacon_id: 'NAVIC-ICG-1104',
    action_log: [
      {
        id: 'log-6',
        timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
        author: 'Coastal Police Alappuzha',
        action_type: 'resolved',
        note: 'Vessel safely berthed at Thottappally Spillway. All 5 fishermen in good health.',
      },
    ],
    created_at: new Date(Date.now() - 210 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 180 * 60000).toISOString(),
  },
]

function getLocalSignals(): DistressSignal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Could not read local distress signals:', err)
  }
  return DEFAULT_SIGNALS
}

function saveLocalSignals(signals: DistressSignal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals))
  } catch (err) {
    console.warn('Could not save local distress signals:', err)
  }
}

export async function fetchDistressSignals(
  status?: string,
  severity?: string
): Promise<DistressSignal[]> {
  try {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.append('status', status)
    if (severity && severity !== 'all') params.append('severity', severity)
    const query = params.toString() ? `?${params.toString()}` : ''

    const signals = await apiFetch<DistressSignal[]>(`/api/sos/signals${query}`)
    if (Array.isArray(signals)) {
      saveLocalSignals(signals)
      return signals
    }
  } catch (err) {
    console.warn('Backend SOS fetch failed, using local storage cache:', err)
  }

  let local = getLocalSignals()
  if (status && status !== 'all') {
    local = local.filter((s) => s.status.toLowerCase() === status.toLowerCase())
  }
  if (severity && severity !== 'all') {
    local = local.filter((s) => s.severity.toLowerCase() === severity.toLowerCase())
  }
  return local
}

export async function fetchDistressSignalById(signalId: string): Promise<DistressSignal | null> {
  try {
    const sig = await apiFetch<DistressSignal>(`/api/sos/signals/${signalId}`)
    if (sig && sig.id) return sig
  } catch (err) {
    console.warn('Backend signal details fetch failed:', err)
  }
  const local = getLocalSignals()
  return local.find((s) => s.id === signalId) || null
}

export async function fetchRescueAssets(): Promise<RescueAsset[]> {
  try {
    const assets = await apiFetch<RescueAsset[]>('/api/sos/assets')
    if (Array.isArray(assets) && assets.length > 0) return assets
  } catch (err) {
    console.warn('Backend rescue assets fetch failed:', err)
  }
  return DEFAULT_RESCUE_ASSETS
}

export async function triggerDistressSignal(
  payload: DistressCreatePayload
): Promise<DistressSignal> {
  try {
    const created = await apiPost<DistressSignal>('/api/sos/signal', payload)
    if (created && created.id) {
      const current = getLocalSignals()
      saveLocalSignals([created, ...current.filter((s) => s.id !== created.id)])
      return created
    }
  } catch (err) {
    console.warn('Backend create distress failed, creating locally:', err)
  }

  const now = new Date().toISOString()
  const localSignal: DistressSignal = {
    id: `SOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    vessel_name: payload.vessel_name,
    registration_no: payload.registration_no,
    boat_type: payload.boat_type || 'Mechanized Trawler',
    skipper_name: payload.skipper_name,
    contact_phone: payload.contact_phone,
    crew_count: payload.crew_count,
    location: { lat: payload.lat, lon: payload.lon },
    nearest_port: payload.nearest_port || 'Kochi Harbor',
    distance_to_coast_nm: Number((10 + Math.random() * 20).toFixed(1)),
    bearing_deg: Math.floor(180 + Math.random() * 120),
    water_depth_m: Math.floor(25 + Math.random() * 50),
    distress_type: payload.distress_type,
    severity: payload.severity,
    status: 'active',
    emergency_message: payload.emergency_message,
    wave_height_m: payload.wave_height_m || 2.5,
    wind_speed_knots: payload.wind_speed_knots || 25,
    sea_state: 'Rough',
    vhf_channel: payload.vhf_channel || '16',
    battery_pct: Math.floor(40 + Math.random() * 55),
    navic_beacon_id: `NAVIC-ICG-${Math.floor(2000 + Math.random() * 8000)}`,
    action_log: [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        author: `Skipper ${payload.skipper_name}`,
        action_type: 'beacon_activated',
        note: payload.emergency_message,
      },
    ],
    created_at: now,
    updated_at: now,
  }

  const current = getLocalSignals()
  saveLocalSignals([localSignal, ...current])
  return localSignal
}

export async function updateDistressStatus(
  signalId: string,
  payload: DistressStatusUpdatePayload
): Promise<DistressSignal> {
  try {
    const updated = await apiFetch<DistressSignal>(`/api/sos/signals/${signalId}/status`, {
      method: 'PATCH',
      body: payload,
    })
    if (updated && updated.id) {
      const current = getLocalSignals()
      const index = current.findIndex((s) => s.id === signalId)
      if (index !== -1) {
        current[index] = updated
        saveLocalSignals([...current])
      }
      return updated
    }
  } catch (err) {
    console.warn('Backend status update failed, updating locally:', err)
  }

  const current = getLocalSignals()
  const target = current.find((s) => s.id === signalId)
  if (!target) {
    throw new Error('Distress signal not found')
  }

  target.status = payload.status
  target.updated_at = new Date().toISOString()
  if (payload.assigned_asset_id) {
    target.assigned_asset = DEFAULT_RESCUE_ASSETS.find((a) => a.id === payload.assigned_asset_id)
  }
  target.action_log.push({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    author: payload.author || 'MRCC Watchstander',
    action_type: 'status_change',
    note: payload.note || `Status updated to ${payload.status.toUpperCase()}`,
  })

  saveLocalSignals([...current])
  return target
}

export async function simulateDistressSignal(): Promise<DistressSignal> {
  try {
    const sim = await apiPost<DistressSignal>('/api/sos/simulate', {})
    if (sim && sim.id) {
      const current = getLocalSignals()
      saveLocalSignals([sim, ...current.filter((s) => s.id !== sim.id)])
      return sim
    }
  } catch (err) {
    console.warn('Backend simulation failed, simulating locally:', err)
  }

  const locations = [
    { port: 'Kochi Harbor', lat: 9.85, lon: 75.82 },
    { port: 'Mangalore Port', lat: 12.82, lon: 74.52 },
    { port: 'Porbandar Port', lat: 21.52, lon: 69.38 },
    { port: 'Chennai Fishery Harbor', lat: 13.12, lon: 80.48 },
    { port: 'Visakhapatnam Base', lat: 17.68, lon: 83.42 },
  ]
  const loc = locations[Math.floor(Math.random() * locations.length)]

  return triggerDistressSignal({
    vessel_name: `Sea Ranger ${Math.floor(10 + Math.random() * 90)}`,
    registration_no: `IND-KL-${Math.floor(10 + Math.random() * 90)}-MM-${Math.floor(1000 + Math.random() * 9000)}`,
    boat_type: 'Mechanized Trawler (48 ft)',
    skipper_name: 'Antony Dsouza',
    contact_phone: `+91 944${Math.floor(1000000 + Math.random() * 9000000)}`,
    crew_count: Math.floor(4 + Math.random() * 5),
    lat: Number((loc.lat + (Math.random() - 0.5) * 0.4).toFixed(4)),
    lon: Number((loc.lon + (Math.random() - 0.5) * 0.3).toFixed(4)),
    distress_type: 'taking_water',
    severity: 'critical',
    emergency_message:
      'Sudden seawater flooding in aft machinery compartment. Bilge strainer choked. Immediate tow or pumps requested.',
    nearest_port: loc.port,
    vhf_channel: '16',
    wave_height_m: 2.7,
    wind_speed_knots: 26,
  })
}
