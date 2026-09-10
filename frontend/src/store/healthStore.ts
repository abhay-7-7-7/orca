import { create } from 'zustand'
import { apiFetch } from '../services/api'

interface AgentHealth {
  name: string
  status: 'live' | 'mock' | 'error' | 'degraded'
  message?: string
}

interface HealthState {
  agents: AgentHealth[]
  overallStatus: 'healthy' | 'degraded' | 'error'
  lastCheck: string | null
  fetchHealth: () => Promise<void>
}

export const useHealthStore = create<HealthState>((set) => ({
  agents: [],
  overallStatus: 'healthy',
  lastCheck: null,

  fetchHealth: async () => {
    try {
      const data = await apiFetch<{
        status: string
        agents: Record<string, { status: string; message?: string }>
      }>('/health')

      const agents: AgentHealth[] = Object.entries(data.agents || {}).map(
        ([name, info]) => ({
          name,
          status: info.status as AgentHealth['status'],
          message: info.message,
        })
      )

      const hasMock = agents.some((a) => a.status === 'mock')
      const hasError = agents.some((a) => a.status === 'error')

      set({
        agents,
        overallStatus: hasError ? 'error' : hasMock ? 'degraded' : 'healthy',
        lastCheck: new Date().toISOString(),
      })
    } catch {
      set({
        overallStatus: 'error',
        lastCheck: new Date().toISOString(),
      })
    }
  },
}))
