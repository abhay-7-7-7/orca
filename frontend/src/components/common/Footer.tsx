import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-charcoal-900 text-cream-300 py-16">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-terracotta-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg font-sans">O</span>
              </div>
              <span className="text-xl font-semibold text-cream-100 font-sans tracking-tight">
                ORCA
              </span>
            </div>
            <p className="text-sm text-cream-400 leading-relaxed max-w-md mb-2">
              {t('footer.tagline')}
            </p>
            <p className="text-xs text-cream-400/60">
              {t('footer.team')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-label uppercase tracking-widest text-cream-400/60 mb-4 font-sans text-xs">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/map" className="text-sm text-cream-300 hover:text-cream-100 no-underline transition-colors">
                  Live Map
                </Link>
              </li>
              <li>
                <Link to="/chat" className="text-sm text-cream-300 hover:text-cream-100 no-underline transition-colors">
                  Chat Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-label uppercase tracking-widest text-cream-400/60 mb-4 font-sans text-xs">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-cream-400">
                  SIH 2026 · ISRO
                </span>
              </li>
              <li>
                <span className="text-sm text-cream-400">
                  Powered by INCOIS · Bhashini · GDACS
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-cream-400/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream-400/50">
            © 2026 ORCA. Data sources: NOAA, Open-Meteo, GDACS, MarineRegions, Bhashini.
          </p>
          <p className="text-xs text-cream-400/50">
            Not for navigation — research & demonstration purposes only.
          </p>
        </div>
      </div>
    </footer>
  )
}
