import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../../store/chatStore'
import { useChatStream } from '../../hooks/useChatStream'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import MessageBubble from './MessageBubble'
import ToolCallBubble from './ToolCallBubble'
import ContextChips from './ContextChips'
import LanguageBadge from './LanguageBadge'
import VoiceIndicator from './VoiceIndicator'
import TypingIndicator from './TypingIndicator'
import { Waves } from 'lucide-react'

interface ChatInterfaceProps {
  mode: 'overlay' | 'fullpage'
}

export default function ChatInterface({ mode }: ChatInterfaceProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const isRecording = useChatStore((s) => s.isRecording)
  const detectedLanguage = useChatStore((s) => s.detectedLanguage)
  const contextChips = useChatStore((s) => s.contextChips)

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
        // Auto-send after voice input
        await send(text)
      }
    } else {
      await startRecording()
    }
  }

  const isFullpage = mode === 'fullpage'

  return (
    <div className={`flex flex-col ${isFullpage ? 'h-full' : 'h-[600px]'}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-cream-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center">
            <span className="text-cream-100 text-xs font-bold">O</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-sans text-charcoal-900">
              ORCA Assistant
            </h3>
            <p className="text-[10px] text-cream-400">
              Marine intelligence • Voice + Text
            </p>
          </div>
        </div>
        {detectedLanguage && <LanguageBadge />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
              <Waves className="w-7 h-7 text-ocean-600" />
            </div>
            <h4 className="text-base font-semibold text-charcoal-900 mb-2 font-serif">
              Ask ORCA anything
            </h4>
            <p className="text-sm text-cream-400 max-w-xs mx-auto leading-relaxed">
              Where to fish today, current wave conditions, route safety — ask in any language.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                'Where should I fish today near Kochi?',
                'Is it safe to go out now?',
                'Show me PFZ zones for Kerala',
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="text-xs px-3 py-2 rounded-full bg-cream-200 text-charcoal-800 hover:bg-cream-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble message={msg} />
            {/* Tool call bubbles */}
            {msg.tool_calls && msg.tool_calls.length > 0 && (
              <div className="mt-2 space-y-1.5 ml-2">
                {msg.tool_calls.map((tc, j) => (
                  <ToolCallBubble key={j} toolCall={tc} />
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Context chips */}
      {contextChips.length > 0 && (
        <div className="px-5 py-2 border-t border-cream-200 flex-shrink-0">
          <ContextChips />
        </div>
      )}

      {/* Voice indicator */}
      {isRecording && (
        <div className="px-5 py-3 border-t border-cream-200 flex-shrink-0 bg-cream-50">
          <VoiceIndicator getAnalyserData={getAnalyserData} />
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-cream-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Mic button */}
          <button
            onClick={handleVoice}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse-soft'
                : 'bg-cream-200 text-charcoal-800 hover:bg-cream-300'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="4" y="4" width="8" height="8" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="6" y="2" width="4" height="8" rx="2" />
                <path d="M4 7v1a4 4 0 0 0 8 0V7" />
                <path d="M8 12v2" />
              </svg>
            )}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? t('chat.recording') : t('chat.placeholder')}
            disabled={isRecording}
            className="flex-1 px-4 py-2.5 text-sm bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 disabled:opacity-50 transition-all font-sans"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-charcoal-900 text-cream-100 flex items-center justify-center disabled:opacity-30 hover:bg-charcoal-800 transition-all flex-shrink-0"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2L2 8l5 2 2 5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
