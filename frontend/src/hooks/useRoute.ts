import { useCallback } from 'react'
import { useRouteStore } from '../store/routeStore'
import { computeRoute, checkReroute } from '../services/routing'
import type { PointCoord } from '../services/agents'

export function useRoute() {
  const {
    activeRoute,
    origin,
    destination,
    setActiveRoute,
    setOrigin,
    setDestination,
    setComputing,
    setError,
    setRerouteStatus,
    setDashboardOpen,
  } = useRouteStore()

  const compute = useCallback(async (from?: PointCoord, to?: PointCoord) => {
    const o = from || origin
    const d = to || destination

    if (!o || !d) {
      setError('Please set both origin and destination')
      return
    }

    setComputing(true)
    setError(null)
    try {
      const route = await computeRoute(o, d)
      setActiveRoute(route)
      setDashboardOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route computation failed')
    } finally {
      setComputing(false)
    }
  }, [origin, destination, setActiveRoute, setComputing, setError, setDashboardOpen])

  const checkForReroute = useCallback(async () => {
    if (!activeRoute) return

    try {
      const status = await checkReroute(activeRoute.id)
      setRerouteStatus(status)

      if (status.needs_reroute && origin && destination) {
        // Auto-reroute
        await compute(origin, destination)
      }
    } catch (err) {
      console.error('Reroute check failed:', err)
    }
  }, [activeRoute, origin, destination, setRerouteStatus, compute])

  return {
    activeRoute,
    origin,
    destination,
    setOrigin,
    setDestination,
    compute,
    checkForReroute,
  }
}
