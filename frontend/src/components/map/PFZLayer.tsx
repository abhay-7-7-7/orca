import { CircleMarker, Popup, Polygon } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import type { PFZZone } from '../../services/agents'

export default function PFZLayer() {
  const pfzZones = useMapStore((s) => s.pfzZones)
  const selectPFZ = useMapStore((s) => s.selectPFZ)
  const setDestination = useRouteStore((s) => s.setDestination)

  const handleClick = (zone: PFZZone) => {
    selectPFZ(zone)
    setDestination({ lat: zone.center.lat, lon: zone.center.lon })
  }

  return (
    <>
      {pfzZones.map((zone) => (
        <div key={zone.id}>
          {/* If polygon data exists, render polygon */}
          {zone.polygon && zone.polygon.length > 2 ? (
            <Polygon
              positions={zone.polygon.map(([lat, lon]) => [lat, lon] as [number, number])}
              pathOptions={{
                color: getZoneColor(zone.score),
                fillColor: getZoneColor(zone.score),
                fillOpacity: 0.2,
                weight: 2,
              }}
              eventHandlers={{ click: () => handleClick(zone) }}
            >
              <Popup>
                <PFZPopup zone={zone} />
              </Popup>
            </Polygon>
          ) : (
            /* Otherwise render as a circle marker */
            <CircleMarker
              center={[zone.center.lat, zone.center.lon]}
              radius={Math.max(8, zone.score * 15)}
              pathOptions={{
                color: getZoneColor(zone.score),
                fillColor: getZoneColor(zone.score),
                fillOpacity: 0.3,
                weight: 2,
              }}
              eventHandlers={{ click: () => handleClick(zone) }}
            >
              <Popup>
                <PFZPopup zone={zone} />
              </Popup>
            </CircleMarker>
          )}
        </div>
      ))}
    </>
  )
}

function PFZPopup({ zone }: { zone: PFZZone }) {
  return (
    <div className="font-sans text-sm min-w-[200px]">
      <h4 className="font-semibold text-charcoal-900 mb-2 text-base">
        🐟 PFZ Zone {zone.label || zone.id.slice(0, 6)}
      </h4>
      <div className="space-y-1 text-charcoal-800/70">
        <p>
          <span className="font-medium text-charcoal-900">Score:</span>{' '}
          {(zone.score * 100).toFixed(0)}%
        </p>
        <p>
          <span className="font-medium text-charcoal-900">SST Gradient:</span>{' '}
          {zone.sst_gradient.toFixed(2)}°C
        </p>
        <p>
          <span className="font-medium text-charcoal-900">Chlorophyll:</span>{' '}
          {zone.chlorophyll.toFixed(2)} mg/m³
        </p>
        {zone.area_km2 && (
          <p>
            <span className="font-medium text-charcoal-900">Area:</span>{' '}
            {zone.area_km2.toFixed(1)} km²
          </p>
        )}
        <p className="text-xs mt-2">
          📍 {zone.center.lat.toFixed(3)}°N, {zone.center.lon.toFixed(3)}°E
        </p>
      </div>
      <p className="text-xs text-terracotta-500 mt-2 font-medium">
        Click to set as route destination
      </p>
    </div>
  )
}

function getZoneColor(score: number): string {
  if (score >= 0.7) return '#2E7D32' // High — green
  if (score >= 0.4) return '#FF9800' // Medium — orange
  return '#F44336' // Low — red
}
