import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      /* Navbar */
      nav: {
        liveMap: 'Live Map',
        chat: 'Chat',
        about: 'About',
        openMap: 'Open Live Map',
      },
      /* Hero */
      hero: {
        headline: 'Know where the fish are.\nKnow the way back.',
        subheadline: 'Real-time marine intelligence — PFZ discovery, hazard-aware routing, and multilingual voice AI for Indian fishermen.',
        cta: 'Open Live Map',
      },
      /* Features */
      features: {
        sectionLabel: 'How it works',
        sectionTitle: 'From open water to safe return',
        pfz: {
          title: 'Find the fish',
          desc: 'Live satellite data fused into actionable fishing zones',
        },
        routing: {
          title: 'Chart the safest course',
          desc: 'Hazard-aware A* routing that respects every boundary',
        },
        dashboard: {
          title: 'Stay safe at sea',
          desc: 'Live rerouting the moment conditions change',
        },
      },
      /* Pillars */
      pillars: {
        explainable: 'Explainable',
        explainableDesc: 'Every route and zone recommendation cites the live numbers behind it — SST gradients, wave heights, wind speeds. No black-box answers.',
        multilingual: 'Multilingual',
        multilingualDesc: 'Powered by Bhashini. Speak or type in any of 22 Indian languages — Hindi, Tamil, Malayalam, Bengali, and more.',
        live: 'Live',
        liveDesc: 'Real-time hazard fusion from satellites, weather models, and disaster feeds. Not a static bulletin — a living picture of the ocean.',
        safety: 'Safety-first',
        safetyDesc: 'EEZ and MPA boundaries are hard no-go zones in routing, not soft preferences. Your safety is non-negotiable.',
      },
      /* Chat */
      chat: {
        placeholder: 'Ask about fishing zones, weather, routes...',
        send: 'Send',
        recording: 'Listening...',
        detected: 'Detected',
      },
      /* Map */
      map: {
        computeRoute: 'Compute Route',
        computing: 'Computing...',
        layers: 'Layers',
        pfzZones: 'PFZ Zones',
        hazards: 'Hazard Overlay',
        vessels: 'Vessels',
        eez: 'EEZ Boundaries',
      },
      /* Dashboard */
      dashboard: {
        routeInfo: 'Route Information',
        eta: 'Estimated Time',
        distance: 'Distance',
        hazardLevel: 'Hazard Level',
        reroute: 'Conditions have changed — rerouting recommended',
      },
      /* Status */
      status: {
        live: 'Live',
        mock: 'Using demo data',
        error: 'Unavailable',
        degraded: 'Some agents using demo data',
      },
      /* Footer */
      footer: {
        tagline: 'Marine EcOsystem Reasoning with Collaborative Agents',
        team: 'Built for SIH 2026 · ISRO/Dept. of Space',
      },
    },
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
