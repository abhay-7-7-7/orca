import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertOctagon,
  Radio,
  Sparkles,
  Ship,
  Users,
  MapPin,
  Flame,
  Wrench,
  AlertTriangle,
  X,
} from 'lucide-react'
import { DistressCreatePayload, DistressSeverity, DistressType } from '../../types/sos'

interface SOSTriggerModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: DistressCreatePayload) => Promise<any>
  onQuickSimulate: () => Promise<any>
  isSimulating: boolean
}

const PRESET_SECTORS = [
  { name: 'Kochi Offshore (Arabian Sea)', lat: 9.82, lon: 75.82, port: 'Kochi Harbor' },
  { name: 'Porbandar IMBL Corridor (Gujarat)', lat: 21.52, lon: 69.38, port: 'Porbandar Port' },
  { name: 'Chennai Bay of Bengal', lat: 13.12, lon: 80.48, port: 'Chennai Fishery Harbor' },
  { name: 'Mangalore Coast (Karnataka)', lat: 12.82, lon: 74.52, port: 'Mangalore Port' },
  { name: 'Visakhapatnam (Andhra Coast)', lat: 17.68, lon: 83.42, port: 'Visakhapatnam Port' },
]

export default function SOSTriggerModal({
  isOpen,
  onClose,
  onSubmit,
  onQuickSimulate,
  isSimulating,
}: SOSTriggerModalProps) {
  const [selectedSector, setSelectedSector] = useState(0)
  const [vesselName, setVesselName] = useState('Matsya Vahana 9')
  const [regNo, setRegNo] = useState('IND-KL-07-MM-6120')
  const [skipperName, setSkipperName] = useState('Pradeep Varghese')
  const [contactPhone, setContactPhone] = useState('+91 94461 72910')
  const [crewCount, setCrewCount] = useState(5)
  const [distressType, setDistressType] = useState<DistressType>('taking_water')
  const [severity, setSeverity] = useState<DistressSeverity>('critical')
  const [message, setMessage] = useState(
    'Hull breach after hitting submerged debris. Taking water rapidly in aft fish hold, 5 crew donning lifejackets.'
  )
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const sector = PRESET_SECTORS[selectedSector]
    await onSubmit({
      vessel_name: vesselName,
      registration_no: regNo,
      boat_type: 'Mechanized Trawler (45 ft)',
      skipper_name: skipperName,
      contact_phone: contactPhone,
      crew_count: Number(crewCount),
      lat: Number((sector.lat + (Math.random() - 0.5) * 0.2).toFixed(4)),
      lon: Number((sector.lon + (Math.random() - 0.5) * 0.2).toFixed(4)),
      distress_type: distressType,
      severity,
      emergency_message: message,
      nearest_port: sector.port,
      vhf_channel: '16',
      wave_height_m: 2.6,
      wind_speed_knots: 28.0,
    })
    setSubmitting(false)
    onClose()
  }

  const handleQuick = async () => {
    await onQuickSimulate()
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl border border-cream-300 shadow-2xl max-w-xl w-full overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="bg-charcoal-900 text-cream-100 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm animate-pulse">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">
                  Simulate / Broadcast SOS Distress Call
                </h3>
                <p className="text-xs text-cream-400">
                  Transmits high-priority emergency telemetry to Maritime Authorities
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-cream-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Quick 1-Click Simulation Box */}
            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  Instant Live Test Mode
                </span>
                <p className="text-xs text-charcoal-700 mt-0.5">
                  Spawns a realistic fishing boat distress beacon with live wave/wind data.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuick}
                disabled={isSimulating}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold font-sans shadow-md flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50"
              >
                <Radio className="w-4 h-4" />
                {isSimulating ? 'Broadcasting...' : '1-Click Quick Simulate'}
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-cream-200 w-full"></div>
              <span className="bg-white px-3 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider absolute">
                Or Configure Distress Parameters
              </span>
            </div>

            {/* Custom Form */}
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Vessel Name
                  </label>
                  <input
                    type="text"
                    required
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Registration No
                  </label>
                  <input
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 font-mono focus:outline-none focus:border-terracotta-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Skipper Name
                  </label>
                  <input
                    type="text"
                    required
                    value={skipperName}
                    onChange={(e) => setSkipperName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Crew Aboard
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    required
                    value={crewCount}
                    onChange={(e) => setCrewCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-charcoal-700 block mb-1">
                  Coastal Location Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 bg-white focus:outline-none focus:border-terracotta-500"
                >
                  {PRESET_SECTORS.map((sec, idx) => (
                    <option key={idx} value={idx}>
                      {sec.name} (Base: {sec.port})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Distress Emergency Nature
                  </label>
                  <select
                    value={distressType}
                    onChange={(e) => setDistressType(e.target.value as DistressType)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 bg-white focus:outline-none focus:border-terracotta-500"
                  >
                    <option value="taking_water">Taking Water / Hull Breach</option>
                    <option value="engine_failure">Engine / Steering Failure</option>
                    <option value="capsized">Capsized / Overturned</option>
                    <option value="fire">Fire in Engine Room / Bilge</option>
                    <option value="cyclone_trapped">Trapped in Cyclone / Squall</option>
                    <option value="medical">Severe Medical Emergency</option>
                    <option value="collision">Collision with Vessel</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal-700 block mb-1">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DistressSeverity)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 bg-white focus:outline-none focus:border-terracotta-500"
                  >
                    <option value="critical">Critical (Immediate Danger to Life)</option>
                    <option value="high">High (Disabled in Rough Sea)</option>
                    <option value="moderate">Moderate (Urgent Assistance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-charcoal-700 block mb-1">
                  Distress Broadcast Message
                </label>
                <textarea
                  rows={2}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-cream-300 text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-charcoal-600 hover:bg-cream-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-charcoal-900 hover:bg-terracotta-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Radio className="w-3.5 h-3.5 text-red-400" />
                  {submitting ? 'Transmitting...' : 'Emit Emergency SOS Signal'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
