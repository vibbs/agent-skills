"""Audit hook for write tools.

Records who did what, to which target, and how it ended, on a dedicated logger so the
trail can be routed and retained on its own. This is an audit hook, not access control:
for real authorization use FastMCP's require_scopes / require_roles / AuthMiddleware
(see references/auth.md in the skill that generated this project).
"""

from typing import Any

from fastmcp.server.middleware import Middleware, MiddlewareContext

from ..logger import audit_log
from ..tools.writes import WRITE_TOOLS


def caller_identity() -> dict[str, Any]:
    try:
        from fastmcp.server.dependencies import get_access_token
    except ImportError:  # pragma: no cover
        return {}
    token = get_access_token()
    if token is None:
        return {"subject": "local"}  # stdio: the single local user
    claims = token.claims or {}
    upstream = claims.get("upstream_claims") or {}
    return {
        "subject": upstream.get("sub") or claims.get("sub") or token.subject,
        "email": upstream.get("email") or claims.get("email"),
    }


class AuditMiddleware(Middleware):
    async def on_call_tool(self, context: MiddlewareContext, call_next):  # type: ignore[override]
        name = getattr(context.message, "name", "")
        if name not in WRITE_TOOLS:
            return await call_next(context)
        who = caller_identity()
        args = dict(getattr(context.message, "arguments", None) or {})
        target = {k: v for k, v in args.items() if k.endswith("_id")}
        try:
            result = await call_next(context)
        except Exception as exc:
            audit_log.info(
                "write tool=%s by=%s target=%s outcome=error:%s",
                name,
                who,
                target,
                type(exc).__name__,
            )
            raise
        audit_log.info(
            "write tool=%s by=%s target=%s confirmed=%s outcome=returned",
            name,
            who,
            target,
            bool(args.get("user_confirmed")),
        )
        return result
