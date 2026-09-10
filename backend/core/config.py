"""
Centralized configuration — all env vars loaded via Pydantic BaseSettings.

Every external URL, API key, and tunable parameter is defined here.
Agent files import `settings` and never hardcode URLs or credentials.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


# Resolve project root (two levels up from this file: core/ -> backend/ -> project root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings — reads from .env at the project root."""

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Server ──────────────────────────────────────────────────────────
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    debug: bool = True

    # ── Mock Flags ──────────────────────────────────────────────────────
    # When True, the agent returns clearly-labeled synthetic data instead
    # of calling the real external API.  A missing/invalid API key for a
    # key-dependent agent automatically forces mock mode even if the flag
    # is False — this prevents silent false negatives.
    mock_sst_chlorophyll: bool = False
    mock_marine_weather: bool = False
    mock_cyclone_disaster: bool = False
    mock_lightning: bool = True
    mock_tide: bool = False
    mock_vessel_ais: bool = True
    mock_geofence: bool = False
    mock_pfz_synthesis: bool = False

    # ── API Keys (required for live mode on key-dependent agents) ──────
    aisstream_api_key: str = ""
    gfw_api_token: str = ""
    wdpa_api_token: str = ""
    bhashini_user_id: str = ""
    bhashini_api_key: str = ""
    bhashini_pipeline_id: str = ""
    llm_provider: str = "anthropic"
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-4-20250514"
    copernicus_username: str = ""
    copernicus_password: str = ""

    # ── External API URLs ───────────────────────────────────────────────
    erddap_base_url: str = "https://coastwatch.pfeg.noaa.gov/erddap"
    open_meteo_marine_url: str = "https://marine-api.open-meteo.com/v1/marine"
    open_meteo_weather_url: str = "https://api.open-meteo.com/v1/forecast"
    ndbc_base_url: str = "https://www.ndbc.noaa.gov/data/realtime2"
    gdacs_feed_url: str = "https://www.gdacs.org/xml/rss.xml"
    aisstream_ws_url: str = "wss://stream.aisstream.io/v0/stream"
    gfw_api_url: str = "https://gateway.api.globalfishingwatch.org"
    bhashini_api_url: str = "https://meity-auth.ulcacontrib.org"
    gebco_wms_url: str = "https://wms.gebco.net/mapserv"

    # ── Data Paths (relative to project root) ───────────────────────────
    eez_data_path: str = "data/eez_boundaries"
    mpa_data_path: str = "data/mpa"
    bathymetry_data_path: str = "data/bathymetry"
    seed_data_path: str = "data/seed"

    # ── Grid / Routing Config ───────────────────────────────────────────
    grid_resolution: float = 0.1  # degrees lat/lon
    reroute_cost_threshold: float = 0.5  # 50% cost increase triggers reroute

    # ── Default Harbor (Kochi) ──────────────────────────────────────────
    default_harbor_lat: float = 9.9312
    default_harbor_lon: float = 76.2673

    # ── Helpers ─────────────────────────────────────────────────────────

    @property
    def project_root(self) -> Path:
        return _PROJECT_ROOT

    def resolve_data_path(self, relative: str) -> Path:
        """Resolve a data path relative to the project root."""
        return _PROJECT_ROOT / relative

    def should_mock(self, agent_name: str) -> bool:
        """
        Check whether an agent should run in mock mode.

        Returns True if either:
        - The explicit mock flag is set, OR
        - The agent requires a key that hasn't been provided.
        """
        flag_name = f"mock_{agent_name}"
        flag_value = getattr(self, flag_name, False)
        if flag_value:
            return True

        # Auto-mock if required credentials are missing
        key_requirements: dict[str, list[str]] = {
            "vessel_ais": ["aisstream_api_key"],
            "geofence": [],  # WDPA token optional — falls back to local data
            "lightning": [],  # No key needed — community MQTT
        }
        required_keys = key_requirements.get(agent_name, [])
        for key_name in required_keys:
            if not getattr(self, key_name, ""):
                return True

        return False


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — call this everywhere instead of constructing Settings()."""
    return Settings()
