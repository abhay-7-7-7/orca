import { motion } from 'framer-motion'
import { AlertOctagon, LifeBuoy, ShieldCheck, Users, Radio } from 'lucide-react'
import { SOSStats } from '../../types/sos'

interface SOSStatsBarProps {
  stats: SOSStats
  onFilterClick?: (status: string) => void
  activeFilter?: string
}

export default function SOSStatsBar({
  stats,
  onFilterClick,
  activeFilter = 'all',
}: SOSStatsBarProps) {
  const cards = [
    {
      id: 'active',
      label: 'Active Distress Calls',
      value: stats.activeCount,
      subtext: 'Requires Immediate Response',
      icon: AlertOctagon,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badgeBg: 'bg-red-500',
      pulse: stats.activeCount > 0,
    },
    {
      id: 'lives',
      label: 'Lives at Risk (At Sea)',
      value: stats.livesAtRisk,
      subtext: 'Crew members on active boats',
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-500',
      pulse: false,
    },
    {
      id: 'dispatched',
      label: 'SAR Missions Dispatched',
      value: stats.dispatchedCount,
      subtext: 'Patrol cutters / Helos en-route',
      icon: LifeBuoy,
      color: 'text-ocean-600',
      bg: 'bg-ocean-50/50',
      border: 'border-ocean-200',
      badgeBg: 'bg-ocean-500',
      pulse: false,
    },
    {
      id: 'assets',
      label: 'Ready Coast Guard Units',
      value: stats.readyAssetsCount,
      subtext: 'Available for immediate sortie',
      icon: ShieldCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50/60',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-600',
      pulse: false,
    },
    {
      id: 'resolved',
      label: 'Resolved Today',
      value: stats.resolvedCount,
      subtext: 'Crew safely in port',
      icon: Radio,
      color: 'text-charcoal-800',
      bg: 'bg-cream-50',
      border: 'border-cream-300',
      badgeBg: 'bg-charcoal-700',
      pulse: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        const isSelected =
          (card.id === 'active' && activeFilter === 'active') ||
          (card.id === 'dispatched' && activeFilter === 'dispatched') ||
          (card.id === 'resolved' && activeFilter === 'resolved')

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            onClick={() => {
              if (onFilterClick && (card.id === 'active' || card.id === 'dispatched' || card.id === 'resolved')) {
                onFilterClick(activeFilter === card.id ? 'all' : card.id)
              }
            }}
            className={`relative p-4 rounded-xl border transition-all ${card.bg} ${card.border} ${
              card.id === 'active' || card.id === 'dispatched' || card.id === 'resolved'
                ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                : ''
            } ${isSelected ? 'ring-2 ring-charcoal-900 shadow-sm' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-charcoal-800/70">
                {card.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color} bg-white shadow-xs`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-bold font-sans text-charcoal-900 tracking-tight">
                {card.value}
              </span>
              {card.pulse && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-charcoal-800/60 font-sans mt-1 truncate">
              {card.subtext}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}
