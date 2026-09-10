"""
Agent API routes — per-agent status and data endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.models.common import AgentResponse, BoundingBox, GeoPoint
from backend.models.geofence import GeofenceCheckRequest, GeofenceCheckResponse, GeofencePathResponse
from backend.api.routes.health import get_agent_health

router = APIRouter(tags=["agents"])


@router.get("/{agent_name}/status")
async def agent_status(agent_name: str):
    """Get the current status of a specific agent."""
    health = get_agent_health(agent_name)
    return health


@router.post("/geofence/check", response_model=GeofenceCheckResponse)
async def geofence_check(request: GeofenceCheckRequest):
    """Check a point against geofence boundaries (EEZ, MPA, bathymetry)."""
    from backend.agents.geofence.agent import get_geofence_agent

    agent = get_geofence_agent()
    if not agent._eez_loaded:
        await agent.initialize()

    if request.point:
        return agent.check_point(request.point)
    elif request.path and len(request.path) > 0:
        return agent.check_point(request.path[0])
    else:
        return GeofenceCheckResponse(
            point=GeoPoint(lat=0, lon=0),
            warnings=["No point or path provided"],
        )


@router.post("/geofence/check-path", response_model=GeofencePathResponse)
async def geofence_check_path(request: GeofenceCheckRequest):
    """Check an entire path against geofence boundaries."""
    from backend.agents.geofence.agent import get_geofence_agent

    agent = get_geofence_agent()
    if not agent._eez_loaded:
        await agent.initialize()

    if not request.path:
        return GeofencePathResponse(violations=["No path provided"])

    checks = agent.check_path(request.path)
    violations = []
    path_safe = True

    for check in checks:
        if not check.is_safe:
            path_safe = False
            violations.extend(check.warnings)

    return GeofencePathResponse(
        checks=checks,
        path_is_safe=path_safe,
        violations=violations,
    )


@router.get("/sst_chlorophyll/data")
async def sst_chlorophyll_data(
    min_lat: float = Query(5.0),
    max_lat: float = Query(25.0),
    min_lon: float = Query(65.0),
    max_lon: float = Query(100.0),
):
    """Get SST and Chlorophyll data for a region."""
    from backend.agents.sst_chlorophyll.agent import get_sst_chlorophyll_agent

    agent = get_sst_chlorophyll_agent()
    bbox = BoundingBox(min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon)
    response = await agent.fetch(bbox=bbox)
    return response


@router.get("/pfz_synthesis/data")
async def pfz_synthesis_data(
    min_lat: float = Query(5.0),
    max_lat: float = Query(25.0),
    min_lon: float = Query(65.0),
    max_lon: float = Query(100.0),
):
    """Get PFZ synthesis candidates for a region."""
    from backend.agents.pfz_synthesis.agent import get_pfz_synthesis_agent

    agent = get_pfz_synthesis_agent()
    bbox = BoundingBox(min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon)
    response = await agent.fetch(bbox=bbox)
    return response


@router.get("/marine_weather/data")
async def marine_weather_data(
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    min_lat: float = Query(5.0),
    max_lat: float = Query(25.0),
    min_lon: float = Query(65.0),
    max_lon: float = Query(100.0),
):
    """Get marine weather data (point or region query)."""
    from backend.agents.marine_weather.agent import get_marine_weather_agent

    agent = get_marine_weather_agent()
    bbox = BoundingBox(min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon)
    response = await agent.fetch(bbox=bbox, lat=lat, lon=lon)
    return response


@router.get("/tide/data")
async def tide_data(
    lat: float = Query(9.9312),
    lon: float = Query(76.2673),
):
    """Get tide predictions for a location."""
    from backend.agents.tide.agent import get_tide_agent

    agent = get_tide_agent()
    response = await agent.fetch(lat=lat, lon=lon)
    return response


@router.get("/cyclone_disaster/data")
async def cyclone_disaster_data():
    """Get active cyclone and disaster alerts."""
    from backend.agents.cyclone_disaster.agent import get_cyclone_disaster_agent

    agent = get_cyclone_disaster_agent()
    response = await agent.fetch()
    return response


@router.get("/lightning/data")
async def lightning_data():
    """Get lightning cluster data."""
    from backend.agents.lightning.agent import get_lightning_agent

    agent = get_lightning_agent()
    response = await agent.fetch()
    return response


@router.get("/vessel_ais/data")
async def vessel_ais_data(
    min_lat: float = Query(8.0),
    max_lat: float = Query(15.0),
    min_lon: float = Query(72.0),
    max_lon: float = Query(80.0),
):
    """Get vessel positions and fishing effort data."""
    from backend.agents.vessel_ais.agent import get_vessel_ais_agent

    agent = get_vessel_ais_agent()
    bbox = BoundingBox(min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon)
    response = await agent.fetch(bbox=bbox)
    return response
