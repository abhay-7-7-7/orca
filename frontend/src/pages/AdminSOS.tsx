import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertOctagon,
  RefreshCw,
  Volume2,
  VolumeX,
  Radio,
  Plus,
  Shield,
  Clock,
  Sparkles,
  LifeBuoy,
} from 'lucide-react'
import { useSOSStore } from '../store/sosStore'
import SOSStatsBar from '../components/admin/SOSStatsBar'
import SOSIncidentMap from '../components/admin/SOSIncidentMap'
import SOSIncidentList from '../components/admin/SOSIncidentList'
import SOSIncidentDetail from '../components/admin/SOSIncidentDetail'
import SOSTriggerModal from '../components/admin/SOSTriggerModal'

export default function AdminSOS() {
  const {
    signals,
    rescueAssets,
    selectedSignalId,
    loading,
    filterStatus,
    filterSeverity,
    searchQuery,
    soundEnabled,
    isSimulating,
    lastRefreshed,
    getStats,
    getSelectedSignal,
    loadSignals,
    loadAssets,
    setSelectedSignalId,
    setFilterStatus,
    setFilterSeverity,
    setSearchQuery,
    toggleSound,
    triggerSimulation,
    createDistress,
    updateStatus,
  } = useSOSStore()

  const [modalOpen, setModalOpen] = useState(false)
  const selectedSignal = getSelectedSignal()
  const stats = getStats()

  // Initial load and periodic refresh
  useEffect(() => {
    loadSignals()
    loadAssets()
    const interval = setInterval(() => {
      loadSignals()
    }, 15000)
    return () => clearInterval(interval)
  }, [loadSignals, loadAssets])

  return (
    <div className="min-h-screen pt-16 bg-cream-100 flex flex-col font-sans">
      {/* Top Authority Header & Command Controls */}
      <header className="bg-charcoal-900 text-cream-100 border-b border-white/10 px-4 lg:px-8 py-3.5 sticky top-16 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg text-cream-50 leading-tight">
                  Maritime Distress & SAR Command Console
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  MRCC Live Stream
                </span>
              </div>
              <p className="text-xs text-cream-400 font-sans">
                Indian Coast Guard & Maritime Rescue Coordination Centre • Coastal Safety Grid
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Audio chime toggle */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Emergency Chime On' : 'Emergency Chime Muted'}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                soundEnabled
                  ? 'bg-charcoal-800 text-cream-200 border-charcoal-700 hover:text-white'
                  : 'bg-charcoal-800/50 text-charcoal-500 border-charcoal-800 hover:text-cream-300'
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="text-[11px] hidden sm:inline">
                {soundEnabled ? 'Alarm Active' : 'Muted'}
              </span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => loadSignals()}
              disabled={loading}
              className="p-2 rounded-lg bg-charcoal-800 text-cream-300 border border-charcoal-700 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh Incident Feed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Simulate / Broadcast SOS Button */}
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs font-sans shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Simulate SOS Distress</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-5 flex flex-col gap-4">
        {/* KPI Stats Bar */}
        <SOSStatsBar
          stats={stats}
          activeFilter={filterStatus}
          onFilterClick={(status) => setFilterStatus(status)}
        />

        {/* Tactical Command Split View (Queue + Leaflet Map + Dossier) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px]">
          {/* Column 1: Incident Queue (3 cols on desktop) */}
          <div className="lg:col-span-3 h-[600px] lg:h-auto min-h-[480px]">
            <SOSIncidentList
              signals={signals}
              selectedId={selectedSignalId}
              onSelect={(id) => setSelectedSignalId(id)}
              activeStatusTab={filterStatus}
              onTabChange={(tab) => setFilterStatus(tab)}
              activeSeverity={filterSeverity}
              onSeverityChange={(sev) => setFilterSeverity(sev)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
            />
          </div>

          {/* Column 2: Geospatial Tactical Leaflet Map (5 cols on desktop) */}
          <div className="lg:col-span-5 h-[480px] lg:h-auto min-h-[480px] relative isolate z-0">
            <SOSIncidentMap
              signals={signals}
              assets={rescueAssets}
              selectedSignal={selectedSignal}
              onSelectSignal={(id) => setSelectedSignalId(id)}
            />
          </div>

          {/* Column 3: Incident Dossier & SAR Dispatch Actions (4 cols on desktop) */}
          <div className="lg:col-span-4 h-[600px] lg:h-auto min-h-[480px]">
            <SOSIncidentDetail
              signal={selectedSignal}
              assets={rescueAssets}
              onUpdateStatus={updateStatus}
              onFocusMap={(lat, lon) => {
                if (selectedSignal) {
                  setSelectedSignalId(selectedSignal.id)
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* Simulation / Trigger Modal */}
      <SOSTriggerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createDistress}
        onQuickSimulate={triggerSimulation}
        isSimulating={isSimulating}
      />
    </div>
  )
}
