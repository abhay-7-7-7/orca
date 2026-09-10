import { motion } from 'framer-motion'
import ChatInterface from '../components/chatbot/ChatInterface'
import { Sparkles, Shield, Radio, Anchor } from 'lucide-react'

export default function Chat() {
  return (
    <div className="fixed inset-0 pt-16 bg-[#FAF8F5] flex flex-col">
      <div className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 flex flex-col h-full min-h-0">
        {/* Full-page header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="pb-3 flex-shrink-0 flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900 tracking-tight flex items-center gap-2.5">
              Talk to ORCA
              <span className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mistral AI Engine
              </span>
            </h1>
            <p className="text-xs text-charcoal-500 font-sans mt-0.5">
              Live hazard fusion, INCOIS PFZ thermal fronts, and 200 NM Indian EEZ guardrails
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-charcoal-600">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-cream-300 shadow-2xs">
              <Shield size={13} className="text-amber-600" />
              <span className="font-medium text-[11px]">EEZ Guard Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-cream-300 shadow-2xs">
              <Radio size={13} className="text-ocean-600" />
              <span className="font-medium text-[11px]">Live Copernicus Feeds</span>
            </div>
          </div>
        </motion.div>

        {/* Chat interface container */}
        <div className="flex-1 bg-white rounded-2xl border border-cream-300 overflow-hidden shadow-sm flex flex-col min-h-0 mb-3">
          <ChatInterface mode="fullpage" />
        </div>
      </div>
    </div>
  )
}
