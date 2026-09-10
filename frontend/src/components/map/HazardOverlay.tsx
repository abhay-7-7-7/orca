import { Rectangle, Tooltip } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'

export default function HazardOverlay() {
  const worldState = useMapStore((s) => s.worldState)

  if (!worldState.length) return null

  return (
    <>
      {worldState.map((cell, i) => {
        const cost = cell.hazard_cost || 0
        const isHighWave = (cell.wave_height || 0) >= 1.8
        // Show if hazard cost is moderate/high OR wave height is significant
        if (cost < 0.3 && !isHighWave) return null

        const color = getHazardColor(cost, cell.wave_height)
        const halfRes = 0.2

        return (
          <Rectangle
            key={`hazard-${i}-${cell.lat}-${cell.lon}`}
            bounds={[
              [cell.lat - halfRes, cell.lon - halfRes],
              [cell.lat + halfRes, cell.lon + halfRes],
            ]}
            pathOptions={{
              color: cost >= 0.6 ? '#DC2626' : 'transparent',
              weight: cost >= 0.6 ? 1.5 : 0,
              fillColor: color,
              fillOpacity: Math.min(0.45, Math.max(0.2, cost * 0.5)),
            }}
          >
            <Tooltip>
              <div className="font-sans text-xs p-1 min-w-[140px]">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1">
                  <p className="font-bold text-charcoal-900 flex items-center gap-1">
                    <span>⚠️</span> Marine Hazard
                  </p>
                  <span
                    className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {(cost * 100).toFixed(0)}% Risk
                  </span>
                </div>
                <div className="space-y-0.5 text-charcoal-800">
                  {cell.wave_height !== undefined && (
                    <p className="flex justify-between">
                      <span className="text-gray-500">🌊 Wave Height:</span>
                      <span className={`font-semibold ${cell.wave_height >= 2.0 ? 'text-red-600' : 'text-charcoal-900'}`}>
                        {cell.wave_height.toFixed(1)}m
                      </span>
                    </p>
                  )}
                  {cell.wind_speed !== undefined && (
                    <p className="flex justify-between">
                      <span className="text-gray-500">💨 Wind Speed:</span>
                      <span className="font-semibold">{cell.wind_speed.toFixed(1)} km/h</span>
                    </p>
                  )}
                  {cell.in_mpa && (
                    <p className="text-[10px] text-amber-700 font-medium mt-1">
                      🏛️ Marine Protected Area
                    </p>
                  )}
                  {cell.in_eez === false && (
                    <p className="text-[10px] text-red-600 font-medium mt-1">
                      ⚠️ International Waters (Outside EEZ)
                    </p>
                  )}
                </div>
              </div>
            </Tooltip>
          </Rectangle>
        )
      })}
    </>
  )
}

function getHazardColor(cost: number, waveHeight?: number): string {
  if (cost >= 0.65 || (waveHeight && waveHeight >= 2.4)) return '#EF4444' // Critical / Rough — Red
  if (cost >= 0.45 || (waveHeight && waveHeight >= 1.9)) return '#F97316' // High — Orange
  if (cost >= 0.3) return '#FBBF24' // Moderate — Amber
  return '#10B981' // Low — Emerald
}
