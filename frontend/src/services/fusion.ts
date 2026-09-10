import { apiFetch } from './api'

/* ---------- Types (frontend-facing) ---------- */

export interface WorldStateCell {
  lat: number
  lon: number
  sst?: number
  chlorophyll?: number
  wave_height?: number
  wind_speed?: number
  wind_direction?: number
  hazard_cost?: number
  in_eez?: boolean
  in_mpa?: boolean
  cyclone_proximity?: number
  lightning_proximity?: number
  depth?: number
}

export interface WorldState {
  cells: WorldStateCell[]
  resolution: number
  bounds: {
    min_lat: number
    max_lat: number
    min_lon: number
    max_lon: number
  }
  timestamp: string
}

export interface FusionStatus {
  agents: Record<string, {
    last_refresh: string
    status: string
    data_age_seconds: number
  }>
}

/* ---------- Backend response types (internal) ---------- */

interface BackendWorldStateCell {
  lat: number
  lon: number
  sst_celsius?: number
  chlorophyll_mg_m3?: number
  pfz_score?: number
  wave_height_m?: number
  wind_speed_kmh?: number
  sea_state?: string
  current_speed_knots?: number
  current_direction_deg?: number
  sea_level_anomaly_m?: number
  cyclone_risk?: number
  lightning_risk?: number
  in_indian_eez?: boolean
  in_mpa?: boolean
  depth_m?: number
  routing_cost?: number
  is_navigable?: boolean
  last_updated?: string
}

interface BackendWorldState {
  cells: BackendWorldStateCell[]
  agent_timestamps?: Array<{ agent_name: string; last_fetch?: string; status: string; is_mock?: boolean }>
  grid_resolution_deg?: number
  bbox?: string
  last_full_refresh?: string
}

/* ---------- Adapters ---------- */

/**
 * Map backend WorldStateCell field names to frontend-expected field names.
 * Backend uses scientific names (sst_celsius, wave_height_m, etc.)
 * Frontend uses short names (sst, wave_height, etc.)
 */
function mapWorldStateCell(cell: BackendWorldStateCell): WorldStateCell {
  return {
    lat: cell.lat,
    lon: cell.lon,
    sst: cell.sst_celsius,
    chlorophyll: cell.chlorophyll_mg_m3,
    wave_height: cell.wave_height_m,
    wind_speed: cell.wind_speed_kmh,
    wind_direction: cell.current_direction_deg,
    hazard_cost: cell.routing_cost,
    in_eez: cell.in_indian_eez,
    in_mpa: cell.in_mpa,
    cyclone_proximity: cell.cyclone_risk,
    lightning_proximity: cell.lightning_risk,
    depth: cell.depth_m,
  }
}

/* ---------- API Calls ---------- */

export async function getWorldState(params: {
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
  resolution?: number
}): Promise<WorldState> {
  const qs = new URLSearchParams({
    min_lat: String(params.min_lat),
    max_lat: String(params.max_lat),
    min_lon: String(params.min_lon),
    max_lon: String(params.max_lon),
    resolution: String(params.resolution || 0.5),
  })
  const raw = await apiFetch<BackendWorldState>(`/api/fusion/world-state?${qs}`)

  return {
    cells: (raw.cells || []).map(mapWorldStateCell),
    resolution: raw.grid_resolution_deg || 0.5,
    bounds: {
      min_lat: params.min_lat,
      max_lat: params.max_lat,
      min_lon: params.min_lon,
      max_lon: params.max_lon,
    },
    timestamp: raw.last_full_refresh || new Date().toISOString(),
  }
}

export async function getFusionCell(lat: number, lon: number): Promise<WorldStateCell> {
  const raw = await apiFetch<BackendWorldStateCell>(`/api/fusion/cell?lat=${lat}&lon=${lon}`)
  return mapWorldStateCell(raw)
}

export async function getFusionStatus(): Promise<FusionStatus> {
  return apiFetch('/api/fusion/status')
}
