import { motion } from 'framer-motion'
import ChatInterface from '../components/chatbot/ChatInterface'

export default function Chat() {
  return (
    <div className="fixed inset-0 pt-16 bg-cream-100">
      <div className="h-full max-w-3xl mx-auto flex flex-col">
        {/* Full-page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-6 flex-shrink-0"
        >
          <h1 className="text-heading font-serif text-charcoal-900 mb-1">
            Talk to ORCA
          </h1>
          <p className="text-sm text-cream-400 font-sans">
            Ask about fishing zones, weather conditions, route safety — in any language.
            ORCA queries live satellite, weather, and hazard data to give you an
            explainable, evidence-based answer.
          </p>
        </motion.div>

        {/* Chat interface fills remaining space */}
        <div className="flex-1 bg-white rounded-t-2xl border border-cream-200 border-b-0 overflow-hidden shadow-sm">
          <ChatInterface mode="fullpage" />
        </div>
      </div>
    </div>
  )
}
