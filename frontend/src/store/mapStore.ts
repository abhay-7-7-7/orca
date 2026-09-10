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

  /* Layer visibility */
  layers: {
    seamarks: boolean
    wind: boolean
    sst: boolean
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
  /* Default view: Indian west coast, centered on Kerala */
  center: [9.85, 75.85],
  zoom: 8,
  setView: (center, zoom) => set({ center, zoom }),

  pfzZones: [],
  setPFZZones: (zones) => set({ pfzZones: zones }),
  selectedPFZ: null,
  selectPFZ: (zone) => set({ selectedPFZ: zone }),

  worldState: [],
  setWorldState: (cells) => set({ worldState: cells }),

  vessels: [],
  setVessels: (vessels) => set({ vessels: vessels }),

  layers: {
    seamarks: true,
    wind: true,
    sst: true,
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
