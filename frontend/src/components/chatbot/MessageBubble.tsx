import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  MapPin,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import type { ChatMessage } from '../../services/chatbot'

export function cleanMarkdown(text: string): string {
  if (!text) return ''

  let t = text

  // 1. Normalize spaced asterisks: * * -> ** and quadruple asterisks
  t = t.replace(/\*\s+\*/g, '**')
  t = t.replace(/\*{3,}/g, '**')

  // 2. Fix broken dividers / headers like :---.# * 1. or ---.# * 2. or :---.# *
  t = t.replace(/[:\s]*---+\s*\.?\s*#\s*\*+\s*(\d+)\.?/g, '\n\n---\n\n### $1. ')
  t = t.replace(/[:\s]*---+\s*\.?\s*#\s*\*+/g, '\n\n---\n\n### ')
  t = t.replace(/\n?#\s*\*+\s*/g, '\n\n### ')
  t = t.replace(/###\s*\*+\s*/g, '### ')

  // 3. Fix list items and bullet points concatenated on the same line
  t = t.replace(/\s*-\s*\*\s*/g, '\n- **')
  t = t.replace(/(?<=[.!?])\s*(###|\d+\.|\*|\-)\s*/g, '\n\n$1 ')

  // 4. Fix spaced colons and bold tags
  t = t.replace(/\*\*\s*:\s*\*\*/g, ': **')
  t = t.replace(/(\*\*)\s*:\s*/g, '$1: ')
  t = t.replace(/:\s*\*\*\s*/g, ': **')

  // 5. Fix mangled table lines from translation
  t = t.replace(/\|\s*-+[\s\-]*-\s*\|/g, '\n| --- | --- | --- | --- |\n')
  t = t.replace(/\|\s*\*\*\s*/g, '| **')
  t = t.replace(/\s*\*\*\s*\|/g, '** |')

  // 6. Ensure headings have clean line spacing
  t = t.replace(/([^\n])\s*(###\s+)/g, '$1\n\n$2')
  t = t.replace(/([^\n])\s*(---\s*)/g, '$1\n\n$2\n\n')

  return t.trim()
}

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    // Strip markdown formatting for cleaner speech synthesis
    const plainText = message.content
      .replace(/[#*`_~>[\]()|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(plainText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-charcoal-900 to-ocean-900 text-cream-100 flex items-center justify-center shadow-xs border border-cream-300 relative">
            <Compass size={16} className="text-cream-200" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300" />
          </div>
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`relative ${
          isUser
            ? 'max-w-[85%] sm:max-w-[75%] bg-gradient-to-br from-charcoal-900 to-charcoal-800 text-cream-50 rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs border border-charcoal-700/50'
            : 'max-w-[95%] sm:max-w-[85%] bg-white text-charcoal-900 rounded-2xl rounded-tl-xs px-5 py-4 shadow-sm border border-cream-300/80'
        }`}
      >
        {/* User Content */}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-cream-100">
            {message.content}
          </p>
        ) : (
          /* Assistant Markdown Content */
          <div className="prose-orca text-sm leading-relaxed text-charcoal-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-3 rounded-xl border border-cream-300 bg-white shadow-2xs">
                    <table
                      className="min-w-full divide-y divide-cream-300 text-xs text-left"
                      {...props}
                    />
                  </div>
                ),
                thead: ({ ...props }) => (
                  <thead
                    className="bg-cream-100/80 font-semibold text-charcoal-900 uppercase tracking-wider text-[11px]"
                    {...props}
                  />
                ),
                th: ({ ...props }) => (
                  <th
                    className="px-3.5 py-2.5 font-bold text-charcoal-900 border-b border-cream-300"
                    {...props}
                  />
                ),
                td: ({ ...props }) => (
                  <td
                    className="px-3.5 py-2 border-b border-cream-200/80 last:border-0 align-middle text-charcoal-800 font-sans"
                    {...props}
                  />
                ),
                tr: ({ ...props }) => (
                  <tr
                    className="hover:bg-cream-50/70 transition-colors even:bg-cream-50/40"
                    {...props}
                  />
                ),
                h1: ({ ...props }) => (
                  <h1
                    className="text-base font-bold font-serif text-charcoal-950 mt-4 mb-2 first:mt-0 pb-1.5 border-b border-cream-200"
                    {...props}
                  />
                ),
                h2: ({ ...props }) => (
                  <h2
                    className="text-sm sm:text-base font-bold font-serif text-charcoal-950 mt-3.5 mb-1.5 first:mt-0"
                    {...props}
                  />
                ),
                h3: ({ ...props }) => (
                  <h3
                    className="text-sm font-bold text-charcoal-900 mt-3 mb-1 first:mt-0 flex items-center gap-1.5 text-terracotta-700"
                    {...props}
                  />
                ),
                h4: ({ ...props }) => (
                  <h4
                    className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mt-2.5 mb-1 first:mt-0"
                    {...props}
                  />
                ),
                p: ({ ...props }) => (
                  <p className="mb-2.5 last:mb-0 leading-relaxed font-sans" {...props} />
                ),
                ul: ({ ...props }) => (
                  <ul
                    className="list-disc pl-5 my-2 space-y-1 text-sm marker:text-terracotta-500"
                    {...props}
                  />
                ),
                ol: ({ ...props }) => (
                  <ol
                    className="list-decimal pl-5 my-2 space-y-1 text-sm marker:font-semibold marker:text-charcoal-700"
                    {...props}
                  />
                ),
                li: ({ ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
                blockquote: ({ ...props }) => (
                  <blockquote
                    className="border-l-3 border-terracotta-500 bg-terracotta-50/50 rounded-r-lg px-3.5 py-2 my-2.5 text-xs text-charcoal-800 italic"
                    {...props}
                  />
                ),
                code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
                  const isInline = !className?.includes('language-') && !String(children).includes('\n')
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded-md bg-cream-100 text-charcoal-900 font-mono text-xs border border-cream-200"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }
                  return (
                    <pre className="p-3.5 rounded-xl bg-charcoal-950 text-cream-100 font-mono text-xs overflow-x-auto my-2.5 border border-charcoal-800 leading-normal">
                      <code {...props}>{children}</code>
                    </pre>
                  )
                },
                hr: ({ ...props }) => <hr className="my-3.5 border-cream-200" {...props} />,
                strong: ({ ...props }) => (
                  <strong className="font-semibold text-charcoal-950" {...props} />
                ),
                a: ({ ...props }) => (
                  <a
                    className="text-terracotta-600 hover:text-terracotta-700 underline font-medium inline-flex items-center gap-0.5"
                    target="_blank"
                    rel="noreferrer"
                    {...props}
                  />
                ),
              }}
            >
              {cleanMarkdown(message.content)}
            </ReactMarkdown>
          </div>
        )}

        {/* Location reference link */}
        {message.location && (
          <div className="mt-3 pt-2.5 border-t border-cream-200/80 flex items-center justify-between">
            <Link
              to={`/map?lat=${message.location.lat}&lon=${message.location.lon}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-600 hover:text-terracotta-700 no-underline bg-terracotta-50/80 border border-terracotta-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              <MapPin size={13} className="text-terracotta-500" />
              Plot on Live Map
              {message.location.label && (
                <span className="font-normal text-charcoal-700">— {message.location.label}</span>
              )}
            </Link>
          </div>
        )}

        {/* Assistant Bottom Toolbar */}
        {!isUser && (
          <div className="mt-3 pt-2 border-t border-cream-200/70 flex items-center justify-between text-[11px] text-cream-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-charcoal-700 font-medium">
                <Sparkles size={11} className="text-ocean-600" />
                Verified live telemetry
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Copy action */}
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-charcoal-900 transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Speak action */}
              <button
                type="button"
                onClick={handleSpeak}
                className={`hover:text-charcoal-900 transition-colors flex items-center gap-1 cursor-pointer ${
                  speaking ? 'text-terracotta-600 font-semibold' : ''
                }`}
                title={speaking ? 'Stop speaking' : 'Read aloud'}
              >
                {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                <span>{speaking ? 'Stop' : 'Listen'}</span>
              </button>

              {/* Timestamp */}
              <span className="font-mono text-[10px]">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}

        {/* User timestamp */}
        {isUser && (
          <div className="flex justify-end mt-1 text-[10px] text-cream-400/70 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
