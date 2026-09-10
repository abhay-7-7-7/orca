import { useCallback, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { speechToText } from '../services/language'

export function useVoiceInput() {
  const { setRecording, setDetectedLanguage } = useChatStore()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up audio analyser for waveform visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      audioContextRef.current = audioContext

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg',
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      throw err
    }
  }, [setRecording])

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        })

        // Clean up
        mediaRecorder.stream.getTracks().forEach((t) => t.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        analyserRef.current = null
        audioContextRef.current = null
        setRecording(false)

        try {
          const result = await speechToText(blob)
          setDetectedLanguage(result.language)
          resolve(result.text)
        } catch (err) {
          // If ASR fails, return empty string
          console.error('ASR failed:', err)
          resolve('')
        }
      }

      mediaRecorder.stop()
    })
  }, [setRecording, setDetectedLanguage])

  const getAnalyserData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    return data
  }, [])

  return {
    startRecording,
    stopRecording,
    getAnalyserData,
  }
}
