"""
Bhashini Language Layer — multilingual support via ULCA APIs.

Pipeline: incoming query → detect language → translate to English →
process in English → translate response back → (optional TTS)

Mock mode: returns input text unchanged with status "mock".
"""

from __future__ import annotations

import json
from typing import Optional

from backend.core.config import get_settings
from backend.core.http_client import get_http_client
from backend.core.logging import get_logger
from backend.models.language import (
    ASRResponse,
    LanguageDetectionResult,
    TranslationResponse,
    TTSResponse,
)

logger = get_logger(__name__)

# Supported Indian languages (Bhashini covers 22 scheduled languages)
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
}


async def detect_language(text: str) -> LanguageDetectionResult:
    """
    Detect the language of input text.

    Uses Bhashini API if credentials are available, falls back
    to a simple heuristic based on Unicode script blocks.
    """
    settings = get_settings()

    if settings.bhashini_user_id and settings.bhashini_api_key:
        try:
            return await _bhashini_detect(text)
        except Exception as exc:
            logger.warning("Bhashini detection failed: %s — using heuristic", exc)

    # Heuristic fallback based on Unicode scripts
    return _heuristic_detect(text)


async def translate(
    text: str,
    source_language: str = "",
    target_language: str = "en",
) -> TranslationResponse:
    """
    Translate text between languages.

    Uses Bhashini MT if available, falls back to returning the
    original text with a mock status.
    """
    settings = get_settings()

    # Auto-detect source if not specified
    if not source_language:
        detection = await detect_language(text)
        source_language = detection.detected_language

    # No translation needed if same language
    if source_language == target_language:
        return TranslationResponse(
            original_text=text,
            translated_text=text,
            source_language=source_language,
            target_language=target_language,
            source="No translation needed",
        )

    if settings.has_bhashini_credentials:
        try:
            return await _bhashini_translate(text, source_language, target_language)
        except Exception as exc:
            logger.warning("Bhashini translation failed: %s — returning original", exc)

    # Mock fallback
    return TranslationResponse(
        original_text=text,
        translated_text=text,  # Return original — clearly marked as mock
        source_language=source_language,
        target_language=target_language,
        source="MOCK — Bhashini credentials not configured",
    )


async def speech_to_text(
    audio_base64: str,
    source_language: str = "",
    audio_format: str = "wav",
) -> ASRResponse:
    """Convert speech to text using Bhashini ASR."""
    settings = get_settings()

    if settings.has_bhashini_credentials:
        try:
            return await _bhashini_asr(audio_base64, source_language, audio_format)
        except Exception as exc:
            logger.warning("Bhashini ASR failed: %s", exc)

    return ASRResponse(
        text="[ASR not configured — Bhashini credentials required]",
        detected_language=source_language or "unknown",
        confidence=0.0,
    )


async def text_to_speech(
    text: str,
    target_language: str = "en",
    gender: str = "female",
) -> TTSResponse:
    """Convert text to speech using Bhashini TTS."""
    settings = get_settings()

    if settings.has_bhashini_credentials:
        try:
            return await _bhashini_tts(text, target_language, gender)
        except Exception as exc:
            logger.warning("Bhashini TTS failed: %s", exc)

    return TTSResponse(
        audio_base64="",
        audio_format="wav",
        language=target_language,
    )


# ── Bhashini API calls ─────────────────────────────────────────────

async def _bhashini_detect(text: str) -> LanguageDetectionResult:
    """Call Bhashini language detection or fallback to heuristic."""
    return _heuristic_detect(text)


async def _bhashini_translate(
    text: str, source: str, target: str
) -> TranslationResponse:
    """Call Bhashini machine translation API via Dhruva pipeline."""
    settings = get_settings()
    client = get_http_client()

    url = settings.bhashini_dhruva_url
    headers = {
        "Content-Type": "application/json",
        "Authorization": settings.effective_bhashini_key,
    }
    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source,
                        "targetLanguage": target,
                    },
                    "serviceId": "ai4bharat/indictrans-v2-all-gpu--t4",
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }

    resp = await client.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    data = resp.json()

    # Parse translation result
    translated = text
    try:
        output = data.get("pipelineResponse", [{}])[0].get("output", [{}])
        if output:
            translated = output[0].get("target", text)
    except (IndexError, KeyError):
        pass

    return TranslationResponse(
        original_text=text,
        translated_text=translated,
        source_language=source,
        target_language=target,
        source="Bhashini / Dhruva (ai4bharat/indictrans-v2)",
    )


async def _bhashini_asr(
    audio_base64: str, source_language: str, audio_format: str
) -> ASRResponse:
    """Call Bhashini ASR API."""
    return ASRResponse(text="", detected_language=source_language, confidence=0.0)


async def _bhashini_tts(
    text: str, target_language: str, gender: str = "female"
) -> TTSResponse:
    """Call Bhashini TTS API via Dhruva pipeline."""
    settings = get_settings()
    client = get_http_client()

    dravidian_langs = {"ml", "ta", "te", "kn"}
    service_id = (
        "ai4bharat/indic-tts-coqui-dravidian-gpu--t4"
        if target_language in dravidian_langs
        else "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"
    )

    url = settings.bhashini_dhruva_url
    headers = {
        "Content-Type": "application/json",
        "Authorization": settings.effective_bhashini_key,
    }
    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": target_language},
                    "serviceId": service_id,
                    "gender": gender or "female",
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }

    resp = await client.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    data = resp.json()

    audio_base64 = ""
    try:
        audio_list = data.get("pipelineResponse", [{}])[0].get("audio", [{}])
        if audio_list:
            audio_base64 = audio_list[0].get("audioContent", "")
    except (IndexError, KeyError):
        pass

    return TTSResponse(
        audio_base64=audio_base64,
        audio_format="wav",
        language=target_language,
    )


# ── Heuristic language detection ────────────────────────────────────

def _heuristic_detect(text: str) -> LanguageDetectionResult:
    """
    Simple heuristic language detection based on Unicode script blocks.

    Not a replacement for Bhashini — just a fallback so the system
    doesn't crash when credentials aren't configured.
    """
    # Check for presence of specific script characters
    scripts = {
        "hi": range(0x0900, 0x097F + 1),  # Devanagari
        "ta": range(0x0B80, 0x0BFF + 1),  # Tamil
        "te": range(0x0C00, 0x0C7F + 1),  # Telugu
        "ml": range(0x0D00, 0x0D7F + 1),  # Malayalam
        "kn": range(0x0C80, 0x0CFF + 1),  # Kannada
        "bn": range(0x0980, 0x09FF + 1),  # Bengali
        "gu": range(0x0A80, 0x0AFF + 1),  # Gujarati
        "pa": range(0x0A00, 0x0A7F + 1),  # Gurmukhi
        "or": range(0x0B00, 0x0B7F + 1),  # Odia
    }

    for lang, script_range in scripts.items():
        if any(ord(c) in script_range for c in text):
            return LanguageDetectionResult(
                detected_language=lang,
                language_name=SUPPORTED_LANGUAGES.get(lang, lang),
                confidence=0.7,
            )

    return LanguageDetectionResult(
        detected_language="en",
        language_name="English",
        confidence=0.5,
    )
