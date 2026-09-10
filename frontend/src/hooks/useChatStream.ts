import { useCallback } from 'react'
import { useChatStore } from '../store/chatStore'
import { sendMessage } from '../services/chatbot'
import { detectLanguage } from '../services/language'
import type { ChatMessage } from '../services/chatbot'

export function useChatStream() {
  const {
    messages,
    sessionId,
    addMessage,
    setLoading,
    setDetectedLanguage,
    setMapTarget,
  } = useChatStore()

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      addMessage(userMessage)
      setLoading(true)

      try {
        // Detect language in background
        detectLanguage(text)
          .then((result) => {
            if (result.language && result.language !== 'English') {
              setDetectedLanguage(result.language)
            }
          })
          .catch(() => {})

        // Send to chatbot
        const response = await sendMessage(text, sessionId)

        // Build the assistant message with follow-ups attached
        const assistantMessage: ChatMessage = {
          ...response.message,
          suggested_followups: response.suggested_followups,
        }
        addMessage(assistantMessage)

        // Auto-navigate map to the first location from the response
        if (response.locations && response.locations.length > 0) {
          const loc = response.locations[0]
          const lat = Number(loc?.lat)
          const lon = Number(loc?.lon)
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            setMapTarget({
              lat,
              lon,
              zoom: Number.isFinite(Number(loc.zoom)) ? Number(loc.zoom) : 10,
              label: loc.label || undefined,
            })
          }
        }

        if (response.detected_language) {
          setDetectedLanguage(response.detected_language)
        }
      } catch (err) {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I couldn\'t process your request. The backend may be unavailable.',
          timestamp: new Date().toISOString(),
        }
        addMessage(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [sessionId, addMessage, setLoading, setDetectedLanguage, setMapTarget]
  )

  return { messages, send, isLoading: useChatStore.getState().isLoading }
}
