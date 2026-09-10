"""
Shared async HTTP client — used by all agents for outbound API calls.

Provides a pre-configured httpx.AsyncClient with sensible timeouts,
retry logic, and connection pooling.  Agents import `get_http_client()`
instead of creating their own.
"""

from __future__ import annotations

import httpx

from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)

# Module-level client — initialized once via lifespan, torn down on shutdown.
_client: httpx.AsyncClient | None = None


def _build_client() -> httpx.AsyncClient:
    """Build a shared async HTTP client with sensible defaults."""
    settings = get_settings()
    return httpx.AsyncClient(
        timeout=httpx.Timeout(
            connect=10.0,
            read=30.0,
            write=10.0,
            pool=5.0,
        ),
        limits=httpx.Limits(
            max_connections=100,
            max_keepalive_connections=20,
        ),
        follow_redirects=True,
        headers={
            "User-Agent": "ORCA-Backend/1.0 (marine-ecosystem-reasoning; hackathon)",
        },
    )


async def init_http_client() -> None:
    """Initialize the shared HTTP client (called during FastAPI startup)."""
    global _client
    if _client is None:
        _client = _build_client()
        logger.info("Shared HTTP client initialized")


async def close_http_client() -> None:
    """Close the shared HTTP client (called during FastAPI shutdown)."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("Shared HTTP client closed")


def get_http_client() -> httpx.AsyncClient:
    """
    Get the shared HTTP client.

    Raises RuntimeError if called before ``init_http_client()``.
    """
    if _client is None:
        raise RuntimeError(
            "HTTP client not initialized. "
            "Ensure init_http_client() is called during app startup."
        )
    return _client


async def fetch_json(
    url: str,
    *,
    params: dict | None = None,
    headers: dict | None = None,
    retries: int = 2,
) -> dict:
    """
    Convenience wrapper: GET a URL, return parsed JSON, with retries.

    Raises ``httpx.HTTPStatusError`` on non-2xx after all retries.
    """
    client = get_http_client()
    last_exc: Exception | None = None

    for attempt in range(1, retries + 2):  # retries + 1 initial attempt
        try:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            last_exc = exc
            if attempt <= retries:
                logger.warning(
                    "HTTP fetch attempt %d/%d failed for %s: %s",
                    attempt,
                    retries + 1,
                    url,
                    exc,
                )
            else:
                raise

    # Should never reach here, but satisfy type checker
    raise last_exc  # type: ignore[misc]
