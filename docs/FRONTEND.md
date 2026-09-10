# ORCA Frontend — Documentation

Complete reference for setup, running, and understanding the ORCA frontend.

## 1. Overview

The ORCA frontend is a React 18 + TypeScript single-page application built with Vite. It provides three main experiences:

1. **Landing Page** — Marketing/overview page explaining ORCA's capabilities
2. **Live Map / Dashboard** — Full-screen interactive map with PFZ zones, hazard overlays, vessel tracking, and hazard-aware route computation
3. **Chat / Voice Interface** — Multilingual conversational AI with tool-call visibility, voice input, and context awareness

Design language: warm cream backgrounds, serif display headlines (Playfair Display), clean sans-serif body (DM Sans), dark contrast bands, terracotta accent — inspired by modern enterprise AI product design.

---

## 2. Page / Component Map

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Landing.tsx          # Hero + features + pillars + stats + CTA
│   │   ├── MapDashboard.tsx     # Full-screen map + controls + dashboard panel
│   │   └── Chat.tsx             # Full-page chat interface
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx      # Leaflet map container (OSM + OpenSeaMap tiles)
│   │   │   ├── PFZLayer.tsx     # PFZ zone polygons/circles with popups
│   │   │   ├── HazardOverlay.tsx # Colored hazard grid cells from fusion data
│   │   │   ├── RouteLayer.tsx   # Computed route polyline + hazard markers
│   │   │   ├── VesselLayer.tsx  # AIS vessel position markers
│   │   │   └── MapControls.tsx  # Route planner panel + layer toggles
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardPanel.tsx # Collapsible side panel (route + PFZ info)
│   │   │   ├── RouteInfo.tsx    # ETA, distance, safety score bar
│   │   │   ├── HazardCard.tsx   # Individual hazard type card
│   │   │   └── RerouteBanner.tsx # Warning banner when reroute needed
│   │   │
│   │   ├── chatbot/
│   │   │   ├── ChatInterface.tsx # Core chat component (overlay + fullpage modes)
│   │   │   ├── ChatOverlay.tsx  # Overlay drawer shell (from FloatingChatButton)
│   │   │   ├── MessageBubble.tsx # User/assistant message bubble
│   │   │   ├── ToolCallBubble.tsx # Inline tool-call tagged card
│   │   │   ├── VoiceIndicator.tsx # Live waveform bar animation
│   │   │   ├── ContextChips.tsx # Session state chips (location, route)
│   │   │   ├── LanguageBadge.tsx # Detected language badge with override
│   │   │   ├── TypingIndicator.tsx # Animated reasoning dots
│   │   │   └── MapThumbnail.tsx # Static map preview linking to Live Map
│   │   │
│   │   └── common/
│   │       ├── Navbar.tsx       # Fixed top nav (adapts for map page)
│   │       ├── Footer.tsx       # Site footer with branding/attribution
│   │       ├── StatusDot.tsx    # Live/mock/error health indicator dot
│   │       ├── FloatingChatButton.tsx # Persistent bottom-right chat FAB
│   │       └── LanguageSwitcher.tsx # Language dropdown (10 Indian languages)
│   │
│   ├── services/
│   │   ├── api.ts               # Base fetch client (reads VITE_API_BASE_URL)
│   │   ├── agents.ts            # All /api/agents/* routes
│   │   ├── fusion.ts            # All /api/fusion/* routes
│   │   ├── routing.ts           # All /api/routing/* routes
│   │   ├── chatbot.ts           # All /api/chatbot/* routes
│   │   └── language.ts          # All /api/language/* routes
│   │
│   ├── store/
│   │   ├── mapStore.ts          # Map viewport, PFZ zones, hazard overlay, vessels
│   │   ├── routeStore.ts        # Active route, origin/dest, reroute status
│   │   ├── chatStore.ts         # Messages, context chips, language, recording
│   │   └── healthStore.ts       # Per-agent health status from /health
│   │
│   ├── hooks/
│   │   ├── useWorldState.ts     # Polling fusion + PFZ + vessels (60s interval)
│   │   ├── useRoute.ts          # Route compute + reroute-check wrapper
│   │   ├── useVoiceInput.ts     # MediaRecorder + Web Audio API + backend ASR
│   │   └── useChatStream.ts     # Message send + tool-call parse + context chips
│   │
│   ├── i18n/
│   │   └── index.ts             # react-i18next setup with English strings
│   │
│   ├── assets/
│   ├── index.css                # Design system (Tailwind + custom components)
│   ├── main.tsx                 # React entry point
│   └── App.tsx                  # Router + health polling + layout shell
│
├── public/
│   └── favicon.svg
│
├── index.html                   # Root HTML (Google Fonts, Leaflet CSS)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── .env
```

---

## 3. Service → Backend Route Mapping

| Frontend Service | Method | Backend Route | Purpose |
|---|---|---|---|
| `api.ts` | GET | `/health` | System health + per-agent status |
| `agents.ts` | GET | `/api/agents/{name}/status` | Single agent status |
| `agents.ts` | GET | `/api/agents/pfz_synthesis/data` | PFZ candidate zones |
| `agents.ts` | GET | `/api/agents/marine_weather/data` | Weather conditions |
| `agents.ts` | GET | `/api/agents/sst_chlorophyll/data` | SST + chlorophyll grid |
| `agents.ts` | GET | `/api/agents/tide/data` | Tide predictions |
| `agents.ts` | GET | `/api/agents/cyclone_disaster/data` | Active cyclone alerts |
| `agents.ts` | GET | `/api/agents/lightning/data` | Lightning clusters |
| `agents.ts` | GET | `/api/agents/vessel_ais/data` | Vessel positions |
| `agents.ts` | POST | `/api/agents/geofence/check` | Point geofence check |
| `agents.ts` | POST | `/api/agents/geofence/check-path` | Path geofence check |
| `fusion.ts` | GET | `/api/fusion/world-state` | Fused world state grid |
| `fusion.ts` | GET | `/api/fusion/cell` | Single cell data |
| `fusion.ts` | GET | `/api/fusion/status` | Per-agent refresh timestamps |
| `routing.ts` | POST | `/api/routing/compute` | Compute hazard-aware route |
| `routing.ts` | POST | `/api/routing/reroute-check` | Check if reroute needed |
| `routing.ts` | GET | `/api/routing/status/{id}` | Route computation status |
| `routing.ts` | GET | `/api/routing/skeleton` | Basic searoute skeleton |
| `chatbot.ts` | POST | `/api/chatbot/message` | Send message, get response |
| `chatbot.ts` | GET | `/api/chatbot/sessions/{id}` | Conversation history |
| `language.ts` | POST | `/api/language/detect` | Detect language |
| `language.ts` | POST | `/api/language/translate` | Translate text |
| `language.ts` | POST | `/api/language/asr` | Speech to text |
| `language.ts` | POST | `/api/language/tts` | Text to speech |

---

## 4. Environment Variables

### `.env.example` (committed at `frontend/`)

```env
# Backend API base URL (required)
VITE_API_BASE_URL=http://localhost:8000
```

That's it — the frontend only needs the backend URL. All API keys, data sources, and external service credentials are managed by the backend's own `.env`.

### Vite Dev Proxy

The `vite.config.ts` also configures a development proxy:
- `/api/*` → `http://localhost:8000`
- `/health` → `http://localhost:8000`

This means in development, you can use relative URLs (`/api/...`) without CORS issues.

---

## 5. Setup & Run Commands (from a clean clone)

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env if your backend runs on a different port

# 4. Start the dev server
npm run dev
# → http://localhost:3000

# 5. (Optional) Production build
npm run build
npm run preview
```

### Prerequisites
- **Node.js 18+** (tested with 20.x)
- **npm 9+**
- Backend running on port 8000 (see `docs/BACKEND.md` for backend setup)

---

## 6. Known Limitations & Mock-Mode Dependencies

### Chat Features

| Feature | Depends on | Current Status |
|---|---|---|
| Tool-call bubbles (which agent was queried) | Backend chatbot returning `tool_calls` in response | Works with **rule-based fallback** — tool call metadata may be limited vs. full LLM mode |
| Voice input → transcription | `/api/language/asr` (Bhashini) | **MOCK** — returns passthrough text (no real ASR without Bhashini credentials) |
| Language auto-detection | `/api/language/detect` (Bhashini) | **MOCK** — always returns "English" without credentials |
| Multilingual responses | `/api/language/translate` (Bhashini) | **MOCK** — passthrough without credentials |

### Map Features

| Feature | Depends on | Current Status |
|---|---|---|
| PFZ zones | `/api/agents/pfz_synthesis/data` | **LIVE** — synthesized from NOAA OISST + ESA OC-CCI |
| Weather/wave overlay | `/api/fusion/world-state` | **LIVE** — from Open-Meteo |
| Vessel markers | `/api/agents/vessel_ais/data` | **MOCK** — synthetic vessels (no AISstream key) |
| Lightning clusters | `/api/agents/lightning/data` | **MOCK** — random clusters |
| Cyclone alerts | `/api/agents/cyclone_disaster/data` | **LIVE** — from GDACS feeds |
| Route computation | `/api/routing/compute` | **LIVE** — A* with hazard-cost overlay |
| Reroute checks | `/api/routing/reroute-check` | **LIVE** — checks current route against updated world state |

### UI Behavior When Backend is Unavailable

- Health status dot in navbar turns **red**
- Map still loads (OSM/OpenSeaMap tiles are external CDN)
- Chat shows error message: "The backend may be unavailable"
- Mock-mode agents show **"Using demo data"** badge on the Map page

---

## 7. Design System Summary

| Token | Value |
|---|---|
| Background | `#FAF8F4` (cream-100) |
| Accent | `#C4703F` (terracotta-500) |
| Dark sections | `#1A1A1A` (charcoal-900) |
| Headline font | Playfair Display (serif) |
| Body font | DM Sans (sans-serif) |
| Label style | Small-caps, tracked, muted color |
| Buttons | Dark rounded with hover elevation |
| Cards | White bg, 1px cream border, 12px radius |
| Chat bubbles | Dark (user) / white bordered (assistant) |
| Tool-call tags | Colored rounded-full chips per tool type |

---

## 8. Routing

| Path | Page | Description |
|---|---|---|
| `/` | Landing | Marketing/overview page |
| `/map` | MapDashboard | Full-screen interactive map + dashboard |
| `/chat` | Chat | Full-page chat interface |

The floating chat button is visible on all pages and opens a chat overlay without leaving the current page.
