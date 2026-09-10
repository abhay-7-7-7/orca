import { Rectangle, Tooltip } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'

export default function HazardOverlay() {
  const worldState = useMapStore((s) => s.worldState)

  if (!worldState.length) return null

  return (
    <>
      {worldState.map((cell, i) => {
        const cost = cell.hazard_cost || 0
        if (cost < 0.1) return null // Skip very low hazard cells

        const color = getHazardColor(cost)
        const halfRes = 0.25 // Half the resolution for cell bounds

        return (
          <Rectangle
            key={i}
            bounds={[
              [cell.lat - halfRes, cell.lon - halfRes],
              [cell.lat + halfRes, cell.lon + halfRes],
            ]}
            pathOptions={{
              color: 'transparent',
              fillColor: color,
              fillOpacity: Math.min(0.5, cost * 0.4),
              weight: 0,
            }}
          >
            <Tooltip>
              <div className="font-sans text-xs">
                <p className="font-medium">Hazard Level: {(cost * 100).toFixed(0)}%</p>
                {cell.wave_height !== undefined && (
                  <p>🌊 Wave: {cell.wave_height.toFixed(1)}m</p>
                )}
                {cell.wind_speed !== undefined && (
                  <p>💨 Wind: {cell.wind_speed.toFixed(1)} km/h</p>
                )}
                {cell.in_mpa && <p>🏛️ Marine Protected Area</p>}
                {cell.in_eez === false && <p>⚠️ Outside EEZ</p>}
              </div>
            </Tooltip>
          </Rectangle>
        )
      })}
    </>
  )
}

function getHazardColor(cost: number): string {
  if (cost >= 0.8) return '#D32F2F' // Critical — red
  if (cost >= 0.5) return '#FF9800' // High — orange
  if (cost >= 0.3) return '#FFC107' // Medium — amber
  return '#4CAF50' // Low — green
}
