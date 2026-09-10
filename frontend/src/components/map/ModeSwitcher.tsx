import { motion } from 'framer-motion'
import { Sparkles, Compass, SlidersHorizontal } from 'lucide-react'
import { useMapStore } from '../../store/mapStore'

export default function ModeSwitcher() {
  const navMode = useMapStore((s) => s.navMode)
  const setNavMode = useMapStore((s) => s.setNavMode)

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] pointer-events-auto">
      <div className="flex items-center p-1 bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-cream-200/80 ring-1 ring-black/5">
        {/* AI Mode Pill */}
        <button
          type="button"
          onClick={() => setNavMode('ai')}
          className={`relative px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
            navMode === 'ai'
              ? 'text-cream-50 font-bold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          {navMode === 'ai' && (
            <motion.div
              layoutId="mode-pill-active"
              className="absolute inset-0 bg-gradient-to-r from-charcoal-950 via-ocean-950 to-charcoal-900 rounded-full"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Sparkles size={13} className={navMode === 'ai' ? 'text-amber-300' : 'text-charcoal-500'} />
            AI Navigator
          </span>
        </button>

        {/* Manual Mode Pill */}
        <button
          type="button"
          onClick={() => setNavMode('manual')}
          className={`relative px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
            navMode === 'manual'
              ? 'text-cream-50 font-bold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          {navMode === 'manual' && (
            <motion.div
              layoutId="mode-pill-active"
              className="absolute inset-0 bg-gradient-to-r from-terracotta-600 to-terracotta-700 rounded-full"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <SlidersHorizontal size={13} className={navMode === 'manual' ? 'text-cream-100' : 'text-charcoal-500'} />
            Manual Controls
          </span>
        </button>
      </div>
    </div>
  )
}
