import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useMapStore } from '../../store/mapStore'
import PFZLayer from './PFZLayer'
import HazardOverlay from './HazardOverlay'
import RouteLayer from './RouteLayer'
import VesselLayer from './VesselLayer'
import 'leaflet/dist/leaflet.css'

function MapEventHandler() {
  const setView = useMapStore((s) => s.setView)

  useMapEvents({
    moveend: (e) => {
      const map = e.target
      const center = map.getCenter()
      setView([center.lat, center.lng], map.getZoom())
    },
  })

  return null
}

function MapViewController() {
  const map = useMap()
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)

  // Only fly to if significantly different
  const mapCenter = map.getCenter()
  const dist = Math.abs(mapCenter.lat - center[0]) + Math.abs(mapCenter.lng - center[1])
  if (dist > 1) {
    map.flyTo(center, zoom, { duration: 1.5 })
  }

  return null
}

export default function MapView() {
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)
  const layers = useMapStore((s) => s.layers)

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={true}
    >
      {/* Base tiles — OpenStreetMap */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {/* OpenSeaMap overlay */}
      <TileLayer
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a>'
        opacity={0.7}
      />

      {/* Map event handlers */}
      <MapEventHandler />

      {/* Conditional layers */}
      {layers.pfz && <PFZLayer />}
      {layers.hazards && <HazardOverlay />}
      {layers.route && <RouteLayer />}
      {layers.vessels && <VesselLayer />}
    </MapContainer>
  )
}
