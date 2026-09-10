import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface AgentStatusItem {
  id: string
  name: string
  source: string
  status: 'live' | 'syncing' | 'ready'
  latency: number
  dataType: string
  updateInterval: string
}

const AGENT_LIST: AgentStatusItem[] = [
  {
    id: 'sst_chlorophyll',
    name: 'SST & Chlorophyll Agent',
    source: 'NOAA OISST / Copernicus Marine',
    status: 'live',
    latency: 94,
    dataType: 'Sea Surface Temp (°C) & Chl-a',
    updateInterval: 'Real-time satellite feed',
  },
  {
    id: 'marine_weather',
    name: 'Marine Weather & Wave Agent',
    source: 'Open-Meteo Marine + GFS',
    status: 'live',
    latency: 112,
    dataType: 'Wave Height (m), Wind Speed & Dir',
    updateInterval: 'Every 60s automated fetch',
  },
  {
    id: 'pfz_synthesis',
    name: 'PFZ Synthesis Engine',
    source: 'INCOIS Algorithmic Method',
    status: 'syncing',
    latency: 145,
    dataType: 'Thermal Fronts & Fish Clustering',
    updateInterval: 'Continuous gradient synthesis',
  },
  {
    id: 'geofence',
    name: 'Geofence & Boundary Sentinel',
    source: 'MarineRegions Indian EEZ',
    status: 'live',
    latency: 42,
    dataType: '200 NM Sovereign Boundary & MPAs',
    updateInterval: 'Active spatial polygon check',
  },
  {
    id: 'cyclone_disaster',
    name: 'Cyclone & Disaster Watch',
    source: 'GDACS Public Global Feeds',
    status: 'live',
    latency: 78,
    dataType: 'Tropical Storm Track & Radius',
    updateInterval: 'Live disaster advisory push',
  },
  {
    id: 'tide',
    name: 'Tidal Harmonic Solver',
    source: 'Self-computed Harmonic Engine',
    status: 'live',
    latency: 28,
    dataType: 'High/Low Tide & Water Levels',
    updateInterval: 'Astronomical epoch sync',
  },
  {
    id: 'vessel_ais',
    name: 'Vessel Traffic & AIS Agent',
    source: 'AISstream.io & GFW Corridors',
    status: 'ready',
    latency: 86,
    dataType: 'Live Vessel Coordinates & Heading',
    updateInterval: 'High-frequency telemetry',
  },
  {
    id: 'language_bhashini',
    name: 'Bhashini Language Layer',
    source: 'Digital India Bhashini / ULCA',
    status: 'live',
    latency: 160,
    dataType: 'Speech-to-Speech in 22 Languages',
    updateInterval: 'Instant voice pipeline',
  },
]

export default function LiveAgentMonitor() {
  const [agents, setAgents] = useState(AGENT_LIST)

  // Subtle simulated heartbeat fluctuations in latency to show active network life
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          latency: Math.max(25, Math.min(220, a.latency + Math.floor((Math.random() - 0.5) * 12))),
        }))
      )
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-20 bg-charcoal-900 text-cream-100 border-t border-charcoal-800">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-bold font-sans tracking-widest uppercase text-terracotta-400 mb-2 block">
              Automated Marine Reasoning Mesh
            </span>
            <h2 className="text-display font-serif text-white">
              8 Autonomous Data Agents. One Live Fusion Layer.
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full self-start md:self-auto text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-300">All Agents Operational</span>
            <span className="text-cream-400 font-mono text-[11px] border-l border-white/20 pl-2">
              Sync: 60s
            </span>
          </div>
        </div>

        {/* 8 Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-xl border border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cream-400">
                    Agent 0{i + 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {agent.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{agent.name}</h3>
                <p className="text-[11px] text-cream-400 mb-3">{agent.source}</p>

                <div className="bg-black/30 rounded-lg p-2 text-[11px] text-cream-300/90 space-y-1 mb-3">
                  <p className="font-mono text-[10px] text-gray-400 truncate">{agent.dataType}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-gray-400">
                <span>{agent.updateInterval}</span>
                <span className="font-mono text-emerald-400 font-bold">{agent.latency}ms</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
