"""Per-user rate limiting (the MCP spec says servers MUST rate-limit tool calls).

Keyed on the authenticated user, not globally. Buckets live in process memory, so the
limit applies per replica.
"""

from fastmcp.server.middleware import MiddlewareContext
from fastmcp.server.middleware.rate_limiting import RateLimitingMiddleware

from ..audit import caller_identity


def _user_key(_: MiddlewareContext) -> str:
    return str(caller_identity().get("subject") or "anonymous")


def user_rate_limiter(rps: float) -> RateLimitingMiddleware:
    return RateLimitingMiddleware(max_requests_per_second=rps, burst_capacity=int(rps * 2) or 1,
                                  get_client_id=_user_key)
