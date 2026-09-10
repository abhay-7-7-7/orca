import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Ship,
  Phone,
  Mail,
  Lock,
  User as UserIcon,
  Anchor,
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { isSupabaseConfigured, getSupabaseUrl } from '../services/supabase'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [mode, setMode] = useState<'signin' | 'register'>('signin')

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vesselName, setVesselName] = useState('')
  const [homePort, setHomePort] = useState('Kochi (Cochin) Port')

  // Supabase URL configuration
  const [supabaseConnected, setSupabaseConnected] = useState(isSupabaseConfigured())
  const [showConfig, setShowConfig] = useState(false)
  const [inputUrl, setInputUrl] = useState(getSupabaseUrl())
  const [urlSaveSuccess, setUrlSaveSuccess] = useState(false)

  const { login, register, isLoading, error, clearError } = useAuthStore()
  const [formFeedback, setFormFeedback] = useState<string | null>(null)

  const handleSaveSupabaseUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputUrl && inputUrl.trim().includes('.supabase.co')) {
      localStorage.setItem('orca_supabase_url', inputUrl.trim())
      setSupabaseConnected(true)
      setUrlSaveSuccess(true)
      setTimeout(() => {
        setUrlSaveSuccess(false)
        window.location.reload()
      }, 1200)
    } else {
      setFormFeedback('Please enter a valid Supabase URL in the format https://<project-ref>.supabase.co')
    }
  }

  const handleModeSwitch = (newMode: 'signin' | 'register') => {
    setMode(newMode)
    clearError()
    setFormFeedback(null)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormFeedback(null)

    if (mode === 'signin') {
      if (!email.trim() || !password) {
        setFormFeedback('Please enter both your registered email and password.')
        return
      }
      const success = await login(email.trim(), password)
      if (success) {
        navigate(from, { replace: true })
      }
    } else {
      if (!name.trim()) {
        setFormFeedback('Skipper name is required for maritime identification.')
        return
      }
      if (!phone.trim()) {
        setFormFeedback('Contact mobile number is required for Coast Guard emergency dispatch.')
        return
      }
      if (!email.trim() || !password) {
        setFormFeedback('Please enter a valid email and secure password.')
        return
      }
      if (password.length < 6) {
        setFormFeedback('Password must be at least 6 characters.')
        return
      }

      const success = await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        vessel_name: vesselName.trim() || 'Matsya Sagar',
        home_port: homePort,
      })
      if (success) {
        navigate(from, { replace: true })
      }
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        {/* Emblem */}
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4 group no-underline">
          <div className="w-10 h-10 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold text-lg font-sans shadow-xs group-hover:bg-terracotta-600 transition-colors">
            O
          </div>
          <span className="font-serif font-bold text-2xl text-charcoal-900 tracking-tight">
            ORCA
          </span>
        </Link>

        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal-900 tracking-tight">
          {mode === 'signin' ? 'Maritime Portal Access' : 'Skipper & Vessel Registry'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-charcoal-600 max-w-sm mx-auto leading-relaxed">
          {mode === 'signin'
            ? 'Sign in to access your autonomous navigation corridor, route history, and emergency distress beacon.'
            : 'Register your maritime profile to enable real-time distress relay, telemetry logging, and voyage tracking.'}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-cream-300 shadow-sm space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-cream-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => handleModeSwitch('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-charcoal-900 text-cream-50 shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100/50'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-charcoal-900 text-cream-50 shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100/50'
              }`}
            >
              Register Vessel
            </button>
          </div>

          {/* Error / Feedback Banner */}
          {(error || formFeedback) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error || formFeedback}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Skipper / Master Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Capt. Thomas Varghese"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-cream-50/50 border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98470 12345"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-cream-50/50 border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-charcoal-500 mt-1">
                    Direct sat/cellular contact used by Coast Guard during SOS distress events.
                  </p>
                </div>

                {/* Vessel Name & Home Port Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                      Vessel Name
                    </label>
                    <div className="relative">
                      <Ship className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={vesselName}
                        onChange={(e) => setVesselName(e.target.value)}
                        placeholder="e.g. Matsya Sagar"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-cream-50/50 border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                      Home Port / Base
                    </label>
                    <div className="relative">
                      <Anchor className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={homePort}
                        onChange={(e) => setHomePort(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-cream-50/50 border border-cream-300 text-charcoal-900 focus:outline-none focus:border-terracotta-500 transition-colors"
                      >
                        <option value="Kochi (Cochin) Port">Kochi (Cochin) Port</option>
                        <option value="Vizhinjam Harbor">Vizhinjam Harbor</option>
                        <option value="Kozhikode Port">Kozhikode Port</option>
                        <option value="Munambam Harbor">Munambam Harbor</option>
                        <option value="Kollam Port">Kollam Port</option>
                        <option value="Mangalore Old Port">Mangalore Old Port</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@maritime.in"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-cream-50/50 border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                  Password *
                </label>
                {mode === 'signin' && (
                  <span className="text-[10px] text-charcoal-400">
                    Strict verification required
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-cream-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg bg-cream-50/50 border border-cream-300 text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-terracotta-500 transition-colors"
                />
              </div>
              {mode === 'signin' && (
                <p className="text-[10px] text-charcoal-500 mt-1.5 leading-normal">
                  Logins are strictly checked against the database table. Unregistered emails or invalid passwords are not permitted entry.
                </p>
              )}
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-cream-50 font-sans font-semibold text-xs tracking-wide uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Enter Command Terminal' : 'Confirm Registration'}</span>
                  <ArrowRight className="w-4 h-4 text-terracotta-400" />
                </>
              )}
            </button>
          </form>

          {/* Database & Cloud Connection Status */}
          <div className="pt-4 border-t border-cream-200 space-y-3">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between text-[11px] text-charcoal-600 hover:text-charcoal-900 transition-colors py-1"
            >
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-terracotta-500" />
                <span className="font-semibold">
                  Database: {supabaseConnected ? 'Supabase Cloud' : 'Maritime Table (Local)'}
                </span>
              </div>
              {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConfig && (
              <div className="p-3 bg-cream-50 border border-cream-300 rounded-xl space-y-2 text-xs">
                <p className="text-[11px] text-charcoal-600 leading-relaxed">
                  Enter your Supabase Project URL to synchronize directly with your Supabase Cloud instance:
                </p>
                <form onSubmit={handleSaveSupabaseUrl} className="space-y-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://<project-ref>.supabase.co"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-cream-300 bg-white text-charcoal-900 focus:outline-none focus:border-terracotta-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-charcoal-400">
                      Key: {import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 15)}...
                    </span>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-charcoal-900 text-cream-50 text-[11px] font-semibold hover:bg-charcoal-800"
                    >
                      {urlSaveSuccess ? 'Saved! Reloading...' : 'Connect URL'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="text-center pt-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-charcoal-500 font-sans">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>INCOIS & Coast Guard MRCC Interoperable Protocol</span>
              </div>
            </div>
          </div>
        </div>


        {/* Footnote */}
        <p className="mt-6 text-center text-xs text-charcoal-500">
          Need rescue dispatch assistance?{' '}
          <Link to="/admin/sos" className="font-semibold text-terracotta-600 hover:underline">
            View Live Distress Queue
          </Link>
        </p>
      </div>
    </div>
  )
}
