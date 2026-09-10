import { useChatStore } from '../../store/chatStore'

export default function ContextChips() {
  const contextChips = useChatStore((s) => s.contextChips)
  const removeContextChip = useChatStore((s) => s.removeContextChip)

  if (contextChips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {contextChips.map((chip) => (
        <span key={chip.id} className="context-chip">
          {chip.label}
          <button
            onClick={() => removeContextChip(chip.id)}
            aria-label={`Remove ${chip.label}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
