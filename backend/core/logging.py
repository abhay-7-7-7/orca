"""
Structured logging setup for the ORCA backend.

Every module uses `get_logger(__name__)` to get a consistently
configured logger.  JSON formatting in production; human-readable
in debug mode.
"""

from __future__ import annotations

import logging
import sys
from typing import Optional

from backend.core.config import get_settings


_CONFIGURED = False


def _setup_logging() -> None:
    """Configure the root logger once."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    settings = get_settings()
    level = logging.DEBUG if settings.debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger("orca")
    root.setLevel(level)
    root.addHandler(handler)

    # Quiet down noisy third-party loggers
    for noisy in ("httpx", "httpcore", "urllib3", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _CONFIGURED = True


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger under the ``orca`` namespace.

    Usage::

        from backend.core.logging import get_logger
        logger = get_logger(__name__)
        logger.info("Agent fetched data", extra={"rows": 42})
    """
    _setup_logging()
    if name:
        return logging.getLogger(f"orca.{name}")
    return logging.getLogger("orca")
