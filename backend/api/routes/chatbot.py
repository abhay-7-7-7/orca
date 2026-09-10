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
    from backend.language.bhashini import detect_language, translate, clean_markdown

    # Detect language
    detection = await detect_language(request.message)
    original_lang = detection.detected_language

    # Translate to English for internal tool argument parsing if needed
    message_en = request.message
    if original_lang != "en":
        try:
            translation = await translate(request.message, original_lang, "en")
            message_en = translation.translated_text
        except Exception:
            message_en = request.message

    # Process through LLM requesting direct target language response
    response = await chat(
        message=message_en,
        session_id=request.session_id,
        location=request.location,
        target_language=original_lang,
    )

    # Check if response needs translation (if LLM replied in English)
    if original_lang != "en":
        script_ranges = {
            "ml": (0x0D00, 0x0D7F),
            "ta": (0x0B80, 0x0BFF),
            "te": (0x0C00, 0x0C7F),
            "hi": (0x0900, 0x097F),
            "kn": (0x0C80, 0x0CFF),
            "bn": (0x0980, 0x09FF),
            "gu": (0x0A80, 0x0AFF),
            "mr": (0x0900, 0x097F),
            "or": (0x0B00, 0x0B7F),
        }
        rng = script_ranges.get(original_lang)
        has_target_script = rng and any(rng[0] <= ord(c) <= rng[1] for c in response.reply)

        if not has_target_script:
            try:
                reply_translation = await translate(response.reply, "en", original_lang)
                response.reply = reply_translation.translated_text
            except Exception:
                pass

    # Clean and repair markdown formatting (spaced asterisks, mangled headers, table pipes)
    response.reply = clean_markdown(response.reply)
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
