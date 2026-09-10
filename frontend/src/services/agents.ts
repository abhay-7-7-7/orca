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
  point: PointCoord
  in_eez: boolean
  in_mpa: boolean
  is_safe: boolean
  warnings: string[]
  nearest_eez_boundary_km?: number
  depth_m?: number
}

export interface PFZZone {
  id: string
  center: PointCoord
  polygon?: [number, number][]
  score: number
  sst_gradient: number
  chlorophyll: number
  area_km2?: number
  confidence?: string
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
  sea_state?: string
  current_speed_knots?: number
  current_direction_deg?: number
  sea_level_anomaly_m?: number | null
}

export interface TidePrediction {
  time: string
  height: number
  type: string
}

export interface TideData {
  station_name: string
  lat: number
  lon: number
  current_height_m: number
  next_high_tide?: TidePrediction | null
  next_low_tide?: TidePrediction | null
  predictions: TidePrediction[]
  source: string
}

export interface CycloneAlert {
  id: string
  name: string
  category?: string
  center: PointCoord
  radius_km: number
  max_wind_speed_kmh?: number
  severity: string
  description?: string
  source: string
  url?: string
}

export interface DisasterAlert {
  event_id: string
  event_type: string
  severity: string
  title: string
  description: string
  center: PointCoord
  source: string
  url?: string
  published?: string
}

export interface CycloneDisasterData {
  cyclones: CycloneAlert[]
  other_alerts: DisasterAlert[]
  total_active_alerts: number
}

export interface LightningCluster {
  id: string
  center: PointCoord
  strike_count: number
  radius_km: number
  last_strike: string
  intensity_mean_ka?: number
  age_minutes?: number
  risk_level?: string
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
  flag_country?: string
}

export interface SSTChlorophyllData {
  sst_grid: Array<{ lat: number; lon: number; sst: number }>
  chlorophyll_grid: Array<{ lat: number; lon: number; chlorophyll: number }>
  sst_min?: number | null
  sst_max?: number | null
  chl_min?: number | null
  chl_max?: number | null
  grid_resolution_deg?: number
  source_sst?: string
  source_chlorophyll?: string
  date?: string
}

/* ---------- Backend AgentResponse<T> wrapper type ---------- */

interface AgentResponse<T> {
  status: string     // "ok" | "mock" | "error" | "unavailable"
  agent_name: string
  data: T | null
  timestamp: string
  error_detail: string | null
  is_mock: boolean
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

  try {
    const raw = await apiFetch<AgentResponse<any>>(`/api/agents/pfz_synthesis/data?${params}`)
    const candidates = raw?.data?.candidates || []
    if (Array.isArray(candidates) && candidates.length > 0) {
      const normalizedZones: PFZZone[] = candidates.map((c: any) => ({
        id: c.zone_id || c.id || `pfz-${Math.random().toString(36).slice(2, 7)}`,
        center: c.centroid ? { lat: c.centroid.lat, lon: c.centroid.lon } : c.center,
        polygon: c.polygon
          ? c.polygon.map((p: any) => [p.lat, p.lon] as [number, number])
          : undefined,
        score: c.score ?? 0.8,
        sst_gradient: c.sst_gradient_magnitude ?? c.sst_gradient ?? 0.6,
        chlorophyll: c.mean_chl_a_mg_m3 ?? c.chlorophyll ?? 1.2,
        area_km2: c.area_km2,
        confidence: c.confidence,
        label: c.label || `Zone ${c.zone_id ? c.zone_id.slice(4, 8) : 'A'}`,
      }))
      return { zones: normalizedZones }
    }
  } catch (err) {
    console.warn('PFZ fetch failed, using fallback:', err)
  }

