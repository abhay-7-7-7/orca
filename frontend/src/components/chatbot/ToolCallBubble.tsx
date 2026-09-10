import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Waves,
  Fish,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  CloudLightning,
  Thermometer,
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle2,
} from 'lucide-react'
import type { ToolCall } from '../../services/chatbot'

interface ToolMeta {
  label: string
  icon: typeof Waves
  categoryColor: string
  badgeColor: string
  borderColor: string
  bgColor: string
}

function getToolMetadata(toolName: string): ToolMeta {
  const name = toolName.toLowerCase()
  if (name.includes('weather') || name.includes('wave')) {
    return {
      label: 'Marine Weather Observation',
      icon: Waves,
      categoryColor: 'text-sky-700',
      badgeColor: 'bg-sky-100 text-sky-800',
      borderColor: 'border-sky-200',
      bgColor: 'bg-sky-50/60',
    }
  }
  if (name.includes('pfz') || name.includes('fish')) {
    return {
      label: 'INCOIS PFZ Ocean Model',
      icon: Fish,
      categoryColor: 'text-emerald-700',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      borderColor: 'border-emerald-200',
      bgColor: 'bg-emerald-50/60',
    }
  }
  if (name.includes('geofence') || name.includes('eez') || name.includes('mpa')) {
    return {
      label: 'EEZ Boundary & Geofence Check',
      icon: ShieldCheck,
      categoryColor: 'text-amber-700',
      badgeColor: 'bg-amber-100 text-amber-800',
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/60',
    }
  }
  if (name.includes('cyclone') || name.includes('alert') || name.includes('disaster')) {
    return {
      label: 'Disaster & Cyclone Watch',
      icon: AlertTriangle,
      categoryColor: 'text-rose-700',
      badgeColor: 'bg-rose-100 text-rose-800',
      borderColor: 'border-rose-200',
      bgColor: 'bg-rose-50/60',
    }
  }
  if (name.includes('lightning')) {
    return {
      label: 'Severe Lightning Sensor',
      icon: CloudLightning,
      categoryColor: 'text-violet-700',
      badgeColor: 'bg-violet-100 text-violet-800',
      borderColor: 'border-violet-200',
      bgColor: 'bg-violet-50/60',
    }
  }
  if (name.includes('sst') || name.includes('chlorophyll')) {
    return {
      label: 'SST & Chlorophyll Data',
      icon: Thermometer,
      categoryColor: 'text-teal-700',
      badgeColor: 'bg-teal-100 text-teal-800',
      borderColor: 'border-teal-200',
      bgColor: 'bg-teal-50/60',
    }
  }
  if (name.includes('route') || name.includes('routing')) {
    return {
      label: 'A* Nautical Route Engine',
      icon: Navigation,
      categoryColor: 'text-indigo-700',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      borderColor: 'border-indigo-200',
      bgColor: 'bg-indigo-50/60',
    }
  }
  return {
    label: toolName.replace(/_/g, ' '),
    icon: Cpu,
    categoryColor: 'text-slate-700',
    badgeColor: 'bg-slate-100 text-slate-800',
    borderColor: 'border-slate-200',
    bgColor: 'bg-slate-50',
  }
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Km', ' (km)')
    .replace('Kmh', ' (km/h)')
    .replace(' M', ' (m)')
}

function formatVal(val: unknown): string {
  if (val === null || val === undefined) return 'None'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number') return Number.isInteger(val) ? val.toString() : val.toFixed(2)
  if (Array.isArray(val)) return val.length === 0 ? 'None' : `${val.length} items`
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export default function ToolCallBubble({ toolCall }: { toolCall: ToolCall }) {
  const [isOpen, setIsOpen] = useState(false)
  const meta = getToolMetadata(toolCall.tool)
  const Icon = meta.icon

  // Attempt to parse result summary as JSON
  let parsedJson: Record<string, unknown> | null = null
  if (toolCall.result_summary) {
    try {
      const trimmed = toolCall.result_summary.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        parsedJson = JSON.parse(trimmed)
      }
    } catch {
      parsedJson = null
    }
  }

  // Key takeaways for quick display in collapsed header
  const quickPills: { label: string; value: string }[] = []
  if (parsedJson) {
    if (parsedJson.wave_height_m !== undefined && parsedJson.wave_height_m !== null) {
      quickPills.push({ label: 'Waves', value: `${parsedJson.wave_height_m}m` })
    }
    if (parsedJson.wind_speed_kmh !== undefined && parsedJson.wind_speed_kmh !== null) {
      quickPills.push({ label: 'Wind', value: `${parsedJson.wind_speed_kmh} km/h` })
    }
    if (parsedJson.sst_celsius !== undefined && parsedJson.sst_celsius !== null) {
      quickPills.push({ label: 'SST', value: `${parsedJson.sst_celsius}°C` })
    }
    if (parsedJson.in_indian_eez !== undefined) {
      quickPills.push({ label: 'In EEZ', value: parsedJson.in_indian_eez ? 'Yes' : 'No' })
    }
    if (parsedJson.total !== undefined) {
      quickPills.push({ label: 'Candidates', value: String(parsedJson.total) })
    }
    if (parsedJson.total_alerts !== undefined) {
      quickPills.push({ label: 'Alerts', value: String(parsedJson.total_alerts) })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border ${meta.borderColor} ${meta.bgColor} transition-all duration-150 overflow-hidden my-1 shadow-xs`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-black/5 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1 rounded-md bg-white shadow-2xs border ${meta.borderColor} ${meta.categoryColor}`}>
            <Icon size={14} strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-charcoal-900 tracking-tight truncate">
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Data
            </span>
          </div>

          {/* Collapsed quick pills */}
          {!isOpen && quickPills.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              {quickPills.slice(0, 3).map((pill, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 border border-cream-300 text-charcoal-700 font-mono"
                >
                  <span className="text-cream-400 mr-1">{pill.label}:</span>
                  <span className="font-semibold">{pill.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-cream-400 group-hover:text-charcoal-700 ml-2">
          <span className="text-[10px] font-mono">{isOpen ? 'Hide' : 'Details'}</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-black/5 px-3.5 py-2.5 bg-white/70 backdrop-blur-xs text-xs font-sans"
          >
            {/* Structured attributes */}
            {parsedJson ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(parsedJson).map(([k, v]) => {
                  if (k === 'note' && v) {
                    return (
                      <div key={k} className="col-span-full py-1 text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-2 text-[11px]">
                        {String(v)}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={k}
                      className="bg-white/90 border border-cream-200/90 rounded-lg p-2 flex flex-col justify-between shadow-2xs"
                    >
                      <span className="text-[10px] font-medium text-cream-400 uppercase tracking-wider">
                        {formatKey(k)}
                      </span>
                      <span className="text-xs font-semibold text-charcoal-900 mt-0.5 truncate font-mono">
                        {formatVal(v)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="font-mono text-[11px] text-charcoal-700 bg-white/80 p-2.5 rounded-lg border border-cream-200 break-all leading-relaxed">
                {toolCall.result_summary || 'Tool executed successfully.'}
              </div>
            )}

            {/* Calling arguments if present */}
            {toolCall.data && Object.keys(toolCall.data).length > 0 && (
              <div className="mt-2 pt-2 border-t border-cream-200/60 flex items-center gap-2 text-[10px] text-cream-400">
                <span className="font-medium uppercase tracking-wider">Parameters:</span>
                <span className="font-mono text-charcoal-700 truncate">
                  {JSON.stringify(toolCall.data)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
