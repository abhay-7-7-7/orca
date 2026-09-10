"""
FastAPI application factory — the single entry point for the ORCA backend.

Start with:
    uvicorn backend.api.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_settings
from backend.core.errors import register_error_handlers
from backend.core.http_client import init_http_client, close_http_client
from backend.core.logging import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info("ORCA backend starting (debug=%s)", settings.debug)

    # ── Startup ─────────────────────────────────────────────────────
    await init_http_client()
    logger.info("HTTP client ready")

    # Import and start the fusion scheduler (lazy import to avoid
    # circular deps during module loading)
    try:
        from backend.fusion.scheduler import start_scheduler
        await start_scheduler()
        logger.info("Fusion scheduler started")
    except ImportError:
        logger.warning("Fusion scheduler not yet implemented — skipping")
    except Exception as exc:
        logger.error("Failed to start fusion scheduler: %s", exc)

    yield

    # ── Shutdown ────────────────────────────────────────────────────
    try:
        from backend.fusion.scheduler import stop_scheduler
        await stop_scheduler()
    except ImportError:
        pass
    except Exception as exc:
        logger.error("Error stopping scheduler: %s", exc)

    await close_http_client()
    logger.info("ORCA backend shut down")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="ORCA — Marine EcOsystem Reasoning with Collaborative Agents",
        description=(
            "Backend API for the ORCA marine decision-support platform. "
            "Provides live ocean data fusion, hazard-aware routing, PFZ synthesis, "
            "and a multilingual conversational interface."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── CORS ────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Tighten for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Error handlers ──────────────────────────────────────────────
    register_error_handlers(app)

    # ── Routes ──────────────────────────────────────────────────────
    from backend.api.routes.health import router as health_router
    app.include_router(health_router)

    # Lazy-import optional routers — don't crash if a module isn't built yet
    _try_include(app, "backend.api.routes.agents", prefix="/api/agents")
    _try_include(app, "backend.api.routes.fusion", prefix="/api/fusion")
    _try_include(app, "backend.api.routes.routing", prefix="/api/routing")
    _try_include(app, "backend.api.routes.chatbot", prefix="/api/chatbot")
    _try_include(app, "backend.api.routes.language", prefix="/api/language")
    _try_include(app, "backend.api.routes.sos", prefix="/api/sos")

    return app


def _try_include(app: FastAPI, module_path: str, prefix: str) -> None:
    """Try to include a router module; log and skip if not yet implemented."""
    try:
        import importlib
        mod = importlib.import_module(module_path)
        router = getattr(mod, "router", None)
        if router:
            app.include_router(router, prefix=prefix)
            logger.info("Loaded router: %s -> %s", module_path, prefix)
        else:
            logger.warning("Module %s has no 'router' attribute -- skipped", module_path)
    except ImportError as exc:
        logger.info("Router %s not yet available: %s", module_path, exc)
    except Exception as exc:
        logger.error("Failed to load router %s: %s", module_path, exc)


# The app instance — uvicorn points at this
app = create_app()
