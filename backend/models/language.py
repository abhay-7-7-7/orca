"""
Language layer models — Bhashini translation schemas.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class LanguageDetectionResult(BaseModel):
    """Result of language detection."""

    detected_language: str  # ISO 639-1 code (e.g., "hi", "ta", "ml", "en")
    language_name: str = ""
    confidence: float = 0.0


class TranslationRequest(BaseModel):
    """Request to translate text."""

    text: str
    source_language: str = ""  # Auto-detect if empty
    target_language: str = "en"


class TranslationResponse(BaseModel):
    """Translation result."""

    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    source: str = "Bhashini / ULCA"


class ASRRequest(BaseModel):
    """Automatic Speech Recognition request."""

    audio_base64: str  # Base64-encoded audio
    source_language: str = ""  # Auto-detect if empty
    audio_format: str = "wav"


class ASRResponse(BaseModel):
    """ASR result."""

    text: str
    detected_language: str = ""
    confidence: float = 0.0


class TTSRequest(BaseModel):
    """Text-to-Speech request."""

    text: str
    target_language: str = "en"
    gender: str = "female"


class TTSResponse(BaseModel):
    """TTS result."""

    audio_base64: str = ""
    audio_format: str = "wav"
    language: str = ""
