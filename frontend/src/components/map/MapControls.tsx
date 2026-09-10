import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import { useRoute } from '../../hooks/useRoute'

const HARBOR_PRESETS = [
  { name: 'Kochi (Cochin) Port', lat: 9.9312, lon: 76.2673 },
  { name: 'Vizhinjam Port', lat: 8.3750, lon: 76.9910 },
  { name: 'Kollam (Neendakara)', lat: 8.8780, lon: 76.5820 },
  { name: 'Kozhikode (Beypore)', lat: 11.1640, lon: 75.8020 },
  { name: 'Mangalore Old Port', lat: 12.8520, lon: 74.8380 },
]

const TARGET_PRESETS = [
  { name: 'PFZ Kochi Upwelling (Score 94%)', lat: 9.85, lon: 75.60 },
  { name: 'PFZ Wadge Bank Front (Score 89%)', lat: 8.40, lon: 76.85 },
  { name: 'PFZ Malabar Thermal (Score 84%)', lat: 10.50, lon: 75.30 },
  { name: 'PFZ Alappuzha Mudbank (Score 91%)', lat: 9.35, lon: 75.75 },
]

export default function MapControls() {
  const { t } = useTranslation()
  const layers = useMapStore((s) => s.layers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)
  const mapClickMode = useMapStore((s) => s.mapClickMode)
  const setMapClickMode = useMapStore((s) => s.setMapClickMode)
  const setView = useMapStore((s) => s.setView)

  const origin = useRouteStore((s) => s.origin)
  const destination = useRouteStore((s) => s.destination)
  const computing = useRouteStore((s) => s.computing)
  const error = useRouteStore((s) => s.error)
  const setOrigin = useRouteStore((s) => s.setOrigin)
  const setDestination = useRouteStore((s) => s.setDestination)
  const { compute } = useRoute()

  const [showLayers, setShowLayers] = useState(true)

  const handlePresetOrigin = (preset: typeof HARBOR_PRESETS[0]) => {
    setOrigin({ lat: preset.lat, lon: preset.lon })
    setView([preset.lat, preset.lon], 9)
  }

  const handlePresetTarget = (preset: typeof TARGET_PRESETS[0]) => {
    setDestination({ lat: preset.lat, lon: preset.lon })
  }

  const handleQuickDemo = () => {
    const orig = { lat: 9.9312, lon: 76.2673 } // Kochi Port
    const dest = { lat: 9.85, lon: 75.60 } // PFZ Kochi Upwelling
    setOrigin(orig)
    setDestination(dest)
    setView([9.89, 75.93], 9)
    compute(orig, dest)
  }

  return (
    <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-3 max-w-xs">
      {/* Route Planner Card */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-cream-300 p-4 w-80"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-sans text-charcoal-900 flex items-center gap-1.5">
            <span>🗺️</span> Marine Route Planner
          </h3>
          <button
            onClick={handleQuickDemo}
            className="text-[10px] bg-terracotta-50 text-terracotta-600 hover:bg-terracotta-100 font-bold px-2 py-0.5 rounded border border-terracotta-200 transition-colors"
            title="1-Click demo: Kochi port to high-yield PFZ zone"
          >
            ⚡ Quick Demo
          </button>
        </div>

        {/* Origin Input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <span>⚓</span> Origin (Harbor)
            </label>
            <button
              onClick={() => setMapClickMode(mapClickMode === 'set_origin' ? 'none' : 'set_origin')}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                mapClickMode === 'set_origin'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              {mapClickMode === 'set_origin' ? 'Cancel Click' : '📍 Pick on Map'}
            </button>
          </div>

          <div className="flex gap-2 mb-1.5">
            <input
              type="number"
              step="0.01"
              value={origin?.lat ?? ''}
              onChange={(e) =>
                setOrigin({ lat: parseFloat(e.target.value) || 0, lon: origin?.lon || 0 })
              }
              placeholder="Lat"
              className="w-1/2 px-2.5 py-1 text-xs border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
            <input
              type="number"
              step="0.01"
              value={origin?.lon ?? ''}
              onChange={(e) =>
                setOrigin({ lat: origin?.lat || 0, lon: parseFloat(e.target.value) || 0 })
              }
              placeholder="Lon"
              className="w-1/2 px-2.5 py-1 text-xs border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
          </div>

          <select
            onChange={(e) => {
              const selected = HARBOR_PRESETS.find((p) => p.name === e.target.value)
              if (selected) handlePresetOrigin(selected)
            }}
            className="w-full text-xs py-1 px-2 border border-cream-300 rounded bg-white text-charcoal-800 focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Select Port Preset...</option>
            {HARBOR_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.lat.toFixed(2)}°N, {p.lon.toFixed(2)}°E)
              </option>
            ))}
          </select>
        </div>

        {/* Destination Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <span>🎯</span> Destination Target
            </label>
            <button
              onClick={() => setMapClickMode(mapClickMode === 'set_destination' ? 'none' : 'set_destination')}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                mapClickMode === 'set_destination'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {mapClickMode === 'set_destination' ? 'Cancel Click' : '🎯 Pick on Map'}
            </button>
          </div>

          <div className="flex gap-2 mb-1.5">
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
              className="w-1/2 px-2.5 py-1 text-xs border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
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
              className="w-1/2 px-2.5 py-1 text-xs border border-cream-300 rounded-md bg-cream-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
            />
          </div>

          <select
            onChange={(e) => {
              const selected = TARGET_PRESETS.find((p) => p.name === e.target.value)
              if (selected) handlePresetTarget(selected)
            }}
            className="w-full text-xs py-1 px-2 border border-cream-300 rounded bg-white text-charcoal-800 focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Select Target Fishing Spot...</option>
            {TARGET_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Compute Button */}
        <button
          onClick={() => compute()}
          disabled={computing || !origin || !destination}
          className="w-full btn-primary justify-center py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {computing ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Computing Safe Route...
            </>
          ) : (
            '🧭 Compute Hazard-Aware Route'
          )}
        </button>

        {error && (
          <p className="text-xs text-red-600 mt-2 bg-red-50 p-1.5 rounded border border-red-200">
            {error}
          </p>
        )}
      </motion.div>

      {/* Layer Visibility Control */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-cream-300 overflow-hidden w-80"
      >
        <button
          onClick={() => setShowLayers(!showLayers)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold font-sans text-charcoal-900 bg-cream-50/60 hover:bg-cream-100/60 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span>🥞</span> Map Layers & Overlays
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${showLayers ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {showLayers && (
          <div className="px-4 py-2.5 space-y-1.5 border-t border-cream-200 text-xs">
            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>💨</span> Wind Streamlines (OpenSeaMap)
              </span>
              <input
                type="checkbox"
                checked={layers.windStream}
                onChange={() => toggleLayer('windStream')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>🧭</span> Wind Barbs
              </span>
              <input
                type="checkbox"
                checked={layers.windBarbs}
                onChange={() => toggleLayer('windBarbs')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>⚓</span> OpenSeaMap Seamarks
              </span>
              <input
                type="checkbox"
                checked={layers.seamarks}
                onChange={() => toggleLayer('seamarks')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>🌡️</span> Sea Surface Temp (SST)
              </span>
              <input
                type="checkbox"
                checked={layers.sst}
                onChange={() => toggleLayer('sst')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>🌊</span> Wave Height Overlay
              </span>
              <input
                type="checkbox"
                checked={layers.waves}
                onChange={() => toggleLayer('waves')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>🐟</span> Potential Fishing Zones (PFZ)
              </span>
              <input
                type="checkbox"
                checked={layers.pfz}
                onChange={() => toggleLayer('pfz')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>⚠️</span> Severe Hazard Alerts
              </span>
              <input
                type="checkbox"
                checked={layers.hazards}
                onChange={() => toggleLayer('hazards')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>🇮🇳</span> Indian EEZ & MPAs
              </span>
              <input
                type="checkbox"
                checked={layers.eez}
                onChange={() => toggleLayer('eez')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>🚢</span> AIS Vessel Traffic
              </span>
              <input
                type="checkbox"
                checked={layers.vessels}
                onChange={() => toggleLayer('vessels')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer hover:bg-cream-50/80 px-1 rounded">
              <span className="flex items-center gap-2 text-charcoal-800 font-medium">
                <span>📍</span> Active Navigation Route
              </span>
              <input
                type="checkbox"
                checked={layers.route}
                onChange={() => toggleLayer('route')}
                className="rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-500 cursor-pointer"
              />
            </label>
          </div>
        )}
      </motion.div>
    </div>
  )
}
