import { apiFetch, apiPost } from './api'
import type { PointCoord } from './agents'

/* ---------- Types ---------- */

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

/* ---------- API Calls ---------- */

export async function computeRoute(
  origin: PointCoord,
  destination: PointCoord
): Promise<ComputedRoute> {
  return apiPost('/api/routing/compute', { origin, destination })
}

export async function checkReroute(routeId: string): Promise<RerouteCheck> {
  return apiPost('/api/routing/reroute-check', { route_id: routeId })
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
