import { create } from 'zustand'
import {
  DistressSignal,
  RescueAsset,
  DistressCreatePayload,
  DistressStatus,
  SOSStats,
} from '../types/sos'
import {
  fetchDistressSignals,
  fetchRescueAssets,
  triggerDistressSignal,
  updateDistressStatus,
  simulateDistressSignal,
} from '../services/sos'

function playDistressChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now) // A5
    osc1.frequency.setValueAtTime(1174.66, now + 0.15) // D6

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(440, now)
    osc2.frequency.setValueAtTime(587.33, now + 0.15)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.5)
    osc2.stop(now + 0.5)
  } catch (err) {
    // Audio may be blocked by autoplay policies
  }
}

interface SOSStoreState {
  signals: DistressSignal[]
  selectedSignalId: string | null
  rescueAssets: RescueAsset[]
  loading: boolean
  error: string | null
  filterStatus: string
  filterSeverity: string
  searchQuery: string
  soundEnabled: boolean
  isSimulating: boolean
  lastRefreshed: string | null

  // Computed / Helpers
  getStats: () => SOSStats
  getSelectedSignal: () => DistressSignal | null

  // Actions
  loadSignals: () => Promise<void>
  loadAssets: () => Promise<void>
  setSelectedSignalId: (id: string | null) => void
  setFilterStatus: (status: string) => void
  setFilterSeverity: (severity: string) => void
  setSearchQuery: (q: string) => void
  toggleSound: () => void
  triggerSimulation: () => Promise<DistressSignal | null>
  createDistress: (payload: DistressCreatePayload) => Promise<DistressSignal | null>
  updateStatus: (
    signalId: string,
    newStatus: DistressStatus,
    note?: string,
    assignedAssetId?: string
  ) => Promise<void>
}

export const useSOSStore = create<SOSStoreState>((set, get) => ({
  signals: [],
  selectedSignalId: null,
  rescueAssets: [],
  loading: false,
  error: null,
  filterStatus: 'all',
  filterSeverity: 'all',
  searchQuery: '',
  soundEnabled: true,
  isSimulating: false,
  lastRefreshed: null,

  getStats: () => {
    const signals = get().signals
    const active = signals.filter(
      (s) => s.status === 'active' || s.status === 'acknowledged'
    )
    const dispatched = signals.filter(
      (s) => s.status === 'dispatched' || s.status === 'on_scene'
    )
    const resolved = signals.filter((s) => s.status === 'resolved')
    const livesAtRisk = active.reduce((sum, s) => sum + (s.crew_count || 0), 0)
    const readyAssets = get().rescueAssets.filter((a) => a.status === 'ready').length

    return {
      total: signals.length,
      activeCount: active.length,
      dispatchedCount: dispatched.length,
      resolvedCount: resolved.length,
      livesAtRisk,
      readyAssetsCount: readyAssets || 5,
    }
  },

  getSelectedSignal: () => {
    const { signals, selectedSignalId } = get()
    if (!selectedSignalId) return signals[0] || null
    return signals.find((s) => s.id === selectedSignalId) || signals[0] || null
  },

  loadSignals: async () => {
    set({ loading: true, error: null })
    try {
      const { filterStatus, filterSeverity } = get()
      const data = await fetchDistressSignals(filterStatus, filterSeverity)
      set({
        signals: data,
        loading: false,
        lastRefreshed: new Date().toLocaleTimeString(),
      })
      if (!get().selectedSignalId && data.length > 0) {
        set({ selectedSignalId: data[0].id })
      }
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to load distress signals' })
    }
  },

  loadAssets: async () => {
    try {
      const assets = await fetchRescueAssets()
      set({ rescueAssets: assets })
    } catch (err) {
      console.warn('Could not load SAR assets:', err)
    }
  },

  setSelectedSignalId: (id: string | null) => set({ selectedSignalId: id }),
  setFilterStatus: (filterStatus: string) => set({ filterStatus }),
  setFilterSeverity: (filterSeverity: string) => set({ filterSeverity }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  triggerSimulation: async () => {
    set({ isSimulating: true })
    try {
      const newSignal = await simulateDistressSignal()
      if (get().soundEnabled) {
        playDistressChime()
      }
      set((state) => ({
        signals: [newSignal, ...state.signals.filter((s) => s.id !== newSignal.id)],
        selectedSignalId: newSignal.id,
        isSimulating: false,
      }))
      return newSignal
    } catch (err) {
      set({ isSimulating: false })
      return null
    }
  },

  createDistress: async (payload: DistressCreatePayload) => {
    set({ loading: true })
    try {
      const newSignal = await triggerDistressSignal(payload)
      if (get().soundEnabled) {
        playDistressChime()
      }
      set((state) => ({
        signals: [newSignal, ...state.signals.filter((s) => s.id !== newSignal.id)],
        selectedSignalId: newSignal.id,
        loading: false,
      }))
      return newSignal
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to trigger distress' })
      return null
    }
  },

  updateStatus: async (
    signalId: string,
    newStatus: DistressStatus,
    note?: string,
    assignedAssetId?: string
  ) => {
    try {
      const updated = await updateDistressStatus(signalId, {
        status: newStatus,
        note,
        assigned_asset_id: assignedAssetId,
      })
      set((state) => ({
        signals: state.signals.map((s) => (s.id === signalId ? updated : s)),
      }))
    } catch (err) {
      console.error('Update status failed:', err)
    }
  },
}))
