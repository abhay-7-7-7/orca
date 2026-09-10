import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface VoiceIndicatorProps {
  getAnalyserData: () => Uint8Array | null
}

export default function VoiceIndicator({ getAnalyserData }: VoiceIndicatorProps) {
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
          const height = Math.max(4, (value / 255) * 32)
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
    <div className="flex items-center gap-3">
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-soft" />
      <div
        ref={barsRef}
        className="flex items-end gap-[3px] h-8"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="voice-bar"
            style={{ height: '4px', transition: 'height 0.05s ease' }}
          />
        ))}
      </div>
      <span className="text-xs text-terracotta-600 font-medium ml-2">
        {t('chat.recording')}
      </span>
    </div>
  )
}
