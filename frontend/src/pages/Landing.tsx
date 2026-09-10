import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Footer from '../components/common/Footer'
import HeroGridLines from '../components/landing/HeroGridLines'
import HeroLiveWidget from '../components/landing/HeroLiveWidget'
import OceanTicker from '../components/landing/OceanTicker'
import LiveRouteSimulator from '../components/landing/LiveRouteSimulator'
import LiveAgentMonitor from '../components/landing/LiveAgentMonitor'

/* --- Animation variants --- */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function Landing() {
  const { t } = useTranslation()

  return (
    <div className="bg-cream-100 min-h-screen">
      {/* ============ HERO WITH LIVE MOVING LINES BACKGROUND ============ */}
      <section className="pt-32 pb-24 md:pt-44 md:pb-36 relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Live architectural moving grid & bezier line interconnects (matches screenshot) */}
        <HeroGridLines />

        <div className="section-container relative z-10 w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-2xl"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-6">
              <span className="label-caps">Marine Intelligence Platform</span>
              <span className="text-[10px] font-bold text-terracotta-700 bg-terracotta-100/70 px-2.5 py-0.5 rounded-full border border-terracotta-300/60">
                ISRO SIH 2026
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-display-xl md:text-[5.8rem] font-serif font-semibold text-charcoal-900 mb-8 leading-[1.0] tracking-tight"
            >
              Know where{' '}
              <br className="hidden md:block" />
              the fish are.{' '}
              <br />
              <span className="text-cream-400 font-normal">Know the way back.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-charcoal-800/80 max-w-lg mb-10 leading-relaxed font-sans"
            >
              {t('hero.subheadline')}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center gap-4 mb-12">
              <Link to="/map" className="btn-primary text-base shadow-lg hover:shadow-terracotta-500/20">
                {t('hero.cta')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
              <Link to="/chat" className="btn-secondary text-base bg-white/80 backdrop-blur-sm hover:bg-white">
                Talk to ORCA
              </Link>
            </motion.div>

            {/* Source and verification strip */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="pt-6 border-t border-cream-300/80 flex flex-wrap items-center gap-6 text-xs text-charcoal-800/60"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span>🛰️</span>
                <span>Copernicus & NOAA Feeds</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span>🐟</span>
                <span>INCOIS PFZ Model</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span>🛡️</span>
                <span>200 NM Indian EEZ Guard</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ LIVE OCEAN TICKER ============ */}
      <OceanTicker />

      {/* ============ LIVE TELEMETRY DECK (MOVED BELOW HERO) ============ */}
      <section className="py-16 md:py-20 bg-cream-50/90 border-b border-cream-200">
        <div className="section-container max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="label-caps mb-2 block">Autonomous Telemetry Feed</span>
              <h2 className="text-heading md:text-display-sm font-serif text-charcoal-900">
                Live Arabian Sea Situational Awareness
              </h2>
            </div>
            <p className="text-xs text-gray-500 max-w-xs font-sans">
              Live automated data fusion across NOAA OISST, Copernicus Marine, and Open-Meteo models.
            </p>
          </div>
          <HeroLiveWidget />
        </div>
      </section>

      {/* ============ SECTION LABEL — "How it works" ============ */}
      <section className="py-section-sm">
        <div className="section-container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="text-center mb-20"
          >
            <motion.p variants={fadeUp} className="label-caps mb-4">
              {t('features.sectionLabel')}
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-display font-serif text-charcoal-900"
            >
              {t('features.sectionTitle')}
            </motion.h2>
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURE 1 — PFZ Discovery ============ */}
      <FeatureSection
        index={1}
        label="01"
        title="Find the fish"
        subtitle="Live PFZ discovery from satellite data"
        description="ORCA's PFZ Synthesis Agent fuses SST thermal fronts and chlorophyll concentration from NOAA OISST and ESA OC-CCI satellites — the same inputs INCOIS uses — to compute candidate fishing zones in real time."
        features={[
          'Self-synthesized PFZ candidates, not scraped bulletins — reproducible and verifiable',
          'Real lat/lon polygons plotted on the map, not static image overlays',
          'SST gradient detection highlights thermal fronts where fish aggregate',
          'Chlorophyll thresholds identify nutrient-rich upwelling zones',
        ]}
        imagePosition="right"
        accentColor="#2E7D96"
      />

      {/* ============ FEATURE 2 — Hazard-Aware Routing ============ */}
      <FeatureSection
        index={2}
        label="02"
        title="Chart the safest course"
        subtitle="Hazard-aware A* routing that respects every boundary"
        description="Not just shortest distance — ORCA's routing engine overlays live wave height, wind speed, cyclone alerts, and lightning data as traversal costs on a navigable-water grid. EEZ and MPA boundaries are infinite-cost no-go zones, not soft preferences."
        features={[
          'A* pathfinding with Haversine heuristic on a live hazard-cost grid',
          'searoute-py skeleton ensures land avoidance, then hazard overlay refines the path',
          'EEZ/IMBL boundaries are hard walls — no route crosses them',
          'Every route decision cites the live data behind it: wave height, wind speed, alert proximity',
        ]}
        imagePosition="left"
        accentColor="#C4703F"
      />

      {/* ============ FEATURE 3 — Live Rerouting ============ */}
      <FeatureSection
        index={3}
        label="03"
        title="Stay safe at sea"
        subtitle="Live rerouting + dashboard monitoring"
        description="The dashboard tracks your vessel along the computed route. When conditions change — a squall forms ahead, a cyclone alert enters your corridor, or wave heights spike — ORCA recomputes the route automatically and pushes a reroute alert."
        features={[
          'Continuous reroute-check against the fusion layer\'s live world state',
          'Precaution banners when hazard thresholds are approached, not just breached',
          'ETA and hazard summary update in real time as conditions shift',
          'Voice alerts in your language when critical rerouting is triggered',
        ]}
        imagePosition="right"
        accentColor="#4CAF50"
      />

      {/* ============ LIVE ROUTE REASONING SIMULATOR ============ */}
      <LiveRouteSimulator />

      {/* ============ DARK BAND — Live Rerouting CTA ============ */}
      <section className="dark-band py-section">
        <div className="section-container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.h2
              variants={fadeUp}
              className="text-display-lg font-serif text-cream-100 mb-8"
            >
              The route changes when the ocean does.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-cream-400 text-lg leading-relaxed mb-10"
            >
              ORCA doesn't give you a static plan and walk away. Every minute,
              the fusion layer re-evaluates conditions along your active route.
              The moment wave heights cross your threshold, a new cyclone alert
              enters your corridor, or lightning clusters form ahead — ORCA
              recomputes and reroutes. Because the ocean doesn't wait for your
              next check-in.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium tracking-wide bg-terracotta-500 text-white rounded-md hover:bg-terracotta-600 transition-all no-underline"
              >
                See it live
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ FOUR PILLARS ============ */}
      <section className="dark-band py-section" style={{ background: '#222' }}>
        <div className="section-container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="label-caps mb-4">
              Built different
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-display font-serif text-cream-100">
              Why ORCA, not another dashboard
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          >
            <PillarCard
              icon="🔍"
              title={t('pillars.explainable')}
              description={t('pillars.explainableDesc')}
            />
            <PillarCard
              icon="🗣️"
              title={t('pillars.multilingual')}
              description={t('pillars.multilingualDesc')}
            />
            <PillarCard
              icon="📡"
              title={t('pillars.live')}
              description={t('pillars.liveDesc')}
            />
            <PillarCard
              icon="🛡️"
              title={t('pillars.safety')}
              description={t('pillars.safetyDesc')}
            />
          </motion.div>
        </div>
      </section>

      {/* ============ LIVE AGENT MESH MONITOR ============ */}
      <LiveAgentMonitor />

      {/* ============ STATS BAND ============ */}
      <section className="py-section bg-cream-100">
        <div className="section-container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="label-caps mb-4">
              The scale of the problem
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-display font-serif text-charcoal-900">
              We handle the work that matters most
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <StatCard number="7M+" label="Fishermen dependent on India's coast" />
            <StatCard number="8,100km" label="Coastline covered" />
            <StatCard number="22" label="Languages supported via Bhashini" />
            <StatCard number="Real-time" label="Satellite + weather + hazard fusion" />
          </motion.div>
        </div>
      </section>

      {/* ============ CTA BAND ============ */}
      <section className="dark-band py-section">
        <div className="section-container text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-display-lg font-serif text-cream-100 mb-6">
              Put agents to work{' '}
              <br className="hidden md:block" />
              in complex environments
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-cream-400 text-lg mb-10 max-w-xl mx-auto">
              8 independent data agents. One fused world state. Routes that reason about safety, not just distance.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="flex items-center justify-center gap-4">
              <Link to="/map" className="btn-primary text-base bg-terracotta-500 hover:bg-terracotta-600">
                Explore the map
              </Link>
              <Link to="/chat" className="btn-secondary text-base border-cream-400 text-cream-100 hover:bg-cream-100 hover:text-charcoal-900">
                Talk to ORCA
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

/* ============ Sub-components ============ */

function FeatureSection({
  index,
  label,
  title,
  subtitle,
  description,
  features,
  imagePosition,
  accentColor,
}: {
  index: number
  label: string
  title: string
  subtitle: string
  description: string
  features: string[]
  imagePosition: 'left' | 'right'
  accentColor: string
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="section-container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${
            imagePosition === 'left' ? 'lg:flex-row-reverse' : ''
          }`}
        >
          {/* Visual on left */}
          {imagePosition === 'left' && (
            <FeatureVisual index={index} accentColor={accentColor} />
          )}

          {/* Content */}
          <div className={imagePosition === 'left' ? 'lg:order-2' : ''}>
            <motion.div variants={fadeUp}>
              <span
                className="inline-block text-xs font-bold font-sans tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                {label}
              </span>
            </motion.div>

            <motion.h3
              variants={fadeUp}
              custom={1}
              className="text-heading md:text-display font-serif text-charcoal-900 mb-3"
            >
              {title}
            </motion.h3>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-subheading text-cream-400 mb-6 font-sans"
            >
              {subtitle}
            </motion.p>

            <motion.p
              variants={fadeUp}
              custom={3}
              className="text-base text-charcoal-800/70 leading-relaxed mb-8"
            >
              {description}
            </motion.p>

            <motion.ul variants={stagger} className="space-y-4">
              {features.map((feature, i) => (
                <motion.li
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  className="flex items-start gap-3 text-sm text-charcoal-800/80 leading-relaxed"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    ✓
                  </span>
                  {feature}
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Visual on right */}
          {imagePosition === 'right' && (
            <FeatureVisual index={index} accentColor={accentColor} />
          )}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureVisual({ index, accentColor }: { index: number; accentColor: string }) {
  if (index === 1) {
    // Feature 1: Authentic technical satellite oceanography display
    return (
      <motion.div
        variants={fadeUp}
        custom={2}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-charcoal-950 border border-charcoal-800 font-sans p-6 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 z-10">
          <div>
            <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">
              SPECTRAL THERMAL FRONT SYNTHESIS
            </span>
            <p className="text-xs font-bold text-white">NOAA OISST + ESA OC-CCI [ARABIAN SEA SECTOR]</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            0.04° RES
          </span>
        </div>

        {/* Vector isotherm contours */}
        <div className="relative my-auto py-4">
          <svg viewBox="0 0 400 180" className="w-full h-full" fill="none">
            {/* Depth isobaths */}
            <path d="M 0 40 Q 100 60 200 35 T 400 50" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 0 90 Q 120 110 240 85 T 400 100" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 0 140 Q 140 160 280 135 T 400 150" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />

            {/* Thermal isotherms */}
            <path d="M 40 10 Q 120 80 180 95 Q 260 110 360 40" stroke="#06B6D4" strokeWidth="2" />
            <path d="M 80 20 Q 150 90 220 110 Q 300 130 380 70" stroke="#10B981" strokeWidth="2.5" />
            <path d="M 120 30 Q 180 100 250 120 Q 330 140 400 90" stroke="#F59E0B" strokeWidth="1.5" />

            {/* Detected PFZ Hotspot polygon */}
            <polygon
              points="190,75 250,85 270,125 210,130"
              fill="#10B981"
              fillOpacity="0.25"
              stroke="#34D399"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />

            {/* Target Centroid */}
            <circle cx="230" cy="105" r="4" fill="#FFFFFF" stroke="#059669" strokeWidth="2" />
            <text x="242" y="102" fill="#E2E8F0" fontSize="10" fontWeight="bold">
              PFZ ZONE 01 [SCORE 0.94]
            </text>
            <text x="242" y="115" fill="#94A3B8" fontSize="8">
              SST FRONT ΔT: 0.78°C / 10km
            </text>
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-[10px] text-gray-400 z-10">
          <div>
            <span className="block text-gray-500">Centroid</span>
            <span className="font-mono text-gray-200">09°51'N, 75°36'E</span>
          </div>
          <div>
            <span className="block text-gray-500">Chlorophyll-a</span>
            <span className="font-mono text-emerald-400 font-bold">1.85 mg/m³</span>
          </div>
          <div>
            <span className="block text-gray-500">Methodology</span>
            <span className="font-mono text-gray-200">INCOIS OISST FRONT</span>
          </div>
        </div>
      </motion.div>
    )
  }

  if (index === 2) {
    // Feature 2: Crisp nautical chart & hazard A* path
    return (
      <motion.div
        variants={fadeUp}
        custom={2}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-cream-50 border border-cream-300 font-sans p-6 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-terracotta-600 tracking-wider">
              ELECTRONIC NAUTICAL PLOTTER
            </span>
            <p className="text-xs font-bold text-charcoal-900">A* Hazard-Cost Traversal Algorithm</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-terracotta-100 text-terracotta-800 border border-terracotta-200">
            EEZ ENFORCED
          </span>
        </div>

        {/* Vector nautical track */}
        <div className="relative my-auto py-2">
          <svg viewBox="0 0 400 180" className="w-full h-full" fill="none">
            {/* Nautical grid */}
            <line x1="0" y1="45" x2="400" y2="45" stroke="#E5E0D2" strokeWidth="0.8" />
            <line x1="0" y1="90" x2="400" y2="90" stroke="#E5E0D2" strokeWidth="0.8" />
            <line x1="0" y1="135" x2="400" y2="135" stroke="#E5E0D2" strokeWidth="0.8" />
            <line x1="100" y1="0" x2="100" y2="180" stroke="#E5E0D2" strokeWidth="0.8" />
            <line x1="200" y1="0" x2="200" y2="180" stroke="#E5E0D2" strokeWidth="0.8" />
            <line x1="300" y1="0" x2="300" y2="180" stroke="#E5E0D2" strokeWidth="0.8" />

            {/* High Swell Hazard Polygon (>2.4m sector) */}
            <circle cx="210" cy="80" r="45" fill="#EF4444" fillOpacity="0.12" stroke="#F87171" strokeWidth="1" strokeDasharray="4 3" />
            <text x="180" y="78" fill="#DC2626" fontSize="9" fontWeight="bold">
              ROUGH SWELL 2.6M
            </text>

            {/* Direct Line (Crosses Hazard - Rejected) */}
            <line x1="60" y1="140" x2="330" y2="40" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* ORCA Safe A* Path (Circumvents Hazard) */}
            <path
              d="M 60 140 Q 130 160 180 145 Q 260 135 300 90 L 330 40"
              stroke="#C4703F"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Origin & Dest */}
            <circle cx="60" cy="140" r="5" fill="#1E293B" stroke="#FFFFFF" strokeWidth="2" />
            <text x="35" y="162" fill="#1E293B" fontSize="9" fontWeight="bold">KOCHI PORT</text>

            <circle cx="330" cy="40" r="5" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
            <text x="300" y="25" fill="#059669" fontSize="9" fontWeight="bold">PFZ HOTSPOT</text>
          </svg>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-cream-200 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-charcoal-800 font-bold">Safe Corridor Confirmed</span>
          </div>
          <span className="font-mono text-gray-500">Distance: 78.4 km · ETA: 4.2h</span>
        </div>
      </motion.div>
    )
  }

  // Feature 3: Marine bridge instrument telemetry
  return (
    <motion.div
      variants={fadeUp}
      custom={2}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-charcoal-900 border border-charcoal-800 font-sans p-6 flex flex-col justify-between text-cream-100"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
            BRIDGE SENTINEL TELEMETRY
          </span>
          <p className="text-xs font-bold text-white">Active Voyage Corridor Watch</p>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          60s CYCLE
        </span>
      </div>

      {/* Live wave condition graph */}
      <div className="space-y-3 my-auto py-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-cream-400">Wave Height Telemetry Profile</span>
          <span className="font-mono text-white font-bold">Current: 1.4m · Max: 2.1m</span>
        </div>

        {/* Technical SVG bar series */}
        <div className="h-16 flex items-end gap-1.5 bg-black/40 p-2.5 rounded-lg border border-white/5">
          {[35, 42, 48, 55, 62, 58, 70, 85, 78, 65, 52, 45, 38, 40].map((val, idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-sm transition-all ${
                val > 75 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ height: `${val}%` }}
            />
          ))}
        </div>

        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-2.5 text-xs text-amber-200 flex items-start gap-2">
          <span>⚠️</span>
          <div>
            <span className="font-bold text-amber-100 block">Precautionary Course Adjustment:</span>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Wave forecast shows spike to 2.3m at Waypoint 4. Heading modified 12° West into smoother water.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[10px] text-cream-400">
        <span>Vessel MMSI: 419001234</span>
        <span className="font-mono text-emerald-400 font-bold">AUTOMATED REROUTE ARMED</span>
      </div>
    </motion.div>
  )
}

function PillarCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <motion.div variants={fadeUp} className="pillar-card">
      <span className="text-2xl mb-4 block">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <motion.div variants={fadeUp} className="text-center">
      <p className="text-display-lg font-serif text-charcoal-900 mb-2">{number}</p>
      <p className="text-sm text-cream-400 font-sans">{label}</p>
    </motion.div>
  )
}

