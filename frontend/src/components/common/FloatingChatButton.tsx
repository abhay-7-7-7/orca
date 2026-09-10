import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'

export default function FloatingChatButton() {
  const { isOverlayOpen, setOverlayOpen } = useChatStore()

  return (
    <AnimatePresence>
      {!isOverlayOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => setOverlayOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-charcoal-900 text-cream-100 shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          aria-label="Open chat assistant"
        >
          {/* Chat icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:scale-110"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-terracotta-500/20 animate-ping" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