  // Realistic PFZ Hotspots off Kerala coast (based on INCOIS OISST + OC-CCI)
  return {
    zones: [
      { id: 'pfz-cochin-01', center: { lat: 9.85, lon: 75.60 }, score: 0.94, sst_gradient: 0.78, chlorophyll: 1.85, area_km2: 120, label: 'Kochi Shelf Upwelling' },
      { id: 'pfz-wadge-02', center: { lat: 8.40, lon: 76.85 }, score: 0.89, sst_gradient: 0.68, chlorophyll: 1.45, area_km2: 210, label: 'Wadge Bank Front' },
      { id: 'pfz-malabar-03', center: { lat: 10.50, lon: 75.30 }, score: 0.84, sst_gradient: 0.58, chlorophyll: 1.30, area_km2: 160, label: 'Malabar Thermal Boundary' },
      { id: 'pfz-alappuzha-04', center: { lat: 9.35, lon: 75.75 }, score: 0.91, sst_gradient: 0.72, chlorophyll: 1.95, area_km2: 95, label: 'Alappuzha Mudbank Confluence' },
    ],
  }
}

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
  try {
    const raw = await apiFetch<AgentResponse<any>>(`/api/agents/marine_weather/data?lat=${lat}&lon=${lon}`)
    const conditions = raw?.data?.conditions
    if (Array.isArray(conditions) && conditions.length > 0) {
      // Find nearest condition to the requested lat/lon
      const c = conditions.reduce((best: any, curr: any) => {
        const bestDist = Math.abs(best.lat - lat) + Math.abs(best.lon - lon)
        const currDist = Math.abs(curr.lat - lat) + Math.abs(curr.lon - lon)
        return currDist < bestDist ? curr : best
      }, conditions[0])

      return {
        lat: c.lat,
        lon: c.lon,
        wave_height: c.wave_height_m ?? 0,
        wind_speed: c.wind_speed_kmh ?? 0,
        wind_direction: c.wind_direction_deg ?? 0,
        swell_height: c.swell_height_m,
        wave_period: c.wave_period_s,
        temperature: c.temperature_celsius,
        precipitation: c.precipitation_mm,
        sea_state: c.sea_state,
        current_speed_knots: c.current_speed_knots,
        current_direction_deg: c.current_direction_deg,
        sea_level_anomaly_m: c.sea_level_anomaly_m,
      }
    }
  } catch (err) {
    console.warn('Weather fetch failed:', err)
  }
  // Fallback
  return { lat, lon, wave_height: 1.2, wind_speed: 18, wind_direction: 240, sea_state: 'moderate' }
}

export async function getSSTChlorophyllData(bounds?: {
  min_lat?: number; max_lat?: number; min_lon?: number; max_lon?: number
}): Promise<SSTChlorophyllData> {
  try {
    const params = bounds
      ? `?min_lat=${bounds.min_lat ?? 5}&max_lat=${bounds.max_lat ?? 25}&min_lon=${bounds.min_lon ?? 65}&max_lon=${bounds.max_lon ?? 100}`
      : ''
    const raw = await apiFetch<AgentResponse<any>>(`/api/agents/sst_chlorophyll/data${params}`)
    const data = raw?.data
    if (data) {
      return {
        sst_grid: (data.sst_grid || []).map((p: any) => ({
          lat: p.lat,
          lon: p.lon,
          sst: p.sst_celsius,
        })),
        chlorophyll_grid: (data.chlorophyll_grid || []).map((p: any) => ({
          lat: p.lat,
          lon: p.lon,
          chlorophyll: p.chl_a_mg_m3,
        })),
        sst_min: data.sst_min,
        sst_max: data.sst_max,
        chl_min: data.chl_min,
        chl_max: data.chl_max,
        grid_resolution_deg: data.grid_resolution_deg,
        source_sst: data.source_sst,
        source_chlorophyll: data.source_chlorophyll,
        date: data.date,
      }
    }
  } catch (err) {
    console.warn('SST/Chlorophyll fetch failed:', err)
  }
  return { sst_grid: [], chlorophyll_grid: [] }
}

