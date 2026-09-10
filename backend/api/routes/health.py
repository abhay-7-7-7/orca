"""
Health endpoint — the fastest way to sanity-check the whole system.

Reports per-agent status (live / mock / unavailable / error) so a
single ``curl /health`` during a demo tells you exactly what's
working and what isn't.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.common import AgentHealthInfo, AgentStatus, HealthReport

router = APIRouter(tags=["health"])


# Agent registry — populated by each agent module at import time.
# The fusion scheduler also updates these after each refresh cycle.
_agent_health: dict[str, AgentHealthInfo] = {}

# All expected agent names
AGENT_NAMES = [
    "sst_chlorophyll",
    "marine_weather",
    "cyclone_disaster",
    "lightning",
    "tide",
    "vessel_ais",
    "geofence",
    "pfz_synthesis",
]


def update_agent_health(info: AgentHealthInfo) -> None:
    """Called by agents/fusion to report their latest status."""
    _agent_health[info.name] = info


def get_agent_health(name: str) -> AgentHealthInfo:
    """Get current health info for an agent."""
    return _agent_health.get(
        name,
        AgentHealthInfo(name=name, status=AgentStatus.UNAVAILABLE, error="Not yet initialized"),
    )


@router.get("/health", response_model=HealthReport)
async def health_check() -> HealthReport:
    """
    System health check.

    Returns the status of every agent and the overall system status.
    - ``"ok"``: all agents are live or acceptably mocked
    - ``"degraded"``: one or more agents are in error/unavailable state
    - ``"down"``: critical agents are failing
    """
    agents = [get_agent_health(name) for name in AGENT_NAMES]

    # Determine overall status
    error_count = sum(
        1 for a in agents if a.status in (AgentStatus.ERROR, AgentStatus.UNAVAILABLE)
    )
    if error_count == 0:
        overall = "ok"
    elif error_count < len(agents):
        overall = "degraded"
    else:
        overall = "down"

    return HealthReport(status=overall, agents=agents)
