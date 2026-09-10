import { useEffect } from 'react'
import MapView from '../components/map/MapView'
import MapControls from '../components/map/MapControls'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import ChatBar from '../components/chatbot/ChatBar'
import { useWorldState } from '../hooks/useWorldState'
import { useRouteStore } from '../store/routeStore'
import { useMapStore } from '../store/mapStore'
import { useChatStore } from '../store/chatStore'

export default function MapDashboard() {
  useWorldState()

  const loading = useMapStore((s) => s.loading)
  const setView = useMapStore((s) => s.setView)
  const activeRoute = useRouteStore((s) => s.activeRoute)
  const dashboardOpen = useRouteStore((s) => s.dashboardOpen)
  const setDashboardOpen = useRouteStore((s) => s.setDashboardOpen)
  const mapTarget = useChatStore((s) => s.mapTarget)

  // Auto-open dashboard when route is computed
  useEffect(() => {
    if (activeRoute) {
      setDashboardOpen(true)
    }
  }, [activeRoute, setDashboardOpen])

  // Bridge: when chat sets a mapTarget, fly the main map there
  useEffect(() => {
    if (
      mapTarget &&
      Number.isFinite(Number(mapTarget.lat)) &&
      Number.isFinite(Number(mapTarget.lon))
    ) {
      const zoom = Number.isFinite(Number(mapTarget.zoom))
        ? Number(mapTarget.zoom)
        : 10
      setView([Number(mapTarget.lat), Number(mapTarget.lon)], zoom)
    }
  }, [mapTarget, setView])

  return (
    <div className="fixed inset-0 pt-16">
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-16 left-0 right-0 z-[1001] h-1 bg-cream-200">
          <div className="h-full bg-terracotta-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Map */}
      <div className="w-full h-full relative">
        <MapView />
        <MapControls />
        <DashboardPanel />
      </div>

      {/* Floating chat bar */}
      <ChatBar />
    </div>
  )
}
