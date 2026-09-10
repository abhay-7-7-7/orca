"""
Agents package — base classes for all ORCA data agents.

Every agent inherits from ``AgentBase`` and implements a consistent
``fetch()`` interface so the fusion layer can call all eight uniformly.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Generic, TypeVar

from backend.core.config import get_settings
from backend.core.logging import get_logger
from backend.models.common import AgentResponse, AgentStatus, BoundingBox

logger = get_logger(__name__)

T = TypeVar("T")


class AgentBase(ABC, Generic[T]):
    """
    Abstract base for all data agents.

    Subclasses implement ``_fetch_live()`` and ``_fetch_mock()`` — this
    base class handles the mock-mode decision, error wrapping, and
    cache-check logic so each agent can focus on its domain.
    """

    # Subclass must set these
    agent_name: str = ""
    update_cadence_seconds: int = 3600  # how often the fusion scheduler should call this

    def __init__(self):
        self._settings = get_settings()
        self._cache: dict[str, tuple[datetime, AgentResponse[T]]] = {}
        self._cache_ttl_seconds: int = self.update_cadence_seconds
        self._logger = get_logger(f"agents.{self.agent_name}")

    @property
    def is_mock(self) -> bool:
        return self._settings.should_mock(self.agent_name)

    async def fetch(
        self,
        bbox: BoundingBox | None = None,
        **kwargs,
    ) -> AgentResponse[T]:
        """
        Main entry point — returns data (live or mock), never raises
        an unhandled exception into the caller.
        """
        cache_key = self._make_cache_key(bbox, **kwargs)

        # Check cache
        if cache_key in self._cache:
            cached_time, cached_resp = self._cache[cache_key]
            age = (datetime.utcnow() - cached_time).total_seconds()
            if age < self._cache_ttl_seconds:
                self._logger.debug("Cache hit (age=%.0fs)", age)
                return cached_resp

        # Decide mock vs live
        if self.is_mock:
            self._logger.info("Running in MOCK mode")
            try:
                data = await self._fetch_mock(bbox=bbox, **kwargs)
                resp = AgentResponse[T](
                    status=AgentStatus.MOCK,
                    agent_name=self.agent_name,
                    data=data,
                    is_mock=True,
                )
            except Exception as exc:
                self._logger.error("Mock fetch failed: %s", exc)
                resp = AgentResponse[T](
                    status=AgentStatus.ERROR,
                    agent_name=self.agent_name,
                    error_detail=f"Mock fetch failed: {exc}",
                    is_mock=True,
                )
        else:
            try:
                data = await self._fetch_live(bbox=bbox, **kwargs)
                resp = AgentResponse[T](
                    status=AgentStatus.OK,
                    agent_name=self.agent_name,
                    data=data,
                )
            except Exception as exc:
                self._logger.error("Live fetch failed: %s — falling back to mock", exc)
                # Fall back to mock on live failure, but mark status clearly
                try:
                    data = await self._fetch_mock(bbox=bbox, **kwargs)
                    resp = AgentResponse[T](
                        status=AgentStatus.ERROR,
                        agent_name=self.agent_name,
                        data=data,
                        error_detail=f"Live fetch failed ({exc}); serving stale/mock data",
                        is_mock=True,
                    )
                except Exception as mock_exc:
                    resp = AgentResponse[T](
                        status=AgentStatus.UNAVAILABLE,
                        agent_name=self.agent_name,
                        error_detail=f"Both live ({exc}) and mock ({mock_exc}) failed",
                    )

        # Update cache
        self._cache[cache_key] = (datetime.utcnow(), resp)
        return resp

    @abstractmethod
    async def _fetch_live(self, bbox: BoundingBox | None = None, **kwargs) -> T:
        """Fetch real data from external APIs. Must be implemented by subclass."""
        ...

    @abstractmethod
    async def _fetch_mock(self, bbox: BoundingBox | None = None, **kwargs) -> T:
        """Return clearly-labeled synthetic data. Must be implemented by subclass."""
        ...

    def _make_cache_key(self, bbox: BoundingBox | None, **kwargs) -> str:
        """Build a cache key from the query parameters."""
        parts = [self.agent_name]
        if bbox:
            parts.append(f"{bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon}")
        for k, v in sorted(kwargs.items()):
            parts.append(f"{k}={v}")
        return "|".join(parts)

    def clear_cache(self) -> None:
        """Clear all cached data for this agent."""
        self._cache.clear()
        self._logger.info("Cache cleared")
