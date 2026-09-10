import { create } from 'zustand'
import type { ComputedRoute, RerouteCheck } from '../services/routing'
import type { PointCoord } from '../services/agents'

interface RouteState {
  /* Active route */
  activeRoute: ComputedRoute | null
  setActiveRoute: (route: ComputedRoute | null) => void

  /* Origin / destination */
  origin: PointCoord | null
  destination: PointCoord | null
  setOrigin: (point: PointCoord | null) => void
  setDestination: (point: PointCoord | null) => void

  /* Reroute */
  rerouteStatus: RerouteCheck | null
  setRerouteStatus: (status: RerouteCheck | null) => void

  /* UI state */
  computing: boolean
  setComputing: (computing: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  dashboardOpen: boolean
  setDashboardOpen: (open: boolean) => void
}

export const useRouteStore = create<RouteState>((set) => ({
  activeRoute: null,
  setActiveRoute: (route) => set({ activeRoute: route, error: null }),

  origin: { lat: 9.9312, lon: 76.2673 }, /* Default: Kochi harbour */
  destination: null,
  setOrigin: (point) => set({ origin: point }),
  setDestination: (point) => set({ destination: point }),

  rerouteStatus: null,
  setRerouteStatus: (status) => set({ rerouteStatus: status }),

  computing: false,
  setComputing: (computing) => set({ computing }),
  error: null,
  setError: (error) => set({ error }),
  dashboardOpen: false,
  setDashboardOpen: (open) => set({ dashboardOpen: open }),
}))
