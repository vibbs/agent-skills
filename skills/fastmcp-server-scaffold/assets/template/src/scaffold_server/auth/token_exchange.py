"""Exchange an inbound token (issued for this server) for a per-user upstream token.

Two grants, chosen by SCAFFOLD_EXCHANGE_GRANT:
  rfc8693    OAuth 2.0 Token Exchange (Okta, Auth0, Keycloak, Ping and others)
  entra-obo  Microsoft Entra ID's on-behalf-of flow (jwt-bearer grant)

Results are cached per inbound token until shortly before the upstream token expires.
The MCP spec forbids passing the inbound token through to another service; this exchange
is the compliant way to call the upstream as the same user.
"""

import hashlib
import time

import httpx

from ..config import AppConfig

_SAFETY_MARGIN_S = 60
_cache: dict[str, tuple[float, str]] = {}


class TokenExchangeError(RuntimeError):
    pass


def _form(cfg: AppConfig, subject_token: str) -> dict[str, str]:
    scope = " ".join(cfg.upstream_scopes)
    if cfg.exchange_grant == "entra-obo":
        return {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": subject_token,
            "requested_token_use": "on_behalf_of",
            "scope": scope or f"{cfg.upstream_audience}/.default",
        }
    form = {
        "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
        "subject_token": subject_token,
        "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
        "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",
        "audience": cfg.upstream_audience or "",
    }
    if scope:
        form["scope"] = scope
    return form


async def exchange(cfg: AppConfig, subject_token: str) -> str:
    key = hashlib.sha256(subject_token.encode()).hexdigest()
    hit = _cache.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    assert cfg.exchange_token_url and cfg.exchange_client_id
    auth = httpx.BasicAuth(cfg.exchange_client_id, cfg.exchange_client_secret or "")
    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.post(cfg.exchange_token_url, data=_form(cfg, subject_token), auth=auth)
    if resp.status_code != 200:
        raise TokenExchangeError(
            f"Token exchange failed ({resp.status_code}). Check SCAFFOLD_EXCHANGE_* settings "
            "and that the identity provider allows this client to exchange tokens."
        )
    body = resp.json()
    token = body["access_token"]
    lifetime = int(body.get("expires_in", 300))
    now = time.time()
    if len(_cache) > 1000:  # bound memory: drop expired entries
        for k in [k for k, (exp, _) in _cache.items() if exp <= now]:
            del _cache[k]
    _cache[key] = (now + max(lifetime - _SAFETY_MARGIN_S, 30), token)
    return token
