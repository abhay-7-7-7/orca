import { useChatStore } from '../../store/chatStore'
import { useTranslation } from 'react-i18next'

export default function LanguageBadge() {
  const { t } = useTranslation()
  const detectedLanguage = useChatStore((s) => s.detectedLanguage)
  const overrideLanguage = useChatStore((s) => s.overrideLanguage)
  const setOverrideLanguage = useChatStore((s) => s.setOverrideLanguage)

  if (!detectedLanguage) return null

  const displayLang = overrideLanguage || detectedLanguage

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-2 py-1 rounded-full bg-ocean-500/10 text-ocean-600 font-medium border border-ocean-500/20">
        {t('chat.detected')}: {displayLang}
      </span>
      {!overrideLanguage && (
        <button
          onClick={() => setOverrideLanguage('English')}
          className="text-[10px] text-cream-400 hover:text-charcoal-900 underline"
        >
          Switch to English
        </button>
      )}
      {overrideLanguage && (
        <button
          onClick={() => setOverrideLanguage(null)}
          className="text-[10px] text-cream-400 hover:text-charcoal-900 underline"
        >
          Auto-detect
        </button>
      )}
    </div>
  )
}
