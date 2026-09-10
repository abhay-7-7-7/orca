import { motion } from 'framer-motion'

const TICKER_ITEMS = [
  { icon: '🌊', label: 'Arabian Sea Swell', value: '1.4m · WSW · Slight Sea State', status: 'normal' },
  { icon: '🌡️', label: 'Kerala Shelf SST', value: '28.6°C (Thermal front active)', status: 'normal' },
  { icon: '🐟', label: 'Live PFZ Candidates', value: '4 High-Yield Zones (INCOIS OISST/OC-CCI)', status: 'highlight' },
  { icon: '💨', label: 'Monsoon Wind', value: '18.5 km/h · 245° WSW · 10.0 kn', status: 'normal' },
  { icon: '🛡️', label: 'Indian EEZ Boundary', value: '200 NM Active · 0 Geofence Breaches', status: 'secure' },
  { icon: '⚓', label: 'Kochi Port Tide', value: '+1.1m High Tide at 16:24 IST', status: 'normal' },
  { icon: '🌪️', label: 'GDACS Disaster Watch', value: 'No Active Cyclone Warnings in Arabian Sea', status: 'secure' },
  { icon: '⚡', label: 'Lightning Network', value: '0 Threat Clusters in 60 NM Corridor', status: 'normal' },
  { icon: '🛰️', label: 'Fusion Frequency', value: 'Automated 60s Cycle Across 8 Agents', status: 'highlight' },
]

export default function OceanTicker() {
  return (
    <div className="relative w-full bg-charcoal-900 border-y border-charcoal-800 py-3 overflow-hidden select-none z-20">
      {/* Edge gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-charcoal-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-charcoal-900 to-transparent z-10 pointer-events-none" />

      {/* Infinite scrolling ticker */}
      <div className="flex w-max">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            repeat: Infinity,
            repeatType: 'loop',
            duration: 38,
            ease: 'linear',
          }}
          className="flex items-center gap-8 whitespace-nowrap"
        >
          {/* Double items array for continuous seamless infinite loop */}
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-sans"
            >
              <span className="text-sm">{item.icon}</span>
              <span className="font-bold text-cream-200 tracking-wide">{item.label}:</span>
              <span
                className={`font-mono text-[11px] ${
                  item.status === 'highlight'
                    ? 'text-terracotta-400 font-bold'
                    : item.status === 'secure'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-cream-300'
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
