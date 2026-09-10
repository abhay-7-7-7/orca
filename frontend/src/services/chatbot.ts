import { apiPost, apiFetch } from './api'

/* ---------- Types ---------- */

export interface ToolCall {
  tool: string
  label: string
  icon: string
  result_summary: string
  data?: Record<string, unknown>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tool_calls?: ToolCall[]
  location?: { lat: number; lon: number; label?: string }
  route_id?: string
  timestamp: string
}

export interface ChatResponse {
  message: ChatMessage
  session_id: string
  detected_language?: string
  context?: {
    last_location?: { lat: number; lon: number; label?: string }
    last_route_id?: string
  }
}

export interface ChatSession {
  session_id: string
  messages: ChatMessage[]
  created_at: string
}

/* ---------- Backend response types (internal) ---------- */

interface BackendToolCallInfo {
  tool_name: string
  arguments?: Record<string, unknown>
  result_summary?: string
}

interface BackendChatResponse {
  reply: string
  session_id: string
  tool_calls_made?: BackendToolCallInfo[]
  data_citations?: string[]
  language_detected?: string
}

/* ---------- Adapters ---------- */

/**
 * Map a backend tool-call label to a human-friendly display icon.
 */
function toolIcon(toolName: string): string {
  const icons: Record<string, string> = {
    marine_weather: '🌊',
    pfz_synthesis: '🐟',
    cyclone_disaster: '🌀',
    lightning: '⚡',
    vessel_ais: '🚢',
    geofence: '🛡️',
    sst_chlorophyll: '🌡️',
    tide: '🌊',
    routing: '🗺️',
  }
  return icons[toolName] || '🔧'
}

/**
 * Transform the backend ChatResponse into the shape expected by frontend components.
 * Backend: { reply, session_id, tool_calls_made, data_citations, language_detected }
 * Frontend: { message: ChatMessage, session_id, detected_language, context }
 */
function adaptChatResponse(backend: BackendChatResponse): ChatResponse {
  const toolCalls: ToolCall[] = (backend.tool_calls_made || []).map((tc) => ({
    tool: tc.tool_name,
    label: tc.tool_name.replace(/_/g, ' '),
    icon: toolIcon(tc.tool_name),
    result_summary: tc.result_summary || '',
    data: tc.arguments,
  }))

  const message: ChatMessage = {
    role: 'assistant',
    content: backend.reply,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    timestamp: new Date().toISOString(),
  }

  return {
    message,
    session_id: backend.session_id,
    detected_language: backend.language_detected,
    // Context extraction from response is not provided by backend —
    // context chips are handled by the frontend's useChatStream hook
    // based on the message content
  }
}

/* ---------- API Calls ---------- */

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<ChatResponse> {
  const raw = await apiPost<BackendChatResponse>('/api/chatbot/message', {
    message,
    session_id: sessionId,
  })
  return adaptChatResponse(raw)
}

export async function getSession(sessionId: string): Promise<ChatSession> {
  return apiFetch(`/api/chatbot/sessions/${sessionId}`)
}
