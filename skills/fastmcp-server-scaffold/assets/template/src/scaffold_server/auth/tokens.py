"""stdio path: tokens from scripts/oauth_login.py, persisted to a 0600 JSON file.

LOAD-BEARING RULE: save_tokens() always stamps an absolute `expires_at`, derived from the
returned lifetime minus a safety margin, with a conservative fallback when the upstream
omits it. Without the stamp, every call looks expired and refreshes, which trips the
upstream token endpoint's rate limit. Do not "simplify" this back.
"""

import json
import time
from pathlib import Path
from typing import Any

import httpx

from ..config import AppConfig

_SAFETY_MARGIN_S = 60
_FALLBACK_LIFETIME_S = 300


def save_tokens(cfg: AppConfig, payload: dict[str, Any], previous: dict[str, Any] | None = None) -> dict[str, Any]:
    lifetime = payload.get("expires_in")
    try:
        lifetime_s = int(lifetime) if lifetime is not None else _FALLBACK_LIFETIME_S
    except (TypeError, ValueError):
        lifetime_s = _FALLBACK_LIFETIME_S
    data = dict(payload)
    data["expires_at"] = int(time.time()) + max(lifetime_s - _SAFETY_MARGIN_S, 30)
    # Some upstreams omit the refresh token on refresh; keep the one we had.
    if not data.get("refresh_token") and previous and previous.get("refresh_token"):
        data["refresh_token"] = previous["refresh_token"]
    path = Path(cfg.token_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))
    path.chmod(0o600)
    return data


def load_tokens(cfg: AppConfig) -> dict[str, Any] | None:
    path = Path(cfg.token_file)
    if not path.is_file():
        return None
    return json.loads(path.read_text())


def token_request(cfg: AppConfig, form: dict[str, str]) -> dict[str, Any]:
    """Keyword arguments for a token-endpoint POST. Confidential clients use HTTP Basic;
    public clients send client_id in the form body (and rely on PKCE)."""
    if cfg.oauth_client_secret:
        return {"data": form, "auth": httpx.BasicAuth(cfg.oauth_client_id or "", cfg.oauth_client_secret)}
    return {"data": {**form, "client_id": cfg.oauth_client_id or ""}}


async def get_access_token(cfg: AppConfig) -> str:
    data = load_tokens(cfg)
    if data and data.get("expires_at") and time.time() < data["expires_at"]:
        return data["access_token"]
    if not data or not data.get("refresh_token"):
        raise RuntimeError(
            "Not signed in to the upstream. Run: uv run python scripts/oauth_login.py"
        )
    request = token_request(cfg, {"grant_type": "refresh_token", "refresh_token": data["refresh_token"]})
    assert cfg.oauth_token_url  # load_config() guarantees it in this mode
    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.post(cfg.oauth_token_url, **request)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Refreshing the upstream token failed ({resp.status_code}). "
            "Sign in again: uv run python scripts/oauth_login.py"
        )
    return save_tokens(cfg, resp.json(), previous=data)["access_token"]
