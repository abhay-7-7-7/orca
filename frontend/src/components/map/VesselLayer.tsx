import { CircleMarker, Tooltip } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'

export default function VesselLayer() {
  const vessels = useMapStore((s) => s.vessels)

  return (
    <>
      {vessels.map((vessel) => (
        <CircleMarker
          key={vessel.mmsi}
          center={[vessel.lat, vessel.lon]}
          radius={4}
          pathOptions={{
            color: '#1565C0',
            fillColor: '#42A5F5',
            fillOpacity: 0.8,
            weight: 1.5,
          }}
        >
          <Tooltip>
            <div className="font-sans text-xs">
              <p className="font-medium">{vessel.name || `Vessel ${vessel.mmsi}`}</p>
              {vessel.speed !== undefined && <p>Speed: {vessel.speed.toFixed(1)} kn</p>}
              {vessel.course !== undefined && <p>Course: {vessel.course.toFixed(0)}°</p>}
              {vessel.vessel_type && <p>Type: {vessel.vessel_type}</p>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}
