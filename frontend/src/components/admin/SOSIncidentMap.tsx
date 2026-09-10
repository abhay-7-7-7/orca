import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DistressSignal, RescueAsset } from '../../types/sos'
import { Shield, Radio, Navigation, Users, Wind, Waves, MapPin, Compass } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Custom CSS for pulsing radar/distress beacons
const PULSE_STYLES = `
@keyframes distress-ping {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes asset-pulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 0.4; }
  100% { transform: scale(0.9); opacity: 0.8; }
}
.distress-marker-pulse {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.distress-ripple {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: distress-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.distress-core {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(0,0,0,0.35);
  font-weight: 700;
  color: white;
}
`

function createDistressIcon(signal: DistressSignal, isSelected: boolean) {
  const isCritical = signal.severity === 'critical'
  const isResolved = signal.status === 'resolved'
  const isDispatched = signal.status === 'dispatched' || signal.status === 'on_scene'

  let coreColor = '#DC2626' // red
  let rippleColor = 'rgba(239, 68, 68, 0.45)'

  if (isResolved) {
    coreColor = '#475569'
    rippleColor = 'transparent'
  } else if (isDispatched) {
    coreColor = '#D97706'
    rippleColor = 'rgba(245, 158, 11, 0.45)'
  } else if (!isCritical) {
    coreColor = '#C4703F'
    rippleColor = 'rgba(196, 112, 63, 0.45)'
  }

  const size = isSelected ? 36 : 28
  const borderStyle = isSelected ? 'border: 3px solid #FFFFFF;' : 'border: 2px solid #FFFFFF;'

  const html = `
    <div class="distress-marker-pulse" style="width: ${size}px; height: ${size}px;">
      ${!isResolved ? `<div class="distress-ripple" style="background-color: ${rippleColor};"></div>` : ''}
      <div class="distress-core" style="width: ${size}px; height: ${size}px; background-color: ${coreColor}; ${borderStyle}">
        <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
          <circle cx="12" cy="12" r="2"></circle>
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
          <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"></path>
        </svg>
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-distress-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createAssetIcon(asset: RescueAsset) {
  const isHeli = asset.asset_type === 'helicopter'
  const isInterceptor = asset.asset_type === 'interceptor'
  const size = 30

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: #1E3A8A;
      border: 2px solid #60A5FA;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 10px rgba(30, 58, 138, 0.4);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${
          isHeli
            ? '<path d="M12 2v4M4 6h16M7 10h10a4 4 0 0 1 4 4v2H3v-2a4 4 0 0 1 4-4zM9 16v4h6v-4" />'
            : isInterceptor
            ? '<polygon points="12 2 19 21 12 17 5 21 12 2" />'
            : '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />'
        }
      </svg>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-asset-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Controller to fly to selected signal
function MapCameraController({ selectedSignal }: { selectedSignal: DistressSignal | null }) {
  const map = useMap()
  const prevIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedSignal && selectedSignal.id !== prevIdRef.current) {
      prevIdRef.current = selectedSignal.id
      map.flyTo([selectedSignal.location.lat, selectedSignal.location.lon], 10, {
        duration: 1.2,
      })
    }
  }, [selectedSignal, map])

  return null
}

interface SOSIncidentMapProps {
  signals: DistressSignal[]
  assets: RescueAsset[]
  selectedSignal: DistressSignal | null
  onSelectSignal: (id: string) => void
}

export default function SOSIncidentMap({
  signals,
  assets,
  selectedSignal,
  onSelectSignal,
}: SOSIncidentMapProps) {
  const [showRadii, setShowRadii] = useState(true)
  const [showAssets, setShowAssets] = useState(true)

  // Default center around Arabian Sea / Southwest Indian Coast (Kochi sector)
  const defaultCenter: [number, number] = selectedSignal
    ? [selectedSignal.location.lat, selectedSignal.location.lon]
    : [11.0, 75.8]

  return (
    <div className="relative isolate z-0 w-full h-full min-h-[460px] bg-slate-900 rounded-xl overflow-hidden border border-cream-300 shadow-sm">
      <style>{PULSE_STYLES}</style>

      <MapContainer
        center={defaultCenter}
        zoom={selectedSignal ? 9 : 7}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Clean OpenStreetMap nautical basemap tiles — no API key watermark */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={18}
        />

        <MapCameraController selectedSignal={selectedSignal} />

        {/* Distress Signals Markers */}
        {signals.map((signal) => {
          const isSelected = selectedSignal?.id === signal.id
          const isCritical = signal.severity === 'critical'
          const isResolved = signal.status === 'resolved'

          return (
            <div key={signal.id}>
              {/* Drift & Search Probability Radius (3 NM ≈ 5556 meters) */}
              {showRadii && !isResolved && (
                <Circle
                  center={[signal.location.lat, signal.location.lon]}
                  radius={5500}
                  pathOptions={{
                    color: isCritical ? '#EF4444' : '#F59E0B',
                    fillColor: isCritical ? '#EF4444' : '#F59E0B',
                    fillOpacity: isSelected ? 0.18 : 0.08,
                    weight: isSelected ? 2 : 1.2,
                    dashArray: '4, 6',
                  }}
                />
              )}

              <Marker
                position={[signal.location.lat, signal.location.lon]}
                icon={createDistressIcon(signal, isSelected)}
                eventHandlers={{
                  click: () => onSelectSignal(signal.id),
                }}
              >
                <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                  <div className="font-sans text-xs p-1 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-charcoal-900">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          signal.severity === 'critical'
                            ? 'bg-red-600'
                            : signal.severity === 'high'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      {signal.vessel_name} ({signal.id})
                    </div>
                    <p className="text-[11px] text-charcoal-700 capitalize">
                      Distress: {signal.distress_type.replace('_', ' ')}
                    </p>
                    <p className="text-[10px] text-charcoal-500">
                      {signal.crew_count} Crew • {signal.distance_to_coast_nm} NM off {signal.nearest_port}
                    </p>
                    <p className="text-[9px] font-mono text-terracotta-600">
                      {signal.location.lat.toFixed(4)}°N, {signal.location.lon.toFixed(4)}°E
                    </p>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="font-sans text-xs p-1 space-y-2 min-w-[200px]">
                    <div className="border-b border-cream-200 pb-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-charcoal-900 text-sm">
                          {signal.vessel_name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            signal.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {signal.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-charcoal-500 font-mono">
                        {signal.registration_no}
                      </p>
                    </div>

                    <p className="text-xs text-charcoal-800 leading-snug">
                      {signal.emergency_message}
                    </p>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-charcoal-600 pt-1">
                      <div>
                        <span className="text-charcoal-400">Crew:</span> {signal.crew_count} souls
                      </div>
                      <div>
                        <span className="text-charcoal-400">VHF:</span> Ch {signal.vhf_channel || '16'}
                      </div>
                      <div>
                        <span className="text-charcoal-400">Wave:</span> {signal.wave_height_m || 2.4}m
                      </div>
                      <div>
                        <span className="text-charcoal-400">Wind:</span> {signal.wind_speed_knots || 25} kn
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectSignal(signal.id)}
                      className="w-full mt-2 py-1 px-2 bg-charcoal-900 text-white rounded text-[11px] font-medium hover:bg-terracotta-500 transition-colors"
                    >
                      Open Full Dossier
                    </button>
                  </div>
                </Popup>
              </Marker>
            </div>
          )
        })}

        {/* Coast Guard & SAR Assets Markers */}
        {showAssets &&
          assets.map((asset) => (
            <Marker
              key={asset.id}
              position={[asset.location.lat, asset.location.lon]}
              icon={createAssetIcon(asset)}
            >
              <Tooltip direction="bottom" offset={[0, 14]}>
                <div className="font-sans text-xs p-0.5">
                  <p className="font-bold text-blue-900">{asset.name}</p>
                  <p className="text-[10px] text-slate-600">
                    Base: {asset.base_port} • Status: {asset.status}
                  </p>
                </div>
              </Tooltip>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Tactical Layer Toggles */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-cream-300 shadow-lg text-xs font-sans space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-charcoal-900 text-[11px] uppercase tracking-wider pb-1 border-b border-cream-200">
          <Radio className="w-3.5 h-3.5 text-terracotta-500" />
          Tactical Overlays
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-charcoal-700 hover:text-charcoal-900">
          <input
            type="checkbox"
            checked={showRadii}
            onChange={(e) => setShowRadii(e.target.checked)}
            className="rounded text-terracotta-500 focus:ring-terracotta-400"
          />
          Search & Drift Zones (3 NM)
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-charcoal-700 hover:text-charcoal-900">
          <input
            type="checkbox"
            checked={showAssets}
            onChange={(e) => setShowAssets(e.target.checked)}
            className="rounded text-terracotta-500 focus:ring-terracotta-400"
          />
          Coast Guard Assets ({assets.length})
        </label>
      </div>

      {/* Map Legend badge */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cream-200 shadow-sm text-[11px] font-sans flex items-center gap-3">
        <span className="flex items-center gap-1 text-red-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-600"></span> Critical
        </span>
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Dispatched
        </span>
        <span className="flex items-center gap-1 text-blue-800 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-700"></span> SAR Cutter
        </span>
      </div>
    </div>
  )
}
