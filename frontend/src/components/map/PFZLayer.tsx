import React from 'react'
import { CircleMarker, Popup, Polygon } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import { useRoute } from '../../hooks/useRoute'
import type { PFZZone } from '../../services/agents'

export default function PFZLayer() {
  const pfzZones = useMapStore((s) => s.pfzZones)
  const selectPFZ = useMapStore((s) => s.selectPFZ)
  const setDestination = useRouteStore((s) => s.setDestination)
  const origin = useRouteStore((s) => s.origin)
  const { compute } = useRoute()

  const handleClick = (zone: PFZZone) => {
    selectPFZ(zone)
    setDestination({ lat: zone.center.lat, lon: zone.center.lon })
  }

  const handleRouteToZone = (zone: PFZZone) => {
    const dest = { lat: zone.center.lat, lon: zone.center.lon }
    selectPFZ(zone)
    setDestination(dest)
    compute(origin || { lat: 9.9312, lon: 76.2673 }, dest)
  }

  return (
    <>
      {pfzZones.map((zone) => (
        <React.Fragment key={zone.id}>
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
                <PFZPopup zone={zone} onSelectRoute={handleRouteToZone} />
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
                fillOpacity: 0.35,
                weight: 2,
              }}
              eventHandlers={{ click: () => handleClick(zone) }}
            >
              <Popup>
                <PFZPopup zone={zone} onSelectRoute={handleRouteToZone} />
              </Popup>
            </CircleMarker>
          )}
        </React.Fragment>
      ))}
    </>
  )
}

function PFZPopup({
  zone,
  onSelectRoute,
}: {
  zone: PFZZone
  onSelectRoute: (zone: PFZZone) => void
}) {
  return (
    <div className="font-sans text-sm min-w-[210px] p-0.5">
      <div className="flex items-center justify-between border-b border-cream-200 pb-1.5 mb-2">
        <h4 className="font-bold text-charcoal-900 text-sm">
          {zone.label || `Zone ${zone.id.slice(0, 6)}`}
        </h4>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {(zone.score * 100).toFixed(0)}% PFZ
        </span>
      </div>
      <div className="space-y-1 text-xs text-charcoal-800">
        <div className="flex justify-between">
          <span className="text-gray-500">SST Front Gradient:</span>
          <span className="font-semibold">{zone.sst_gradient.toFixed(2)}°C / 10km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Chlorophyll-a:</span>
          <span className="font-semibold text-emerald-700">{zone.chlorophyll.toFixed(2)} mg/m³</span>
        </div>
        {zone.area_km2 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Coverage Area:</span>
            <span className="font-medium">{zone.area_km2.toFixed(0)} km²</span>
          </div>
        )}
        <div className="flex justify-between text-gray-400 text-[10px] pt-1">
          <span>Coordinates:</span>
          <span>{zone.center.lat.toFixed(3)}°N, {zone.center.lon.toFixed(3)}°E</span>
        </div>
      </div>
      <button
        onClick={() => onSelectRoute(zone)}
        className="w-full mt-3 px-2.5 py-1.5 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
      >
        Plan Safe Route Here
      </button>
    </div>
  )
}

function getZoneColor(score: number): string {
  if (score >= 0.7) return '#2E7D32' // High — green
  if (score >= 0.4) return '#FF9800' // Medium — orange
  return '#F44336' // Low — red
}
