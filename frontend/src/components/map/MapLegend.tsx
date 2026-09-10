import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapStore } from '../../store/mapStore'

export default function MapLegend() {
  const [collapsed, setCollapsed] = useState(false)
  const layers = useMapStore((s) => s.layers)

  return (
    <div className="absolute bottom-6 left-4 z-[1000]">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-cream-300 overflow-hidden min-w-[220px] max-w-[260px]">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-charcoal-900 bg-cream-50/80 hover:bg-cream-100/80 transition-colors border-b border-cream-200"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sm">🧭</span> OpenSeaMap Legend
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        {/* Content */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3 space-y-3 text-[11px] font-sans"
            >
              {/* Wind Streamlines */}
              {layers.windStream && (
                <div>
                  <div className="flex items-center justify-between font-medium text-charcoal-800 mb-1">
                    <span>💨 Wind Streamlines</span>
                    <span className="text-[10px] text-cyan-700 font-bold">Flow Vectors</span>
                  </div>
                  <div className="h-2 rounded-full w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-1" />
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>Cyan (Light air)</span>
                    <span>Purple (Strong gale)</span>
                  </div>
                </div>
              )}

              {/* SST Thermal Scale */}
              {layers.sst && (
                <div>
                  <div className="flex items-center justify-between font-medium text-charcoal-800 mb-1">
                    <span>🌡️ SST Heatmap</span>
                    <span className="text-[10px] text-gray-500">24°C – 32°C</span>
                  </div>
                  <div className="h-2 rounded-full w-full bg-gradient-to-r from-blue-600 via-emerald-400 via-amber-400 to-red-600 mb-1" />
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>Cold Upwelling</span>
                    <span>Warm Surface</span>
                  </div>
                </div>
              )}

              {/* Wave Height */}
              {layers.waves && (
                <div>
                  <div className="flex items-center justify-between font-medium text-charcoal-800 mb-1">
                    <span>🌊 Wave Swell</span>
                    <span className="text-[10px] text-gray-500">Meters</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-charcoal-700">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block" /> &lt;1.5m
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> 1.5–2.5m
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-red-600 inline-block" /> &gt;2.5m
                    </span>
                  </div>
                </div>
              )}

              {/* Maritime Features */}
              <div className="pt-2 border-t border-cream-200 space-y-1 text-[10px] text-charcoal-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">
                    🐟
                  </span>
                  <span>PFZ Potential Fishing Zone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-500 inline-block border-t border-dashed" />
                  <span>Indian EEZ Limit (200 NM)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-terracotta-500 inline-block" />
                  <span>ORCA Navigational Route</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-red-500">⚠️</span>
                  <span>Severe Wave / Hazard Alert</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
