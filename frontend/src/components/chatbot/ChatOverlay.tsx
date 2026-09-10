import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import ChatInterface from './ChatInterface'

export default function ChatOverlay() {
  const isOverlayOpen = useChatStore((s) => s.isOverlayOpen)
  const setOverlayOpen = useChatStore((s) => s.setOverlayOpen)

  return (
    <AnimatePresence>
      {isOverlayOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOverlayOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998]"
          />

          {/* Chat panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[999] w-full md:w-[420px] md:max-h-[700px] bg-white md:rounded-2xl shadow-2xl border border-cream-200 overflow-hidden"
            style={{ height: 'min(700px, calc(100vh - 100px))' }}
          >
            {/* Close button */}
            <button
              onClick={() => setOverlayOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-cream-100 hover:bg-cream-200 flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>

            <ChatInterface mode="overlay" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
