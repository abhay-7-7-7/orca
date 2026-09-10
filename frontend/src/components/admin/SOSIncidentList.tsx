import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  AlertTriangle,
  Flame,
  Wrench,
  HeartPulse,
  CloudLightning,
  Ship,
  Clock,
  Users,
  Navigation,
  CheckCircle2,
  SlidersHorizontal,
  User,
  MapPin,
} from 'lucide-react'
import { DistressSignal, DistressType } from '../../types/sos'

interface SOSIncidentListProps {
  signals: DistressSignal[]
  selectedId: string | null
  onSelect: (id: string) => void
  activeStatusTab: string
  onTabChange: (status: string) => void
  activeSeverity: string
  onSeverityChange: (sev: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

function getDistressIcon(type: DistressType) {
  switch (type) {
    case 'taking_water':
    case 'capsized':
      return AlertTriangle
    case 'fire':
      return Flame
    case 'engine_failure':
      return Wrench
    case 'medical':
      return HeartPulse
    case 'cyclone_trapped':
      return CloudLightning
    default:
      return Ship
  }
}

function formatExactTime(isoTime: string) {
  try {
    const d = new Date(isoTime)
    const dateStr = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return `${dateStr}, ${timeStr} IST`
  } catch {
    return isoTime
  }
}

function formatElapsed(isoTime: string) {
  const diffMs = Date.now() - new Date(isoTime).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  return new Date(isoTime).toLocaleDateString()
}


export default function SOSIncidentList({
  signals,
  selectedId,
  onSelect,
  activeStatusTab,
  onTabChange,
  activeSeverity,
  onSeverityChange,
  searchQuery,
  onSearchChange,
}: SOSIncidentListProps) {
  // Filter locally by search query and severity
  const filtered = signals.filter((signal) => {
    const matchesSearch =
      signal.vessel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.registration_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.skipper_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.nearest_port.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSeverity =
      activeSeverity === 'all' || signal.severity === activeSeverity

    const matchesStatus =
      activeStatusTab === 'all'
        ? true
        : activeStatusTab === 'active'
        ? signal.status === 'active' || signal.status === 'acknowledged'
        : activeStatusTab === 'dispatched'
        ? signal.status === 'dispatched' || signal.status === 'on_scene'
        : signal.status === activeStatusTab

    return matchesSearch && matchesSeverity && matchesStatus
  })

  const tabs = [
    { id: 'all', label: 'All Feeds' },
    { id: 'active', label: 'Active SOS' },
    { id: 'dispatched', label: 'Dispatched' },
    { id: 'resolved', label: 'Resolved' },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-cream-300 shadow-xs overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 border-b border-cream-200 bg-cream-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-charcoal-900 tracking-tight">
            Distress Incidents Queue
          </h3>
          <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-cream-200 text-charcoal-700">
            {filtered.length} Incident{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vessel, reg #, skipper, or port..."
            className="w-full pl-9 pr-3 py-2 text-xs font-sans rounded-lg bg-white border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-cream-200/80 p-1 rounded-lg">
          {tabs.map((tab) => {
            const isActive = activeStatusTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 py-1.5 px-2 text-[11px] font-medium font-sans rounded-md transition-all ${
                  isActive
                    ? 'bg-charcoal-900 text-cream-50 shadow-xs font-semibold'
                    : 'text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-100'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Severity Filter Dropdown */}
        <div className="flex items-center justify-between text-[11px] text-charcoal-600 font-sans pt-0.5">
          <span className="flex items-center gap-1 text-charcoal-500">
            <SlidersHorizontal className="w-3 h-3" /> Severity:
          </span>
          <div className="flex gap-1">
            {['all', 'critical', 'high', 'moderate'].map((sev) => (
              <button
                key={sev}
                onClick={() => onSeverityChange(sev)}
                className={`px-2 py-0.5 rounded capitalize text-[10px] transition-colors ${
                  activeSeverity === sev
                    ? sev === 'critical'
                      ? 'bg-red-600 text-white font-semibold'
                      : sev === 'high'
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'bg-charcoal-800 text-white font-semibold'
                    : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-cream-200">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-charcoal-500 font-sans space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <p className="text-sm font-medium">No distress signals matching criteria</p>
            <p className="text-xs text-charcoal-400">All vessels in selected sector are accounted for</p>
          </div>
        ) : (
          filtered.map((signal) => {
            const isSelected = selectedId === signal.id
            const Icon = getDistressIcon(signal.distress_type)
            const isCritical = signal.severity === 'critical'
            const isResolved = signal.status === 'resolved'
            const isDispatched = signal.status === 'dispatched' || signal.status === 'on_scene'

            return (
              <motion.div
                key={signal.id}
                onClick={() => onSelect(signal.id)}
                whileHover={{ backgroundColor: 'rgba(250, 248, 244, 0.9)' }}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cream-100/90 border-l-4 border-l-terracotta-500 pl-3'
                    : 'hover:bg-cream-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isCritical && !isResolved
                          ? 'bg-red-100 text-red-600'
                          : isDispatched
                          ? 'bg-amber-100 text-amber-600'
                          : isResolved
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-terracotta-100 text-terracotta-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal-900 font-sans leading-tight">
                        {signal.vessel_name}
                      </h4>
                      <p className="text-[10px] text-charcoal-500 font-mono">
                        {signal.registration_no}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-700'
                        : isDispatched
                        ? 'bg-amber-100 text-amber-800'
                        : isCritical
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {signal.status}
                  </span>
                </div>

                {/* Distress Origin Telemetry Strip: Sender & Timestamp & Location */}
                <div className="bg-cream-100/95 rounded-lg p-2 mb-2 text-[10px] font-sans border border-cream-300/80 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-charcoal-900 flex items-center gap-1 truncate">
                      <User className="w-3 h-3 text-terracotta-500 shrink-0" />
                      <span>Sent by:</span>
                      <strong className="text-charcoal-950 font-bold">{signal.skipper_name}</strong>
                    </span>
                    <span className="font-mono text-ocean-700 shrink-0 font-medium">{signal.contact_phone}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-charcoal-600 pt-0.5 border-t border-cream-200">
                    <span className="flex items-center gap-1 font-mono text-charcoal-700">
                      <Clock className="w-2.5 h-2.5 text-terracotta-600 shrink-0" />
                      {formatExactTime(signal.created_at)}
                    </span>
                    <span className="font-mono text-charcoal-800 font-semibold flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-ocean-600 shrink-0" />
                      {signal.location.lat.toFixed(4)}°N, {signal.location.lon.toFixed(4)}°E
                    </span>
                  </div>
                </div>

                {/* Brief Message */}
                <p className="text-[11px] text-charcoal-700 font-sans line-clamp-2 leading-relaxed mb-2">
                  {signal.emergency_message}
                </p>

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center justify-between text-[10px] text-charcoal-500 font-sans pt-1 border-t border-cream-200/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium text-charcoal-700">
                      <Users className="w-3 h-3 text-terracotta-500" />
                      {signal.crew_count} Crew
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-ocean-500" />
                      {signal.distance_to_coast_nm} NM off {signal.nearest_port.split(' ')[0]}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-charcoal-500 font-medium">
                    {formatElapsed(signal.created_at)}
                  </span>
                </div>

              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
