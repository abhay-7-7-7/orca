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

/**
 * Map backend AgentStatus enum values to frontend display values.
 * Backend: "ok" | "mock" | "unavailable" | "error"
 * Frontend: "live" | "mock" | "error" | "degraded"
 */
function mapAgentStatus(backendStatus: string): AgentHealth['status'] {
  switch (backendStatus) {
    case 'ok':
      return 'live'
    case 'mock':
      return 'mock'
    case 'unavailable':
      return 'error'
    case 'error':
      return 'error'
    default:
      return 'degraded'
  }
}

export const useHealthStore = create<HealthState>((set) => ({
  agents: [],
  overallStatus: 'healthy',
  lastCheck: null,

  fetchHealth: async () => {
    try {
      // Backend returns { status, agents: AgentHealthInfo[], timestamp, version }
      // where agents is an ARRAY of { name, status, last_fetch?, error?, is_mock? }
      const data = await apiFetch<{
        status: string
        agents: Array<{ name: string; status: string; error?: string; is_mock?: boolean }>
      }>('/health')

      const agents: AgentHealth[] = (data.agents || []).map((agent) => ({
        name: agent.name,
        status: mapAgentStatus(agent.status),
        message: agent.error,
      }))

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
