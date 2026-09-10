"""
Custom exceptions and FastAPI error-handling middleware.

Every agent failure surfaces as a structured JSON response,
never an unhandled 500 with a bare stack trace.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.core.logging import get_logger

logger = get_logger(__name__)


# ── Custom Exceptions ───────────────────────────────────────────────────


class OrcaError(Exception):
    """Base exception for all ORCA backend errors."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AgentUnavailableError(OrcaError):
    """Raised when an agent cannot provide data (missing key, service down)."""

    def __init__(self, agent_name: str, reason: str = "Agent unavailable"):
        self.agent_name = agent_name
        super().__init__(
            message=f"Agent '{agent_name}' is unavailable: {reason}",
            status_code=503,
        )


class ExternalAPIError(OrcaError):
    """Raised when an external API call fails after retries."""

    def __init__(self, source: str, detail: str):
        self.source = source
        super().__init__(
            message=f"External API error ({source}): {detail}",
            status_code=502,
        )


class DataFetchError(OrcaError):
    """Raised when data fetching/parsing fails."""

    def __init__(self, detail: str):
        super().__init__(message=f"Data fetch error: {detail}", status_code=500)


class ValidationError(OrcaError):
    """Raised for invalid request parameters."""

    def __init__(self, detail: str):
        super().__init__(message=detail, status_code=422)


# ── Error Handlers ──────────────────────────────────────────────────────


def register_error_handlers(app: FastAPI) -> None:
    """Attach exception handlers to the FastAPI app."""

    @app.exception_handler(OrcaError)
    async def orca_error_handler(request: Request, exc: OrcaError) -> JSONResponse:
        logger.error("OrcaError: %s", exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": type(exc).__name__,
                "message": exc.message,
                "status_code": exc.status_code,
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred. Check server logs.",
                "status_code": 500,
            },
        )
