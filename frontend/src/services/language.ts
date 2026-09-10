import { apiPost } from './api'

/* ---------- Types (frontend-facing) ---------- */

export interface LanguageDetection {
  language: string
  language_code: string
  confidence: number
}

export interface Translation {
  translated_text: string
  source_language: string
  target_language: string
}

export interface ASRResult {
  text: string
  language: string
  language_code: string
  confidence: number
}

export interface TTSResult {
  audio_url: string
  audio_base64?: string
}

/* ---------- Backend response types (internal) ---------- */

interface BackendLanguageDetection {
  detected_language: string
  language_name: string
  confidence: number
}

interface BackendASRResponse {
  text: string
  detected_language: string
  confidence: number
}

interface BackendTTSResponse {
  audio_base64: string
  audio_format: string
  language: string
}

/* ---------- Helpers ---------- */

/**
 * Convert a Blob to a base64-encoded string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      // Strip the "data:audio/...;base64," prefix
      const base64 = dataUrl.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/* ---------- API Calls ---------- */

export async function detectLanguage(text: string): Promise<LanguageDetection> {
  // Backend: POST /api/language/detect?text=... → { detected_language, language_name, confidence }
  const raw = await apiPost<BackendLanguageDetection>(
    `/api/language/detect?text=${encodeURIComponent(text)}`,
    {}
  )
  return {
    language: raw.language_name || raw.detected_language,
    language_code: raw.detected_language,
    confidence: raw.confidence,
  }
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<Translation> {
  // Backend TranslationRequest expects: { text, source_language, target_language }
  return apiPost('/api/language/translate', {
    text,
    source_language: sourceLang,
    target_language: targetLang,
  })
}

export async function speechToText(audioBlob: Blob, language = ''): Promise<ASRResult> {
  // Backend ASRRequest expects JSON: { audio_base64, source_language, audio_format }
  const base64Audio = await blobToBase64(audioBlob)

  const raw = await apiPost<BackendASRResponse>('/api/language/asr', {
    audio_base64: base64Audio,
    source_language: language,
    audio_format: 'wav',
  })

  return {
    text: (raw?.text || '').trim(),
    language: raw?.detected_language || language || 'en',
    language_code: raw?.detected_language || language || 'en',
    confidence: raw?.confidence ?? 0,
  }
}

export async function textToSpeech(text: string, language: string): Promise<TTSResult> {
  // Backend TTSRequest expects: { text, target_language, gender }
  const raw = await apiPost<BackendTTSResponse>('/api/language/tts', {
    text,
    target_language: language,
  })

  return {
    audio_base64: raw.audio_base64,
    // Construct a playable data URI from the base64 audio
    audio_url: raw.audio_base64
      ? `data:audio/${raw.audio_format || 'wav'};base64,${raw.audio_base64}`
      : '',
  }
}
