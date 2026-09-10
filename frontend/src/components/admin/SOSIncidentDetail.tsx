import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertOctagon,
  ShieldCheck,
  Ship,
  Phone,
  Users,
  Compass,
  Wind,
  Waves,
  Battery,
  Radio,
  Clock,
  Check,
  Copy,
  Send,
  LifeBuoy,
  Anchor,
  FileText,
  MapPin,
  ExternalLink,
  User,
} from 'lucide-react'
import { DistressSignal, DistressStatus, RescueAsset } from '../../types/sos'

interface SOSIncidentDetailProps {
  signal: DistressSignal | null
  assets: RescueAsset[]
  onUpdateStatus: (
    signalId: string,
    status: DistressStatus,
    note?: string,
    assetId?: string
  ) => void
  onFocusMap?: (lat: number, lon: number) => void
}

function formatFullTimestamp(isoTime: string) {
  try {
    const d = new Date(isoTime)
    const dateStr = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return `${dateStr}, ${timeStr} IST`
  } catch {
    return isoTime
  }
}

function formatElapsed(isoTime: string) {
  const diffMs = Date.now() - new Date(isoTime).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  return new Date(isoTime).toLocaleDateString()
}


export default function SOSIncidentDetail({
  signal,
  assets,
  onUpdateStatus,
  onFocusMap,
}: SOSIncidentDetailProps) {
  const [operatorNote, setOperatorNote] = useState('')
  const [copiedCoords, setCopiedCoords] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)

  if (!signal) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-white rounded-xl border border-cream-300 text-center font-sans text-charcoal-400">
        <div>
          <Ship className="w-12 h-12 text-cream-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-charcoal-600">No Distress Incident Selected</p>
          <p className="text-xs">Click on an incident in the list or map marker to view details</p>
        </div>
      </div>
    )
  }

  const isCritical = signal.severity === 'critical'
  const isResolved = signal.status === 'resolved'
  const isDispatched = signal.status === 'dispatched' || signal.status === 'on_scene'

  const copyCoordinates = () => {
    const coordString = `MAYDAY RELAY: Vessel ${signal.vessel_name} (${signal.registration_no}) at LAT ${signal.location.lat.toFixed(4)}°N, LON ${signal.location.lon.toFixed(4)}°E (${signal.distance_to_coast_nm} NM off ${signal.nearest_port}). Nature: ${signal.emergency_message}. POB: ${signal.crew_count}.`
    navigator.clipboard.writeText(coordString)
    setCopiedCoords(true)
    setTimeout(() => setCopiedCoords(false), 2500)
  }

  const handleAddNote = () => {
    if (!operatorNote.trim()) return
    onUpdateStatus(signal.id, signal.status, operatorNote.trim())
    setOperatorNote('')
  }

  const handleDispatch = () => {
    if (!selectedAssetId) return
    const asset = assets.find((a) => a.id === selectedAssetId)
    const note = `Dispatched ${asset?.name || 'Rescue Unit'} to coordinates ${signal.location.lat.toFixed(4)}N, ${signal.location.lon.toFixed(4)}E.`
    onUpdateStatus(signal.id, 'dispatched', note, selectedAssetId)
    setDispatchModalOpen(false)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-cream-300 shadow-xs overflow-hidden">
      {/* Dossier Header */}
      <div className="p-4 border-b border-cream-200 bg-cream-50/90">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-charcoal-900 text-cream-100 uppercase tracking-wider">
                {signal.id}
              </span>
              <span
                className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  isCritical
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}
              >
                {signal.severity} Urgency
              </span>
            </div>
            <h2 className="font-serif font-bold text-xl text-charcoal-900 mt-1">
              {signal.vessel_name}
            </h2>
            <p className="text-xs text-charcoal-500 font-mono">
              {signal.registration_no} • {signal.boat_type}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block text-xs font-bold font-sans uppercase tracking-wider px-2.5 py-1 rounded-md ${
                isResolved
                  ? 'bg-emerald-100 text-emerald-800'
                  : isDispatched
                  ? 'bg-amber-100 text-amber-800'
                  : isCritical
                  ? 'bg-red-100 text-red-800 animate-pulse'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {signal.status}
            </span>
            <p className="text-[10px] text-charcoal-400 font-sans mt-1">
              {new Date(signal.created_at).toLocaleTimeString()} IST
            </p>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-sans text-red-900 space-y-1 mt-2">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-red-700">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            Distress Message:
          </div>
          <p className="leading-relaxed text-charcoal-900">{signal.emergency_message}</p>
        </div>

        {/* Distress Origin & Sender Identity Telemetry Panel */}
        <div className="p-3.5 bg-cream-100/90 rounded-xl border border-cream-300/90 space-y-2 mt-2 font-sans">
          <div className="flex items-center justify-between border-b border-cream-200/80 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-900">
              <Radio className="w-3.5 h-3.5 text-terracotta-600" />
              <span>Verified SOS Transmission Log</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cream-200 text-charcoal-700 font-semibold">
              Live Marine Incident Log
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            {/* 1. Who Sent SOS */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-wider block font-medium">
                Transmitted By (Skipper)
              </span>
              <div className="flex items-center gap-1.5 font-bold text-charcoal-950">
                <User className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />
                <span>{signal.skipper_name}</span>
              </div>
              <a
                href={`tel:${signal.contact_phone}`}
                className="text-[11px] text-ocean-700 font-mono flex items-center gap-1 hover:underline"
              >
                <Phone className="w-3 h-3" />
                {signal.contact_phone}
              </a>
            </div>

            {/* 2. Exact Timestamp */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-wider block font-medium">
                Transmission Timestamp
              </span>
              <div className="flex items-center gap-1.5 font-bold text-charcoal-950 font-mono">
                <Clock className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />
                <span>{formatFullTimestamp(signal.created_at)}</span>
              </div>
              <span className="text-[10px] text-charcoal-500 block font-sans">
                Elapsed: {formatElapsed(signal.created_at)}
              </span>
            </div>

            {/* 3. Exact Location */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-charcoal-400 uppercase tracking-wider block font-medium">
                Distress GPS Location
              </span>
              <div className="flex items-center gap-1.5 font-bold text-charcoal-950 font-mono">
                <MapPin className="w-3.5 h-3.5 text-ocean-600 shrink-0" />
                <span>{signal.location.lat.toFixed(4)}°N, {signal.location.lon.toFixed(4)}°E</span>
              </div>
              <span className="text-[10px] text-charcoal-600 block">
                {signal.distance_to_coast_nm} NM off {signal.nearest_port}
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Quick Triage / Status Actions */}
        <div>
          <h4 className="text-[11px] font-sans font-bold uppercase tracking-wider text-charcoal-400 mb-2">
            Mission Command Status Actions
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              disabled={signal.status !== 'active'}
              onClick={() => onUpdateStatus(signal.id, 'acknowledged', 'MRCC Watchstander acknowledged distress broadcast.')}
              className={`py-2 px-3 rounded-lg text-xs font-medium font-sans border transition-all ${
                signal.status === 'active'
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  : 'bg-cream-100 text-charcoal-400 border-cream-200 cursor-not-allowed opacity-60'
              }`}
            >
              1. Acknowledge
            </button>

            <button
              onClick={() => setDispatchModalOpen(true)}
              className="py-2 px-3 rounded-lg text-xs font-medium font-sans bg-ocean-600 text-white border border-ocean-700 hover:bg-ocean-700 transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              2. Dispatch Unit
            </button>

            <button
              onClick={() => onUpdateStatus(signal.id, 'on_scene', 'Rescue assets arrived on scene; assisting vessel crew.')}
              className={`py-2 px-3 rounded-lg text-xs font-medium font-sans border transition-all ${
                isDispatched
                  ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                  : 'bg-cream-100 text-charcoal-400 border-cream-200'
              }`}
            >
              3. On-Scene
            </button>

            <button
              onClick={() => onUpdateStatus(signal.id, 'resolved', 'SAR mission closed. All fishermen safe and accounted for.')}
              className="py-2 px-3 rounded-lg text-xs font-medium font-sans bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 transition-all shadow-xs flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              4. Mark Resolved
            </button>
          </div>
        </div>

        {/* Assigned Responder Asset Badge if dispatched */}
        {signal.assigned_asset && (
          <div className="p-3 bg-ocean-50 border border-ocean-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-ocean-600 text-white flex items-center justify-center">
                <Ship className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-sans uppercase tracking-wider text-ocean-700 font-bold">
                  Assigned Rescue Unit
                </span>
                <p className="text-xs font-bold text-charcoal-900">{signal.assigned_asset.name}</p>
                <p className="text-[10px] text-charcoal-500">
                  Callsign: {signal.assigned_asset.callsign} • Base: {signal.assigned_asset.base_port}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-sans text-ocean-800 bg-white px-2 py-1 rounded border border-ocean-200">
              ETA ~{signal.assigned_asset.eta_minutes || 25}m
            </span>
          </div>
        )}

        {/* Vessel Specifications & Skipper Telemetry */}
        <div className="bg-cream-50/70 p-4 rounded-xl border border-cream-200 space-y-3">
          <h4 className="text-[11px] font-sans font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-terracotta-500" />
            Vessel & Crew Manifest
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-sans">
            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Skipper / Master</span>
              <span className="font-semibold text-charcoal-900">{signal.skipper_name}</span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Phone / Sat Contact</span>
              <a
                href={`tel:${signal.contact_phone}`}
                className="font-semibold text-ocean-600 hover:underline flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                {signal.contact_phone}
              </a>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Crew Size (POB)</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {signal.crew_count} Souls aboard
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">VHF Emergency Channel</span>
              <span className="font-mono font-semibold text-charcoal-900 flex items-center gap-1">
                <Radio className="w-3 h-3 text-terracotta-500" />
                Channel {signal.vhf_channel || '16'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Beacon Battery</span>
              <span className="font-mono font-semibold text-charcoal-900 flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-emerald-600" />
                {signal.battery_pct || 75}% charged
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">NavIC Beacon Reg</span>
              <span className="font-mono text-[11px] text-charcoal-700">
                {signal.navic_beacon_id || 'NAVIC-ICG-GEN'}
              </span>
            </div>
          </div>
        </div>

        {/* Location & Marine Weather at Distress Coordinates */}
        <div className="bg-cream-50/70 p-4 rounded-xl border border-cream-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-sans font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
              Location & Marine Weather Conditions
            </h4>
            {onFocusMap && (
              <button
                onClick={() => onFocusMap(signal.location.lat, signal.location.lon)}
                className="text-[11px] text-terracotta-600 font-medium hover:underline flex items-center gap-1"
              >
                Center on Map <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
            <div className="col-span-2">
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Coordinates (WGS84)</span>
              <span className="font-mono font-bold text-charcoal-900">
                {signal.location.lat.toFixed(4)}°N, {signal.location.lon.toFixed(4)}°E
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Distance off Shore</span>
              <span className="font-semibold text-charcoal-900">
                {signal.distance_to_coast_nm} NM ({signal.nearest_port})
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Sea Depth</span>
              <span className="font-semibold text-charcoal-900">
                {signal.water_depth_m ? `${signal.water_depth_m}m` : '38m'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Wave Height</span>
              <span className="font-semibold text-charcoal-900 flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-ocean-600" />
                {signal.wave_height_m || 2.4} m
              </span>
            </div>

            <div>
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Wind Speed</span>
              <span className="font-semibold text-charcoal-900 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-ocean-600" />
                {signal.wind_speed_knots || 24} kn
              </span>
            </div>

            <div className="col-span-2">
              <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">Sea State</span>
              <span className="font-medium text-charcoal-800">
                {signal.sea_state || 'Rough (Douglas Scale 5)'}
              </span>
            </div>
          </div>
        </div>

        {/* Rapid Actions Bar */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={copyCoordinates}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium font-sans bg-white border border-cream-300 text-charcoal-800 hover:bg-cream-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedCoords ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied Navtex Broadcast!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-charcoal-500" />
                Copy Marine Radio Relay Text
              </>
            )}
          </button>

          <a
            href={`tel:${signal.contact_phone}`}
            className="py-2 px-4 rounded-lg text-xs font-medium font-sans bg-white border border-cream-300 text-charcoal-800 hover:bg-cream-100 flex items-center gap-1.5 transition-colors no-underline"
          >
            <Phone className="w-3.5 h-3.5 text-terracotta-500" />
            Call Master
          </a>
        </div>

        {/* Incident Timeline & Action Log */}
        <div className="border-t border-cream-200 pt-4 space-y-3">
          <h4 className="text-[11px] font-sans font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-terracotta-500" />
            SAR Action & Audit Timeline
          </h4>

          <div className="space-y-2 relative pl-4 border-l-2 border-cream-300">
            {signal.action_log.map((log) => (
              <div key={log.id} className="relative group text-xs font-sans">
                <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-terracotta-500"></span>
                <div className="flex items-center justify-between text-[10px] text-charcoal-400">
                  <span className="font-semibold text-charcoal-700">{log.author}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-charcoal-800 text-[11px] leading-relaxed mt-0.5">{log.note}</p>
              </div>
            ))}
          </div>

          {/* Add Operator Log Input */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="Record operational note or log entry..."
              className="flex-1 px-3 py-2 text-xs font-sans rounded-lg bg-white border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500"
            />
            <button
              onClick={handleAddNote}
              disabled={!operatorNote.trim()}
              className="px-3 py-2 bg-charcoal-900 text-cream-100 rounded-lg text-xs font-medium hover:bg-terracotta-500 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dispatch Asset Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-cream-300 shadow-2xl max-w-md w-full p-5 font-sans space-y-4"
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-bold text-sm text-charcoal-900 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-ocean-600" />
                Dispatch Coast Guard SAR Asset
              </h3>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-charcoal-600">
              Select available cutter, interceptor, or rotary asset to scramble to{' '}
              <span className="font-semibold text-charcoal-900">{signal.vessel_name}</span> at{' '}
              {signal.location.lat.toFixed(4)}°N, {signal.location.lon.toFixed(4)}°E.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAssetId === asset.id
                      ? 'border-ocean-500 bg-ocean-50/70 ring-1 ring-ocean-500'
                      : 'border-cream-300 hover:bg-cream-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-charcoal-900">{asset.name}</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {asset.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">
                    Base: {asset.base_port} • Callsign: {asset.callsign}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-cream-200">
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-charcoal-600 hover:bg-cream-100"
              >
                Cancel
              </button>
              <button
                disabled={!selectedAssetId}
                onClick={handleDispatch}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-charcoal-900 text-cream-100 hover:bg-terracotta-500 disabled:opacity-40 transition-colors"
              >
                Confirm Sortie Dispatch
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
