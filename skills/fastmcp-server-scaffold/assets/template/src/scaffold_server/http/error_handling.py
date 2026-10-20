"""Unhandled exceptions become clean JSON: full context in the server log, nothing leaked
to the caller. Covers the auth layer and custom routes, which mask_error_details (tools
only) cannot see. Wired in at .run(middleware=...) so the app factory stays testable."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from ..logger import create_logger

log = create_logger("http")


class UnhandledErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):  # type: ignore[override]
        try:
            return await call_next(request)
        except Exception:
            log.exception("Unhandled exception handling %s %s", request.method, request.url.path)
            message = "An unexpected error occurred. Try again; if it persists, contact support."
            return JSONResponse({"error": "internal_error", "message": message}, status_code=500)
