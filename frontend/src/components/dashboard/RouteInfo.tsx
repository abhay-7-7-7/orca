import type { ComputedRoute } from '../../services/routing'

export default function RouteInfo({ route }: { route: ComputedRoute }) {
  // Derive safety score: if we have hazard_summary, use max wave; otherwise use is_safe flag
  const safetyScore = route.is_safe
    ? route.hazard_summary
      ? Math.max(0, 100 - (route.hazard_summary.max_wave_height_m / 4) * 60)
      : 85
    : 35

  return (
    <div className="bg-cream-50 rounded-xl p-4 border border-cream-200">
      <h3 className="text-sm font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500" />
        Route Information
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-cream-400 uppercase tracking-wider mb-0.5">ETA</p>
          <p className="text-2xl font-semibold text-charcoal-900 font-sans">
            {formatDuration(route.estimated_time_hours)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-cream-400 uppercase tracking-wider mb-0.5">Distance</p>
          <p className="text-2xl font-semibold text-charcoal-900 font-sans">
            {route.total_distance_km.toFixed(1)}
            <span className="text-sm text-cream-400 ml-1">km</span>
          </p>
        </div>
      </div>

      {/* Safety score bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-cream-400 uppercase tracking-wider">Safety Score</p>
          <p className={`text-sm font-semibold ${
            safetyScore >= 70 ? 'text-emerald-600' :
            safetyScore >= 40 ? 'text-amber-600' :
            'text-red-600'
          }`}>
            {safetyScore.toFixed(0)}%
          </p>
        </div>
        <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              safetyScore >= 70 ? 'bg-emerald-500' :
              safetyScore >= 40 ? 'bg-amber-500' :
              'bg-red-500'
            }`}
            style={{ width: `${safetyScore}%` }}
          />
        </div>
      </div>

      {/* Hazard summary */}
      {route.hazard_summary && (
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-blue-50 rounded-lg px-2 py-1.5 border border-blue-100">
            <p className="text-blue-500 font-medium">Max Wave</p>
            <p className="text-charcoal-900 font-semibold">
              {route.hazard_summary.max_wave_height_m.toFixed(1)}m
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-2 py-1.5 border border-blue-100">
            <p className="text-blue-500 font-medium">Max Wind</p>
            <p className="text-charcoal-900 font-semibold">
              {route.hazard_summary.max_wind_speed_kmh.toFixed(0)} km/h
            </p>
          </div>
        </div>
      )}

      {/* Route details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-cream-400">Origin</span>
          <span className="text-charcoal-900 font-medium">
            {route.origin.lat.toFixed(2)}°N, {route.origin.lon.toFixed(2)}°E
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-400">Destination</span>
          <span className="text-charcoal-900 font-medium">
            {route.destination.lat.toFixed(2)}°N, {route.destination.lon.toFixed(2)}°E
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-400">Waypoints</span>
          <span className="text-charcoal-900 font-medium">
            {route.waypoints?.length || route.path?.length || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-400">Algorithm</span>
          <span className="text-charcoal-900 font-medium text-xs">
            {route.algorithm}
          </span>
        </div>
        {route.warnings?.length > 0 && (
          <div className="bg-red-50 rounded-lg px-3 py-2 mt-2 border border-red-200">
            <p className="text-xs text-red-700 font-medium">
              {route.warnings.join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}
