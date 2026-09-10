import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ChatMessage } from '../../services/chatbot'

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {/* Location reference → map link */}
        {message.location && (
          <Link
            to={`/map?lat=${message.location.lat}&lon=${message.location.lon}`}
            className="inline-flex items-center gap-1.5 mt-2 text-xs text-terracotta-500 hover:text-terracotta-600 no-underline font-medium"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1C3.8 1 2 2.8 2 5c0 3 4 6 4 6s4-3 4-6c0-2.2-1.8-4-4-4z" />
              <circle cx="6" cy="5" r="1.5" />
            </svg>
            View on map
            {message.location.label && ` — ${message.location.label}`}
          </Link>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-cream-400/50' : 'text-cream-400/70'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}
