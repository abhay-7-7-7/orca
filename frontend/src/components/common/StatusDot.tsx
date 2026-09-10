interface StatusDotProps {
  status: 'live' | 'mock' | 'error'
  label?: string
  showLabel?: boolean
}

export default function StatusDot({ status, label, showLabel = false }: StatusDotProps) {
  const labels: Record<string, string> = {
    live: label || 'Live',
    mock: label || 'Demo data',
    error: label || 'Unavailable',
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`status-dot ${status}`} />
      {showLabel && (
        <span className="text-xs text-cream-400 font-sans">{labels[status]}</span>
      )}
    </span>
  )
}
