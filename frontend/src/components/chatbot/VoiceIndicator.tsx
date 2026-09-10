import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface VoiceIndicatorProps {
  getAnalyserData: () => Uint8Array | null
  interimTranscript?: string
  onCancel?: () => void
}

export default function VoiceIndicator({
  getAnalyserData,
  interimTranscript,
  onCancel,
}: VoiceIndicatorProps) {
  const { t } = useTranslation()
  const barsRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = () => {
      const data = getAnalyserData()
      if (data && barsRef.current) {
        const bars = barsRef.current.children
        const step = Math.floor(data.length / bars.length)

        for (let i = 0; i < bars.length; i++) {
          const value = data[i * step] || 0
          const height = Math.max(4, (value / 255) * 28)
          ;(bars[i] as HTMLElement).style.height = `${height}px`
        }
      }
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [getAnalyserData])

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <div ref={barsRef} className="flex items-end gap-[3px] h-6 flex-shrink-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] bg-red-500 rounded-full"
              style={{ height: '4px', transition: 'height 0.05s ease' }}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
          {interimTranscript ? (
            <span className="text-xs text-charcoal-800 font-medium truncate italic">
              "{interimTranscript}"
            </span>
          ) : (
            <span className="text-xs text-terracotta-700 font-medium truncate">
              {t('chat.recording', 'Listening... speak in your language')}
            </span>
          )}
        </div>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-cream-500 hover:text-charcoal-700 px-2 py-0.5 rounded hover:bg-cream-200/60 transition-colors flex-shrink-0 cursor-pointer"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
