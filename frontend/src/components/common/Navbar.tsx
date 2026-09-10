import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import StatusDot from './StatusDot'
import { useHealthStore } from '../../store/healthStore'
import { useSOSStore } from '../../store/sosStore'
import { AlertOctagon } from 'lucide-react'

export default function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const overallStatus = useHealthStore((s) => s.overallStatus)
  const signals = useSOSStore((s) => s.signals)

  const isMapPage = location.pathname === '/map'
  const isDarkNav = isMapPage

  const activeSOSCount = signals.filter(
    (s) => s.status === 'active' || s.status === 'acknowledged'
  ).length

  const links = [
    { to: '/map', label: t('nav.liveMap') },
    { to: '/chat', label: t('nav.chat') },
  ]

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 ${
        isDarkNav
          ? 'bg-charcoal-900/95 backdrop-blur-md'
          : 'bg-cream-100/90 backdrop-blur-md'
      }`}
      style={{
        borderBottom: isDarkNav
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid #EDE6D8',
      }}
    >
      <div className="max-w-content mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="w-8 h-8 rounded-full bg-terracotta-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm font-sans">O</span>
          </div>
          <span
            className={`text-base font-semibold tracking-tight font-sans ${
              isDarkNav ? 'text-cream-100' : 'text-charcoal-900'
            }`}
          >
            ORCA
          </span>
          <StatusDot
            status={
              overallStatus === 'healthy'
                ? 'live'
                : overallStatus === 'degraded'
                ? 'mock'
                : 'error'
            }
          />
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium no-underline transition-colors ${
                location.pathname === link.to
                  ? isDarkNav
                    ? 'text-cream-100 font-semibold'
                    : 'text-charcoal-900 font-semibold'
                  : isDarkNav
                  ? 'text-cream-400 hover:text-cream-100'
                  : 'text-cream-400 hover:text-charcoal-900'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Admin Distress Monitor Link */}
          <Link
            to="/admin"
            className={`text-sm font-medium no-underline flex items-center gap-2 transition-colors ${
              location.pathname.startsWith('/admin')
                ? 'text-charcoal-900 font-semibold'
                : isDarkNav
                ? 'text-cream-400 hover:text-cream-100'
                : 'text-cream-400 hover:text-charcoal-900'
            }`}
          >
            <span>Distress Monitor</span>
            {activeSOSCount > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
            )}
          </Link>
        </div>

        {/* CTA */}
        <Link
          to="/map"
          className={`text-sm font-medium px-5 py-2.5 rounded-md no-underline transition-all ${isMapPage
            ? 'bg-terracotta-500 text-white hover:bg-terracotta-600'
            : 'bg-charcoal-900 text-cream-100 hover:bg-charcoal-800'
            }`}
        >
          {t('nav.openMap')}
        </Link>
      </div>
    </motion.nav>
  )
}
