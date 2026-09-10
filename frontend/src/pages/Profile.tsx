import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User,
  Phone,
  Mail,
  Ship,
  Anchor,
  ShieldCheck,
  LogOut,
  Edit3,
  Check,
  AlertOctagon,
  Navigation,
  Compass,
  Radio,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSOSStore } from '../store/sosStore'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, isAuthenticated, logout, updateProfile } = useAuthStore()
  const signals = useSOSStore((s) => s.signals)

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [vesselName, setVesselName] = useState(profile?.vessel_name || '')
  const [homePort, setHomePort] = useState(profile?.home_port || 'Kochi (Cochin) Port')
  const [saveSuccess, setSaveSuccess] = useState(false)

  if (!isAuthenticated || !profile) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4 font-sans pt-20">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-cream-300 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-cream-200 text-charcoal-700 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-xl text-charcoal-900">
            No Active Skipper Session
          </h2>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            Please log in or register your maritime credentials to inspect your vessel profile,
            telemetry manifests, and rescue beacon associations.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 px-4 rounded-xl bg-charcoal-900 text-cream-50 text-xs font-semibold uppercase tracking-wider hover:bg-charcoal-800 transition-colors no-underline"
          >
            Go to Maritime Login
          </Link>
        </div>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      vessel_name: vesselName.trim(),
      home_port: homePort,
    })
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // Filter SOS incidents sent by this skipper or vessel
  const userIncidents = signals.filter(
    (s) =>
      s.skipper_name.toLowerCase() === profile.name.toLowerCase() ||
      s.contact_phone === profile.phone ||
      s.vessel_name.toLowerCase() === (profile.vessel_name || '').toLowerCase()
  )

  return (
    <div className="min-h-screen bg-cream-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-300 pb-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-terracotta-600 font-semibold block mb-1">
              Maritime Telemetry Registry
            </span>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal-900">
              Vessel Master Profile
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="py-2 px-3.5 rounded-lg border border-cream-300 bg-white text-charcoal-800 hover:bg-cream-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-charcoal-500" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="py-2 px-3.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Profile telemetry successfully updated and saved to local and Supabase stores.</span>
          </motion.div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-cream-300 shadow-xs p-6 sm:p-8 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="font-serif font-bold text-lg text-charcoal-900">
                Update Registered Telemetry
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Skipper Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-lg border border-cream-300 focus:outline-none focus:border-terracotta-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Verified Emergency Mobile
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-lg border border-cream-300 focus:outline-none focus:border-terracotta-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Registered Vessel
                  </label>
                  <input
                    type="text"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-lg border border-cream-300 focus:outline-none focus:border-terracotta-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Home Base / Harbor
                  </label>
                  <input
                    type="text"
                    value={homePort}
                    onChange={(e) => setHomePort(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-lg border border-cream-300 focus:outline-none focus:border-terracotta-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-2 px-4 rounded-lg text-xs font-semibold border border-cream-300 text-charcoal-700 hover:bg-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg text-xs font-semibold bg-charcoal-900 text-cream-50 hover:bg-charcoal-800"
                >
                  Save Telemetry
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Identity Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-cream-50/70 border border-cream-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-charcoal-900 text-cream-50 flex items-center justify-center font-serif text-2xl font-bold">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif font-bold text-xl text-charcoal-900">
                        {profile.name}
                      </h2>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Verified Master
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-500 font-mono mt-0.5">
                      Account ID: {profile.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-charcoal-400 block uppercase tracking-wider">
                      Role
                    </span>
                    <span className="text-xs font-bold text-charcoal-800 capitalize">
                      {profile.role || 'Vessel Skipper'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-cream-200 bg-white">
                  <div className="flex items-center gap-2 text-charcoal-500 mb-1">
                    <Phone className="w-3.5 h-3.5 text-terracotta-500" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">
                      Emergency Contact Mobile
                    </span>
                  </div>
                  <span className="font-semibold text-charcoal-900 text-sm font-mono">
                    {profile.phone || 'Not configured'}
                  </span>
                  <p className="text-[10px] text-charcoal-400 mt-1">
                    Transmitted immediately during SOS distress signals.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-cream-200 bg-white">
                  <div className="flex items-center gap-2 text-charcoal-500 mb-1">
                    <Mail className="w-3.5 h-3.5 text-ocean-500" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">
                      Maritime Email Address
                    </span>
                  </div>
                  <span className="font-semibold text-charcoal-900 text-sm font-mono">
                    {profile.email}
                  </span>
                  <p className="text-[10px] text-charcoal-400 mt-1">
                    Connected to Supabase identity database.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-cream-200 bg-white">
                  <div className="flex items-center gap-2 text-charcoal-500 mb-1">
                    <Ship className="w-3.5 h-3.5 text-charcoal-600" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">
                      Primary Registered Vessel
                    </span>
                  </div>
                  <span className="font-semibold text-charcoal-900 text-sm">
                    {profile.vessel_name || 'Matsya Sagar'}
                  </span>
                  <p className="text-[10px] text-charcoal-400 mt-1">
                    Type: Mechanized Trawler / Deep-Sea Gillnetter
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-cream-200 bg-white">
                  <div className="flex items-center gap-2 text-charcoal-500 mb-1">
                    <Anchor className="w-3.5 h-3.5 text-charcoal-600" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">
                      Home Port / Base Station
                    </span>
                  </div>
                  <span className="font-semibold text-charcoal-900 text-sm">
                    {profile.home_port || 'Kochi (Cochin) Port'}
                  </span>
                  <p className="text-[10px] text-charcoal-400 mt-1">
                    Indian Southern Naval & Coast Guard Sector
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SOS Integration Context Banner */}
        <div className="bg-charcoal-900 text-cream-100 rounded-2xl p-6 shadow-sm border border-charcoal-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600/90 text-white flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-cream-50">
                  Autonomous SOS Distress Identity Protocol
                </h3>
                <p className="text-xs text-cream-400">
                  Automatic binding of authenticated skipper credentials during distress events
                </p>
              </div>
            </div>
          </div>


          <p className="text-xs text-cream-300 leading-relaxed">
            Whenever you activate the emergency SOS button on the vessel terminal or live map, the
            distress payload transmits your name (<strong className="text-white">{profile.name}</strong>),
            direct emergency phone (<strong className="text-white">{profile.phone}</strong>), vessel
            name (<strong className="text-white">{profile.vessel_name}</strong>), exact GPS coordinates, and
            time of distress directly to Coast Guard MRCC watchstanders and records into the Supabase
            incident queue.
          </p>
        </div>

        {/* User's recent incidents */}
        {userIncidents.length > 0 && (
          <div className="bg-white rounded-2xl border border-cream-300 p-6 space-y-4">
            <h3 className="font-serif font-bold text-base text-charcoal-900">
              Distress Broadcasts Transmitted by this Master
            </h3>
            <div className="divide-y divide-cream-200">
              {userIncidents.map((incident) => (
                <div key={incident.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-charcoal-900">
                        {incident.id}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-amber-100 text-amber-800">
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      {incident.emergency_message}
                    </p>
                    <p className="text-[10px] text-charcoal-400 font-mono mt-0.5">
                      {new Date(incident.created_at).toLocaleString()} IST • Coordinates:{' '}
                      {incident.location.lat.toFixed(4)}°N, {incident.location.lon.toFixed(4)}°E
                    </p>
                  </div>

                  {profile.role === 'admin' ? (
                    <Link
                      to="/admin/sos"
                      className="text-xs font-semibold text-terracotta-600 hover:underline"
                    >
                      View Dispatch Console
                    </Link>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Logged with Coast Guard
                    </span>
                  )}
                </div>
              ))}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
