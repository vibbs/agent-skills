"""Error normalisation shared by every upstream client.

The single place an upstream HTTP error becomes the standard failure dict. Every client
calls it; no client formats its own errors. Raw vendor payloads never pass through: the
detail is truncated, and the hint explains in plain language how to read the status.
"""

from typing import Any

import httpx

_HINTS = {
    400: "The upstream rejected the request as invalid; check the parameters.",
    401: "The upstream did not accept the sign-in; the user may need to sign in again.",
    403: "The signed-in user is not allowed to do this upstream.",
    404: "The upstream has no such record, or the user cannot see it.",
    409: "The record changed upstream; read it again before retrying.",
    429: "The upstream is rate limiting; wait and retry later.",
}


def _hint(status: int) -> str:
    if status in _HINTS:
        return _HINTS[status]
    if status >= 500:
        return "The upstream failed; this is not the user's fault. Retry later."
    return "The upstream returned an unexpected status."


def _short_detail(resp: httpx.Response, limit: int = 300) -> str:
    try:
        body: Any = resp.json()
    except ValueError:
        body = resp.text
    if isinstance(body, dict):
        text = body.get("message") or body.get("error") or str(body)
    else:
        text = str(body)
    text = " ".join(str(text).split())
    return text[:limit] + ("..." if len(text) > limit else "")


def upstream_error(resp: httpx.Response) -> dict[str, Any]:
    return {
        "ok": False,
        "code": f"upstream_{resp.status_code}",
        "status": resp.status_code,
        "message": _hint(resp.status_code),
        "hint": _hint(resp.status_code),
        "detail": _short_detail(resp),
    }


def transport_error(exc: httpx.HTTPError) -> dict[str, Any]:
    return {
        "ok": False,
        "code": "upstream_unreachable",
        "message": "Could not reach the upstream API. Retry later.",
        "detail": type(exc).__name__,
    }
