import { motion } from 'framer-motion'

export default function HeroGridLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* SVG Canvas for precision architectural grid lines and bezier interconnects */}
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
              strokeWidth="0.8"
            />
          </pattern>

          {/* Precise ClipPaths for Embedded Photo Tiles locked to grid cells */}
          <clipPath id="tile-clip-stacked-top">
            <rect x="720" y="360" width="120" height="120" rx="2" />
          </clipPath>
          <clipPath id="tile-clip-stacked-bottom">
            <rect x="720" y="480" width="120" height="120" rx="2" />
          </clipPath>
          <clipPath id="tile-clip-east">
            <rect x="1080" y="240" width="120" height="120" rx="2" />
          </clipPath>
        </defs>

        {/* 1. Base modular structural grid matching screenshot */}
        <rect width="100%" height="100%" fill="url(#base-grid)" opacity="0.6" />

        {/* 2. Primary Architectural Curved Flow Paths (exact shapes from reference images) */}
        <g stroke="#CDC7B5" strokeWidth="1" fill="none">
          {/* Top-right sweeping curves */}
          <path d="M 720 0 L 720 120 Q 720 240 840 240 L 960 240" />
          <path d="M 600 0 L 600 60 Q 600 120 720 120" />
          
          {/* Architectural modular squares */}
          <rect x="360" y="120" width="120" height="120" />
          <rect x="600" y="0" width="120" height="120" />
          <rect x="600" y="240" width="120" height="120" />
          <rect x="840" y="120" width="120" height="120" />
          <rect x="480" y="480" width="120" height="120" />
          <rect x="960" y="360" width="120" height="120" />
          <rect x="1080" y="480" width="120" height="120" />

          {/* EXACT CROSSING CURVED ARCS (from screenshot media_1789028112722.png) */}
          {/* Arc 1: curves from (600, 480) up and right to (720, 360) */}
          <path d="M 600 480 C 660 480 660 360 720 360" />
          {/* Arc 2: curves from (600, 360) down and right to (720, 480) */}
          <path d="M 600 360 C 660 360 660 480 720 480" />

          {/* Sweeping S-curves and fillets */}
          <path d="M 720 120 Q 840 120 840 240" />
          <path d="M 840 240 C 900 240 900 360 960 360 L 1080 360" />
          <path d="M 960 240 Q 1080 240 1080 360 L 1080 480" />
          <path d="M 1080 360 Q 1200 360 1200 480 L 1200 600" />

          {/* Flow interconnects across the bottom hero */}
          <path d="M 0 480 L 360 480 Q 480 480 480 600 L 480 720 Q 480 840 600 840 L 1440 840" />
          <path d="M 240 240 L 480 240 Q 600 240 600 360 L 600 480" />
          <path d="M 840 480 Q 960 480 960 600 L 960 720" />
          <path d="M 720 600 C 720 660 840 660 840 720 L 840 840" />
        </g>

        {/* 3. Authentic Photo Tiles Locked Directly inside SVG Grid (matches screenshots) */}
        <g className="photo-tiles">
          {/* Stacked Tile 1 (Top): Marine deck / harbour scene */}
          <image
            href="https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=300&q=80"
            x="720"
            y="360"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#tile-clip-stacked-top)"
            opacity="0.92"
          />
          <rect
            x="720"
            y="360"
            width="120"
            height="120"
            rx="2"
            stroke="#CDC7B5"
            strokeWidth="1"
            fill="none"
          />

          {/* Stacked Tile 2 (Bottom): Harbour worker / coastal walk (matches screenshot 3) */}
          <image
            href="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80"
            x="720"
            y="480"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#tile-clip-stacked-bottom)"
            opacity="0.90"
          />
          <rect
            x="720"
            y="480"
            width="120"
            height="120"
            rx="2"
            stroke="#CDC7B5"
            strokeWidth="1"
            fill="none"
          />

          {/* Tile 3 (East): Ocean surface swell & navigation */}
          <image
            href="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=300&q=80"
            x="1080"
            y="240"
            width="120"
            height="120"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#tile-clip-east)"
            opacity="0.92"
          />
          <rect
            x="1080"
            y="240"
            width="120"
            height="120"
            rx="2"
            stroke="#CDC7B5"
            strokeWidth="1"
            fill="none"
          />
        </g>

        {/* 4. Live Moving Lines — Continuous fluid traveling data pulses along the grid */}
        <g fill="none">
          {/* Pulse 1: Main horizontal cross-ocean current (Terracotta) */}
          <motion.path
            d="M 0 480 L 360 480 Q 480 480 480 600 L 480 720 Q 480 840 600 840 L 1440 840"
            stroke="#C4703F"
            strokeWidth="2"
            strokeDasharray="140 600"
            initial={{ strokeDashoffset: 1480 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 7.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Pulse 2: Vertical descending oceanic data stream (Ocean Cyan) */}
          <motion.path
            d="M 720 0 L 720 120 Q 720 240 840 240 L 960 240 Q 1080 240 1080 360 L 1080 480 Q 1200 480 1200 600"
            stroke="#2E7D96"
            strokeWidth="1.8"
            strokeDasharray="120 500"
            initial={{ strokeDashoffset: 1200 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: 'linear',
              delay: 1.2,
            }}
          />

          {/* Pulse 3: Traversing the Crossing S-Curves (Emerald) */}
          <motion.path
            d="M 240 240 L 480 240 Q 600 240 600 360 C 660 360 660 480 720 480 L 720 600 C 720 660 840 660 840 720 L 840 840"
            stroke="#10B981"
            strokeWidth="1.6"
            strokeDasharray="110 450"
            initial={{ strokeDashoffset: 1100 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'linear',
              delay: 2.5,
            }}
          />

          {/* Pulse 4: Counter Crossing Wave */}
          <motion.path
            d="M 480 480 L 600 480 C 660 480 660 360 720 360 L 720 120 Q 840 120 840 240 C 900 240 900 360 960 360 L 1080 360"
            stroke="#C4703F"
            strokeWidth="1.6"
            strokeDasharray="100 420"
            initial={{ strokeDashoffset: 1050 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 6.2,
              repeat: Infinity,
              ease: 'linear',
              delay: 3.8,
            }}
          />
        </g>

        {/* 5. Moving glowing nodes traveling along key vertices */}
        <motion.circle
          r="3"
          fill="#C4703F"
          animate={{
            cx: [360, 480, 480, 600],
            cy: [480, 480, 720, 840],
            opacity: [0, 0.9, 0.9, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.circle
          r="3"
          fill="#2E7D96"
          animate={{
            cx: [720, 840, 960, 1080],
            cy: [120, 240, 240, 360],
            opacity: [0, 0.9, 0.9, 0],
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
