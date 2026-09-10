import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import { useRoute } from '../../hooks/useRoute'

export default function MapControls() {
  const { t } = useTranslation()
  const layers = useMapStore((s) => s.layers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)
  const origin = useRouteStore((s) => s.origin)
  const destination = useRouteStore((s) => s.destination)
  const computing = useRouteStore((s) => s.computing)
  const error = useRouteStore((s) => s.error)
  const setOrigin = useRouteStore((s) => s.setOrigin)
  const setDestination = useRouteStore((s) => s.setDestination)
  const { compute } = useRoute()

  const [showLayers, setShowLayers] = useState(false)

  return (
    <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-3">
      {/* Route controls */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-cream-300 p-4 w-72"
      >
        <h3 className="text-sm font-semibold font-sans text-charcoal-900 mb-3">
          Route Planner
        </h3>

        {/* Origin */}
        <div className="mb-3">
          <label className="text-xs text-cream-400 font-sans uppercase tracking-wider block mb-1">
            Origin
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={origin?.lat ?? ''}
              onChange={(e) =>
                setOrigin({ lat: parseFloat(e.target.value) || 0, lon: origin?.lon || 0 })
              }
              placeholder="Lat"
              className="flex-1 px-2.5 py-1.5 text-sm border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
            <input
              type="number"
              step="0.01"
              value={origin?.lon ?? ''}
              onChange={(e) =>
                setOrigin({ lat: origin?.lat || 0, lon: parseFloat(e.target.value) || 0 })
              }
              placeholder="Lon"
              className="flex-1 px-2.5 py-1.5 text-sm border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
          </div>
        </div>

        {/* Destination */}
        <div className="mb-4">
          <label className="text-xs text-cream-400 font-sans uppercase tracking-wider block mb-1">
            Destination
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={destination?.lat ?? ''}
              onChange={(e) =>
                setDestination({
                  lat: parseFloat(e.target.value) || 0,
                  lon: destination?.lon || 0,
                })
              }
              placeholder="Lat"
              className="flex-1 px-2.5 py-1.5 text-sm border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
            <input
              type="number"
              step="0.01"
              value={destination?.lon ?? ''}
              onChange={(e) =>
                setDestination({
                  lat: destination?.lat || 0,
                  lon: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="Lon"
              className="flex-1 px-2.5 py-1.5 text-sm border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
          </div>
          <p className="text-[10px] text-cream-400 mt-1">
            💡 Click a PFZ zone on the map to set destination
          </p>
        </div>

        {/* Compute button */}
        <button
          onClick={() => compute()}
          disabled={computing || !origin || !destination}
          className="w-full btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {computing ? (
            <>
              <span className="w-4 h-4 border-2 border-cream-100/30 border-t-cream-100 rounded-full animate-spin" />
              {t('map.computing')}
            </>
          ) : (
            t('map.computeRoute')
          )}
        </button>

        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </motion.div>

      {/* Layer toggles */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-cream-300"
      >
        <button
          onClick={() => setShowLayers(!showLayers)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium font-sans text-charcoal-900"
        >
          {t('map.layers')}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${showLayers ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {showLayers && (
          <div className="px-4 pb-3 space-y-2 border-t border-cream-200">
            {(Object.keys(layers) as Array<keyof typeof layers>).map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-charcoal-800 cursor-pointer py-1"
              >
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => toggleLayer(key)}
                  className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500"
                />
                {key === 'pfz' ? t('map.pfzZones') :
                 key === 'hazards' ? t('map.hazards') :
                 key === 'vessels' ? t('map.vessels') :
                 key === 'eez' ? t('map.eez') :
                 'Route'}
              </label>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
