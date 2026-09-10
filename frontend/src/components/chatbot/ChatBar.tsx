import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Square, X, Compass } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStore } from '../../store/chatStore'
import { useChatStream } from '../../hooks/useChatStream'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { cleanMarkdown } from './MessageBubble'

/**
 * ChatBar — compact floating chat input for the map page.
 * Shows a minimal input bar at the bottom. When the assistant responds,
 * a compact card slides up above the bar with the answer and follow-up chips.
 */
export default function ChatBar() {
  const [input, setInput] = useState('')
  const [showResponse, setShowResponse] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const isRecording = useChatStore((s) => s.isRecording)

  const { send } = useChatStream()
  const { startRecording, stopRecording } = useVoiceInput()

  // Show response card when new assistant message arrives
  const lastMsg = messages[messages.length - 1]
  useEffect(() => {
    if (lastMsg?.role === 'assistant') {
      setShowResponse(true)
    }
  }, [lastMsg])

  const handleSend = async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || isLoading) return
    if (!text) setInput('')
    setShowResponse(false) // hide old response while loading
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

  const assistantMsg = lastMsg?.role === 'assistant' ? lastMsg : null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1002] w-[94%] max-w-2xl flex flex-col items-stretch gap-2">
      {/* Response card (slides up when assistant responds) */}
      <AnimatePresence>
        {showResponse && assistantMsg && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-cream-200 overflow-hidden"
          >
            {/* Response header */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-cream-200/60">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-charcoal-900 to-ocean-900 flex items-center justify-center">
                  <Compass size={10} className="text-cream-200" />
                </div>
                <span className="text-[10px] font-semibold text-charcoal-700">ORCA</span>
              </div>
              <button
                type="button"
                onClick={() => setShowResponse(false)}
                className="p-0.5 rounded text-cream-400 hover:text-charcoal-700 cursor-pointer transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Response body (compact, max height scrollable) */}
            <div className="px-3 py-2.5 max-h-[200px] overflow-y-auto text-xs text-charcoal-800 leading-relaxed prose-orca">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanMarkdown(assistantMsg.content)}
              </ReactMarkdown>
            </div>

            {/* Follow-up chips */}
            {assistantMsg.suggested_followups && assistantMsg.suggested_followups.length > 0 && (
              <div className="px-3 py-2 border-t border-cream-200/60 flex flex-wrap gap-1.5">
                {assistantMsg.suggested_followups.map((followup, j) => (
                  <button
                    key={j}
                    onClick={() => handleSend(followup)}
                    disabled={isLoading}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-cream-300 bg-cream-50 text-charcoal-700 hover:border-terracotta-500 hover:text-terracotta-700 hover:bg-terracotta-50/50 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {followup}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-cream-200"
          >
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-charcoal-400"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </div>
            <span className="text-[10px] text-charcoal-500">Querying live data...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-cream-200 px-3 py-2">
        {/* Mic */}
        <button
          type="button"
          onClick={handleVoice}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200 border border-cream-300'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? <Square size={11} fill="currentColor" /> : <Mic size={13} />}
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask ORCA anything..."
          disabled={isRecording}
          className="flex-1 px-3 py-1.5 text-sm bg-transparent focus:outline-none text-charcoal-900 placeholder:text-cream-400 font-sans"
        />

        {/* Send */}
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 rounded-lg bg-charcoal-900 text-cream-100 flex items-center justify-center disabled:opacity-30 hover:bg-charcoal-800 transition-all flex-shrink-0 cursor-pointer shadow-xs"
          aria-label="Send message"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  )
}
