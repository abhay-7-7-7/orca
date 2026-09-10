import { Polyline, CircleMarker, Popup, Tooltip } from 'react-leaflet'
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
          radius={9}
          pathOptions={{
            color: '#1E293B',
            fillColor: '#0EA5E9',
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="font-sans text-xs min-w-[150px]">
              <p className="font-bold text-charcoal-900">
                Departure Harbor / Origin
              </p>
              <p className="text-gray-500 mt-1">
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
          radius={9}
          pathOptions={{
            color: '#1E293B',
            fillColor: '#10B981',
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="font-sans text-xs min-w-[150px]">
              <p className="font-bold text-charcoal-900">
                Destination Target
              </p>
              <p className="text-gray-500 mt-1">
                {destination.lat.toFixed(4)}°N, {destination.lon.toFixed(4)}°E
              </p>
              {activeRoute && (
                <div className="mt-2 pt-1.5 border-t border-gray-100 text-[11px] text-charcoal-800">
                  <p>Total: <span className="font-semibold">{activeRoute.total_distance_km.toFixed(1)} km</span></p>
                  <p>ETA: <span className="font-semibold">{activeRoute.estimated_time_hours.toFixed(1)} hrs</span></p>
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Route polyline & waypoints */}
      {activeRoute && activeRoute.path && activeRoute.path.length > 1 && (
        <>
          {/* Outer glow line */}
          <Polyline
            positions={activeRoute.path}
            pathOptions={{
              color: '#000000',
              weight: 7,
              opacity: 0.18,
            }}
          />

          {/* Main route track */}
          <Polyline
            positions={activeRoute.path}
            pathOptions={{
              color: '#C4703F',
              weight: 4.5,
              opacity: 0.95,
            }}
          />

          {/* Intermediate navigational waypoints */}
          {activeRoute.waypoints &&
            activeRoute.waypoints.map((wp, idx) => {
              // Show every 3rd or 4th waypoint to keep map clean
              if (idx === 0 || idx === activeRoute.waypoints.length - 1 || idx % 2 !== 0) return null
              return (
                <CircleMarker
                  key={`wp-${idx}`}
                  center={[wp.lat, wp.lon]}
                  radius={3.5}
                  pathOptions={{
                    color: '#C4703F',
                    fillColor: '#FFFFFF',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]}>
                    <div className="font-sans text-[11px] p-0.5">
                      <p className="font-bold text-charcoal-900">Waypoint #{idx + 1}</p>
                      {wp.wave_height !== undefined && (
                        <p className="text-gray-600">Wave: {wp.wave_height.toFixed(1)}m</p>
                      )}
                      {wp.wind_speed !== undefined && (
                        <p className="text-gray-600">Wind: {wp.wind_speed.toFixed(1)} km/h</p>
                      )}
                    </div>
                  </Tooltip>
                </CircleMarker>
              )
            })}

          {/* Hazard warnings along route */}
          {activeRoute.hazards_along_path?.map((hazard, i) => (
            <CircleMarker
              key={`hazard-pt-${i}`}
              center={[hazard.location.lat, hazard.location.lon]}
              radius={7}
              pathOptions={{
                color: hazard.severity === 'high' ? '#EF4444' : '#F59E0B',
                fillColor: hazard.severity === 'high' ? '#EF4444' : '#F59E0B',
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div className="font-sans text-xs">
                  <p className="font-bold text-amber-800">
                    {hazard.type}
                  </p>
                  <p className="text-gray-700 mt-1">{hazard.description}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}
    </>
  )
}
