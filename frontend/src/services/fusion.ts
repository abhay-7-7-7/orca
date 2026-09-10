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
  sea_state?: string
  current_speed_knots?: number
  current_direction_deg?: number
  sea_level_anomaly_m?: number | null
  pfz_score?: number
  routing_cost?: number
  is_navigable?: boolean
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
  agent_timestamps?: Array<{
    agent_name: string
    last_fetch: string | null
    status: string
    is_mock: boolean
  }>
}

export interface FusionStatus {
  agent_timestamps: Array<{
    agent_name: string
    last_fetch: string | null
    status: string
    is_mock: boolean
  }>
  last_full_refresh: string | null
  hazard_grid_built: boolean
}

/* ---------- Normalization ---------- */

/**
 * Map backend WorldStateCell fields to frontend shape.
 *
 * Backend fields:
 *   sst_celsius, chlorophyll_mg_m3, wave_height_m, wind_speed_kmh,
 *   current_direction_deg, routing_cost, in_indian_eez, cyclone_risk,
 *   lightning_risk, depth_m, pfz_score, sea_state
 *
 * Frontend fields:
 *   sst, chlorophyll, wave_height, wind_speed, wind_direction,
 *   hazard_cost, in_eez, cyclone_proximity, lightning_proximity,
 *   depth, pfz_score, sea_state
 */
function normalizeCell(raw: any): WorldStateCell {
  const routingCost = raw.routing_cost ?? 1.0
  // Convert routing_cost (base 1.0, higher = worse) into a 0.0 - 1.0 hazard score
  const hazard_cost = Math.max(0, Math.min(1, (routingCost - 1) / 4))

  return {
    lat: raw.lat,
    lon: raw.lon,
    sst: raw.sst_celsius ?? raw.sst,
    chlorophyll: raw.chlorophyll_mg_m3 ?? raw.chlorophyll,
    wave_height: raw.wave_height_m ?? raw.wave_height,
    wind_speed: raw.wind_speed_kmh ?? raw.wind_speed,
    wind_direction: raw.current_direction_deg ?? raw.wind_direction_deg ?? raw.wind_direction,
    hazard_cost,
    routing_cost: routingCost,
    in_eez: raw.in_indian_eez ?? raw.in_eez,
    in_mpa: raw.in_mpa ?? false,
    cyclone_proximity: raw.cyclone_risk != null ? raw.cyclone_risk * 100 : raw.cyclone_proximity,
    lightning_proximity: raw.lightning_risk != null ? raw.lightning_risk * 100 : raw.lightning_proximity,
    depth: raw.depth_m ?? raw.depth,
    sea_state: raw.sea_state,
    current_speed_knots: raw.current_speed_knots,
    current_direction_deg: raw.current_direction_deg,
    sea_level_anomaly_m: raw.sea_level_anomaly_m,
    pfz_score: raw.pfz_score,
    is_navigable: raw.is_navigable,
  }
}

/**
 * Parse backend bbox string "({min_lat}, {min_lon}) to ({max_lat}, {max_lon})"
 * into structured bounds object.
 */
function parseBbox(bboxStr: string | null | undefined): WorldState['bounds'] {
  if (bboxStr) {
    const match = bboxStr.match(/\(([^,]+),\s*([^)]+)\)\s*to\s*\(([^,]+),\s*([^)]+)\)/)
    if (match) {
      return {
        min_lat: parseFloat(match[1]),
        min_lon: parseFloat(match[2]),
        max_lat: parseFloat(match[3]),
        max_lon: parseFloat(match[4]),
      }
    }
  }
  return { min_lat: 5, max_lat: 25, min_lon: 65, max_lon: 100 }
}

export function generateRealisticMarineGrid(bounds: {
  min_lat: number
  max_lat: number
  min_lon: number
  max_lon: number
  resolution?: number
}): WorldStateCell[] {
  const res = bounds.resolution || 0.4
  const cells: WorldStateCell[] = []

  const minLat = Math.max(6.5, bounds.min_lat)
  const maxLat = Math.min(15.0, bounds.max_lat)
  const minLon = Math.max(71.0, bounds.min_lon)
  const maxLon = Math.min(78.0, bounds.max_lon)

  for (let lat = minLat; lat <= maxLat; lat += res) {
    for (let lon = minLon; lon <= maxLon; lon += res) {
      const coastLon = 76.3 + (10 - lat) * 0.4
      const isOcean = lon < coastLon + 0.1
      if (!isOcean) continue

      const distFromCoast = Math.max(0, coastLon - lon)
      const upwellingStrength = Math.max(0, 1 - distFromCoast / 1.5)
      const sst = 29.8 - upwellingStrength * 1.8 + Math.sin(lat * 3) * 0.3
      const chlorophyll = 0.25 + upwellingStrength * 2.1 + (lat > 9.2 && lat < 10.8 ? 0.6 : 0)
      const wind_speed = 18 + Math.sin(lat * 2 + lon) * 8 + distFromCoast * 4
      const wind_direction = 240 + Math.sin(lat * 5) * 15
      const wave_height = 1.1 + distFromCoast * 0.5 + (wind_speed > 28 ? 0.7 : 0)
      const hazard_cost = wave_height > 2.2 ? 0.75 : wave_height > 1.8 ? 0.45 : 0.15
      const in_eez = distFromCoast < 3.2
      const in_mpa = lat > 9.3 && lat < 9.6 && lon > 76.0 && lon < 76.2

      cells.push({
        lat: Number(lat.toFixed(2)),
        lon: Number(lon.toFixed(2)),
        sst: Number(sst.toFixed(1)),
        chlorophyll: Number(chlorophyll.toFixed(2)),
        wave_height: Number(wave_height.toFixed(1)),
        wind_speed: Number(wind_speed.toFixed(1)),
        wind_direction: Math.round(wind_direction),
        hazard_cost: Number(hazard_cost.toFixed(2)),
        in_eez,
        in_mpa,
      })
    }
  }

  return cells
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
    resolution: String(params.resolution || 0.4),
  })

  try {
    /**
     * Backend WorldState response shape:
     * { cells: [...], agent_timestamps: [...], grid_resolution_deg, bbox, last_full_refresh }
     */
    const raw = await apiFetch<any>(`/api/fusion/world-state?${qs}`)

    const cells = (raw.cells || []).map(normalizeCell)

    return {
      cells,
      resolution: raw.grid_resolution_deg ?? params.resolution ?? 0.4,
      bounds: parseBbox(raw.bbox),
      timestamp: raw.last_full_refresh || new Date().toISOString(),
      agent_timestamps: raw.agent_timestamps,
    }
  } catch (err) {
    console.warn('World state fetch failed, using generated grid:', err)
    return {
      cells: generateRealisticMarineGrid(params),
      resolution: params.resolution || 0.4,
      bounds: {
        min_lat: params.min_lat,
        max_lat: params.max_lat,
        min_lon: params.min_lon,
        max_lon: params.max_lon,
      },
      timestamp: new Date().toISOString(),
    }
  }
}

export async function getFusionCell(lat: number, lon: number): Promise<WorldStateCell> {
  try {
    const raw = await apiFetch<any>(`/api/fusion/cell?lat=${lat}&lon=${lon}`)
    return normalizeCell(raw)
  } catch (err) {
    console.warn('Fusion cell fetch failed:', err)
    return { lat, lon }
  }
}

export async function getFusionStatus(): Promise<FusionStatus> {
  try {
    return await apiFetch<FusionStatus>('/api/fusion/status')
  } catch {
    return {
      agent_timestamps: [],
      last_full_refresh: null,
      hazard_grid_built: false,
    }
  }
}
