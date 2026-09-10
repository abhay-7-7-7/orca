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

/* ---------- API Calls ---------- */

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<ChatResponse> {
  return apiPost('/api/chatbot/message', {
    message,
    session_id: sessionId,
  })
}

export async function getSession(sessionId: string): Promise<ChatSession> {
  return apiFetch(`/api/chatbot/sessions/${sessionId}`)
}
