"""
Chatbot Engine — tool-calling LLM orchestrator.

Sits on top of the fusion layer and routing engine.
Uses Anthropic Claude (default) or other LLM providers.

Falls back to a rule-based responder when no LLM key is configured.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from backend.chatbot.tools import TOOLS, execute_tool
from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.chatbot import ChatMessage, ChatResponse, LocationRef, ToolCallInfo

logger = get_logger(__name__)

# ── In-memory session store (hackathon) ─────────────────────────────
# Production: replace with Redis or database
_sessions: dict[str, list[ChatMessage]] = {}


def _extract_locations(tool_calls_made: list[ToolCallInfo]) -> list[LocationRef]:
    """Extract geographic locations from tool call arguments for map navigation."""
    locations: list[LocationRef] = []
    seen = set()

    for tc in tool_calls_made:
        args = tc.arguments
        name = tc.tool_name

        # Weather / geofence / tide calls have direct lat/lon
        if "lat" in args and "lon" in args:
            key = (round(float(args["lat"]), 2), round(float(args["lon"]), 2))
            if key not in seen:
                seen.add(key)
                label_map = {
                    "get_weather_at": "Weather observation",
                    "check_geofence": "Boundary check",
                    "get_tide": "Tide forecast",
                }
                locations.append(LocationRef(
                    lat=float(args["lat"]),
                    lon=float(args["lon"]),
                    label=label_map.get(name, name.replace("_", " ").title()),
                    zoom=10,
                ))

        # PFZ calls have a bounding box — use center
        if all(k in args for k in ("min_lat", "max_lat", "min_lon", "max_lon")):
            clat = (float(args["min_lat"]) + float(args["max_lat"])) / 2
            clon = (float(args["min_lon"]) + float(args["max_lon"])) / 2
            key = (round(clat, 2), round(clon, 2))
            if key not in seen:
                seen.add(key)
                locations.append(LocationRef(
                    lat=clat, lon=clon,
                    label="PFZ search area",
                    zoom=8,
                ))

        # Route calls have origin and destination
        if "origin_lat" in args and "origin_lon" in args:
            key = (round(float(args["origin_lat"]), 2), round(float(args["origin_lon"]), 2))
            if key not in seen:
                seen.add(key)
                locations.append(LocationRef(
                    lat=float(args["origin_lat"]),
                    lon=float(args["origin_lon"]),
                    label="Route origin",
                    zoom=9,
                ))
        if "dest_lat" in args and "dest_lon" in args:
            key = (round(float(args["dest_lat"]), 2), round(float(args["dest_lon"]), 2))
            if key not in seen:
                seen.add(key)
                locations.append(LocationRef(
                    lat=float(args["dest_lat"]),
                    lon=float(args["dest_lon"]),
                    label="Route destination",
                    zoom=9,
                ))

    return locations


SYSTEM_PROMPT = """You are ORCA, an AI assistant for Indian marine stakeholders — primarily fishermen.
You help users find safe, productive fishing locations and plan safe routes.

You have access to LIVE marine data tools:
- Weather conditions (waves, wind)
- Potential Fishing Zones (PFZ) based on SST gradients and chlorophyll
- Safe routing with hazard avoidance (cyclones, lightning, MPAs, EEZ boundaries)
- Geofence checking (EEZ/IMBL boundaries, marine protected areas)
- Cyclone and disaster alerts
- Tide predictions

IMPORTANT RULES:
1. Always use your tools to get current data — never make up conditions.
2. When suggesting fishing locations, cite the actual PFZ score and conditions.
3. When suggesting routes, mention the hazards avoided and distance/time.
4. Be concise but thorough about safety warnings.
5. If a location is outside the Indian EEZ or in a no-take MPA, warn clearly.
6. Express distances in km, times in hours, temperatures in °C.
7. When asked "where to fish," default to a ~200km radius around the user's location or Kochi (9.93°N, 76.27°E) if no location given.

