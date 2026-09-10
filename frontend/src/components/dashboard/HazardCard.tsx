interface HazardProps {
  hazard: {
    type: string
    location: { lat: number; lon: number }
    severity: string
    description: string
  }
}

const severityColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export default function HazardCard({ hazard }: HazardProps) {
  const colors = severityColors[hazard.severity] || severityColors.medium

  return (
    <div className={`${colors.bg} rounded-lg px-3 py-2.5 border ${colors.border}`}>
      <div className="flex items-start gap-2.5">
        <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${colors.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-xs font-semibold ${colors.text} capitalize`}>
              {hazard.type}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
              {hazard.severity}
            </span>
          </div>
          <p className="text-xs text-charcoal-800/70 leading-relaxed">
            {hazard.description}
          </p>
          <p className="text-[10px] text-cream-400 mt-1">
            {hazard.location.lat.toFixed(2)}°N, {hazard.location.lon.toFixed(2)}°E
          </p>
        </div>
      </div>
    </div>
  )
}
