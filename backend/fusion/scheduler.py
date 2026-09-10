"""
Fusion Scheduler — calls agents at their own update cadence.

Each agent has its own refresh interval. The scheduler runs as
background tasks inside the FastAPI lifespan.
"""

from __future__ import annotations

import asyncio
from datetime import datetime

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.common import AgentStatus, BoundingBox
from backend.api.routes.health import update_agent_health, AgentHealthInfo

logger = get_logger(__name__)

_tasks: list[asyncio.Task] = []
_running = False


async def start_scheduler() -> None:
    """Start all agent refresh loops."""
    global _running
    _running = True
    logger.info("Starting fusion scheduler")

    async def _startup_worker() -> None:
        try:
            # Initial fetch for all agents in background
            await _initial_fetch()
        except Exception as exc:
            logger.error("Initial fetch failed: %s", exc)

        # Start periodic refresh loops
        _tasks.append(asyncio.create_task(_refresh_loop("sst_chlorophyll", 86400)))
        _tasks.append(asyncio.create_task(_refresh_loop("pfz_synthesis", 86400)))
        _tasks.append(asyncio.create_task(_refresh_loop("marine_weather", 3600)))
        _tasks.append(asyncio.create_task(_refresh_loop("tide", 21600)))
        _tasks.append(asyncio.create_task(_refresh_loop("cyclone_disaster", 900)))
        _tasks.append(asyncio.create_task(_refresh_loop("lightning", 300)))
        _tasks.append(asyncio.create_task(_refresh_loop("vessel_ais", 300)))
        # geofence is static — loaded once in initial fetch, no periodic refresh

    _tasks.append(asyncio.create_task(_startup_worker()))


async def stop_scheduler() -> None:
    """Stop all refresh loops."""
    global _running
    _running = False
    for task in _tasks:
        task.cancel()
    _tasks.clear()
    logger.info("Fusion scheduler stopped")


async def _initial_fetch() -> None:
    """Run an initial fetch for all agents to populate the world state."""
    from backend.fusion.world_state import get_world_state_store

    store = get_world_state_store()
    default_bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

    # Geofence (load once — static data)
    try:
        from backend.agents.geofence.agent import get_geofence_agent
        agent = get_geofence_agent()
        await agent.initialize()
        response = await agent.fetch(bbox=default_bbox)
        store.set_geofence_agent(agent)
        store.update_agent_data("geofence", response.data, response.status, response.is_mock)
        _report_health("geofence", response.status, response.is_mock)
        logger.info("Geofence agent initialized")
    except Exception as exc:
        logger.error("Geofence init failed: %s", exc)
        _report_health("geofence", AgentStatus.ERROR, error=str(exc))

    # Fetch all other agents
    for agent_name in [
        "sst_chlorophyll", "marine_weather", "tide",
        "cyclone_disaster", "lightning", "vessel_ais",
    ]:
        await _refresh_agent(agent_name, default_bbox)

    # PFZ synthesis (depends on SST data being available)
    await _refresh_agent("pfz_synthesis", default_bbox)

    # Build the hazard grid
    try:
        store.build_hazard_grid(default_bbox)
        logger.info("Initial hazard grid built")
    except Exception as exc:
        logger.error("Failed to build initial hazard grid: %s", exc)


async def _refresh_loop(agent_name: str, interval_seconds: int) -> None:
    """Periodic refresh loop for a single agent."""
    default_bbox = BoundingBox(min_lat=5.0, max_lat=25.0, min_lon=65.0, max_lon=100.0)

    while _running:
        await asyncio.sleep(interval_seconds)
        if not _running:
            break

        await _refresh_agent(agent_name, default_bbox)

        # Rebuild hazard grid after weather/cyclone/lightning refreshes
        if agent_name in ("marine_weather", "cyclone_disaster", "lightning"):
            try:
                from backend.fusion.world_state import get_world_state_store
                store = get_world_state_store()
                store.build_hazard_grid(default_bbox)
            except Exception as exc:
                logger.error("Hazard grid rebuild failed after %s refresh: %s", agent_name, exc)


async def _refresh_agent(agent_name: str, bbox: BoundingBox) -> None:
    """Fetch data from a single agent and update the world state."""
    from backend.fusion.world_state import get_world_state_store

    store = get_world_state_store()

    try:
        agent = _get_agent_instance(agent_name)
        response = await agent.fetch(bbox=bbox)
        store.update_agent_data(agent_name, response.data, response.status, response.is_mock)
        _report_health(agent_name, response.status, response.is_mock)
        logger.debug("Refreshed agent: %s (status=%s)", agent_name, response.status)
    except Exception as exc:
        logger.error("Agent refresh failed: %s — %s", agent_name, exc)
        _report_health(agent_name, AgentStatus.ERROR, error=str(exc))


def _get_agent_instance(agent_name: str):
    """Import and get the singleton instance for an agent."""
    if agent_name == "sst_chlorophyll":
        from backend.agents.sst_chlorophyll.agent import get_sst_chlorophyll_agent
        return get_sst_chlorophyll_agent()
    elif agent_name == "marine_weather":
        from backend.agents.marine_weather.agent import get_marine_weather_agent
        return get_marine_weather_agent()
    elif agent_name == "tide":
        from backend.agents.tide.agent import get_tide_agent
        return get_tide_agent()
    elif agent_name == "cyclone_disaster":
        from backend.agents.cyclone_disaster.agent import get_cyclone_disaster_agent
        return get_cyclone_disaster_agent()
    elif agent_name == "lightning":
        from backend.agents.lightning.agent import get_lightning_agent
        return get_lightning_agent()
    elif agent_name == "vessel_ais":
        from backend.agents.vessel_ais.agent import get_vessel_ais_agent
        return get_vessel_ais_agent()
    elif agent_name == "pfz_synthesis":
        from backend.agents.pfz_synthesis.agent import get_pfz_synthesis_agent
        return get_pfz_synthesis_agent()
    elif agent_name == "geofence":
        from backend.agents.geofence.agent import get_geofence_agent
        return get_geofence_agent()
    else:
        raise ValueError(f"Unknown agent: {agent_name}")


def _report_health(
    agent_name: str,
    status: AgentStatus,
    is_mock: bool = False,
    error: str | None = None,
) -> None:
    """Report agent health to the health endpoint."""
    update_agent_health(
        AgentHealthInfo(
            name=agent_name,
            status=status,
            last_fetch=datetime.utcnow(),
            is_mock=is_mock,
            error=error,
        )
    )
