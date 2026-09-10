import { create } from 'zustand'
import type { ChatMessage } from '../services/chatbot'

interface ContextChip {
  id: string
  type: 'location' | 'route'
  label: string
  data: Record<string, unknown>
}

interface ChatState {
  /* Messages */
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  clearMessages: () => void

  /* Session */
  sessionId: string
  setSessionId: (id: string) => void

  /* Context chips */
  contextChips: ContextChip[]
  addContextChip: (chip: ContextChip) => void
  removeContextChip: (id: string) => void
  clearContextChips: () => void

  /* Language */
  detectedLanguage: string | null
  setDetectedLanguage: (lang: string | null) => void
  overrideLanguage: string | null
  setOverrideLanguage: (lang: string | null) => void

  /* UI */
  isOverlayOpen: boolean
  setOverlayOpen: (open: boolean) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
  isRecording: boolean
  setRecording: (recording: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], contextChips: [] }),

  sessionId: `orca-${Date.now()}`,
  setSessionId: (id) => set({ sessionId: id }),

  contextChips: [],
  addContextChip: (chip) =>
    set((state) => {
      const existing = state.contextChips.find((c) => c.id === chip.id)
      if (existing) return state
      return { contextChips: [...state.contextChips, chip] }
    }),
  removeContextChip: (id) =>
    set((state) => ({
      contextChips: state.contextChips.filter((c) => c.id !== id),
    })),
  clearContextChips: () => set({ contextChips: [] }),

  detectedLanguage: null,
  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),
  overrideLanguage: null,
  setOverrideLanguage: (lang) => set({ overrideLanguage: lang }),

  isOverlayOpen: false,
  setOverlayOpen: (open) => set({ isOverlayOpen: open }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  isRecording: false,
  setRecording: (recording) => set({ isRecording: recording }),
}))
