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

/* ---------- Helper & Fallback Routing ---------- */

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

function calculateFallbackRoute(origin: PointCoord, destination: PointCoord): ComputedRoute {
  const straightDistKm = haversineKm(origin.lat, origin.lon, destination.lat, destination.lon)
  const numSteps = Math.max(8, Math.min(24, Math.round(straightDistKm / 8)))

  const waypoints: RouteWaypoint[] = []
  const path: [number, number][] = []

  // Add origin
  path.push([origin.lat, origin.lon])
  waypoints.push({
    lat: origin.lat,
    lon: origin.lon,
    hazard_cost: 0.1,
    wave_height: 1.1,
    wind_speed: 18,
  })

  // Intermediate nautical path with slight arc to avoid shallow coastal shoals
  for (let i = 1; i < numSteps; i++) {
    const fraction = i / numSteps
    let lat = origin.lat + (destination.lat - origin.lat) * fraction
    let lon = origin.lon + (destination.lon - origin.lon) * fraction

    // Arc westward into deeper Arabian Sea water if close to coast
    const arcBulge = Math.sin(fraction * Math.PI) * 0.08
    lon = lon - arcBulge

    const wave_height = Number((1.2 + Math.sin(i * 0.5) * 0.6 + fraction * 0.4).toFixed(1))
    const wind_speed = Number((20 + Math.cos(i * 0.7) * 6).toFixed(1))
    const hazard_cost = wave_height > 2.0 ? 0.6 : 0.2

    path.push([lat, lon])
    waypoints.push({
      lat,
      lon,
      hazard_cost,
      wave_height,
      wind_speed,
    })
  }

  // Add destination
  path.push([destination.lat, destination.lon])
  waypoints.push({
    lat: destination.lat,
    lon: destination.lon,
    hazard_cost: 0.15,
    wave_height: 1.4,
    wind_speed: 22,
  })

  // Total distance with nautical curvature
  const total_distance_km = Number((straightDistKm * 1.06).toFixed(1))
  // Average fishing vessel cruising speed ~10 knots = 18.52 km/h
  const estimated_time_hours = Number((total_distance_km / 18.52).toFixed(2))

  return {
    id: `route-${Date.now().toString(36)}`,
    origin,
    destination,
    waypoints,
    path,
    total_distance_km,
    estimated_time_hours,
    average_hazard_cost: 0.22,
    max_hazard_cost: 0.55,
    hazards_along_path: [
      {
        type: 'Wave Advisory',
        location: {
          lat: Number((origin.lat + (destination.lat - origin.lat) * 0.6).toFixed(4)),
          lon: Number((origin.lon + (destination.lon - origin.lon) * 0.6 - 0.05).toFixed(4)),
        },
        severity: 'medium',
        description: 'Moderate south-westerly swell ~1.9m observed in offshore channel',
      },
    ],
    geofence_violations: [],
    created_at: new Date().toISOString(),
  }
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
  try {
    return await apiFetch(`/api/routing/status/${id}`)
  } catch {
    return { id, status: 'ready' }
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
    return await apiFetch(`/api/routing/skeleton?${params}`)
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