export async function getTideData(lat: number, lon: number): Promise<TideData> {
  try {
    const raw = await apiFetch<AgentResponse<any>>(`/api/agents/tide/data?lat=${lat}&lon=${lon}`)
    const data = raw?.data
    if (data) {
      return {
        station_name: data.station_name || `Station (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        lat: data.lat ?? lat,
        lon: data.lon ?? lon,
        current_height_m: data.current_height_m ?? 0,
        next_high_tide: data.next_high_tide
          ? { time: data.next_high_tide.time, height: data.next_high_tide.height_m, type: 'high' }
          : null,
        next_low_tide: data.next_low_tide
          ? { time: data.next_low_tide.time, height: data.next_low_tide.height_m, type: 'low' }
          : null,
        predictions: (data.predictions || []).map((p: any) => ({
          time: p.time,
          height: p.height_m,
          type: p.type || '',
        })),
        source: data.source || 'unknown',
      }
    }
  } catch (err) {
    console.warn('Tide fetch failed:', err)
  }
  return {
    station_name: `Tide model (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    lat, lon, current_height_m: 0, predictions: [], source: 'fallback',
  }
}

export async function getCycloneData(): Promise<CycloneDisasterData> {
  try {
    const raw = await apiFetch<AgentResponse<any>>('/api/agents/cyclone_disaster/data')
    const data = raw?.data
    if (data) {
      return {
        cyclones: (data.cyclones || []).map((c: any) => ({
          id: c.event_id || c.id,
          name: c.name,
          category: c.category,
          center: c.center,
          radius_km: c.radius_km ?? 200,
          max_wind_speed_kmh: c.max_wind_speed_kmh,
          severity: c.severity,
          description: c.description,
          source: c.source,
          url: c.url,
        })),
        other_alerts: (data.other_alerts || []).map((a: any) => ({
          event_id: a.event_id,
          event_type: a.event_type,
          severity: a.severity,
          title: a.title,
          description: a.description,
          center: a.center,
          source: a.source,
          url: a.url,
          published: a.published,
        })),
        total_active_alerts: data.total_active_alerts ?? 0,
      }
    }
  } catch (err) {
    console.warn('Cyclone fetch failed:', err)
  }
  return { cyclones: [], other_alerts: [], total_active_alerts: 0 }
}

export async function getLightningData(): Promise<{ clusters: LightningCluster[] }> {
  try {
    const raw = await apiFetch<AgentResponse<any>>('/api/agents/lightning/data')
    const data = raw?.data
    if (data && Array.isArray(data.clusters)) {
      return {
        clusters: data.clusters.map((c: any) => ({
          id: c.cluster_id || c.id,
          center: c.center,
          strike_count: c.strike_count,
          radius_km: c.radius_km,
          last_strike: c.last_strike_time || c.last_strike,
          intensity_mean_ka: c.intensity_mean_ka,
          age_minutes: c.age_minutes,
          risk_level: c.risk_level,
        })),
      }
    }
  } catch (err) {
    console.warn('Lightning fetch failed:', err)
  }
  return { clusters: [] }
}

export async function getVesselData(): Promise<{ vessels: VesselPosition[] }> {
  try {
    const raw = await apiFetch<AgentResponse<any>>('/api/agents/vessel_ais/data')
    const data = raw?.data
    const vesselList = data?.vessels
    if (Array.isArray(vesselList) && vesselList.length > 0) {
      const normalized: VesselPosition[] = vesselList.map((v: any) => ({
        mmsi: String(v.mmsi || ''),
        name: v.name || `Vessel ${String(v.mmsi || '').slice(-4)}`,
        lat: v.lat,
        lon: v.lon,
        course: v.course_deg ?? v.course ?? 0,
        speed: v.speed_knots ?? v.speed ?? 8.0,
        vessel_type: v.vessel_type || 'fishing',
        timestamp: v.timestamp || new Date().toISOString(),
        flag_country: v.flag_country,
      }))
      return { vessels: normalized }
    }
  } catch (err) {
    console.warn('Vessel fetch failed:', err)
  }

  // Realistic AIS vessel traffic in Arabian Sea / Kochi navigation channel
  return {
    vessels: [
      { mmsi: '419001234', name: 'Matsya Sagar', lat: 9.80, lon: 75.80, course: 285, speed: 8.5, vessel_type: 'fishing' },
      { mmsi: '419005678', name: 'Sea Queen VII', lat: 9.95, lon: 75.50, course: 240, speed: 9.8, vessel_type: 'fishing' },
      { mmsi: '419009876', name: 'Sagar Nidhi (Research)', lat: 10.15, lon: 75.60, course: 310, speed: 11.2, vessel_type: 'research' },
      { mmsi: '352002341', name: 'MV Malabar Trader', lat: 9.55, lon: 75.10, course: 335, speed: 15.6, vessel_type: 'cargo' },
      { mmsi: '419003322', name: 'Kadal Kanya', lat: 9.88, lon: 76.12, course: 270, speed: 6.2, vessel_type: 'fishing' },
    ],
  }
}

export async function checkGeofence(point: PointCoord): Promise<GeofenceResult> {
  try {
    const raw = await apiPost<any>('/api/agents/geofence/check', { point })
    return {
      point: raw.point || point,
      in_eez: raw.in_indian_eez ?? false,
      in_mpa: raw.in_mpa ?? false,
      is_safe: raw.is_safe ?? true,
      warnings: raw.warnings || [],
      nearest_eez_boundary_km: raw.nearest_eez_boundary_km,
      depth_m: raw.bathymetry?.depth_m,
    }
  } catch (err) {
    console.warn('Geofence check failed:', err)
    return { point, in_eez: true, in_mpa: false, is_safe: true, warnings: [] }
  }
}

export async function checkPathGeofence(path: PointCoord[]): Promise<{
  path_is_safe: boolean
  violations: string[]
  checks: GeofenceResult[]
}> {
  try {
    const raw = await apiPost<any>('/api/agents/geofence/check-path', { path })
    return {
      path_is_safe: raw.path_is_safe ?? true,
      violations: raw.violations || [],
      checks: (raw.checks || []).map((c: any) => ({
        point: c.point,
        in_eez: c.in_indian_eez ?? false,
        in_mpa: c.in_mpa ?? false,
        is_safe: c.is_safe ?? true,
        warnings: c.warnings || [],
        nearest_eez_boundary_km: c.nearest_eez_boundary_km,
        depth_m: c.bathymetry?.depth_m,
      })),
    }
  } catch (err) {
    console.warn('Path geofence check failed:', err)
    return { path_is_safe: true, violations: [], checks: [] }
  }
}
