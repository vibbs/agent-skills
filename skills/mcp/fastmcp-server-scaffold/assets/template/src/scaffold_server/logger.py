"""Logger factory.

Logs go to stderr, never stdout: on the stdio transport stdout *is* the protocol
stream, and a single stray line corrupts it. MCP protocol logging
(notifications/message) is deprecated as of spec 2026-07-28; stderr plus
OpenTelemetry is the replacement, so nothing here uses ctx.info() and friends.
"""

import logging
import os
import sys

_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def create_logger(component: str) -> logging.Logger:
    log = logging.getLogger(f"scaffold_server.{component}")
    if not log.handlers:  # repeated calls must not duplicate output
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter(_FORMAT))
        log.addHandler(handler)
        log.setLevel(os.environ.get("SCAFFOLD_LOG_LEVEL", "INFO").upper())
        log.propagate = False
    return log


# Routed separately from operational logs so it can be shipped and retained on its own.
audit_log = create_logger("audit")
