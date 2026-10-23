"""HTTP proxy mode: this server is an OAuth resource server to MCP clients and an OAuth
client to the upstream. FastMCP's OAuthProxy bridges the two; this module supplies:

1. A token verifier. The upstream issues opaque tokens with no JWKS or introspection, so
   the only honest check is a live call to a cheap "who am I" endpoint. Results are
   cached briefly so a burst of tool calls costs one upstream call.
2. An identity-claims hook. Opaque tokens carry no identity, so identity is fetched once
   per code exchange and once per refresh (never per tool call) and embedded in the token
   the proxy issues. Later requests read it from AccessToken.claims["upstream_claims"].
3. Explicit proxy parameters. Every one is pinned, with a comment naming the failure it
   prevents. Framework defaults will not always match your upstream.
"""

import hashlib
import time
from typing import Any

import httpx
from fastmcp.server.auth import AccessToken, OAuthProxy, TokenVerifier

from ..config import AppConfig

_CACHE_TTL_S = 60


class UserinfoVerifier(TokenVerifier):
    def __init__(self, userinfo_url: str, scopes: list[str]) -> None:
        super().__init__()
        self.userinfo_url = userinfo_url
        self.scopes = scopes
        self._cache: dict[str, tuple[float, AccessToken]] = {}

    async def verify_token(self, token: str) -> AccessToken | None:
        key = hashlib.sha256(token.encode()).hexdigest()
        hit = self._cache.get(key)
        if hit and hit[0] > time.monotonic():
            return hit[1]
        profile = await fetch_userinfo(self.userinfo_url, token)
        if profile is None:
            self._cache.pop(key, None)
            return None
        result = AccessToken(
            token=token,
            client_id=str(profile.get("id")),
            scopes=self.scopes,
            subject=str(profile.get("id")),
        )
        self._cache[key] = (time.monotonic() + _CACHE_TTL_S, result)
        return result


async def fetch_userinfo(url: str, token: str) -> dict[str, Any] | None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(url, headers={"Authorization": f"Bearer {token}"})
    except httpx.HTTPError:
        return None
    if resp.status_code != 200:
        return None
    profile = resp.json()
    return profile if isinstance(profile, dict) and profile.get("id") else None


class IdentityProxy(OAuthProxy):
    """Embeds the caller's identity in the proxy-issued token, once per login/refresh.

    _extract_upstream_claims is a private FastMCP hook (still underscore-prefixed in
    4.1). tests/unit/test_auth_proxy.py fails if it stops being called; check it on
    every FastMCP upgrade.
    """

    def __init__(self, *, userinfo_url: str, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._userinfo_url = userinfo_url

    async def _extract_upstream_claims(self, idp_tokens: dict[str, Any]) -> dict[str, Any] | None:
        profile = await fetch_userinfo(self._userinfo_url, idp_tokens.get("access_token", ""))
        if not profile:
            return None
        return {"sub": str(profile.get("id")), "email": profile.get("email")}


def build_proxy(cfg: AppConfig) -> OAuthProxy:
    assert cfg.oauth_authorize_url and cfg.oauth_token_url and cfg.oauth_client_id
    assert cfg.userinfo_url and cfg.public_url and cfg.jwt_signing_key
    return IdentityProxy(
        userinfo_url=cfg.userinfo_url,
        upstream_authorization_endpoint=cfg.oauth_authorize_url,
        upstream_token_endpoint=cfg.oauth_token_url,
        upstream_client_id=cfg.oauth_client_id,
        upstream_client_secret=cfg.oauth_client_secret,
        token_verifier=UserinfoVerifier(cfg.userinfo_url, cfg.oauth_scopes),
        base_url=cfg.public_url,
        # Pinned rather than inherited: many upstreams allow one registered redirect URI
        # per API client, so each deployed environment needs its own API client.
        redirect_path="/auth/callback",
        # Client-facing scopes. An empty list rejects registration from MCP clients that
        # request scopes, which several common clients do by default.
        valid_scopes=cfg.oauth_scopes or None,
        # Pinned explicitly. Some upstreams reject the RFC 8707 `resource` parameter, and
        # the rejection can arrive as a URL fragment the server never sees. Set False if
        # logins fail with a bare "missing code" error.
        forward_resource=True,
        forward_pkce=True,
        # Confused-deputy defence: the spec requires per-client user consent when a proxy
        # uses one static upstream client id. True is FastMCP's default; pin it anyway.
        require_authorization_consent=True,
        # Client ID Metadata Documents are the spec's recommended registration path;
        # Dynamic Client Registration is deprecated (spec 2026-07-28).
        enable_cimd=True,
        # Without an explicit key the proxy derives one from the client secret, so
        # rotating the secret would sign everyone out. config.py requires it.
        jwt_signing_key=cfg.jwt_signing_key,
        # No client_storage: FastMCP's encrypted, process-scoped file store is used.
        # Degraded mode, documented: a restart or a second replica means users sign in
        # again. Pass an encrypted shared store (see references/auth.md) for durability.
    )
