import { useState, useEffect } from 'react'
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
    <div className="bg-white rounded-2xl shadow-xl border border-cream-300 overflow-hidden max-w-4xl mx-auto font-sans">
      {/* Top Selection Bar */}
      <div className="p-4 sm:p-5 bg-cream-100/60 border-b border-cream-200">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
          Select Telemetry Mode
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Tab 1: Sea State */}
          <button
            onClick={() => setActiveTab('weather')}
            className={`p-2.5 sm:p-3 rounded-xl text-left border transition-all ${
              activeTab === 'weather'
                ? 'bg-white border-terracotta-500 shadow-md ring-1 ring-terracotta-500/30'
                : 'bg-white/60 border-cream-300 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-terracotta-600 uppercase">Telemetry</span>
              {activeTab === 'weather' && <span className="text-xs font-bold text-emerald-600">Active</span>}
            </div>
            <p className="text-xs font-bold text-charcoal-900 truncate">Sea State</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Waves · Wind · Baro · SST</p>
          </button>

          {/* Tab 2: Live PFZ Radar */}
          <button
            onClick={() => setActiveTab('pfz')}
            className={`p-2.5 sm:p-3 rounded-xl text-left border transition-all ${
              activeTab === 'pfz'
                ? 'bg-white border-terracotta-500 shadow-md ring-1 ring-terracotta-500/30'
                : 'bg-white/60 border-cream-300 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-terracotta-600 uppercase">Detection</span>
              {activeTab === 'pfz' && <span className="text-xs font-bold text-emerald-600">Active</span>}
            </div>
            <p className="text-xs font-bold text-charcoal-900 truncate">Live PFZ Radar</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Kochi Shelf Front #1 · Wadge</p>
          </button>

          {/* Tab 3: Geofence */}
          <button
            onClick={() => setActiveTab('fleet')}
            className={`p-2.5 sm:p-3 rounded-xl text-left border transition-all ${
              activeTab === 'fleet'
                ? 'bg-white border-terracotta-500 shadow-md ring-1 ring-terracotta-500/30'
                : 'bg-white/60 border-cream-300 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-terracotta-600 uppercase">Security</span>
              {activeTab === 'fleet' && <span className="text-xs font-bold text-emerald-600">Active</span>}
            </div>
            <p className="text-xs font-bold text-charcoal-900 truncate">Geofence</p>
            <p className="text-[11px] text-gray-500 mt-0.5">EEZ Guard · IMBL Sentinel</p>
          </button>
        </div>
      </div>

      {/* Main Dashboard Panel — Proportional spacing, no gaping voids */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-cream-200">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase">Marine Basin</span>
              <p className="text-base font-bold text-charcoal-900 mt-0.5">
                ARABIAN SEA
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Live Marine Telemetry</span>
              <p className="text-base font-bold text-charcoal-900 mt-0.5 font-mono">
                {timeStr || '16:52:05 IST'}
              </p>
            </div>
          </div>

          {activeTab === 'weather' && (
            <>
              {/* 4 Metric Cards in 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-center">
                {/* Wave Swell */}
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    <span>Wave Swell</span>
                    <span className="text-emerald-600 font-bold">● Safe</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal-900 font-sans mt-0.5">
                    1.4 <span className="text-xs text-gray-500 font-normal">meters</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Slight chop · Period 8.2s</p>
                </div>

                {/* Wind Vector */}
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    <span>Wind Vector</span>
                    <span className="text-sky-600 font-bold font-mono">245° WSW</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal-900 font-sans mt-0.5">
                    18.5 <span className="text-xs text-gray-500 font-normal">km/h</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">10.0 knots · Moderate breeze</p>
                </div>

                {/* Surface Temp (SST) */}
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    <span>Surface Temp</span>
                    <span className="text-terracotta-600 font-bold font-mono">OISST</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal-900 font-sans mt-0.5">
                    28.6 <span className="text-xs text-gray-500 font-normal">°C</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">Nutrient Upwelling Front</p>
                </div>

                {/* Atmospheric Baro */}
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1 font-semibold uppercase">
                    <span>Baro Pressure</span>
                    <span className="text-gray-500 font-medium">Nominal</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal-900 font-sans mt-0.5">
                    1012 <span className="text-xs text-gray-500 font-normal">hPa</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Stable · Cyclone Risk: 0.0%</p>
                </div>
              </div>

              {/* Reasoning Callout */}
              <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200 text-xs">
                <div>
                  <span className="font-bold text-emerald-950 block mb-0.5">Optimal Fishing Conditions</span>
                  <p className="text-emerald-800 leading-relaxed">
                    Clear navigation corridor out of Kochi Harbor up to 45 NM
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'pfz' && (
            <>
              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">SST Gradient</span>
                  <p className="text-base sm:text-lg font-bold text-charcoal-900 font-sans mt-0.5">
                    0.78 <span className="text-[10px] text-gray-500 font-normal">°C/10km</span>
                  </p>
                </div>
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Chlorophyll-a</span>
                  <p className="text-base sm:text-lg font-bold text-emerald-700 font-sans mt-0.5">
                    1.85 <span className="text-[10px] text-gray-500 font-normal">mg/m³</span>
                  </p>
                </div>
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">PFZ Score</span>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 font-sans mt-0.5">
                    94%
                  </p>
                </div>
              </div>

              <div className="bg-cream-50 rounded-xl p-3 border border-cream-200 text-xs space-y-1">
                <span className="font-bold text-charcoal-900 block">Kochi Shelf Front #1 (34 NM West)</span>
                <p className="text-charcoal-700 leading-relaxed">
                  Coordinates: 9.85°N, 75.60°E · Target Species: Mackerel, Sardine
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold pt-0.5">
                  Secondary Front: Wadge Bank Front (89% Confidence) · 8.40°N, 76.85°E
                </p>
              </div>
            </>
          )}

          {activeTab === 'fleet' && (
            <>
              {/* 2 Big Metric Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-center">
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">EEZ Sentinel</span>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal-900 font-sans mt-0.5">
                    200 <span className="text-xs text-gray-500 font-normal">NM</span>
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">100% Boundary Enforced</p>
                </div>

                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">IMBL Violations</span>
                  <p className="text-xl sm:text-2xl font-bold text-charcoal-900 font-sans mt-0.5">
                    0
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">Zero IMBL Crossings</p>
                </div>
              </div>

              <div className="bg-cream-50 rounded-xl p-3 border border-cream-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Marine Protected Areas (MPA):</span>
                  <span className="font-semibold text-charcoal-900 bg-cream-200/90 border border-cream-300 px-2.5 py-0.5 rounded text-[11px]">
                    Vembanad Buffer Protected
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">AIS Vessels Active in Sector:</span>
                  <span className="font-bold text-charcoal-900 font-mono">5 Tracked Crafts</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Action & Visual Column (5 cols) — No pulsing dot, balanced spacing */}
        <div className="lg:col-span-5 bg-charcoal-900 rounded-xl p-5 sm:p-6 text-cream-100 flex flex-col justify-between h-full space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs text-cream-400 mb-2.5">
              <span className="font-mono uppercase">Status</span>
              <span className="text-emerald-400 font-bold text-xs tracking-wider">
                VERIFIED NAVIGABLE
              </span>
            </div>
            <h4 className="text-lg font-serif text-white font-bold mb-2">
              Ready to deploy to vessel?
            </h4>
            <p className="text-xs text-cream-300/80 leading-relaxed">
              Open this route directly in the full OpenSeaMap viewer to inspect live wind streamlines, sea surface thermal fronts, and waypoint advisories.
            </p>
          </div>

          <div>
            {activeTab === 'weather' && (
              <Link
                to="/map"
                className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-terracotta-500/20"
              >
                <span>View Map →</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            )}

            {activeTab === 'pfz' && (
              <Link
                to="/map"
                onClick={handleRouteToKochiPFZ}
                className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-terracotta-500/20"
              >
                <span>Plan Safe Route to this Hotspot</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            )}

            {activeTab === 'fleet' && (
              <Link
                to="/map"
                className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-terracotta-500/20"
              >
                <span>Open Fleet Geofence Monitor</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
