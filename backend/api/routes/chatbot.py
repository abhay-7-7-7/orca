"""
Chatbot API routes — conversational interface.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.chatbot import ChatRequest, ChatResponse

router = APIRouter(tags=["chatbot"])


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message to the ORCA chatbot.

    The chatbot queries live marine data via tool calls and returns
    an evidence-based response with data citations.
    """
    from backend.chatbot.engine import chat
    from backend.language.bhashini import detect_language, translate

    # Detect language
    detection = await detect_language(request.message)
    original_lang = detection.detected_language

    # Translate to English if needed
    message_en = request.message
    if original_lang != "en":
        translation = await translate(request.message, original_lang, "en")
        message_en = translation.translated_text

    # Process in English
    response = await chat(
        message=message_en,
        session_id=request.session_id,
        location=request.location,
    )

    # Translate response back if needed
    if original_lang != "en":
        reply_translation = await translate(response.reply, "en", original_lang)
        response.reply = reply_translation.translated_text

    response.language_detected = original_lang
    return response


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get the conversation history for a session."""
    from backend.chatbot.engine import _sessions

    messages = _sessions.get(session_id, [])
    return {
        "session_id": session_id,
        "messages": [m.model_dump() for m in messages],
        "message_count": len(messages),
    }
