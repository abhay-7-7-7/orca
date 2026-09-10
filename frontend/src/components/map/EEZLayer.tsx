import { Polyline, Polygon, Tooltip } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'

export default function EEZLayer() {
  const showEEZ = useMapStore((s) => s.layers.eez)

  if (!showEEZ) return null

  // 200 Nautical Mile Indian Exclusive Economic Zone (EEZ) approximate boundary off Kerala / SW India
  const eezBoundary: [number, number][] = [
    [13.5, 71.2],
    [12.5, 71.5],
    [11.5, 71.8],
    [10.5, 72.3],
    [9.5, 72.9],
    [8.5, 73.6],
    [7.5, 74.4],
    [6.5, 75.8],
    [6.0, 77.2],
  ]

  // Coastal Marine Protected Area (MPA) / Fisheries Conservation Sanctuary
  const mpaReserve: [number, number][] = [
    [9.60, 76.05],
    [9.60, 76.22],
    [9.35, 76.22],
    [9.35, 76.05],
  ]

  return (
    <>
      {/* Indian EEZ 200 NM Outer Boundary */}
      <Polyline
        positions={eezBoundary}
        pathOptions={{
          color: '#3B82F6',
          weight: 2.5,
          dashArray: '8, 6',
          opacity: 0.8,
        }}
      >
        <Tooltip sticky>
          <div className="font-sans text-xs">
            <p className="font-bold text-blue-700">
              Indian EEZ Limit (200 NM)
            </p>
            <p className="text-gray-600 text-[11px]">
              Sovereign rights for fishing & resource exploitation. Beyond is High Seas.
            </p>
          </div>
        </Tooltip>
      </Polyline>

      {/* Marine Protected Area */}
      <Polygon
        positions={mpaReserve}
        pathOptions={{
          color: '#D97706',
          fillColor: '#F59E0B',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '5, 5',
        }}
      >
        <Tooltip sticky>
          <div className="font-sans text-xs">
            <p className="font-bold text-amber-800">
              Marine Protected Area (MPA)
            </p>
            <p className="text-gray-700 text-[11px]">
              Vembanad-Kochi Coastal Buffer. Commercial bottom trawling prohibited.
            </p>
          </div>
        </Tooltip>
      </Polygon>
    </>
  )
}
