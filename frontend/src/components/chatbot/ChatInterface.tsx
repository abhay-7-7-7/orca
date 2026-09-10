import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  Mic,
  Square,
  Compass,
  Fish,
  Navigation,
  RotateCcw,
} from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useChatStream } from '../../hooks/useChatStream'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import MessageBubble from './MessageBubble'
import ToolCallBubble from './ToolCallBubble'
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await send(text)
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
    {
      icon: Fish,
      text: 'Best fishing zones near Vizhinjam tomorrow',
      label: 'Find fishing zones',
    },
    {
      icon: Navigation,
      text: 'Plan a safe route from Kochi avoiding bad weather',
      label: 'Plan safe route',
    },
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
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
              {samplePrompts.map((item, i) => {
                const Icon = item.icon
                return (
                  <button
                    key={i}
                    onClick={() => send(item.text)}
                    className="p-3 rounded-xl bg-white border border-cream-300 hover:border-terracotta-400 hover:shadow-xs transition-all text-left group flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-cream-100 text-charcoal-700 group-hover:bg-terracotta-50 group-hover:text-terracotta-700 transition-colors flex-shrink-0">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-charcoal-900 group-hover:text-terracotta-800 transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-cream-400 truncate font-sans">
                        "{item.text}"
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => {
          const isAssistant = msg.role === 'assistant'
          return (
            <div key={i} className="space-y-2">
              {/* Tool call pills before assistant answer */}
              {isAssistant && msg.tool_calls && msg.tool_calls.length > 0 && (
                <div className="ml-10 flex flex-wrap gap-1.5 my-1">
                  {msg.tool_calls.map((tc, j) => (
                    <ToolCallBubble key={j} toolCall={tc} />
                  ))}
                </div>
              )}

              <MessageBubble message={msg} />
            </div>
          )
        })}

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
            onClick={handleSend}
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
