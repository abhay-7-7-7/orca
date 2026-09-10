import { apiFetch, apiPost } from './api'
import type { PointCoord } from './agents'

/* ---------- Types (frontend-facing) ---------- */

export interface RouteWaypoint {
  lat: number
  lon: number
  hazard_cost?: number
  wave_height?: number
  wind_speed?: number
}

export interface ComputedRoute {
  id: string
  origin: PointCoord
  destination: PointCoord
  waypoints: RouteWaypoint[]
  path: [number, number][]
  total_distance_km: number
  estimated_time_hours: number
  average_hazard_cost: number
  max_hazard_cost: number
  hazards_along_path: Array<{
    type: string
    location: PointCoord
    severity: string
    description: string
  }>
  geofence_violations: string[]
  created_at: string
}

export interface RerouteCheck {
  needs_reroute: boolean
  reason?: string
  cost_increase_pct?: number
  new_hazards?: string[]
}

export interface RouteStatus {
  id: string
  status: 'computing' | 'ready' | 'failed'
  route?: ComputedRoute
  error?: string
}

/* ---------- Backend response types (internal) ---------- */

interface BackendRouteWaypoint {
  lat: number
  lon: number
  cost?: number
  cumulative_cost?: number
  distance_from_start_km?: number
  wave_height_m?: number
  wind_speed_kmh?: number
  hazards?: string[]
}

interface BackendHazardSummary {
  max_wave_height_m?: number
  max_wind_speed_kmh?: number
  eez_crossings?: number
  mpa_near_misses?: number
  cyclone_proximity_km?: number
  lightning_clusters_near?: number
}

interface BackendRouteResponse {
  route_id: string
  origin: PointCoord
  destination: PointCoord
  waypoints: BackendRouteWaypoint[]
  total_cost?: number
  total_distance_km: number
  estimated_time_hours: number
  hazard_summary?: BackendHazardSummary
  is_safe?: boolean
  warnings?: string[]
  algorithm?: string
}

interface BackendRerouteCheckResponse {
  route_id: string
  needs_reroute: boolean
  reroute_event?: {
    trigger?: string
    reason?: string
    cost_increase_pct?: number
    old_remaining_cost?: number
    new_remaining_cost?: number
  } | null
}

/* ---------- Adapters ---------- */

/**
 * Transform backend RouteResponse into frontend ComputedRoute.
 * Maps field names and derives computed fields.
 */
function adaptRouteResponse(backend: BackendRouteResponse): ComputedRoute {
  const waypoints: RouteWaypoint[] = backend.waypoints.map((wp) => ({
    lat: wp.lat,
    lon: wp.lon,
    hazard_cost: wp.cost,
    wave_height: wp.wave_height_m,
    wind_speed: wp.wind_speed_kmh,
  }))

  // Construct a lat/lon path from waypoints
  const path: [number, number][] = backend.waypoints.map((wp) => [wp.lat, wp.lon])

  // Derive average and max hazard cost from waypoints
  const costs = backend.waypoints.map((wp) => wp.cost || 0)
  const avgCost = costs.length > 0
    ? costs.reduce((a, b) => a + b, 0) / costs.length
    : 0
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0

  // Collect hazards from waypoints that have them
  const hazards: ComputedRoute['hazards_along_path'] = []
  for (const wp of backend.waypoints) {
    if (wp.hazards && wp.hazards.length > 0) {
      for (const h of wp.hazards) {
        hazards.push({
          type: 'hazard',
          location: { lat: wp.lat, lon: wp.lon },
          severity: (wp.cost || 0) > 2.0 ? 'high' : (wp.cost || 0) > 1.0 ? 'medium' : 'low',
          description: h,
        })
      }
    }
  }

  return {
    id: backend.route_id,
    origin: backend.origin,
    destination: backend.destination,
    waypoints,
    path,
    total_distance_km: backend.total_distance_km,
    estimated_time_hours: backend.estimated_time_hours,
    average_hazard_cost: avgCost,
    max_hazard_cost: backend.hazard_summary?.max_wave_height_m
      ? maxCost
      : maxCost,
    hazards_along_path: hazards,
    geofence_violations: backend.warnings || [],
    created_at: new Date().toISOString(),
  }
}

/* ---------- API Calls ---------- */

export async function computeRoute(
  origin: PointCoord,
  destination: PointCoord
): Promise<ComputedRoute> {
  const raw = await apiPost<BackendRouteResponse>('/api/routing/compute', { origin, destination })
  return adaptRouteResponse(raw)
}

export async function checkReroute(routeId: string): Promise<RerouteCheck> {
  // Backend expects route_id as a QUERY PARAMETER, not JSON body
  const raw = await apiPost<BackendRerouteCheckResponse>(
    `/api/routing/reroute-check?route_id=${encodeURIComponent(routeId)}`,
    {}
  )
  return {
    needs_reroute: raw.needs_reroute,
    reason: raw.reroute_event?.reason,
    cost_increase_pct: raw.reroute_event?.cost_increase_pct,
  }
}

export async function getRouteStatus(id: string): Promise<RouteStatus> {
  return apiFetch(`/api/routing/status/${id}`)
}

export async function getSkeletonRoute(
  origin: PointCoord,
  destination: PointCoord
): Promise<{ path: [number, number][] }> {
  const params = new URLSearchParams({
    origin_lat: String(origin.lat),
    origin_lon: String(origin.lon),
    dest_lat: String(destination.lat),
    dest_lon: String(destination.lon),
  })
  return apiFetch(`/api/routing/skeleton?${params}`)
}
