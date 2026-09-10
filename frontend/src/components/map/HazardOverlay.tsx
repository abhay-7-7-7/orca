import { Circle, CircleMarker, Popup } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'

export default function HazardOverlay() {
  const worldState = useMapStore((s) => s.worldState)

  if (!worldState.length) return null

  // Find cells with critical/severe marine conditions (e.g. wave > 2.2m or cyclone proximity)
  const criticalCells = worldState.filter(
    (cell) => (cell.wave_height || 0) >= 2.2 || (cell.hazard_cost || 0) >= 0.65
  )

  return (
    <>
      {criticalCells.map((cell, i) => {
        const wave = cell.wave_height || 2.4

        return (
          <div key={`crit-hazard-${i}-${cell.lat}-${cell.lon}`}>
            {/* Warning radius circle */}
            <Circle
              center={[cell.lat, cell.lon]}
              radius={18000} // 18 km alert radius
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            />

            {/* Warning beacon pin */}
            <CircleMarker
              center={[cell.lat, cell.lon]}
              radius={6}
              pathOptions={{
                color: '#DC2626',
                fillColor: '#FFFFFF',
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>
                <div className="font-sans text-xs p-1 min-w-[160px]">
                  <p className="font-bold text-red-600 flex items-center gap-1">
                    <span>⚠️</span> Rough Sea Swell Warning
                  </p>
                  <p className="text-gray-700 mt-1">
                    Significant wave height: <span className="font-bold text-red-600">{wave.toFixed(1)}m</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Position: {cell.lat.toFixed(2)}°N, {cell.lon.toFixed(2)}°E
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1 font-medium bg-amber-50 p-1 rounded">
                    Navigation advisory: Reduce speed & avoid small craft operations.
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          </div>
        )
      })}
    </>
  )
}
