import { motion, AnimatePresence } from 'framer-motion'
import { useRouteStore } from '../../store/routeStore'
import { useMapStore } from '../../store/mapStore'
import RouteInfo from './RouteInfo'
import HazardCard from './HazardCard'
import RerouteBanner from './RerouteBanner'

export default function DashboardPanel() {
  const dashboardOpen = useRouteStore((s) => s.dashboardOpen)
  const setDashboardOpen = useRouteStore((s) => s.setDashboardOpen)
  const activeRoute = useRouteStore((s) => s.activeRoute)
  const rerouteStatus = useRouteStore((s) => s.rerouteStatus)
  const selectedPFZ = useMapStore((s) => s.selectedPFZ)

  const hasContent = activeRoute || selectedPFZ

  return (
    <AnimatePresence>
      {dashboardOpen && hasContent && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-md border-l border-cream-300 shadow-2xl z-[1000] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-cream-200 px-5 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold font-sans text-charcoal-900">
              Dashboard
            </h2>
            <button
              onClick={() => setDashboardOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-cream-200 flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Reroute banner */}
            {rerouteStatus?.needs_reroute && (
              <RerouteBanner rerouteStatus={rerouteStatus} />
            )}

            {/* Route info */}
            {activeRoute && <RouteInfo route={activeRoute} />}

            {/* Selected PFZ info */}
            {selectedPFZ && (
              <div className="bg-cream-50 rounded-xl p-4 border border-cream-200">
                <h3 className="text-sm font-semibold text-charcoal-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">
                    🐟
                  </span>
                  PFZ Zone {selectedPFZ.label || selectedPFZ.id.slice(0, 6)}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-cream-400 uppercase tracking-wider">Score</p>
                    <p className="text-lg font-semibold text-charcoal-900">
                      {(selectedPFZ.score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-cream-400 uppercase tracking-wider">SST Gradient</p>
                    <p className="text-lg font-semibold text-charcoal-900">
                      {selectedPFZ.sst_gradient.toFixed(2)}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-cream-400 uppercase tracking-wider">Chlorophyll</p>
                    <p className="text-lg font-semibold text-charcoal-900">
                      {selectedPFZ.chlorophyll.toFixed(2)} mg/m³
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-cream-400 uppercase tracking-wider">Position</p>
                    <p className="text-xs font-medium text-charcoal-900">
                      {selectedPFZ.center.lat.toFixed(2)}°N, {selectedPFZ.center.lon.toFixed(2)}°E
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hazards along route */}
            {activeRoute?.hazards_along_path && activeRoute.hazards_along_path.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-cream-400 uppercase tracking-wider mb-3">
                  Hazards along route
                </h3>
                <div className="space-y-2">
                  {activeRoute.hazards_along_path.map((hazard, i) => (
                    <HazardCard key={i} hazard={hazard} />
                  ))}
                </div>
              </div>
            )}

            {/* Mock data notice */}
            <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <span className="status-dot mock" />
                Some agents are using demo data. Check health status for details.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
