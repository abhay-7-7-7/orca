"""
Language API routes — translation, ASR, TTS.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.language import (
    ASRRequest,
    ASRResponse,
    LanguageDetectionResult,
    TranslationRequest,
    TranslationResponse,
    TTSRequest,
    TTSResponse,
)

router = APIRouter(tags=["language"])


@router.post("/detect", response_model=LanguageDetectionResult)
async def detect(text: str):
    """Detect the language of input text."""
    from backend.language.bhashini import detect_language
    return await detect_language(text)


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text between languages."""
    from backend.language.bhashini import translate
    return await translate(request.text, request.source_language, request.target_language)


@router.post("/asr", response_model=ASRResponse)
async def asr(request: ASRRequest):
    """Convert speech to text (Bhashini ASR)."""
    from backend.language.bhashini import speech_to_text
    return await speech_to_text(request.audio_base64, request.source_language, request.audio_format)


@router.post("/tts", response_model=TTSResponse)
async def tts(request: TTSRequest):
    """Convert text to speech (Bhashini TTS)."""
    from backend.language.bhashini import text_to_speech
    return await text_to_speech(request.text, request.target_language, request.gender)
