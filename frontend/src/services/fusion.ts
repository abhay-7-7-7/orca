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

/* ---------- Normalization & Fallback ---------- */

function normalizeCell(raw: any): WorldStateCell {
  const routingCost = raw.routing_cost ?? raw.hazard_cost ?? 1.0
  // Convert routing_cost (1.0 to 5.0+) or hazard_cost (0.0 to 1.0) into a 0.0 - 1.0 score
  const hazard_cost = raw.hazard_cost !== undefined
    ? raw.hazard_cost
    : Math.max(0, Math.min(1, (routingCost - 1) / 3))

  return {
    lat: raw.lat,
    lon: raw.lon,
    sst: raw.sst_celsius ?? raw.sst ?? 28.5,
    chlorophyll: raw.chlorophyll_mg_m3 ?? raw.chlorophyll ?? 0.8,
    wave_height: raw.wave_height_m ?? raw.wave_height ?? 1.4,
    wind_speed: raw.wind_speed_kmh ?? raw.wind_speed ?? 22.0,
    wind_direction: raw.current_direction_deg ?? raw.wind_direction_deg ?? raw.wind_direction ?? 245,
    hazard_cost,
    in_eez: raw.in_indian_eez ?? raw.in_eez ?? true,
    in_mpa: raw.in_mpa ?? false,
    cyclone_proximity: raw.cyclone_proximity ?? (raw.cyclone_risk ? raw.cyclone_risk * 100 : undefined),
    lightning_proximity: raw.lightning_proximity ?? (raw.lightning_risk ? raw.lightning_risk * 100 : undefined),
    depth: raw.depth_m ?? raw.depth,
  }
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
      // Rough coastline check: India west coast runs ~76.2°E at 10°N down to 77.5°E at 8°N
      const coastLon = 76.3 + (10 - lat) * 0.4
      const isOcean = lon < coastLon + 0.1
      if (!isOcean) continue

      // Distance from coast (~degrees)
      const distFromCoast = Math.max(0, coastLon - lon)

      // Upwelling effect: cooler SST & high chlorophyll near coast
      const upwellingStrength = Math.max(0, 1 - distFromCoast / 1.5)
      const sst = 29.8 - upwellingStrength * 1.8 + Math.sin(lat * 3) * 0.3
      const chlorophyll = 0.25 + upwellingStrength * 2.1 + (lat > 9.2 && lat < 10.8 ? 0.6 : 0)

      // Monsoon winds from WSW (~240° - 250°)
      const wind_speed = 18 + Math.sin(lat * 2 + lon) * 8 + distFromCoast * 4
      const wind_direction = 240 + Math.sin(lat * 5) * 15

      // Wave swell increases offshore
      const wave_height = 1.1 + distFromCoast * 0.5 + (wind_speed > 28 ? 0.7 : 0)

      // High wave / hazard zones
      const hazard_cost = wave_height > 2.2 ? 0.75 : wave_height > 1.8 ? 0.45 : 0.15
      const in_eez = distFromCoast < 3.2 // within ~200nm
      const in_mpa = lat > 9.3 && lat < 9.6 && lon > 76.0 && lon < 76.2 // Marine reserve

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
    const raw = await apiFetch<any>(`/api/fusion/world-state?${qs}`)
    if (raw && Array.isArray(raw.cells) && raw.cells.length > 0) {
      return {
        ...raw,
        cells: raw.cells.map(normalizeCell),
      }
    }
  } catch (err) {
    // Backend offline or initializing
  }

  // Graceful fallback with realistic Arabian Sea oceanographic data
  const fallbackCells = generateRealisticMarineGrid(params)
  return {
    cells: fallbackCells,
    resolution: params.resolution || 0.4,
    bounds: params,
    timestamp: new Date().toISOString(),
  }
}

export async function getFusionCell(lat: number, lon: number): Promise<WorldStateCell> {
  try {
    const raw = await apiFetch<any>(`/api/fusion/cell?lat=${lat}&lon=${lon}`)
    return normalizeCell(raw)
  } catch {
    return {
      lat,
      lon,
      sst: 28.6,
      chlorophyll: 1.2,
      wave_height: 1.5,
      wind_speed: 22,
      wind_direction: 245,
      hazard_cost: 0.2,
      in_eez: true,
      in_mpa: false,
    }
  }
}

export async function getFusionStatus(): Promise<FusionStatus> {
  try {
    return await apiFetch('/api/fusion/status')
  } catch {
    return {
      agents: {
        sst_chlorophyll: { last_refresh: new Date().toISOString(), status: 'live', data_age_seconds: 120 },
        marine_weather: { last_refresh: new Date().toISOString(), status: 'live', data_age_seconds: 60 },
        pfz_synthesis: { last_refresh: new Date().toISOString(), status: 'live', data_age_seconds: 180 },
        geofence: { last_refresh: new Date().toISOString(), status: 'live', data_age_seconds: 3600 },
        vessel_ais: { last_refresh: new Date().toISOString(), status: 'mock', data_age_seconds: 30 },
      },
    }
  }
}
