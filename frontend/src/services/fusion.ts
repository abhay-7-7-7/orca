import { apiFetch } from './api'

/* ---------- Types ---------- */

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
  return apiFetch(`/api/fusion/world-state?${qs}`)
}

export async function getFusionCell(lat: number, lon: number): Promise<WorldStateCell> {
  return apiFetch(`/api/fusion/cell?lat=${lat}&lon=${lon}`)
}

export async function getFusionStatus(): Promise<FusionStatus> {
  return apiFetch('/api/fusion/status')
}
