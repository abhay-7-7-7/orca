import { apiFetch, apiPost } from './api'

/* ---------- Types ---------- */

export interface AgentStatus {
  name: string
  status: 'live' | 'mock' | 'error' | 'degraded'
  last_update?: string
  message?: string
}

export interface PointCoord {
  lat: number
  lon: number
}

export interface GeofenceResult {
  in_eez: boolean
  in_mpa: boolean
  zone_name?: string
  violations: string[]
}

export interface PFZZone {
  id: string
  center: PointCoord
  polygon?: [number, number][]
  score: number
  sst_gradient: number
  chlorophyll: number
  area_km2?: number
  label?: string
}

export interface WeatherData {
  lat: number
  lon: number
  wave_height: number
  wind_speed: number
  wind_direction: number
  swell_height?: number
  wave_period?: number
  temperature?: number
  precipitation?: number
  conditions?: string
}

export interface TideData {
  lat: number
  lon: number
  predictions: Array<{
    time: string
    height: number
    type: 'high' | 'low'
  }>
}

export interface CycloneAlert {
  id: string
  name: string
  category: string
  center: PointCoord
  radius_km: number
  wind_speed_kmh: number
  severity: string
  source: string
}

export interface LightningCluster {
  id: string
  center: PointCoord
  strike_count: number
  radius_km: number
  last_strike: string
}

export interface VesselPosition {
  mmsi: string
  name?: string
  lat: number
  lon: number
  course?: number
  speed?: number
  vessel_type?: string
  timestamp?: string
}

export interface SSTChlorophyllData {
  grid: Array<{
    lat: number
    lon: number
    sst: number
    chlorophyll: number
  }>
}

/* ---------- API Calls ---------- */

export async function getAgentStatus(name: string): Promise<AgentStatus> {
  return apiFetch<AgentStatus>(`/api/agents/${name}/status`)
}

export async function getPFZData(bounds: {
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
}): Promise<{ zones: PFZZone[] }> {
  const params = new URLSearchParams({
    min_lat: String(bounds.min_lat),
    max_lat: String(bounds.max_lat),
    min_lon: String(bounds.min_lon),
    max_lon: String(bounds.max_lon),
  })
  return apiFetch(`/api/agents/pfz_synthesis/data?${params}`)
}

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
  return apiFetch(`/api/agents/marine_weather/data?lat=${lat}&lon=${lon}`)
}

export async function getSSTChlorophyllData(): Promise<SSTChlorophyllData> {
  return apiFetch('/api/agents/sst_chlorophyll/data')
}

export async function getTideData(lat: number, lon: number): Promise<TideData> {
  return apiFetch(`/api/agents/tide/data?lat=${lat}&lon=${lon}`)
}

export async function getCycloneData(): Promise<{ alerts: CycloneAlert[] }> {
  return apiFetch('/api/agents/cyclone_disaster/data')
}

export async function getLightningData(): Promise<{ clusters: LightningCluster[] }> {
  return apiFetch('/api/agents/lightning/data')
}

export async function getVesselData(): Promise<{ vessels: VesselPosition[] }> {
  return apiFetch('/api/agents/vessel_ais/data')
}

export async function checkGeofence(point: PointCoord): Promise<GeofenceResult> {
  return apiPost('/api/agents/geofence/check', { point })
}

export async function checkPathGeofence(path: PointCoord[]): Promise<GeofenceResult> {
  return apiPost('/api/agents/geofence/check-path', { path })
}
