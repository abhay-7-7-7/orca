import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Footer from '../components/common/Footer'

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
      {/* ============ HERO ============ */}
      <section className="pt-32 pb-24 md:pt-44 md:pb-32 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-200/40 to-cream-100 pointer-events-none" />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, #C4703F 0%, transparent 70%)',
          }}
        />

        <div className="section-container relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.p variants={fadeUp} custom={0} className="label-caps mb-6">
              Marine Intelligence Platform
            </motion.p>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-display-xl md:text-[5.5rem] font-serif font-semibold text-charcoal-900 mb-8 leading-[1.02]"
              style={{ letterSpacing: '-0.03em' }}
            >
              Know where{' '}
              <br className="hidden md:block" />
              the fish are.{' '}
              <br />
              <span className="text-cream-400">Know the way back.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-cream-400 max-w-xl mb-10 leading-relaxed font-sans"
            >
              {t('hero.subheadline')}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex items-center gap-4">
              <Link to="/map" className="btn-primary text-base">
                {t('hero.cta')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
              <Link to="/chat" className="btn-secondary text-base">
                Talk to ORCA
              </Link>
            </motion.div>
          </motion.div>
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
          {/* Image/visual placeholder */}
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

          {/* Image on right */}
          {imagePosition === 'right' && (
            <FeatureVisual index={index} accentColor={accentColor} />
          )}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureVisual({ index, accentColor }: { index: number; accentColor: string }) {
  const visuals = [
    // PFZ Discovery — satellite imagery feel
    {
      bg: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 40%, #2E7D96 70%, #4db8a4 100%)',
      content: (
        <>
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(46,125,150,0.5) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(77,184,164,0.4) 0%, transparent 40%)' }} />
          {/* PFZ zone markers */}
          <div className="absolute top-[30%] left-[40%] w-16 h-16 rounded-full border-2 border-emerald-400/60 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="absolute top-[55%] left-[60%] w-12 h-12 rounded-full border-2 border-emerald-400/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="absolute top-[20%] left-[65%] w-10 h-10 rounded-full border-2 border-yellow-400/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          </div>
          {/* Label overlay */}
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">PFZ Candidates</p>
            <p className="text-sm text-white font-medium">3 zones detected</p>
          </div>
        </>
      ),
    },
    // Routing — path visualization
    {
      bg: 'linear-gradient(135deg, #f5e6d3 0%, #ddd0bc 100%)',
      content: (
        <>
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          {/* Route path SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
            {/* Dashed skeleton */}
            <path d="M 60 250 Q 120 200 160 180 Q 200 160 240 120 Q 280 80 340 60" stroke="#C4703F" strokeWidth="3" fill="none" strokeDasharray="8 4" opacity="0.3" />
            {/* Hazard-aware route */}
            <path d="M 60 250 Q 100 220 130 200 Q 160 180 200 170 Q 240 160 270 130 Q 300 100 340 60" stroke="#C4703F" strokeWidth="3" fill="none" />
            {/* Origin */}
            <circle cx="60" cy="250" r="6" fill="#1A1A1A" />
            <circle cx="60" cy="250" r="3" fill="white" />
            {/* Destination */}
            <circle cx="340" cy="60" r="6" fill="#2E7D32" />
            <circle cx="340" cy="60" r="3" fill="white" />
            {/* Hazard zones */}
            <circle cx="200" cy="130" r="25" fill="#F44336" opacity="0.15" />
            <circle cx="280" cy="170" r="20" fill="#FF9800" opacity="0.15" />
          </svg>
          {/* Label */}
          <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-cream-300">
            <p className="text-[10px] text-charcoal-900/50 uppercase tracking-wider">Hazard-Aware Route</p>
            <p className="text-sm text-charcoal-900 font-medium">Kochi → PFZ Zone A</p>
          </div>
        </>
      ),
    },
    // Dashboard — monitoring feel
    {
      bg: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
      content: (
        <>
          {/* Dashboard cards */}
          <div className="absolute top-6 left-6 right-6 space-y-3">
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">ETA</p>
                <p className="text-lg text-white font-semibold">3h 24m</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-sm">✓</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Wave Height</p>
                <p className="text-lg text-white font-semibold">1.2m</p>
              </div>
              <div className="flex items-end gap-0.5 h-6">
                {[60, 80, 50, 90, 70, 85, 55].map((h, i) => (
                  <div key={i} className="w-1 bg-terracotta-500 rounded-full" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="bg-amber-500/20 backdrop-blur rounded-lg px-4 py-3 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">⚠</span>
                <div>
                  <p className="text-[10px] text-amber-300/60 uppercase tracking-wider">Reroute Alert</p>
                  <p className="text-xs text-amber-200">Wind speed increasing on current path</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ),
    },
  ]

  const visual = visuals[index - 1]

  return (
    <motion.div
      variants={fadeUp}
      custom={2}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl"
      style={{ background: visual.bg }}
    >
      {visual.content}
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
