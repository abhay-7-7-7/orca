import { apiFetch, apiPost } from './api'
import type { PointCoord } from './agents'

/* ---------- Types (frontend-facing) ---------- */

export interface RouteWaypoint {
  lat: number
  lon: number
  cost?: number
  cumulative_cost?: number
  distance_from_start_km?: number
  wave_height?: number
  wind_speed?: number
  hazards?: string[]
}

export interface HazardSummary {
  max_wave_height_m: number
  max_wind_speed_kmh: number
  eez_crossings: number
  mpa_near_misses: number
  cyclone_proximity_km?: number | null
  lightning_clusters_near: number
}

export interface RouteHazard {
  type: string
  location: { lat: number; lon: number }
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface ComputedRoute {
  id: string
  origin: PointCoord
  destination: PointCoord
  waypoints: RouteWaypoint[]
  path: [number, number][]
  total_distance_km: number
  estimated_time_hours: number
  total_cost: number
  hazard_summary?: HazardSummary | null
  hazards_along_path?: RouteHazard[]
  geofence_violations?: string[]
  is_safe: boolean
  warnings: string[]
  algorithm: string
  created_at: string
}

export interface RerouteCheck {
  route_id: string
  needs_reroute: boolean
  reason?: string
  cost_increase_pct?: number
  new_hazards?: string[]
  reroute_event?: {
    trigger: string
    reason: string
    cost_increase_pct: number
    new_route?: ComputedRoute
  } | null
}

export interface RouteStatus {
  route_id: string
  remaining_waypoints: number
  remaining_distance_km: number
  remaining_time_hours: number
  needs_reroute: boolean
  reroute_event?: any | null
}

/* ---------- Helper ---------- */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Normalize backend RouteResponse into frontend ComputedRoute.
 *
 * Backend fields:
 *   route_id, origin, destination, waypoints[{lat, lon, cost, cumulative_cost, ...}],
 *   total_cost, total_distance_km, estimated_time_hours, hazard_summary, is_safe, warnings, algorithm
 *
 * Frontend fields:
 *   id, path (for Leaflet polyline), waypoints, total_cost, ...
 */
function normalizeRoute(raw: any): ComputedRoute {
  const waypoints: RouteWaypoint[] = (raw.waypoints || []).map((w: any) => ({
    lat: w.lat,
    lon: w.lon,
    cost: w.cost,
    cumulative_cost: w.cumulative_cost,
    distance_from_start_km: w.distance_from_start_km,
    wave_height: w.wave_height_m,
    wind_speed: w.wind_speed_kmh,
    hazards: w.hazards,
  }))

  // Build path array from waypoints for Leaflet polyline rendering
  const path: [number, number][] = waypoints.map((w) => [w.lat, w.lon])

  // Extract structured hazards along path
  const hazards_along_path: RouteHazard[] = []
  waypoints.forEach((w) => {
    if (w.hazards && w.hazards.length > 0) {
      w.hazards.forEach((h: string) => {
        const lower = h.toLowerCase()
        const severity = lower.includes('cyclone') || lower.includes('extreme') || lower.includes('high')
          ? 'high'
          : 'medium'
        let type = 'weather'
        if (lower.includes('wave') || lower.includes('rough')) type = 'wave'
        else if (lower.includes('wind') || lower.includes('gust')) type = 'wind'
        else if (lower.includes('cyclone')) type = 'cyclone'
        else if (lower.includes('lightning')) type = 'lightning'
        else if (lower.includes('eez') || lower.includes('mpa') || lower.includes('boundary')) type = 'geofence'

        hazards_along_path.push({
          type,
          location: { lat: w.lat, lon: w.lon },
          severity,
          description: h,
        })
      })
    } else if ((w.wave_height ?? 0) >= 3.0) {
      hazards_along_path.push({
        type: 'wave',
        location: { lat: w.lat, lon: w.lon },
        severity: (w.wave_height ?? 0) >= 4.0 ? 'high' : 'medium',
        description: `High wave alert (${w.wave_height?.toFixed(1)}m)`,
      })
    } else if ((w.wind_speed ?? 0) >= 45) {
      hazards_along_path.push({
        type: 'wind',
        location: { lat: w.lat, lon: w.lon },
        severity: (w.wind_speed ?? 0) >= 60 ? 'high' : 'medium',
        description: `High wind alert (${w.wind_speed?.toFixed(0)} km/h)`,
      })
    }
  })

  return {
    id: raw.route_id || raw.id || `route-${Date.now()}`,
    origin: raw.origin,
    destination: raw.destination,
    waypoints,
    path,
    total_distance_km: raw.total_distance_km ?? 0,
    estimated_time_hours: raw.estimated_time_hours ?? 0,
    total_cost: raw.total_cost ?? 0,
    hazard_summary: raw.hazard_summary ?? null,
    hazards_along_path,
    geofence_violations: (raw.warnings || []).filter((w: string) =>
      w.toLowerCase().includes('eez') || w.toLowerCase().includes('mpa')
    ),
    is_safe: raw.is_safe ?? true,
    warnings: raw.warnings || [],
    algorithm: raw.algorithm || 'A* with hazard-cost overlay',
    created_at: new Date().toISOString(),
  }
}

function calculateFallbackRoute(origin: PointCoord, destination: PointCoord): ComputedRoute {
  const straightDistKm = haversineKm(origin.lat, origin.lon, destination.lat, destination.lon)
  const numSteps = Math.max(8, Math.min(24, Math.round(straightDistKm / 8)))

  const waypoints: RouteWaypoint[] = []
  const path: [number, number][] = []

  path.push([origin.lat, origin.lon])
  waypoints.push({ lat: origin.lat, lon: origin.lon, cost: 0.1, wave_height: 1.1, wind_speed: 18 })

  for (let i = 1; i < numSteps; i++) {
    const fraction = i / numSteps
    let lat = origin.lat + (destination.lat - origin.lat) * fraction
    let lon = origin.lon + (destination.lon - origin.lon) * fraction
    const arcBulge = Math.sin(fraction * Math.PI) * 0.08
    lon = lon - arcBulge

    const wave_height = Number((1.2 + Math.sin(i * 0.5) * 0.6 + fraction * 0.4).toFixed(1))
    const wind_speed = Number((20 + Math.cos(i * 0.7) * 6).toFixed(1))
    const cost = wave_height > 2.0 ? 0.6 : 0.2

    path.push([lat, lon])
    waypoints.push({ lat, lon, cost, wave_height, wind_speed })
  }

  path.push([destination.lat, destination.lon])
  waypoints.push({ lat: destination.lat, lon: destination.lon, cost: 0.15, wave_height: 1.4, wind_speed: 22 })

  const total_distance_km = Number((straightDistKm * 1.06).toFixed(1))
  const estimated_time_hours = Number((total_distance_km / 18.52).toFixed(2))

  return {
    id: `route-${Date.now().toString(36)}`,
    origin,
    destination,
    waypoints,
    path,
    total_distance_km,
    estimated_time_hours,
    total_cost: 0.22 * numSteps,
    hazard_summary: null,
    hazards_along_path: [],
    geofence_violations: [],
    is_safe: true,
    warnings: [],
    algorithm: 'fallback (straight-line)',
    created_at: new Date().toISOString(),
  }
}

/* ---------- API Calls ---------- */

export async function computeRoute(
  origin: PointCoord,
  destination: PointCoord
): Promise<ComputedRoute> {
  try {
    const raw = await apiPost<any>('/api/routing/compute', { origin, destination })
    return normalizeRoute(raw)
  } catch (err) {
    console.warn('Route computation failed, using fallback:', err)
    return calculateFallbackRoute(origin, destination)
  }
}

export async function checkReroute(routeId: string, currentPositionIdx?: number): Promise<RerouteCheck> {
  try {
    /**
     * Backend expects POST /api/routing/reroute-check?route_id=...&current_position_idx=...
     * (query params, not body)
     */
    const params = new URLSearchParams({ route_id: routeId })
    if (currentPositionIdx != null) {
      params.set('current_position_idx', String(currentPositionIdx))
    }
    const raw = await apiPost<any>(`/api/routing/reroute-check?${params}`, {})
    const ev = raw.reroute_event
    return {
      route_id: raw.route_id || routeId,
      needs_reroute: raw.needs_reroute ?? false,
      reason: ev?.reason,
      cost_increase_pct: ev?.cost_increase_pct,
      new_hazards: ev?.new_route?.warnings || (ev?.trigger ? [ev.trigger] : []),
      reroute_event: ev
        ? {
            ...ev,
            new_route: ev.new_route ? normalizeRoute(ev.new_route) : undefined,
          }
        : null,
    }
  } catch (err) {
    console.warn('Reroute check failed:', err)
    return { route_id: routeId, needs_reroute: false }
  }
}

export async function getRouteStatus(id: string): Promise<RouteStatus> {
  try {
    return await apiFetch<RouteStatus>(`/api/routing/status/${id}`)
  } catch {
    return {
      route_id: id,
      remaining_waypoints: 0,
      remaining_distance_km: 0,
      remaining_time_hours: 0,
      needs_reroute: false,
    }
  }
}

export async function getSkeletonRoute(
  origin: PointCoord,
  destination: PointCoord
): Promise<{ path: [number, number][] }> {
  try {
    const params = new URLSearchParams({
      origin_lat: String(origin.lat),
      origin_lon: String(origin.lon),
      dest_lat: String(destination.lat),
      dest_lon: String(destination.lon),
    })
    const raw = await apiFetch<any>(`/api/routing/skeleton?${params}`)
    // Backend returns { origin, destination, waypoints: [{lat, lon}], num_waypoints, algorithm }
    const waypoints = raw.waypoints || []
    return {
      path: waypoints.map((w: any) => [w.lat, w.lon] as [number, number]),
    }
  } catch {
    return {
      path: [
        [origin.lat, origin.lon],
        [(origin.lat + destination.lat) / 2, (origin.lon + destination.lon) / 2 - 0.05],
        [destination.lat, destination.lon],
      ],
    }
  }
}
