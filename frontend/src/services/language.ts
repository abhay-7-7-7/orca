import { apiPost, apiPostForm } from './api'

/* ---------- Types ---------- */

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

/* ---------- API Calls ---------- */

export async function detectLanguage(text: string): Promise<LanguageDetection> {
  return apiPost(`/api/language/detect?text=${encodeURIComponent(text)}`, {})
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<Translation> {
  return apiPost('/api/language/translate', {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
  })
}

export async function speechToText(audioBlob: Blob): Promise<ASRResult> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  return apiPostForm('/api/language/asr', formData)
}

export async function textToSpeech(text: string, language: string): Promise<TTSResult> {
  return apiPost('/api/language/tts', { text, language })
}