FOLLOW-UP SUGGESTIONS:
After your response, ALWAYS include exactly 2-3 short follow-up questions the user might want to ask next. Put them inside [FOLLOWUPS] and [/FOLLOWUPS] tags, one per line.
These should be natural next steps based on what you just told them. Keep each under 40 characters.
Example:
[FOLLOWUPS]
Plan route to best zone
Check weather at Kochi
Any storm alerts today?
[/FOLLOWUPS]
"""


import re

def _extract_followups(reply: str) -> tuple[str, list[str]]:
    """Extract follow-up suggestions from [FOLLOWUPS]...[/FOLLOWUPS] block.
    
    Returns (clean_reply, followups_list).
    """
    pattern = r'\[FOLLOWUPS\](.*?)\[/FOLLOWUPS\]'
    match = re.search(pattern, reply, re.DOTALL | re.IGNORECASE)
    
    if not match:
        return reply.strip(), []
    
    # Extract the followups
    raw = match.group(1).strip()
    followups = [line.strip().lstrip('- ').strip() for line in raw.split('\n') if line.strip()]
    followups = [f for f in followups if len(f) > 2][:3]  # Max 3
    
    # Remove the block from the visible reply
    clean = re.sub(pattern, '', reply, flags=re.DOTALL | re.IGNORECASE).strip()
    
    return clean, followups


async def chat(
    message: str,
    session_id: str = "default",
    location: dict | None = None,
    target_language: str = "en",
) -> ChatResponse:
    """
    Process a chat message through the LLM with tool calling.

    Falls back to a rule-based responder if no LLM key is configured.
    """
    settings = get_settings()

    # Get or create session
    _sessions.setdefault(session_id, [])

    # Add user message to history
    _sessions[session_id].append(
        ChatMessage(
            role="user",
            content=message,
            timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
    )

    # Try LLM-powered response
    if settings.llm_api_key:
        if settings.llm_provider == "mistral":
            try:
                response = await _chat_with_mistral(
                    message, session_id, location, target_language=target_language
                )
                return response
            except Exception as exc:
                logger.error("Mistral LLM chat failed: %s — falling back to rule-based", exc)
        elif settings.llm_provider == "anthropic":
            try:
                response = await _chat_with_anthropic(message, session_id, location)
                return response
            except Exception as exc:
                logger.error("Anthropic LLM chat failed: %s — falling back to rule-based", exc)

    # Fallback: rule-based responder
    response = await _rule_based_chat(message, session_id, location)
    return response


async def _chat_with_mistral(
    message: str,
    session_id: str,
    location: dict | None,
    target_language: str = "en",
) -> ChatResponse:
    """Use Mistral AI for tool-calling chat."""
    from backend.core.http_client import get_http_client

    settings = get_settings()
    client = get_http_client()

    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.llm_api_key}",
    }

    # Language instruction
    lang_names = {
        "ml": "Malayalam (മലയാളം)",
        "ta": "Tamil (தமிழ்)",
        "hi": "Hindi (हिन्दी)",
        "te": "Telugu (తెలుగు)",
        "kn": "Kannada (ಕನ್ನಡ)",
        "bn": "Bengali (বাংলা)",
        "gu": "Gujarati (ગુજરાતી)",
        "mr": "Marathi (मराठी)",
        "or": "Odia (ଓଡ଼ିଆ)",
    }
    lang_label = lang_names.get(target_language, target_language)

    system_text = SYSTEM_PROMPT
    if target_language and target_language != "en":
        system_text += (
            f"\n\nCRITICAL LANGUAGE & FORMATTING INSTRUCTION:\n"
            f"The user is asking in {lang_label}. You MUST write your entire final advisory response "
            f"directly in natural, fluent {lang_label}.\n"
            f"Always use clean, standard Markdown syntax:\n"
            f"- Use ### for main section headings (always on their own line with a blank line before and after).\n"
            f"- Use **bold** for key numbers, temperatures, wave heights, and safety recommendations. Never put spaces inside asterisks.\n"
            f"- Use clean bullet points with - on new lines.\n"
            f"- Use Markdown tables with clean pipes (|) and standard headers.\n"
        )

    # Build messages (keep last 10 turns for context)
    history = _sessions.setdefault(session_id, [])[-10:]
    messages = [{"role": "system", "content": system_text}]
    for m in history:
        messages.append({"role": m.role, "content": m.content})

    # Add location context if provided
    if location and messages:
        messages[-1]["content"] += (
            f"\n\n[User's current location: {location.get('lat', 'unknown')}°N, "
            f"{location.get('lon', 'unknown')}°E]"
        )

    # Convert our tool definitions to Mistral format
    mistral_tools = [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        }
        for t in TOOLS
    ]

    tool_calls_made = []
    max_tool_rounds = 5
    model = settings.llm_model or "ministral-8b-latest"

    for round_num in range(max_tool_rounds):
        payload = {
            "model": model,
            "messages": messages,
            "tools": mistral_tools,
            "tool_choice": "auto",
        }

        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code == 429 and model != "open-mistral-7b":
            logger.warning("Mistral model %s rate limited, trying open-mistral-7b", model)
            payload["model"] = "open-mistral-7b"
            resp = await client.post(url, json=payload, headers=headers)

        resp.raise_for_status()
        data = resp.json()
        choice = data.get("choices", [{}])[0]
        choice_msg = choice.get("message", {})

        tool_calls = choice_msg.get("tool_calls")
        if not tool_calls:
            # No tool calls — extract text reply
            reply = choice_msg.get("content") or "I'm sorry, I couldn't generate a response."
            break

        # Append assistant message with tool calls
        messages.append(choice_msg)

        # Execute each tool call and append tool response
        for tc in tool_calls:
            func = tc.get("function", {})
            tool_name = func.get("name", "")
            try:
                args = json.loads(func.get("arguments", "{}"))
            except json.JSONDecodeError:
                args = {}

            result = await execute_tool(tool_name, args)
            tool_calls_made.append(
                ToolCallInfo(
                    tool_name=tool_name,
                    arguments=args,
                    result_summary=json.dumps(result)[:200],
                )
            )

            messages.append({
                "role": "tool",
                "name": tool_name,
                "tool_call_id": tc.get("id", f"call_{len(tool_calls_made)}"),
                "content": json.dumps(result),
            })
    else:
        reply = "I've gathered the data. Let me summarize what I found."

    # Store assistant response in history
    _sessions.setdefault(session_id, []).append(
        ChatMessage(
            role="assistant",
            content=reply,
            timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
    )

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        tool_calls_made=tool_calls_made,
        data_citations=[tc.tool_name for tc in tool_calls_made],
        locations=_extract_locations(tool_calls_made),
    )


async def _chat_with_anthropic(
    message: str,
    session_id: str,
    location: dict | None,
) -> ChatResponse:
    """Use Anthropic Claude for tool-calling chat."""
    import anthropic

    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.llm_api_key)

    # Build messages (keep last 10 turns for context)
    history = _sessions.get(session_id, [])[-10:]
    messages = [{"role": m.role, "content": m.content} for m in history]

    # Add location context if provided
    if location:
        messages[-1]["content"] += (
            f"\n\n[User's current location: {location.get('lat', 'unknown')}°N, "
            f"{location.get('lon', 'unknown')}°E]"
        )

    # Convert our tool definitions to Anthropic format
    anthropic_tools = [
        {
            "name": t["name"],
            "description": t["description"],
            "input_schema": t["parameters"],
        }
        for t in TOOLS
    ]

    tool_calls_made = []
    max_tool_rounds = 5

    for round_num in range(max_tool_rounds):
        response = client.messages.create(
            model=settings.llm_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=anthropic_tools,
            messages=messages,
        )

        # Check if the model wants to use tools
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            # No tool calls — extract text response
            text_blocks = [b.text for b in response.content if hasattr(b, "text")]
            reply = "\n".join(text_blocks) or "I'm sorry, I couldn't generate a response."
            break

        # Execute tool calls
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for tool_block in tool_use_blocks:
            result = await execute_tool(tool_block.name, tool_block.input)
            tool_calls_made.append(
                ToolCallInfo(
                    tool_name=tool_block.name,
                    arguments=tool_block.input,
                    result_summary=json.dumps(result)[:200],
                )
            )
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": json.dumps(result),
            })

        messages.append({"role": "user", "content": tool_results})
    else:
        reply = "I've gathered the data. Let me summarize what I found."

    # Store assistant response
    _sessions[session_id].append(
        ChatMessage(
            role="assistant",
            content=reply,
            timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
    )

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        tool_calls_made=tool_calls_made,
        data_citations=[tc.tool_name for tc in tool_calls_made],
        locations=_extract_locations(tool_calls_made),
    )


async def _rule_based_chat(
    message: str,
    session_id: str,
    location: dict | None,
) -> ChatResponse:
    """
    Fallback rule-based responder when no LLM key is configured.

    Uses pattern matching to route queries to the right tools
    and constructs a response from the data.
    """
    message_lower = message.lower()
    tool_calls = []
    reply_parts = []

    lat = location.get("lat", 9.93) if location else 9.93
    lon = location.get("lon", 76.27) if location else 76.27

    # Pattern: fishing/PFZ query
    if any(word in message_lower for word in ["fish", "pfz", "catch", "where"]):
        result = await execute_tool("get_pfz_zones", {
            "min_lat": lat - 3, "max_lat": lat + 3,
            "min_lon": lon - 3, "max_lon": lon + 3,
        })
        tool_calls.append(ToolCallInfo(
            tool_name="get_pfz_zones",
            arguments={"region": "near user"},
            result_summary=f"{result.get('total', 0)} PFZ candidates found",
        ))

        candidates = result.get("candidates", [])
        if candidates:
            reply_parts.append(f"🐟 I found **{len(candidates)} Potential Fishing Zones** near your area:\n")
            for i, c in enumerate(candidates[:3], 1):
                centroid = c.get("centroid", {})
                reply_parts.append(
                    f"  {i}. **{c['zone_id']}** — Score: {c['score']:.2f} ({c['confidence']}), "
                    f"Location: {centroid.get('lat', 0):.2f}°N {centroid.get('lon', 0):.2f}°E, "
                    f"SST: {c.get('mean_sst', 'N/A')}°C, Chl-a: {c.get('mean_chl_a', 'N/A')} mg/m³"
                )
        else:
            reply_parts.append("No PFZ candidates found in the area right now.")

    # Pattern: weather/safety query
    if any(word in message_lower for word in ["weather", "safe", "wave", "wind", "condition"]):
        result = await execute_tool("get_weather_at", {"lat": lat, "lon": lon})
        tool_calls.append(ToolCallInfo(
            tool_name="get_weather_at",
            arguments={"lat": lat, "lon": lon},
            result_summary=f"Sea state: {result.get('sea_state', 'unknown')}",
        ))

        reply_parts.append(
            f"\n🌊 **Current conditions** at ({lat:.2f}°N, {lon:.2f}°E):\n"
            f"  • Waves: {result.get('wave_height_m', 'N/A')}m\n"
            f"  • Wind: {result.get('wind_speed_kmh', 'N/A')} km/h\n"
            f"  • Sea state: {result.get('sea_state', 'N/A')}\n"
            f"  • SST: {result.get('sst_celsius', 'N/A')}°C"
        )

    # Pattern: route query
    if any(word in message_lower for word in ["route", "go to", "navigate", "path", "how to reach"]):
        # Default destination: first PFZ if available
        dest_lat, dest_lon = lat + 0.5, lon - 0.5
        result = await execute_tool("compute_route", {
            "origin_lat": lat, "origin_lon": lon,
            "dest_lat": dest_lat, "dest_lon": dest_lon,
        })
        tool_calls.append(ToolCallInfo(
            tool_name="compute_route",
            arguments={"origin": f"{lat},{lon}", "dest": f"{dest_lat},{dest_lon}"},
            result_summary=f"Distance: {result.get('total_distance_km', 'N/A')}km",
        ))

        reply_parts.append(
            f"\n🗺️ **Route computed:**\n"
            f"  • Distance: {result.get('total_distance_km', 'N/A')} km\n"
            f"  • Est. time: {result.get('estimated_time_hours', 'N/A')} hours\n"
            f"  • Safe: {'✅ Yes' if result.get('is_safe') else '⚠️ Caution needed'}"
        )
        if result.get("warnings"):
            reply_parts.append(f"  • Warnings: {', '.join(result['warnings'])}")

    # Pattern: alert/cyclone query
    if any(word in message_lower for word in ["alert", "cyclone", "danger", "warning", "disaster"]):
        result = await execute_tool("get_active_alerts", {})
        tool_calls.append(ToolCallInfo(
            tool_name="get_active_alerts",
            arguments={},
            result_summary=f"{result.get('total_alerts', 0)} alerts active",
        ))

        total = result.get("total_alerts", 0)
        if total > 0:
            reply_parts.append(f"\n⚠️ **{total} active alert(s):**")
            for c in result.get("cyclones", []):
                reply_parts.append(
                    f"  • {c['name']} — Center: {c['center']['lat']:.1f}°N, "
                    f"{c['center']['lon']:.1f}°E, Radius: {c['radius_km']}km"
                )
        else:
            reply_parts.append("\n✅ No active cyclone or disaster alerts in the Indian Ocean region.")

    # Default response
    if not reply_parts:
        reply_parts.append(
            "👋 I'm ORCA, your marine safety assistant. I can help you with:\n"
            "• **Finding fishing zones** — \"Where should I fish today?\"\n"
            "• **Weather conditions** — \"Is it safe to go out?\"\n"
            "• **Route planning** — \"Route from Kochi to [location]\"\n"
            "• **Alerts** — \"Any cyclone warnings?\"\n"
            "• **Geofence checks** — \"Am I near the IMBL?\"\n\n"
            "What would you like to know?"
        )

    reply = "\n".join(reply_parts)

    _sessions[session_id].append(
        ChatMessage(role="assistant", content=reply, timestamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
    )

    return ChatResponse(
        reply=reply,
        session_id=session_id,
        tool_calls_made=tool_calls,
        data_citations=[tc.tool_name for tc in tool_calls],
        locations=_extract_locations(tool_calls),
    )
