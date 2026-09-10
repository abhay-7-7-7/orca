import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Map, X, Maximize2, Minimize2 } from 'lucide-react'
import ChatInterface from '../components/chatbot/ChatInterface'
import { useChatStore } from '../store/chatStore'
import { useWorldState } from '../hooks/useWorldState'
import PFZLayer from '../components/map/PFZLayer'
import EEZLayer from '../components/map/EEZLayer'
import HazardOverlay from '../components/map/HazardOverlay'
import { useMapStore } from '../store/mapStore'
import ErrorBoundary from '../components/common/ErrorBoundary'
import 'leaflet/dist/leaflet.css'

/* ── Map resize watcher ─────────────────────────── */
function MapResizeController() {
  const map = useMap()
  useEffect(() => {
    const handleResize = () => {
      try {
        map.invalidateSize()
      } catch {}
    }
    handleResize()
    const t1 = setTimeout(handleResize, 100)
    const t2 = setTimeout(handleResize, 400)
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])
  return null
}

/* ── Map auto-fly controller ────────────────────── */
function ChatMapController() {
  const map = useMap()
  const mapTarget = useChatStore((s) => s.mapTarget)
  const prevRef = useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (!mapTarget) return
    const lat = Number(mapTarget.lat)
    const lon = Number(mapTarget.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

    const prev = prevRef.current
    if (
      prev &&
      Math.abs(prev.lat - lat) < 0.001 &&
      Math.abs(prev.lon - lon) < 0.001
    ) {
      return
    }

    prevRef.current = { lat, lon }

    // Wait slightly for layout & Leaflet container size stabilization
    const timer = setTimeout(() => {
      try {
        map.invalidateSize()
        const size = map.getSize()
        const targetZoom = Number.isFinite(Number(mapTarget.zoom))
          ? Number(mapTarget.zoom)
          : 10

        if (size && size.x > 30 && size.y > 30) {
          map.flyTo([lat, lon], targetZoom, {
            duration: 1.2,
            easeLinearity: 0.25,
          })
        } else {
          map.setView([lat, lon], targetZoom)
        }
      } catch (err) {
        console.warn('Map flyTo caught safely:', err)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [mapTarget, map])

  return null
}

/* ── Location marker on map ─────────────────────── */
function ChatLocationMarker() {
  const mapTarget = useChatStore((s) => s.mapTarget)

  const markerData = useMemo(() => {
    if (!mapTarget) return null
    const lat = Number(mapTarget.lat)
    const lon = Number(mapTarget.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return { lat, lon, label: mapTarget.label }
  }, [mapTarget])

  if (!markerData) return null

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width: 20px; height: 20px;
      background: #E05E3A;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse-ring 1.5s ease-out infinite;
    "></div>
    <style>
      @keyframes pulse-ring {
        0% { box-shadow: 0 0 0 0 rgba(224,94,58,0.5); }
        70% { box-shadow: 0 0 0 12px rgba(224,94,58,0); }
        100% { box-shadow: 0 0 0 0 rgba(224,94,58,0); }
      }
    </style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

  return (
    <Marker position={[markerData.lat, markerData.lon]} icon={icon}>
      {markerData.label && (
        <Popup className="chat-map-popup">
          <div className="text-xs font-semibold text-charcoal-900">
            {markerData.label}
          </div>
          <div className="text-[10px] text-cream-400 font-mono mt-0.5">
            {markerData.lat.toFixed(4)}°N, {markerData.lon.toFixed(4)}°E
          </div>
        </Popup>
      )}
    </Marker>
  )
}

/* ── Main Chat Page ─────────────────────────────── */
export default function Chat() {
  useWorldState()
  const mapTarget = useChatStore((s) => s.mapTarget)
  const layers = useMapStore((s) => s.layers)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [mobileMapOpen, setMobileMapOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-open mobile map on small screens when a location is referenced
  useEffect(() => {
    if (mapTarget && !isDesktop) {
      setMobileMapOpen(true)
    }
  }, [mapTarget, isDesktop])

  const hasContext = Boolean(
    mapTarget &&
      Number.isFinite(Number(mapTarget.lat)) &&
      Number.isFinite(Number(mapTarget.lon))
  )

  const defaultCenter: [number, number] = [9.9312, 76.2673]
  const mapCenter: [number, number] = hasContext
    ? [Number(mapTarget!.lat), Number(mapTarget!.lon)]
    : defaultCenter
  const mapZoom = Number.isFinite(Number(mapTarget?.zoom))
    ? Number(mapTarget!.zoom)
    : 9

  return (
    <div className="fixed inset-0 pt-16 bg-[#FAF8F5] flex overflow-hidden">
      {/* ── Left: Chat Panel ─────────────────── */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          mapExpanded
            ? 'w-[380px] min-w-[380px]'
            : hasContext && isDesktop
              ? 'w-full lg:w-[55%]'
              : 'w-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 bg-white lg:border-r border-cream-200 overflow-hidden flex flex-col min-h-0">
            <ChatInterface mode="fullpage" />
          </div>
        </div>
      </div>

      {/* ── Right: Embedded Live Map (Desktop only) ── */}
      <AnimatePresence>
        {hasContext && isDesktop && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: mapExpanded ? 'calc(100% - 380px)' : '45%',
              opacity: 1,
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onAnimationComplete={() => {
              window.dispatchEvent(new Event('resize'))
            }}
            className="hidden lg:flex flex-col h-full relative overflow-hidden"
          >
            {/* Map header bar */}
            <div className="h-10 bg-charcoal-900 flex items-center justify-between px-3 flex-shrink-0 border-b border-charcoal-800 z-10">
              <div className="flex items-center gap-2">
                <Map size={13} className="text-cream-400" />
                <span className="text-[11px] font-semibold text-cream-200 tracking-tight">
                  Live Ocean Map
                </span>
                {mapTarget?.label && (
                  <span className="text-[10px] text-terracotta-400 font-mono truncate max-w-[200px]">
                    — {mapTarget.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMapExpanded(!mapExpanded)
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
                  }}
                  className="p-1 rounded text-cream-400 hover:text-cream-100 hover:bg-charcoal-800 transition-colors cursor-pointer"
                  title={mapExpanded ? 'Shrink map' : 'Expand map'}
                >
                  {mapExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
            </div>

            {/* Map container with ErrorBoundary */}
            <div className="flex-1 relative">
              <ErrorBoundary>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  className="w-full h-full"
                  zoomControl={false}
                  attributionControl={false}
                  preferCanvas={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={18}
                    keepBuffer={4}
                    updateWhenIdle={true}
                    updateWhenZooming={false}
                  />

                  {/* Wind streamlines */}
                  {layers.windStream && (
                    <TileLayer
                      url="https://weather.openportguide.de/tiles/actual/wind_stream/0h/{z}/{x}/{y}.png"
                      maxNativeZoom={7}
                      maxZoom={18}
                      opacity={0.8}
                      zIndex={350}
                      updateWhenIdle={true}
                    />
                  )}

                  {/* OpenSeaMap seamark overlay */}
                  {layers.seamarks && (
                    <TileLayer
                      url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                      opacity={0.9}
                      zIndex={450}
                      maxZoom={18}
                      updateWhenIdle={true}
                    />
                  )}

                  <MapResizeController />
                  <ChatMapController />
                  <ChatLocationMarker />
                  {layers.eez && <EEZLayer />}
                  {layers.hazards && <HazardOverlay />}
                  {layers.pfz && <PFZLayer />}
                </MapContainer>
              </ErrorBoundary>

              {/* Coordinates overlay */}
              {mapTarget && Number.isFinite(mapTarget.lat) && Number.isFinite(mapTarget.lon) && (
                <div className="absolute bottom-3 left-3 bg-charcoal-900/80 backdrop-blur-sm text-cream-200 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border border-charcoal-700/50 z-[500]">
                  {Number(mapTarget.lat).toFixed(4)}°N, {Number(mapTarget.lon).toFixed(4)}°E
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile: Slide-up map panel (Mobile only) ── */}
      <AnimatePresence>
        {mobileMapOpen && hasContext && !isDesktop && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[48vh] bg-white rounded-t-2xl shadow-2xl border-t border-cream-200 overflow-hidden flex flex-col"
          >
            {/* Mobile map header */}
            <div className="h-10 bg-charcoal-900 flex items-center justify-between px-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Map size={13} className="text-cream-400" />
                <span className="text-[11px] font-semibold text-cream-200">
                  {mapTarget?.label || 'Live Ocean Map'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMapOpen(false)}
                className="p-1 rounded text-cream-400 hover:text-cream-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 relative">
              <ErrorBoundary>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  className="w-full h-full"
                  zoomControl={false}
                  attributionControl={false}
                  preferCanvas={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={18}
                    keepBuffer={4}
                    updateWhenIdle={true}
                  />
                  <MapResizeController />
                  <ChatMapController />
                  <ChatLocationMarker />
                  {layers.eez && <EEZLayer />}
                  {layers.pfz && <PFZLayer />}
                </MapContainer>
              </ErrorBoundary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile: Map toggle FAB ────────── */}
      {hasContext && !mobileMapOpen && !isDesktop && (
        <button
          type="button"
          onClick={() => setMobileMapOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-charcoal-900 text-cream-100 shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
        >
          <Map size={18} />
        </button>
      )}
    </div>
  )
}
