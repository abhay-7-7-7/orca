# ORCA Backend — Documentation

Complete reference for setting up, running, and working with the ORCA backend.

## 1. Overview

The ORCA backend is a Python/FastAPI server that powers a marine decision-support platform. It runs **8 independent data agents** (SST/Chlorophyll, Marine Weather, Cyclone/Disaster, Lightning, Tide, Vessel/AIS, Geofence, PFZ Synthesis) that each fetch data from verified free/live sources. These agents feed into a **Fusion Layer** (in-memory world-state store) that the **Routing Engine** (A* with hazard-cost overlay) and **Chatbot** (tool-calling LLM) both read from. A **Bhashini Language Layer** provides multilingual support across 22 Indian languages.

Architecture: `User → Language Layer → Chatbot → Fusion Layer ← 8 Agents`. The Routing Engine reads from the same Fusion Layer the map uses, so the chatbot can explain *why* a route was chosen.

---

## 2. External API Reference

| Agent | Provider | Signup URL | Tier | Env Var(s) | Rate Limit Notes | Status |
|---|---|---|---|---|---|---|
| SST/Chlorophyll | NOAA ERDDAP | None needed | Public domain | — | No formal limit; be reasonable | **LIVE** |
| Marine Weather | Open-Meteo | None needed | Free (non-commercial) | — | 10,000 req/day | **LIVE** |
| Cyclone/Disaster | GDACS | None needed | Free public feeds | — | Reasonable use | **LIVE** |
| Tide | Harmonic model | None needed | Self-computed | — | N/A | **LIVE** |
| Geofence (EEZ) | MarineRegions | [marineregions.org](https://marineregions.org) | Free download | — | Static shapefile | **LIVE** |
| Geofence (MPA) | ProtectedPlanet | [protectedplanet.net](https://protectedplanet.net/en/api-token) | Free API token | `WDPA_API_TOKEN` | — | **MOCK** (no token) |
| Lightning | Blitzortung | Community network | Free | — | Must use approved wrapper | **MOCK** |
| Vessel/AIS | AISstream.io | [aisstream.io](https://aisstream.io) | Free API key | `AISSTREAM_API_KEY` | WebSocket, unlimited | **MOCK** (no key) |
| Vessel (fishing) | Global Fishing Watch | [globalfishingwatch.org](https://globalfishingwatch.org/our-apis) | Free (non-commercial) | `GFW_API_TOKEN` | Non-commercial only | **MOCK** (no token) |
| Language | Bhashini/ULCA | [bhashini.gov.in](https://bhashini.gov.in) | Free PoC tier | `BHASHINI_USER_ID`, `BHASHINI_API_KEY` | PoC-level throughput | **MOCK** (no creds) |
| Chatbot LLM | Anthropic | [anthropic.com](https://console.anthropic.com) | Paid | `LLM_API_KEY` | Per-plan | **RULE-BASED FALLBACK** |
| Bathymetry | GEBCO WMS | None needed | Free with citation | — | WMS tile server | **SYNTHETIC** |

---

## 3. `.env.example`

Committed at the repo root. See [`.env.example`](file:///c:/Users/Sreehari%20S%20J/Desktop/orca/orca/.env.example) for the complete file with all variable names, grouped by module, with comments on which are optional (mock-mode fallback exists) vs. required.

To use: `cp .env.example .env` and fill in your API keys.

---

## 4. Setup & Run Instructions

### Prerequisites
- **Python 3.11+** (tested with 3.13)
- **pip** (latest)
- No Docker required — plain virtualenv only

### Steps (from a clean clone)

```bash
# 1. Clone the repo
git clone https://github.com/abhay-7-7-7/orca.git
cd orca

# 2. Create and activate a virtualenv
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your API keys (optional — mock mode works without them)

# 5. Start the server
uvicorn backend.api.main:app --reload --port 8000

# 6. Verify it's running
curl http://localhost:8000/health
```

The server listens on **port 8000** by default. The `/health` endpoint returns per-agent status so you can immediately see what's live vs. mocked.

---

## 5. Internal API Reference

### Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | System health with per-agent status |

```bash
curl http://localhost:8000/health
```

---

### Agents

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/agents/{name}/status` | Single agent status |
| POST | `/api/agents/geofence/check` | Point geofence check |
| POST | `/api/agents/geofence/check-path` | Path geofence check |
| GET | `/api/agents/sst_chlorophyll/data` | SST + Chlorophyll grid |
| GET | `/api/agents/pfz_synthesis/data` | PFZ candidate zones |
| GET | `/api/agents/marine_weather/data` | Weather conditions |
| GET | `/api/agents/tide/data` | Tide predictions |
| GET | `/api/agents/cyclone_disaster/data` | Active alerts |
| GET | `/api/agents/lightning/data` | Lightning clusters |
| GET | `/api/agents/vessel_ais/data` | Vessel positions |

**Examples:**

```bash
# Geofence check (Kochi)
curl -X POST http://localhost:8000/api/agents/geofence/check \
  -H "Content-Type: application/json" \
  -d '{"point": {"lat": 9.93, "lon": 76.27}}'

# PFZ zones near Kerala
curl "http://localhost:8000/api/agents/pfz_synthesis/data?min_lat=8&max_lat=13&min_lon=74&max_lon=78"

# Weather at a point
curl "http://localhost:8000/api/agents/marine_weather/data?lat=10&lon=76"

# Tide at Kochi
curl "http://localhost:8000/api/agents/tide/data?lat=9.93&lon=76.27"
```

---

### Fusion (World State)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/fusion/world-state` | Query fused world state (grid) |
| GET | `/api/fusion/cell` | Single cell fused data |
| GET | `/api/fusion/status` | Per-agent refresh timestamps |

```bash
# World state for Kerala coast
curl "http://localhost:8000/api/fusion/world-state?min_lat=8&max_lat=13&min_lon=74&max_lon=78&resolution=0.5"

# Single cell
curl "http://localhost:8000/api/fusion/cell?lat=10&lon=76"
```

---

### Routing

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/routing/compute` | Compute hazard-aware route |
| POST | `/api/routing/reroute-check` | Check if route needs rerouting |
| GET | `/api/routing/status/{id}` | Route status |
| GET | `/api/routing/skeleton` | Basic searoute skeleton |

```bash
# Compute route: Kochi → offshore PFZ
curl -X POST http://localhost:8000/api/routing/compute \
  -H "Content-Type: application/json" \
  -d '{"origin": {"lat": 9.93, "lon": 76.27}, "destination": {"lat": 10.5, "lon": 75.5}}'

# Skeleton route (no hazard cost)
curl "http://localhost:8000/api/routing/skeleton?origin_lat=9.93&origin_lon=76.27&dest_lat=10.5&dest_lon=75.5"
```

---

### Chatbot

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chatbot/message` | Send message, get response |
| GET | `/api/chatbot/sessions/{id}` | Conversation history |

```bash
# Ask the chatbot
curl -X POST http://localhost:8000/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Where should I fish today near Kochi?", "session_id": "demo"}'
```

---

### Language

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/language/detect` | Detect language |
| POST | `/api/language/translate` | Translate text |
| POST | `/api/language/asr` | Speech to text |
| POST | `/api/language/tts` | Text to speech |

```bash
# Detect language
curl -X POST "http://localhost:8000/api/language/detect?text=मछली कहाँ है"
```

---

## 6. Architecture Recap

**How a request flows through the codebase:**

1. **User sends a query** (text or voice, any Indian language)
2. **`language/bhashini.py`** detects the language and translates to English
3. **`chatbot/engine.py`** receives the English query, decides which tools to call
4. **`chatbot/tools.py`** wraps fusion-layer functions — the chatbot calls these, never raw APIs
5. **`fusion/world_state.py`** returns the current world state (pre-populated by `fusion/scheduler.py`)
6. **`agents/*`** — each agent independently fetches from its external source at its own cadence
7. **`routing/astar.py`** uses the `routing/hazard_grid.py` (built from fusion data) for path computation
8. Response is translated back to the user's language and returned

```
User → Language → Chatbot → Tools → Fusion Store → [Agents → External APIs]
                                   → Routing (A*) → Hazard Grid ←─┘
```

The Fusion Layer is the **only** thing that knows about all agents. The Routing and Chatbot layers read the same world state, so the chatbot can always explain why a route was chosen.

---

## 7. Known Limitations / Mock-Mode Notes

| Agent | Status | What mock data looks like | What real data adds |
|---|---|---|---|
| Vessel/AIS | **MOCK** | 15-30 synthetic vessels near Kerala | Real AIS positions via WebSocket stream |
| Lightning | **MOCK** | 2-5 random clusters in Indian Ocean | Seconds-level strike detection via Blitzortung |
| Language (Bhashini) | **MOCK** | Passthrough (text unchanged) | Real ASR/MT/TTS for 22 Indian languages |
| Chatbot LLM | **RULE-BASED** | Pattern-matching responder | Full tool-calling Claude with multi-turn context |
| MPA data | **DEFAULT** | 4 hardcoded Indian MPAs | Full WDPA database via API |
| Bathymetry | **SYNTHETIC** | Distance-from-coast depth model | GEBCO GeoTIFF real depth data |

**Free-tier quota risks during demo:**
- **Open-Meteo**: 10,000 requests/day — unlikely to hit during a demo
- **GDACS**: no formal rate limit
- **ERDDAP**: public, but large bbox queries can be slow (>5s)

---

## 8. Testing

### Run the full test suite
```bash
cd <project_root>
python -m pytest backend/tests/ -v --tb=short
```

All tests run in **mock mode** — no external API calls, deterministic, safe to run repeatedly.

### Test groups
```bash
# Agent tests only
python -m pytest backend/tests/agents/ -v

# Fusion tests
python -m pytest backend/tests/fusion/ -v

# Routing tests
python -m pytest backend/tests/routing/ -v
```

### Manual smoke test (before a live demo)
```bash
# 1. Start the server
uvicorn backend.api.main:app --reload --port 8000

# 2. Check health
curl http://localhost:8000/health

# 3. Check PFZ synthesis
curl "http://localhost:8000/api/agents/pfz_synthesis/data?min_lat=8&max_lat=13&min_lon=74&max_lon=78"

# 4. Compute a route
curl -X POST http://localhost:8000/api/routing/compute \
  -H "Content-Type: application/json" \
  -d '{"origin": {"lat": 9.93, "lon": 76.27}, "destination": {"lat": 10.5, "lon": 75.5}}'

# 5. Ask the chatbot
curl -X POST http://localhost:8000/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Is it safe to go fishing today?", "session_id": "smoke-test"}'

# 6. Check world state
curl "http://localhost:8000/api/fusion/world-state?min_lat=9&max_lat=11&min_lon=75&max_lon=77&resolution=0.5"
```
