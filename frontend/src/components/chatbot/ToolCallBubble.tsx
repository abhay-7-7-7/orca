import { motion } from 'framer-motion'
import {
  Waves,
  Fish,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  CloudLightning,
  Thermometer,
  Cpu,
} from 'lucide-react'
import type { ToolCall } from '../../services/chatbot'

interface ToolMeta {
  label: string
  icon: typeof Waves
  color: string
  bg: string
  border: string
}

function getToolMeta(toolName: string): ToolMeta {
  const name = toolName.toLowerCase()
  if (name.includes('weather') || name.includes('wave') || name.includes('tide')) {
    return {
      label: name.includes('tide') ? 'Tide Forecast' : 'Marine Weather',
      icon: Waves,
      color: 'text-sky-700',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
    }
  }
  if (name.includes('pfz') || name.includes('fish')) {
    return {
      label: 'INCOIS PFZ',
      icon: Fish,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    }
  }
  if (name.includes('geofence') || name.includes('eez') || name.includes('mpa')) {
    return {
      label: 'EEZ Boundary',
      icon: ShieldCheck,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    }
  }
  if (name.includes('cyclone') || name.includes('alert') || name.includes('disaster')) {
    return {
      label: 'Disaster Alert',
      icon: AlertTriangle,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
    }
  }
  if (name.includes('lightning')) {
    return {
      label: 'Lightning',
      icon: CloudLightning,
      color: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
    }
  }
  if (name.includes('sst') || name.includes('chlorophyll')) {
    return {
      label: 'SST / Chl-a',
      icon: Thermometer,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    }
  }
  if (name.includes('route') || name.includes('routing')) {
    return {
      label: 'Route Engine',
      icon: Navigation,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
    }
  }
  return {
    label: toolName.replace(/^(get_|check_)/, '').replace(/_/g, ' '),
    icon: Cpu,
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  }
}

export default function ToolCallBubble({ toolCall }: { toolCall: ToolCall }) {
  const meta = getToolMeta(toolCall.tool)
  const Icon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${meta.border} ${meta.bg} shadow-2xs`}
    >
      <Icon size={12} strokeWidth={2.2} className={meta.color} />
      <span className={`text-[10px] font-semibold ${meta.color} tracking-tight`}>
        {meta.label}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
    </motion.div>
  )
}
