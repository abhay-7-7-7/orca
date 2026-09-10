import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useRouteStore } from '../../store/routeStore'

export default function HeroLiveWidget() {
  const [timeStr, setTimeStr] = useState('')
  const [activeTab, setActiveTab] = useState<'weather' | 'pfz' | 'fleet'>('weather')
  const setDestination = useRouteStore((s) => s.setDestination)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRouteToKochiPFZ = () => {
    setDestination({ lat: 9.85, lon: 75.60 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-lg mx-auto lg:max-w-none"
    >
      {/* Main architectural card */}
      <div className="relative bg-white rounded-xl shadow-lg border border-cream-300 overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-cream-50/90 border-b border-cream-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-charcoal-900">
              Live Marine Telemetry
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-cream-300 font-mono text-gray-500">
              {timeStr || '13:42:10 IST'}
            </span>
            <span className="text-[10px] font-bold text-terracotta-600 bg-terracotta-50 px-2 py-0.5 rounded-full border border-terracotta-200/60">
              ARABIAN SEA
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-cream-200 bg-white/50 text-xs font-medium text-gray-500">
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'weather'
                ? 'border-terracotta-500 text-charcoal-900 font-bold bg-white'
                : 'border-transparent hover:text-charcoal-800'
            }`}
          >
            <span>🌊</span> Sea State
          </button>
          <button
            onClick={() => setActiveTab('pfz')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'pfz'
                ? 'border-terracotta-500 text-charcoal-900 font-bold bg-white'
                : 'border-transparent hover:text-charcoal-800'
            }`}
          >
            <span>🐟</span> Live PFZ Radar
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'fleet'
                ? 'border-terracotta-500 text-charcoal-900 font-bold bg-white'
                : 'border-transparent hover:text-charcoal-800'
            }`}
          >
            <span>🛡️</span> Geofence
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-5">
          {activeTab === 'weather' && (
            <motion.div
              key="weather"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Primary metric grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                    <span>Wave Swell</span>
                    <span className="text-emerald-600 font-bold">● Safe</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-sans text-charcoal-900">1.4</span>
                    <span className="text-xs font-semibold text-gray-500">meters</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Slight chop · Period 8.2s</p>
                </div>

                <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                    <span>Wind Vector</span>
                    <span className="text-cyan-600 font-bold">245° WSW</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-sans text-charcoal-900">18.5</span>
                    <span className="text-xs font-semibold text-gray-500">km/h</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">10.0 knots · Moderate breeze</p>
                </div>

                <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                    <span>Surface Temp (SST)</span>
                    <span className="text-terracotta-600 font-bold">OISST</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-sans text-charcoal-900">28.6</span>
                    <span className="text-xs font-semibold text-gray-500">°C</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium mt-1">Nutrient Upwelling Front</p>
                </div>

                <div className="bg-cream-50/80 rounded-xl p-3 border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                    <span>Atmospheric Baro</span>
                    <span className="text-gray-500 font-medium">Nominal</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-sans text-charcoal-900">1012</span>
                    <span className="text-xs font-semibold text-gray-500">hPa</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Stable · Cyclone Risk: 0.0%</p>
                </div>
              </div>

              {/* Status callout */}
              <div className="bg-emerald-50/90 rounded-xl p-3 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌤️</span>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Optimal Fishing Conditions</p>
                    <p className="text-[11px] text-emerald-800">Clear navigation corridor out of Kochi Harbor up to 45 NM</p>
                  </div>
                </div>
                <Link
                  to="/map"
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex-shrink-0"
                >
                  View Map →
                </Link>
              </div>
            </motion.div>
          )}

          {activeTab === 'pfz' && (
            <motion.div
              key="pfz"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="bg-cream-50/90 rounded-xl p-3.5 border border-cream-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                      🐟
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal-900">Kochi Shelf Front #1</h4>
                      <p className="text-[10px] text-gray-500">9.85°N, 75.60°E (34 NM West)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    94% SCORE
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] bg-white p-2 rounded-lg border border-cream-200/80 mb-3">
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase">SST Gradient</span>
                    <span className="font-bold text-charcoal-900">0.78°C / 10km</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase">Chlorophyll-a</span>
                    <span className="font-bold text-emerald-700">1.85 mg/m³</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase">Species</span>
                    <span className="font-bold text-charcoal-900">Mackerel, Sardine</span>
                  </div>
                </div>

                <Link
                  to="/map"
                  onClick={handleRouteToKochiPFZ}
                  className="w-full py-2 bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>🧭</span> Plan Safe Route to this Hotspot
                </Link>
              </div>

              <div className="bg-cream-50/60 rounded-xl p-2.5 border border-cream-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📍</span>
                  <span className="font-medium text-charcoal-800">Wadge Bank Front (89% Confidence)</span>
                </div>
                <span className="text-[10px] text-gray-400">8.40°N, 76.85°E</span>
              </div>
            </motion.div>
          )}

          {activeTab === 'fleet' && (
            <motion.div
              key="fleet"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-cream-50/80 p-2.5 rounded-xl border border-cream-200">
                  <span className="text-xl font-bold text-charcoal-900">200 NM</span>
                  <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">Indian EEZ Guard</p>
                  <p className="text-[10px] text-emerald-600 font-medium">100% Boundary Enforced</p>
                </div>

                <div className="bg-cream-50/80 p-2.5 rounded-xl border border-cream-200">
                  <span className="text-xl font-bold text-charcoal-900">0</span>
                  <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">Border Violations</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Zero IMBL Crossings</p>
                </div>
              </div>

              <div className="bg-cream-50/90 rounded-xl p-3 border border-cream-200 text-xs space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">Marine Protected Areas (MPA):</span>
                  <span className="font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">Vembanad Buffer Protected</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">AIS Vessels Active in Sector:</span>
                  <span className="font-bold text-charcoal-900">5 Tracked Crafts</span>
                </div>
              </div>

              <Link
                to="/map"
                className="w-full py-2 bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>🗺️</span> Open Fleet Geofence Monitor
              </Link>
            </motion.div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-5 py-2.5 bg-cream-50/60 border-t border-cream-200 text-[10px] text-gray-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>🛰️</span> NOAA OISST · Open-Meteo · INCOIS Framework
          </span>
          <span className="text-emerald-700 font-semibold">100% Automated Fusion</span>
        </div>
      </div>
    </motion.div>
  )
}
