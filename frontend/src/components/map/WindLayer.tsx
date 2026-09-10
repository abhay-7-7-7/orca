import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '../../store/mapStore'

function getWindColor(speed: number): string {
  if (speed >= 40) return '#EF4444' // Gale / high — red
  if (speed >= 28) return '#F59E0B' // Strong — amber
  if (speed >= 16) return '#10B981' // Moderate — emerald
  return '#0EA5E9' // Light — sky blue
}

function getWindDescription(speed: number): string {
  if (speed >= 40) return 'Rough / Strong Gale'
  if (speed >= 28) return 'Moderate chop / Strong breeze'
  if (speed >= 16) return 'Gentle chop / Moderate breeze'
  return 'Calm / Light air'
}

function getCardinalDirection(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  return directions[idx]
}

function createWindIcon(speed: number, direction: number) {
  const color = getWindColor(speed)
  const knots = Math.round(speed * 0.539957)

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; width: 44px; height: 44px;">
      <div style="transform: rotate(${direction}deg); transition: transform 0.3s ease;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L6 14H10V22H14V14H18L12 2Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </div>
      <span style="font-size: 9px; font-weight: 700; color: #1e293b; background: rgba(255,255,255,0.85); padding: 1px 3px; border-radius: 3px; margin-top: -2px; box-shadow: 0 1px 2px rgba(0,0,0,0.15); white-space: nowrap;">
        ${Math.round(speed)}k
      </span>
    </div>
  `

  return L.divIcon({
    html,
    className: 'wind-marker-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

export default function WindLayer() {
  const worldState = useMapStore((s) => s.worldState)

  if (!worldState || worldState.length === 0) return null

  // Filter cells that have wind data and sample down to avoid visual clutter
  const windCells = worldState.filter((cell) => cell.wind_speed !== undefined)

  return (
    <>
      {windCells.map((cell, idx) => {
        const speed = cell.wind_speed || 0
        const dir = cell.wind_direction ?? 245
        const knots = (speed * 0.539957).toFixed(1)
        const cardinal = getCardinalDirection(dir)
        const icon = createWindIcon(speed, dir)

        return (
          <Marker
            key={`wind-${idx}-${cell.lat}-${cell.lon}`}
            position={[cell.lat, cell.lon]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -18]}>
              <div className="font-sans text-xs p-0.5 min-w-[140px]">
                <p className="font-bold text-charcoal-900">
                  Wind Vector
                </p>
                <div className="mt-1 space-y-0.5 text-charcoal-800">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Speed:</span>
                    <span className="font-semibold">{speed.toFixed(1)} km/h ({knots} kn)</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Direction:</span>
                    <span className="font-semibold">{dir}° ({cardinal})</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">State:</span>
                    <span className="font-medium text-[11px] text-amber-700">{getWindDescription(speed)}</span>
                  </p>
                </div>
              </div>
            </Tooltip>
          </Marker>
        )
      })}
    </>
  )
}
