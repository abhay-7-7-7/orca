import { Rectangle, Tooltip } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'

function getSSTColor(temp: number): string {
  if (temp >= 30.2) return '#DC2626' // Hot (>30.2°C) - Red
  if (temp >= 29.5) return '#EA580C' // Warm (29.5-30.2°C) - Orange
  if (temp >= 28.8) return '#F59E0B' // Mild warm (28.8-29.5°C) - Amber
  if (temp >= 28.0) return '#10B981' // Moderate (28.0-28.8°C) - Emerald
  if (temp >= 27.2) return '#06B6D4' // Cool upwelling (27.2-28.0°C) - Cyan
  return '#2563EB' // Deep cool (<27.2°C) - Royal blue
}

export default function SSTHeatmapLayer() {
  const worldState = useMapStore((s) => s.worldState)

  if (!worldState || worldState.length === 0) return null

  // Resolution cell size
  const halfRes = 0.2

  return (
    <>
      {worldState.map((cell, i) => {
        if (cell.sst === undefined) return null

        const color = getSSTColor(cell.sst)
        // High chlorophyll (>1.5 mg/m³) indicates strong nutrient upwelling
        const isUpwelling = (cell.chlorophyll || 0) >= 1.4

        return (
          <Rectangle
            key={`sst-${i}-${cell.lat}-${cell.lon}`}
            bounds={[
              [cell.lat - halfRes, cell.lon - halfRes],
              [cell.lat + halfRes, cell.lon + halfRes],
            ]}
            pathOptions={{
              color: isUpwelling ? '#10B981' : 'transparent',
              weight: isUpwelling ? 1.5 : 0,
              fillColor: color,
              fillOpacity: 0.32,
              dashArray: isUpwelling ? '3, 3' : undefined,
            }}
          >
            <Tooltip>
              <div className="font-sans text-xs p-1 min-w-[150px]">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-1">
                  <p className="font-bold text-charcoal-900">
                    Thermal SST
                  </p>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {cell.sst.toFixed(1)}°C
                  </span>
                </div>

                <div className="space-y-0.5 text-charcoal-800">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Chlorophyll-a:</span>
                    <span className="font-semibold text-emerald-700">
                      {cell.chlorophyll?.toFixed(2) ?? 'N/A'} mg/m³
                    </span>
                  </p>
                  {isUpwelling && (
                    <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded mt-1">
                      Nutrient-Rich Upwelling Front
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {cell.lat.toFixed(2)}°N, {cell.lon.toFixed(2)}°E
                  </p>
                </div>
              </div>
            </Tooltip>
          </Rectangle>
        )
      })}
    </>
  )
}
