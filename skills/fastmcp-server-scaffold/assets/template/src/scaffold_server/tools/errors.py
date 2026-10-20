"""Failure results.

Tools *return* failures; they never let an exception reach the wire. A failure is the
standard dict {"ok": False, "code", "message", ...}, sent as JSON text in a result with
isError: true. The MCP spec asks for isError on tool-execution errors so the model can
self-correct, and the dict shape lets it explain what happened and what to do next.

No structuredContent on errors: a tool's outputSchema describes its success shape, and
client validators are not consistent about error results.
"""

import json
from typing import Any

from fastmcp.exceptions import ToolError


def failure(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"ok": False, "code": code, "message": message, **extra}


def raise_failure(result: dict[str, Any]) -> None:
    """Turn a failure dict into an isError result. ToolError text always reaches the
    client, even with mask_error_details=True; other exceptions are masked."""
    raise ToolError(json.dumps(result))


def unwrap(result: dict[str, Any]) -> dict[str, Any]:
    """Registry helper: pass successes through, convert failures to isError results.

    A needs_confirmation result is not a failure: nothing went wrong, the tool is asking
    the model to confirm with the user. It is returned normally.
    """
    if result.get("ok") is False and not result.get("needs_confirmation"):
        raise_failure(result)
    return result
