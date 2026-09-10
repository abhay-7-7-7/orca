import { motion, AnimatePresence } from 'framer-motion'
import { Wind, Waves, Fish, AlertTriangle, Compass, Check, X, Sparkles } from 'lucide-react'
import { useMapStore } from '../../store/mapStore'

export default function FeatureSetupModal() {
  const showFeatureSetup = useMapStore((s) => s.showFeatureSetup)
  const setShowFeatureSetup = useMapStore((s) => s.setShowFeatureSetup)
  const setFirstQuerySetupDone = useMapStore((s) => s.setFirstQuerySetupDone)
  const layers = useMapStore((s) => s.layers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)

  const handleClose = () => {
    setFirstQuerySetupDone(true)
    setShowFeatureSetup(false)
  }

  const features = [
    {
      key: 'windStream' as const,
      name: 'Wind Streamlines',
      desc: 'Live marine wind flow streamlines across the sea',
      icon: Wind,
      color: 'from-sky-500 to-blue-600',
    },
    {
      key: 'waves' as const,
      name: 'Wave Height & Swell',
      desc: 'Live sea state, wave heights, and swell warnings',
      icon: Waves,
      color: 'from-cyan-500 to-teal-600',
    },
    {
      key: 'pfz' as const,
      name: 'Potential Fishing Zones',
      desc: 'High-yield PFZ zones, thermal fronts & chlorophyll',
      icon: Fish,
      color: 'from-emerald-500 to-green-600',
    },
    {
      key: 'hazards' as const,
      name: 'Severe Hazard Alerts',
      desc: 'Cyclone buffers, gale warnings & lightning clusters',
      icon: AlertTriangle,
      color: 'from-amber-500 to-red-600',
    },
    {
      key: 'seamarks' as const,
      name: 'OpenSeaMap Seamarks',
      desc: 'Lighthouses, navigational buoys & harbor marks',
      icon: Compass,
      color: 'from-indigo-500 to-purple-600',
    },
  ]

  return (
    <AnimatePresence>
      {showFeatureSetup && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-charcoal-950/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cream-200/90 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-cream-200/70 bg-gradient-to-br from-cream-50/80 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-charcoal-900 to-ocean-900 text-cream-100 flex items-center justify-center shadow-xs">
                    <Sparkles size={16} className="text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-sans text-charcoal-900">
                      Configure Ocean Overlays
                    </h3>
                    <p className="text-[11px] text-charcoal-500">
                      Toggle any layer to preview background changes live
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded-full text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Feature list */}
            <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
              {features.map((item) => {
                const Icon = item.icon
                const isEnabled = layers[item.key]

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleLayer(item.key)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isEnabled
                        ? 'bg-cream-50/90 border-terracotta-400 shadow-2xs ring-1 ring-terracotta-400/20'
                        : 'bg-white border-cream-200 hover:border-cream-300 hover:bg-cream-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          isEnabled
                            ? `bg-gradient-to-br ${item.color} text-white shadow-xs`
                            : 'bg-cream-100 text-charcoal-500'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-charcoal-900">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-charcoal-500 leading-tight">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    {/* Check indicator */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isEnabled
                          ? 'bg-terracotta-500 border-terracotta-500 text-white shadow-xs'
                          : 'border-cream-300 bg-white text-transparent'
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer action */}
            <div className="p-4 border-t border-cream-200/70 bg-cream-50/50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-charcoal-500">
                You can change these anytime in controls
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-cream-100 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Apply & Navigate
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
