import { Polyline, CircleMarker, Popup } from 'react-leaflet'
import { useRouteStore } from '../../store/routeStore'

export default function RouteLayer() {
  const activeRoute = useRouteStore((s) => s.activeRoute)
  const origin = useRouteStore((s) => s.origin)
  const destination = useRouteStore((s) => s.destination)

  return (
    <>
      {/* Origin marker */}
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lon]}
          radius={8}
          pathOptions={{
            color: '#1A1A1A',
            fillColor: '#1A1A1A',
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="font-sans text-sm">
              <p className="font-medium">📍 Origin</p>
              <p className="text-xs text-gray-500">
                {origin.lat.toFixed(4)}°N, {origin.lon.toFixed(4)}°E
              </p>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Destination marker */}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lon]}
          radius={8}
          pathOptions={{
            color: '#2E7D32',
            fillColor: '#2E7D32',
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="font-sans text-sm">
              <p className="font-medium">🎯 Destination</p>
              <p className="text-xs text-gray-500">
                {destination.lat.toFixed(4)}°N, {destination.lon.toFixed(4)}°E
              </p>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Route polyline */}
      {activeRoute && activeRoute.path && (
        <>
          {/* Shadow line */}
          <Polyline
            positions={activeRoute.path.map(([lat, lon]) => [lat, lon] as [number, number])}
            pathOptions={{
              color: '#000',
              weight: 6,
              opacity: 0.15,
            }}
          />
          {/* Main route line */}
          <Polyline
            positions={activeRoute.path.map(([lat, lon]) => [lat, lon] as [number, number])}
            pathOptions={{
              color: '#C4703F',
              weight: 4,
              opacity: 0.9,
              dashArray: undefined,
            }}
          />
          {/* Hazard markers along path */}
          {activeRoute.hazards_along_path?.map((hazard, i) => (
            <CircleMarker
              key={i}
              center={[hazard.location.lat, hazard.location.lon]}
              radius={6}
              pathOptions={{
                color: hazard.severity === 'high' ? '#F44336' : '#FF9800',
                fillColor: hazard.severity === 'high' ? '#F44336' : '#FF9800',
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup>
                <div className="font-sans text-sm">
                  <p className="font-medium">⚠️ {hazard.type}</p>
                  <p className="text-xs">{hazard.description}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}
    </>
  )
}
