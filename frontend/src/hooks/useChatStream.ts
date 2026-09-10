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
    addContextChip,
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

        // Add assistant message
        addMessage(response.message)

        // Update context chips from response
        if (response.context?.last_location) {
          addContextChip({
            id: 'location',
            type: 'location',
            label: `📍 ${response.context.last_location.label || `${response.context.last_location.lat.toFixed(2)}, ${response.context.last_location.lon.toFixed(2)}`}`,
            data: response.context.last_location as unknown as Record<string, unknown>,
          })
        }

        if (response.context?.last_route_id) {
          addContextChip({
            id: 'route',
            type: 'route',
            label: `🗺️ Route: ${response.context.last_route_id}`,
            data: { route_id: response.context.last_route_id },
          })
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
    [sessionId, addMessage, setLoading, setDetectedLanguage, addContextChip]
  )

  return { messages, send, isLoading: useChatStore.getState().isLoading }
}
