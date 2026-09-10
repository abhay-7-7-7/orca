import { useEffect } from 'react'
import MapView from '../components/map/MapView'
import MapControls from '../components/map/MapControls'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import { useWorldState } from '../hooks/useWorldState'
import { useRouteStore } from '../store/routeStore'
import { useMapStore } from '../store/mapStore'
import { useHealthStore } from '../store/healthStore'

export default function MapDashboard() {
  useWorldState()

  const loading = useMapStore((s) => s.loading)
  const activeRoute = useRouteStore((s) => s.activeRoute)
  const dashboardOpen = useRouteStore((s) => s.dashboardOpen)
  const setDashboardOpen = useRouteStore((s) => s.setDashboardOpen)
  const agents = useHealthStore((s) => s.agents)

  // Auto-open dashboard when route is computed
  useEffect(() => {
    if (activeRoute) {
      setDashboardOpen(true)
    }
  }, [activeRoute, setDashboardOpen])

  const mockAgents = agents.filter((a) => a.status === 'mock')

  return (
    <div className="fixed inset-0 pt-16">
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-16 left-0 right-0 z-[1001] h-1 bg-cream-200">
          <div className="h-full bg-terracotta-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Mock agents badge */}
      {mockAgents.length > 0 && (
        <div className="absolute top-20 right-4 z-[1001]">
          <div className="bg-amber-50/95 backdrop-blur-md border border-amber-200 rounded-lg px-3 py-2 shadow-sm">
            <p className="text-[10px] text-amber-700 flex items-center gap-1.5">
              <span className="status-dot mock" />
              {mockAgents.length} agent{mockAgents.length > 1 ? 's' : ''} using demo data
            </p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="w-full h-full relative">
        <MapView />
        <MapControls />
        <DashboardPanel />
      </div>
    </div>
  )
}
