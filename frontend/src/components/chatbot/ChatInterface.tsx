import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  Mic,
  Square,
  Compass,
  RotateCcw,
} from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useChatStream } from '../../hooks/useChatStream'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import MessageBubble from './MessageBubble'
import LanguageBadge from './LanguageBadge'
import VoiceIndicator from './VoiceIndicator'
import TypingIndicator from './TypingIndicator'

interface ChatInterfaceProps {
  mode: 'overlay' | 'fullpage'
}

export default function ChatInterface({ mode }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const isRecording = useChatStore((s) => s.isRecording)
  const detectedLanguage = useChatStore((s) => s.detectedLanguage)
  const clearMessages = useChatStore((s) => s.clearMessages)

  const { send } = useChatStream()
  const { startRecording, stopRecording, getAnalyserData } = useVoiceInput()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || isLoading) return
    if (!text) setInput('')
    await send(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoice = async () => {
    if (isRecording) {
      const text = await stopRecording()
      if (text) {
        setInput(text)
        await send(text)
      }
    } else {
      await startRecording()
    }
  }

  const samplePrompts = [
    { text: 'Best fishing zones near Vizhinjam tomorrow', label: '🐟 Find fishing zones' },
    { text: 'Plan a safe route from Kochi', label: '🛤️ Plan safe route' },
    { text: 'Is it safe to go out today?', label: '🌊 Check sea conditions' },
  ]

  return (
    <div className={`flex flex-col ${mode === 'fullpage' ? 'h-full' : 'h-[600px]'} bg-cream-50/40`}>
      {/* Minimal header */}
      <div className="px-4 py-2.5 border-b border-cream-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-charcoal-900 to-ocean-950 flex items-center justify-center shadow-xs border border-charcoal-800">
            <Compass size={14} className="text-cream-200" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-sans text-charcoal-900">
              ORCA
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {detectedLanguage && <LanguageBadge />}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearMessages}
              className="p-1.5 rounded-lg text-cream-400 hover:text-charcoal-800 hover:bg-cream-100 transition-colors cursor-pointer"
              title="New conversation"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 max-w-md mx-auto"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ocean-50 to-terracotta-50 border border-cream-300 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Compass size={22} className="text-ocean-800" />
            </div>
            <h4 className="text-base font-bold text-charcoal-900 mb-1 font-serif">
              Ask ORCA anything
            </h4>
            <p className="text-xs text-charcoal-500 leading-relaxed mb-5">
              Fishing zones, weather, route safety — in any Indian language.
            </p>

            <div className="flex flex-col gap-2 text-left">
              {samplePrompts.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(item.text)}
                  className="p-3 rounded-xl bg-white border border-cream-300 hover:border-terracotta-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  <div className="text-xs font-semibold text-charcoal-900 group-hover:text-terracotta-800 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-cream-400 truncate font-sans mt-0.5">
                    "{item.text}"
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-2">
            <MessageBubble message={msg} />

            {/* Follow-up suggestion chips */}
            {msg.role === 'assistant' &&
              msg.suggested_followups &&
              msg.suggested_followups.length > 0 &&
              i === messages.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                  className="ml-10 flex flex-wrap gap-1.5"
                >
                  {msg.suggested_followups.map((followup, j) => (
                    <button
                      key={j}
                      onClick={() => handleSend(followup)}
                      disabled={isLoading}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-cream-300 bg-white text-charcoal-700 hover:border-terracotta-500 hover:text-terracotta-700 hover:bg-terracotta-50/50 transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
                    >
                      {followup}
                    </button>
                  ))}
                </motion.div>
              )}
          </div>
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice indicator */}
      {isRecording && (
        <div className="px-4 py-2.5 border-t border-cream-200 flex-shrink-0 bg-red-50/50">
          <VoiceIndicator getAnalyserData={getAnalyserData} />
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-cream-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Mic button */}
          <button
            type="button"
            onClick={handleVoice}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200 border border-cream-300'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            title={isRecording ? 'Stop recording' : 'Speak in your language'}
          >
            {isRecording ? <Square size={13} fill="currentColor" /> : <Mic size={15} />}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Listening...' : 'Ask in any language...'}
              disabled={isRecording}
              className="w-full px-4 py-2 text-sm bg-cream-50/80 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-500 disabled:opacity-50 transition-all font-sans text-charcoal-900 placeholder:text-cream-400"
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-charcoal-900 text-cream-100 flex items-center justify-center disabled:opacity-30 hover:bg-charcoal-800 transition-all flex-shrink-0 cursor-pointer shadow-xs border border-charcoal-800"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
