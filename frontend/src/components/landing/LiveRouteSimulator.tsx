import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useRouteStore } from '../../store/routeStore'

interface RouteScenario {
  id: string
  originName: string
  destName: string
  origin: { lat: number; lon: number }
  dest: { lat: number; lon: number }
  distanceKm: number
  etaHours: number
  hazardAvoided: string
  safetyScore: number
  fuelSaved: string
}

const SCENARIOS: RouteScenario[] = [
  {
    id: 'kochi-upwelling',
    originName: 'Kochi (Cochin) Port',
    destName: 'Kochi Shelf PFZ #1 (Score 94%)',
    origin: { lat: 9.9312, lon: 76.2673 },
    dest: { lat: 9.85, lon: 75.60 },
    distanceKm: 78.4,
    etaHours: 4.2,
    hazardAvoided: 'Rerouted 8 NM North to circumvent 2.6m wave swell & shallow mudbanks',
    safetyScore: 92,
    fuelSaved: '14% vs direct trawler course',
  },
  {
    id: 'vizhinjam-wadge',
    originName: 'Vizhinjam International Seaport',
    destName: 'Wadge Bank Thermal Front (Score 89%)',
    origin: { lat: 8.3750, lon: 76.9910 },
    dest: { lat: 8.40, lon: 76.85 },
    distanceKm: 42.1,
    etaHours: 2.3,
    hazardAvoided: 'Hard boundary enforced along Marine Protected Area (MPA) buffer',
    safetyScore: 96,
    fuelSaved: '18% via coastal current assist',
  },
  {
    id: 'beypore-malabar',
    originName: 'Kozhikode (Beypore) Port',
    destName: 'Malabar Thermal Boundary (Score 84%)',
    origin: { lat: 11.1640, lon: 75.8020 },
    dest: { lat: 10.50, lon: 75.30 },
    distanceKm: 96.2,
    etaHours: 5.1,
    hazardAvoided: 'Circumvented strong 32 km/h cross-winds in outer shipping channel',
    safetyScore: 88,
    fuelSaved: '12% fuel optimization',
  },
]

export default function LiveRouteSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<RouteScenario>(SCENARIOS[0])
  const setOrigin = useRouteStore((s) => s.setOrigin)
  const setDestination = useRouteStore((s) => s.setDestination)

  const handleApplyToMap = (s: RouteScenario) => {
    setOrigin(s.origin)
    setDestination(s.dest)
  }

  return (
    <section className="py-20 md:py-28 bg-cream-50 border-t border-cream-200">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="label-caps mb-3 inline-block">Interactive Navigation Preview</span>
          <h2 className="text-heading md:text-display font-serif text-charcoal-900 mb-4">
            See how ORCA reasons about the sea
          </h2>
          <p className="text-cream-400 text-base md:text-lg font-sans">
            Unlike standard nautical GPS that draws a straight line across danger, ORCA’s A* routing evaluates wave swell, wind shear, EEZ fences, and marine protected areas.
          </p>
        </div>

        {/* Live Simulator Widget Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-cream-300 overflow-hidden max-w-4xl mx-auto font-sans">
          {/* Top selection bar */}
          <div className="p-4 sm:p-6 bg-cream-100/60 border-b border-cream-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Select Voyage Scenario
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SCENARIOS.map((s) => {
                const isActive = s.id === selectedScenario.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isActive
                        ? 'bg-white border-terracotta-500 shadow-md ring-1 ring-terracotta-500/30'
                        : 'bg-white/60 border-cream-300 hover:bg-white text-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-terracotta-600 uppercase">Scenario</span>
                      {isActive && <span className="text-xs font-bold text-emerald-600">Active</span>}
                    </div>
                    <p className="text-xs font-bold text-charcoal-900 truncate">{s.originName.split(' ')[0]} → PFZ</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{s.distanceKm} km · {s.etaHours}h</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reasoning Dashboard Panel */}
          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Metrics column */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-cream-200">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Origin Port</span>
                  <p className="text-base font-bold text-charcoal-900 mt-0.5">
                    {selectedScenario.originName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Target Hotspot</span>
                  <p className="text-base font-bold text-emerald-700 mt-0.5 justify-end">
                    {selectedScenario.destName.split('(')[0]}
                  </p>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Voyage Dist</span>
                  <p className="text-xl font-bold text-charcoal-900 font-sans mt-0.5">
                    {selectedScenario.distanceKm} <span className="text-xs text-gray-500">km</span>
                  </p>
                </div>
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Estimated ETA</span>
                  <p className="text-xl font-bold text-charcoal-900 font-sans mt-0.5">
                    {selectedScenario.etaHours} <span className="text-xs text-gray-500">hrs</span>
                  </p>
                </div>
                <div className="bg-cream-50 p-3 rounded-xl border border-cream-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Safety Index</span>
                  <p className="text-xl font-bold text-emerald-600 font-sans mt-0.5">
                    {selectedScenario.safetyScore}%
                  </p>
                </div>
              </div>

              {/* Reasoning Callout */}
              <div className="bg-cream-100/70 rounded-xl p-4 border border-cream-300 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider">
                    Autonomous Hazard Reasoning
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                    Efficiency: {selectedScenario.fuelSaved}
                  </span>
                </div>
                <p className="text-charcoal-700 leading-relaxed font-sans">
                  {selectedScenario.hazardAvoided}
                </p>
              </div>
            </div>

            {/* Right Action & Visual column */}
            <div className="lg:col-span-5 bg-charcoal-900 rounded-xl p-6 text-cream-100 flex flex-col justify-between h-full space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs text-cream-400 mb-3">
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

              <Link
                to="/map"
                onClick={() => handleApplyToMap(selectedScenario)}
                className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-terracotta-500/20"
              >
                <span>Launch in Interactive Map</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
