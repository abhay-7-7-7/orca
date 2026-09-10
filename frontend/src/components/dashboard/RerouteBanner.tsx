import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import type { RerouteCheck } from '../../services/routing'

export default function RerouteBanner({ rerouteStatus }: { rerouteStatus: RerouteCheck }) {
  if (!rerouteStatus.needs_reroute) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-500/10 border border-amber-400 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-800 mb-1">
            Reroute Recommended
          </h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            {rerouteStatus.reason || 'Conditions along your current route have changed.'}
          </p>
          {rerouteStatus.cost_increase_pct && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Route cost increased by {rerouteStatus.cost_increase_pct.toFixed(0)}%
            </p>
          )}
          {rerouteStatus.new_hazards && rerouteStatus.new_hazards.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {rerouteStatus.new_hazards.map((h, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-medium"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
