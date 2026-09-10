import { useCallback, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../store/chatStore'
import { speechToText } from '../services/language'

const BCP47_LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  or: 'or-IN',
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string; message?: string }) => void) | null
  onresult: ((event: {
    resultIndex: number
    results: {
      length: number
      [index: number]: {
        isFinal: boolean
        length: number
        [index: number]: { transcript: string; confidence: number }
      }
    }
  }) => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

/**
 * Downsample Float32 audio buffer from input sample rate to 16,000 Hz.
 */
function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000
): Float32Array {
  if (outputSampleRate >= inputSampleRate) {
    return buffer
  }
  const ratio = inputSampleRate / outputSampleRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

/**
 * Encode raw Float32 audio samples into standard 16-bit Mono WAV format.
 */
function encodeWAV(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // Audio format 1 = PCM
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true) // Sample rate = 16000
  view.setUint32(28, sampleRate * 2, true) // Byte rate (16000 * 1 * 16/8)
  view.setUint16(32, 2, true) // Block align (1 * 16/8)
  view.setUint16(34, 16, true) // Bits per sample = 16
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([view], { type: 'audio/wav' })
}

export interface UseVoiceInputOptions {
  onTranscriptChange?: (transcript: string) => void
}

export function useVoiceInput(options?: UseVoiceInputOptions) {
  const { i18n } = useTranslation()
  const { isRecording, setRecording, setDetectedLanguage } = useChatStore()

  const [interimTranscript, setInterimTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const pcmChunksRef = useRef<Float32Array[]>([])
  const sampleRateRef = useRef<number>(44100)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const speechTranscriptRef = useRef<string>('')
  const onTranscriptChangeRef = useRef(options?.onTranscriptChange)

  useEffect(() => {
    onTranscriptChangeRef.current = options?.onTranscriptChange
  }, [options?.onTranscriptChange])

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect()
      } catch {}
      processorRef.current = null
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect()
      } catch {}
      analyserRef.current = null
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch {}
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    pcmChunksRef.current = []
  }, [])

  const startRecording = useCallback(async (): Promise<void> => {
    setVoiceError(null)
    setInterimTranscript('')
    speechTranscriptRef.current = ''
    pcmChunksRef.current = []

    // 1. Determine language code for speech recognition
    const currentLang = i18n.language ? i18n.language.split('-')[0] : 'en'
    const bcp47 = BCP47_LANG_MAP[currentLang] || 'en-IN'

    // 2. Initialize Web Speech API if supported
    const SpeechConstructor = getSpeechRecognitionConstructor()
    if (SpeechConstructor) {
      try {
        const recognition = new SpeechConstructor()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = bcp47

        recognition.onresult = (event) => {
          let fullTranscript = ''
          let interim = ''
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i]
            if (item.isFinal) {
              fullTranscript += item[0].transcript + ' '
            } else {
              interim += item[0].transcript
            }
          }
          const currentCombined = (fullTranscript + interim).trim()
          speechTranscriptRef.current = (fullTranscript || interim).trim()
          setInterimTranscript(currentCombined)
          if (onTranscriptChangeRef.current && currentCombined) {
            onTranscriptChangeRef.current(currentCombined)
          }
        }

        recognition.onerror = (event) => {
          if (event.error === 'not-allowed') {
            setVoiceError('Microphone permission denied. Please allow microphone access.')
          } else if (event.error !== 'no-speech') {
            console.warn('SpeechRecognition notice:', event.error)
          }
        }

        recognition.start()
        recognitionRef.current = recognition
      } catch (e) {
        console.warn('Could not initialize SpeechRecognition:', e)
      }
    }

    // 3. Initialize MediaStream & Web Audio API (for visualizer + 16kHz WAV fallback)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext
      sampleRateRef.current = audioContext.sampleRate || 44100

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // ScriptProcessor to capture PCM samples for WAV encoding
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        pcmChunksRef.current.push(new Float32Array(inputData))
      }
      source.connect(processor)
      processor.connect(audioContext.destination)
      processorRef.current = processor

      setRecording(true)
    } catch (err: unknown) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
        recognitionRef.current = null
      }
      cleanupAudio()
      setRecording(false)
      const errMsg = err instanceof Error && err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow access.'
        : 'Failed to access microphone.'
      setVoiceError(errMsg)
      throw new Error(errMsg)
    }
  }, [i18n.language, setRecording, cleanupAudio])

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      // 1. Stop SpeechRecognition if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }

      // Collect captured PCM data before cleanup
      const capturedChunks = [...pcmChunksRef.current]
      const inputRate = sampleRateRef.current
      const speechApiText = speechTranscriptRef.current.trim()

      cleanupAudio()
      setRecording(false)
      setInterimTranscript('')

      // 2. If Web Speech API captured text, use it immediately
      if (speechApiText) {
        setDetectedLanguage(i18n.language || 'en')
        resolve(speechApiText)
        return
      }

      // 3. Fallback: Encode PCM to 16kHz WAV and send to backend ASR
      if (capturedChunks.length === 0) {
        resolve('')
        return
      }

      // Calculate total PCM length and combine
      const totalLen = capturedChunks.reduce((acc, c) => acc + c.length, 0)
      const merged = new Float32Array(totalLen)
      let offset = 0
      for (const chunk of capturedChunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }

      // Downsample to 16,000 Hz and encode to WAV
      const downsampled = downsampleBuffer(merged, inputRate, 16000)
      const wavBlob = encodeWAV(downsampled, 16000)

      const currentLang = i18n.language ? i18n.language.split('-')[0] : 'en'

      speechToText(wavBlob, currentLang)
        .then((result) => {
          if (result.text) {
            setDetectedLanguage(result.language || currentLang)
            resolve(result.text)
          } else {
            resolve('')
          }
        })
        .catch((err) => {
          console.error('ASR fallback failed:', err)
          resolve('')
        })
    })
  }, [cleanupAudio, setRecording, setDetectedLanguage, i18n.language])

  const cancelRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {}
      recognitionRef.current = null
    }
    cleanupAudio()
    setRecording(false)
    setInterimTranscript('')
    setVoiceError(null)
  }, [cleanupAudio, setRecording])

  const getAnalyserData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    return data
  }, [])

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    getAnalyserData,
    interimTranscript,
    voiceError,
    isRecording,
    isSupported: Boolean(getSpeechRecognitionConstructor() || (typeof navigator !== 'undefined' && navigator.mediaDevices)),
  }
}
