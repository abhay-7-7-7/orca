import { create } from 'zustand'
import type { PFZZone, VesselPosition } from '../services/agents'
import type { WorldStateCell } from '../services/fusion'

interface MapState {
  /* Viewport */
  center: [number, number]
  zoom: number
  setView: (center: [number, number], zoom: number) => void

  /* PFZ zones */
  pfzZones: PFZZone[]
  setPFZZones: (zones: PFZZone[]) => void
  selectedPFZ: PFZZone | null
  selectPFZ: (zone: PFZZone | null) => void

  /* World state (hazard overlay) */
  worldState: WorldStateCell[]
  setWorldState: (cells: WorldStateCell[]) => void

  /* Vessels */
  vessels: VesselPosition[]
  setVessels: (vessels: VesselPosition[]) => void

  /* Navigation Mode */
  navMode: 'ai' | 'manual'
  setNavMode: (mode: 'ai' | 'manual') => void

  /* Feature setup popup shown on first AI query */
  firstQuerySetupDone: boolean
  setFirstQuerySetupDone: (done: boolean) => void
  showFeatureSetup: boolean
  setShowFeatureSetup: (show: boolean) => void

  /* Layer visibility */
  layers: {
    seamarks: boolean
    windStream: boolean
    windBarbs: boolean
    sst: boolean
    waves: boolean
    pfz: boolean
    hazards: boolean
    vessels: boolean
    eez: boolean
    route: boolean
  }
  toggleLayer: (layer: keyof MapState['layers']) => void
  setLayer: (layer: keyof MapState['layers'], enabled: boolean) => void

  /* Map click mode for routing */
  mapClickMode: 'none' | 'set_origin' | 'set_destination'
  setMapClickMode: (mode: 'none' | 'set_origin' | 'set_destination') => void

  /* Loading */
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useMapStore = create<MapState>((set) => ({
  /* Default view: Panoramic view of Indian subcontinent & Arabian Sea as in OpenSeaMap */
  center: [12.5, 76.5],
  zoom: 6,
  setView: (center, zoom) => set({ center, zoom }),

  navMode: 'ai',
  setNavMode: (mode) => set({ navMode: mode }),

  firstQuerySetupDone: false,
  setFirstQuerySetupDone: (done) => set({ firstQuerySetupDone: done }),
  showFeatureSetup: false,
  setShowFeatureSetup: (show) => set({ showFeatureSetup: show }),

  pfzZones: [],
  setPFZZones: (zones) => set({ pfzZones: zones }),
  selectedPFZ: null,
  selectPFZ: (zone) => set({ selectedPFZ: zone }),

  worldState: [],
  setWorldState: (cells) => set({ worldState: cells }),

  vessels: [],
  setVessels: (vessels) => set({ vessels: vessels }),

  /* Clean AI mode defaults: No noisy watermarked demo tiles obscuring the ocean */
  layers: {
    seamarks: true,
    windStream: false,
    windBarbs: false,
    sst: false,
    waves: false,
    pfz: true,
    hazards: true,
    vessels: true,
    eez: true,
    route: true,
  },
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),
  setLayer: (layer, enabled) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: enabled },
    })),

  mapClickMode: 'none',
  setMapClickMode: (mode) => set({ mapClickMode: mode }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}))
