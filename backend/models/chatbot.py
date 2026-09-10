"""
Chatbot models — conversational interface schemas.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in a conversation."""

    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """Request to send a message to the chatbot."""

    message: str
    session_id: str = "default"
    location: Optional[dict] = None  # {"lat": ..., "lon": ...}

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "message": "Where should I fish today near Kochi?",
                    "session_id": "user-123",
                    "location": {"lat": 9.93, "lon": 76.27},
                }
            ]
        }


class ToolCallInfo(BaseModel):
    """Record of a tool call made by the chatbot."""

    tool_name: str
    arguments: dict = Field(default_factory=dict)
    result_summary: str = ""


class LocationRef(BaseModel):
    """A geographic location referenced in a chatbot response."""

    lat: float
    lon: float
    label: Optional[str] = None
    zoom: Optional[int] = None


class ChatResponse(BaseModel):
    """Chatbot response with tool call citations."""

    reply: str
    session_id: str
    tool_calls_made: list[ToolCallInfo] = Field(default_factory=list)
    data_citations: list[str] = Field(default_factory=list)
    language_detected: Optional[str] = None
    locations: list[LocationRef] = Field(default_factory=list)
