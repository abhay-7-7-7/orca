import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Mic,
  Square,
  X,
  Compass,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  Navigation,
  Anchor,
  Fish,
  AlertCircle
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStore } from '../../store/chatStore'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import { useChatStream } from '../../hooks/useChatStream'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { cleanMarkdown } from './MessageBubble'

export default function ChatBar() {
  const [input, setInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const isRecording = useChatStore((s) => s.isRecording)

  const navMode = useMapStore((s) => s.navMode)
  const firstQuerySetupDone = useMapStore((s) => s.firstQuerySetupDone)
  const setShowFeatureSetup = useMapStore((s) => s.setShowFeatureSetup)

  const { send } = useChatStream()
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null)

  const {
    startRecording,
    stopRecording,
    interimTranscript,
    voiceError,
  } = useVoiceInput({
    onTranscriptChange: (liveText) => {
      if (liveText) setInput(liveText)
    },
  })

  const hasMessages = messages.length > 0
  const lastMsg = messages[messages.length - 1]
  const assistantMsg = lastMsg?.role === 'assistant' ? lastMsg : null

  // Ensure minimized state is restored when new response arrives
  useEffect(() => {
    if (assistantMsg) {
      setIsMinimized(false)
    }
  }, [assistantMsg])

  const handleSend = async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || isLoading) return
    if (!text) setInput('')
    setVoiceNotice(null)

    // First time in AI mode: present feature setup pop-up
    if (!firstQuerySetupDone) {
      setShowFeatureSetup(true)
    }

    await send(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoice = async () => {
    setVoiceNotice(null)
    if (isRecording) {
      try {
        const text = await stopRecording()
        const finalText = (text || input).trim()
        if (finalText) {
          setInput(finalText)
          await handleSend(finalText)
        } else {
          setVoiceNotice('No speech detected. Please speak clearly and try again.')
          setTimeout(() => setVoiceNotice(null), 4000)
        }
      } catch (err) {
        console.error('Stop voice error:', err)
      }
    } else {
      try {
        setInput('')
        await startRecording()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not access microphone.'
        setVoiceNotice(msg)
        setTimeout(() => setVoiceNotice(null), 4000)
      }
    }
  }

  const quickPrompts = [
    { text: 'Plan route from Kochi to Thoothukudi', label: 'Plan Sea Route (Kochi ➔ Thoothukudi)', icon: Anchor },
    { text: 'Best high-yield fishing zones near Vizhinjam', label: 'Find Fishing Zones (PFZ)', icon: Fish },
    { text: 'Check sea conditions, waves, and alerts', label: 'Check Wave & Hazard Alerts', icon: AlertCircle },
  ]

  // ── AI MODE: HERO CENTER STATE (Initial, before any messages) ──────────────
  if (navMode === 'ai' && !hasMessages && !isLoading) {
    return (
      <div className="fixed inset-x-0 bottom-12 z-[1002] flex flex-col items-center justify-end pointer-events-none px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cream-200/90 p-5 pointer-events-auto ring-1 ring-black/5"
        >
          {/* Hero Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-charcoal-900 to-ocean-950 flex items-center justify-center shadow-md">
              <Sparkles size={18} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans text-charcoal-950 flex items-center gap-2">
                ORCA Marine AI
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Sea Nav Ready
                </span>
              </h2>
              <p className="text-xs text-charcoal-500">
                Autonomous hazard-aware maritime route planner & fishery guide
              </p>
            </div>
          </div>

          {/* Large Input Box */}
          <div className="flex items-center gap-2 bg-cream-50/90 rounded-2xl border border-cream-300/80 px-4 py-3 shadow-inner mb-3">
            <button
              type="button"
              onClick={handleVoice}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-white text-charcoal-700 hover:bg-cream-100 border border-cream-300'
              }`}
              title={isRecording ? 'Stop recording' : 'Voice search'}
            >
              {isRecording ? <Square size={12} fill="currentColor" /> : <Mic size={15} />}
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? (interimTranscript ? `Listening: "${interimTranscript}"` : 'Listening... speak in your language')
                  : "Ask ORCA: e.g. 'Plan route from Kochi to Thoothukudi'..."
              }
              className="flex-1 text-sm bg-transparent focus:outline-none text-charcoal-900 placeholder:text-charcoal-400 font-sans"
              autoFocus
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-cream-100 flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-30 cursor-pointer shadow-xs"
            >
              <span>Ask</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {(voiceNotice || voiceError) && (
            <div className="mb-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center justify-between">
              <span>{voiceNotice || voiceError}</span>
              <button type="button" onClick={() => setVoiceNotice(null)} className="cursor-pointer font-bold text-amber-600">✕</button>
            </div>
          )}

          {/* Quick Action Pills */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-cream-200/60">
            <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider self-center mr-1">
              Suggested:
            </span>
            {quickPrompts.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(item.text)}
                  className="text-xs px-3 py-1.5 rounded-full bg-cream-100/70 hover:bg-cream-200/90 text-charcoal-800 border border-cream-300/80 flex items-center gap-1.5 transition-all cursor-pointer hover:border-terracotta-400"
                >
                  <Icon size={12} className="text-terracotta-600" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── ACTIVE CONVERSATION / SIDE DOCK STATE ──────────────────────────────────
  // In AI mode with messages, animates to the top-left floating glass window!
  return (
    <div
      className={`fixed z-[1002] transition-all duration-300 pointer-events-auto ${
        navMode === 'ai'
          ? 'top-20 left-4 w-full max-w-sm sm:max-w-md'
          : 'bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-2xl'
      }`}
    >
      <AnimatePresence>
        {/* Minimized toggle button */}
        {isMinimized && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-cream-200 text-charcoal-900 hover:bg-cream-50 cursor-pointer font-sans text-xs font-bold"
          >
            <div className="w-5 h-5 rounded-lg bg-charcoal-900 text-cream-100 flex items-center justify-center">
              <Compass size={11} />
            </div>
            <span>Show ORCA Response</span>
            <Maximize2 size={12} className="text-charcoal-400 ml-1" />
          </motion.button>
        )}

        {/* Full Card */}
        {!isMinimized && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cream-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-cream-200/70 bg-gradient-to-r from-cream-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-charcoal-900 to-ocean-950 flex items-center justify-center shadow-2xs">
                  <Compass size={12} className="text-cream-200" />
                </div>
                <div>
                  <span className="text-xs font-bold text-charcoal-900">ORCA Assistant</span>
                  <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-md text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100 transition-colors cursor-pointer"
                  title="Minimize card"
                >
                  <Minimize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => useChatStore.getState().clearMessages()}
                  className="p-1 rounded-md text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100 transition-colors cursor-pointer"
                  title="Reset conversation"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Content area: show last message & response */}
            <div className="p-4 max-h-[340px] overflow-y-auto space-y-3">
              {/* User question query badge */}
              {lastMsg?.role === 'user' && (
                <div className="bg-charcoal-900 text-cream-50 text-xs px-3.5 py-2 rounded-2xl rounded-tr-xs shadow-xs leading-relaxed">
                  {lastMsg.content}
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-cream-50/80 border border-cream-200">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-terracotta-500"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-charcoal-600">
                    Computing sea-safe route & ocean intelligence...
                  </span>
                </div>
              )}

              {/* Assistant Answer */}
              {assistantMsg && !isLoading && (
                <div className="text-xs text-charcoal-800 leading-relaxed prose-orca">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanMarkdown(assistantMsg.content)}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Interactive Follow-up Question Buttons ("btn like follow ups") */}
            {assistantMsg &&
              assistantMsg.suggested_followups &&
              assistantMsg.suggested_followups.length > 0 &&
              !isLoading && (
                <div className="px-4 py-2.5 border-t border-cream-200/70 bg-cream-50/60">
                  <p className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" />
                    Suggested follow-up actions:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {assistantMsg.suggested_followups.map((followup, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => handleSend(followup)}
                        disabled={isLoading}
                        className="text-left text-xs px-3 py-2 rounded-xl border border-cream-300 bg-white text-charcoal-800 hover:border-terracotta-500 hover:text-terracotta-700 hover:bg-terracotta-50/60 transition-all cursor-pointer font-medium shadow-2xs flex items-center justify-between group disabled:opacity-40"
                      >
                        <span>{followup}</span>
                        <ArrowRight
                          size={12}
                          className="text-cream-400 group-hover:text-terracotta-600 group-hover:translate-x-0.5 transition-all"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Voice Notice */}
            {(voiceNotice || voiceError) && (
              <div className="px-3 py-1 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                <span>{voiceNotice || voiceError}</span>
                <button type="button" onClick={() => setVoiceNotice(null)} className="cursor-pointer font-bold text-amber-600">✕</button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-cream-200/80 bg-white flex items-center gap-2">
              <button
                type="button"
                onClick={handleVoice}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200 border border-cream-300'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <Square size={10} fill="currentColor" /> : <Mic size={13} />}
              </button>

              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? (interimTranscript ? `Listening: "${interimTranscript}"` : 'Listening...')
                    : "Ask follow-up or enter port..."
                }
                disabled={isRecording}
                className="flex-1 px-3 py-1.5 text-xs bg-cream-50/70 border border-cream-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-terracotta-500 font-sans text-charcoal-900 placeholder:text-charcoal-400"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-charcoal-900 text-cream-100 flex items-center justify-center disabled:opacity-30 hover:bg-charcoal-800 transition-all flex-shrink-0 cursor-pointer shadow-xs"
                title="Send"
              >
                <Send size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
