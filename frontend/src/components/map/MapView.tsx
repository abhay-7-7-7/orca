import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useMapStore } from '../../store/mapStore'
import { useRouteStore } from '../../store/routeStore'
import PFZLayer from './PFZLayer'
import HazardOverlay from './HazardOverlay'
import EEZLayer from './EEZLayer'
import RouteLayer from './RouteLayer'
import VesselLayer from './VesselLayer'
import MapLegend from './MapLegend'
import 'leaflet/dist/leaflet.css'

function MapEventHandler() {
  const setView = useMapStore((s) => s.setView)
  const mapClickMode = useMapStore((s) => s.mapClickMode)
  const setMapClickMode = useMapStore((s) => s.setMapClickMode)
  const setOrigin = useRouteStore((s) => s.setOrigin)
  const setDestination = useRouteStore((s) => s.setDestination)

  useMapEvents({
    moveend: (e) => {
      const map = e.target
      const center = map.getCenter()
      setView([center.lat, center.lng], map.getZoom())
    },
    click: (e) => {
      const lat = Number(e.latlng.lat.toFixed(4))
      const lon = Number(e.latlng.lng.toFixed(4))

      if (mapClickMode === 'set_origin') {
        setOrigin({ lat, lon })
        setMapClickMode('none')
      } else if (mapClickMode === 'set_destination') {
        setDestination({ lat, lon })
        setMapClickMode('none')
      }
    },
  })

  return null
}

function MapScaleControl() {
  const map = useMap()

  useEffect(() => {
    const scale = L.control.scale({
      imperial: false,
      metric: true,
      position: 'bottomright',
    })
    scale.addTo(map)

    return () => {
      scale.remove()
    }
  }, [map])

  return null
}

function MapViewController() {
  const map = useMap()
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)

  const mapCenter = map.getCenter()
  const dist = Math.abs(mapCenter.lat - center[0]) + Math.abs(mapCenter.lng - center[1])
  if (dist > 1.2) {
    map.flyTo(center, zoom, { duration: 1.2 })
  }

  return null
}

export default function MapView() {
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)
  const layers = useMapStore((s) => s.layers)
  const mapClickMode = useMapStore((s) => s.mapClickMode)

  return (
    <div className="w-full h-full relative">
      {/* Click mode banner indicator */}
      {mapClickMode !== 'none' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1002] bg-terracotta-500 text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>🎯</span>
          {mapClickMode === 'set_origin'
            ? 'Click anywhere on the sea to set ORIGIN harbor'
            : 'Click anywhere on the sea to set DESTINATION point'}
        </div>
      )}

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
          maxZoom={18}
        />

        {/* OpenPortGuide / OpenSeaMap Wind Streamlines (Flowing aerodynamic vectors as in OpenSeaMap) */}
        {layers.windStream && (
          <TileLayer
            url="https://weather.openportguide.de/tiles/actual/wind_stream/0h/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openportguide.de">OpenPortGuide Weather</a>'
            maxNativeZoom={7}
            maxZoom={18}
            opacity={0.88}
            zIndex={350}
          />
        )}

        {/* OpenPortGuide Wind Barbs */}
        {layers.windBarbs && (
          <TileLayer
            url="https://weather.openportguide.de/tiles/actual/wind_barb/0h/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openportguide.de">OpenPortGuide</a>'
            maxNativeZoom={7}
            maxZoom={18}
            opacity={0.85}
            zIndex={355}
          />
        )}

        {/* OpenPortGuide Sea Surface Temperature (SST Thermal Heatmap) */}
        {layers.sst && (
          <TileLayer
            url="https://weather.openportguide.de/tiles/actual/sea_surface_temperature/0h/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openportguide.de">OpenPortGuide SST</a>'
            maxNativeZoom={7}
            maxZoom={18}
            opacity={0.65}
            zIndex={320}
          />
        )}

        {/* OpenPortGuide Significant Wave Height */}
        {layers.waves && (
          <TileLayer
            url="https://weather.openportguide.de/tiles/actual/significant_wave_height/0h/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openportguide.de">OpenPortGuide Wave</a>'
            maxNativeZoom={7}
            maxZoom={18}
            opacity={0.65}
            zIndex={330}
          />
        )}

        {/* OpenSeaMap Seamark Navigation overlay (Lighthouses, buoys, beacons, port signals) */}
        {layers.seamarks && (
          <TileLayer
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a>'
            opacity={0.95}
            zIndex={450}
            maxZoom={18}
          />
        )}

        {/* Map controls & event listeners */}
        <MapEventHandler />
        <MapScaleControl />
        <MapViewController />

        {/* Interactive ORCA Marine layers */}
        {layers.eez && <EEZLayer />}
        {layers.hazards && <HazardOverlay />}
        {layers.pfz && <PFZLayer />}
        {layers.route && <RouteLayer />}
        {layers.vessels && <VesselLayer />}
      </MapContainer>

      {/* Floating Marine Legend */}
      <MapLegend />
    </div>
  )
}
