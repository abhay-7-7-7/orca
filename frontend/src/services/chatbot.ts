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
  suggested_followups?: string[]
  location?: { lat: number; lon: number; label?: string }
  route_id?: string
  timestamp: string
}

export interface ChatResponse {
  message: ChatMessage
  session_id: string
  detected_language?: string
  suggested_followups?: string[]
  locations?: { lat: number; lon: number; label?: string; zoom?: number }[]
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
  locations?: { lat: number; lon: number; label?: string; zoom?: number }[]
  suggested_followups?: string[]
}

/* ---------- Adapters ---------- */

/**
 * Transform the backend ChatResponse into the shape expected by frontend components.
 */
function adaptChatResponse(backend: BackendChatResponse): ChatResponse {
  const toolCalls: ToolCall[] = (backend.tool_calls_made || []).map((tc) => ({
    tool: tc.tool_name,
    label: tc.tool_name.replace(/_/g, ' '),
    icon: '',
    result_summary: tc.result_summary || '',
    data: tc.arguments,
  }))

  const message: ChatMessage = {
    role: 'assistant',
    content: backend.reply,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    suggested_followups: backend.suggested_followups,
    timestamp: new Date().toISOString(),
  }

  return {
    message,
    session_id: backend.session_id,
    detected_language: backend.language_detected,
    locations: backend.locations,
    suggested_followups: backend.suggested_followups,
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
