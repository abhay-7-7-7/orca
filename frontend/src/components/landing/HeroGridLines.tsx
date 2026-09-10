import { motion } from 'framer-motion'

export default function HeroGridLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* SVG Canvas for precision architectural grid lines, curves, and thematic photo tiles */}
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle gradient for moving pulses */}
          <linearGradient id="terracotta-pulse" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C4703F" stopOpacity="0" />
            <stop offset="50%" stopColor="#C4703F" stopOpacity="1" />
            <stop offset="100%" stopColor="#C4703F" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="cyan-pulse" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2E7D96" stopOpacity="0" />
            <stop offset="50%" stopColor="#2E7D96" stopOpacity="1" />
            <stop offset="100%" stopColor="#2E7D96" stopOpacity="0" />
          </linearGradient>

          {/* Grid pattern definition for the subtle underlying square grid */}
          <pattern id="base-grid" width="120" height="120" patternUnits="userSpaceOnUse">
            <path
              d="M 120 0 L 0 0 0 120"
              fill="none"
              stroke="#E8E4DA"
              strokeWidth="0.75"
            />
          </pattern>

          {/* Precise ClipPaths for Embedded Thematic Photo Tiles locked to grid cells on the right */}
          <clipPath id="tile-clip-stacked-top">
            <rect x="900" y="280" width="120" height="120" rx="2" />
          </clipPath>
          <clipPath id="tile-clip-stacked-bottom">
            <rect x="900" y="400" width="120" height="120" rx="2" />
          </clipPath>
          <clipPath id="tile-clip-east">
            <rect x="1140" y="160" width="120" height="120" rx="2" />
          </clipPath>
        </defs>

        {/* 1. Base modular structural grid (softly visible across entire canvas) */}
        <rect width="100%" height="100%" fill="url(#base-grid)" opacity="0.45" />

        {/* 
          2. Primary Architectural Curved Flow Paths & Grid Boxes
          Positioned intentionally toward the right (x: 660 - 1440)
          leaving the left (0 - 660) clean and open for the serif headline
        */}
        <g stroke="#CDC7B5" strokeWidth="1" fill="none">
          {/* Subtle horizontal lead-in from behind the hero typography */}
          <path d="M 480 520 L 780 520" />
          <path d="M 660 280 L 780 280" />

          {/* Vertical descending leads */}
          <path d="M 780 40 L 780 160 Q 780 280 900 280" />
          <path d="M 900 0 L 900 160 Q 900 280 1020 280 L 1140 280" />

          {/* Architectural modular squares (shifted to right side matching screenshot) */}
          <rect x="780" y="160" width="120" height="120" />
          <rect x="780" y="280" width="120" height="120" />
          <rect x="1020" y="160" width="120" height="120" />
          <rect x="1020" y="280" width="120" height="120" />
          <rect x="1020" y="400" width="120" height="120" />
          <rect x="1260" y="280" width="120" height="120" />

          {/* 
            EXACT CROSSING ARCS (Hourglass / X curve from reference screenshot media_1789028112722.png)
            Located at cell (x: 780, y: 400)
          */}
          <path d="M 780 520 C 840 520 840 400 900 400" />
          <path d="M 780 400 C 840 400 840 520 900 520" />

          {/* Sweeping S-curves and corner fillets flowing eastward */}
          <path d="M 900 160 Q 1020 160 1020 280" />
          <path d="M 1020 280 C 1080 280 1080 400 1140 400 L 1260 400" />
          <path d="M 1140 280 Q 1260 280 1260 400 L 1260 520" />
          <path d="M 1260 400 Q 1380 400 1380 520 L 1380 640" />

          {/* Cross-corridor connecting to right edge */}
          <path d="M 900 520 C 960 520 960 640 1020 640 L 1440 640" />
          <path d="M 1020 520 Q 1140 520 1140 640 L 1140 760" />
        </g>

        {/* 
          3. Thematic Authentic Photos (Right-Shifted & locked in grid cells)
          Theme: Indian Marine Fisheries, Deep-Sea Vessels, and Satellite Ocean Telemetry
        */}
        <g className="photo-tiles">
          {/* Stacked Tile 1 (Top): Marine Vessel Wake & Ocean Navigation */}
          <image
            href="https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=400&q=80"
            x="900"
            y="280"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#tile-clip-stacked-top)"
            opacity="0.92"
          />
          <rect
            x="900"
            y="280"
            width="120"
            height="120"
            rx="2"
            stroke="#CDC7B5"
            strokeWidth="1"
            fill="none"
          />

          {/* Stacked Tile 2 (Bottom): Traditional Fishing Vessel at Dawn on Ocean */}
          <image
            href="https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&w=400&q=80"
            x="900"
            y="400"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#tile-clip-stacked-bottom)"
            opacity="0.90"
          />
          <rect
            x="900"
            y="400"
            width="120"
            height="120"
            rx="2"
            stroke="#CDC7B5"
            strokeWidth="1"
            fill="none"
          />

          {/* Tile 3 (East): Satellite Earth Observation / Ocean Currents Telemetry */}
          <image
            href="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80"
            x="1140"
            y="160"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#tile-clip-east)"
            opacity="0.94"
          />
          <rect
            x="1140"
            y="160"
            width="120"
            height="120"
            rx="2"
            stroke="#CDC7B5"
            strokeWidth="1"
            fill="none"
          />
        </g>

        {/* 4. Live Moving Lines — Continuous traveling light pulses on the right-shifted tracks */}
        <g fill="none">
          {/* Pulse 1: Terracotta Pulse entering from headline lead-in and sweeping east */}
          <motion.path
            d="M 480 520 L 780 520 C 840 520 840 400 900 400 L 1020 400 C 1080 400 1080 280 1140 280 L 1440 280"
            stroke="#C4703F"
            strokeWidth="2"
            strokeDasharray="140 550"
            initial={{ strokeDashoffset: 1400 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Pulse 2: Ocean Cyan Pulse descending from top through the S-curves */}
          <motion.path
            d="M 900 0 L 900 160 Q 900 280 1020 280 C 1080 280 1080 400 1140 400 Q 1260 400 1260 520 L 1260 640"
            stroke="#2E7D96"
            strokeWidth="1.8"
            strokeDasharray="120 480"
            initial={{ strokeDashoffset: 1200 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 1.2,
            }}
          />

          {/* Pulse 3: Emerald Pulse traversing the lower crossing wave */}
          <motion.path
            d="M 780 400 C 840 400 840 520 900 520 C 960 520 960 640 1020 640 L 1440 640"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeDasharray="110 420"
            initial={{ strokeDashoffset: 1100 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'linear',
              delay: 2.8,
            }}
          />

          {/* Pulse 4: Counter S-Curve Wave (Terracotta secondary stream) */}
          <motion.path
            d="M 780 40 L 780 160 Q 780 280 900 280 L 1020 280 Q 1140 280 1140 400 L 1260 400"
            stroke="#C4703F"
            strokeWidth="1.5"
            strokeDasharray="95 380"
            initial={{ strokeDashoffset: 950 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 5.8,
              repeat: Infinity,
              ease: 'linear',
              delay: 3.6,
            }}
          />
        </g>

        {/* 5. Moving glowing nodes / sensor beads traveling along vertices on the right */}
        <motion.circle
          r="3"
          fill="#C4703F"
          animate={{
            cx: [780, 900, 1020, 1140],
            cy: [520, 400, 400, 280],
            opacity: [0, 0.95, 0.95, 0],
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.circle
          r="3"
          fill="#2E7D96"
          animate={{
            cx: [900, 1020, 1140, 1260],
            cy: [160, 280, 400, 520],
            opacity: [0, 0.95, 0.95, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.8,
          }}
        />
      </svg>
    </div>
  )
}
