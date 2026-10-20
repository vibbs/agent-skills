"""authed_client(): the one seam that hides the transport and auth-mode difference.

Every upstream client calls authed_client(cfg) and knows nothing about which transport
is live. The server always acts as the signed-in human with that human's own upstream
token, so the upstream's permission model is the backstop. There is no service account.

Where the bearer comes from:
  stdio, auth=none             SCAFFOLD_UPSTREAM_TOKEN from the environment
  stdio, proxy/resource-server the local token file written by scripts/oauth_login.py
  http,  proxy                 the upstream token the OAuth proxy holds for this user
  http,  resource-server       an RFC 8693 / on-behalf-of exchange of the inbound token;
                               the inbound token is never forwarded (no token passthrough)
"""

import httpx

from ..config import AppConfig


async def upstream_bearer(cfg: AppConfig) -> str:
    # scaffold:if http
    if cfg.transport == "http":
        from fastmcp.server.dependencies import get_access_token

        token = get_access_token()
        if token is None:
            raise RuntimeError(
                "No authenticated session for this request (missing, expired, or revoked token)."
            )
        # scaffold:if auth=resource-server
        if cfg.auth_mode == "resource-server":
            from .token_exchange import exchange

            return await exchange(cfg, token.token)
        # scaffold:end
        return token.token
    # scaffold:end
    # scaffold:if auth=none
    if cfg.auth_mode == "none":
        assert cfg.upstream_token  # load_config() guarantees it in this mode
        return cfg.upstream_token
    # scaffold:end
    # scaffold:if auth=proxy|auth=resource-server
    from .tokens import get_access_token as file_token

    return await file_token(cfg)
    # scaffold:end


async def authed_client(cfg: AppConfig) -> httpx.AsyncClient:
    bearer = await upstream_bearer(cfg)
    return httpx.AsyncClient(
        base_url=cfg.upstream_base_url,
        headers={"Authorization": f"Bearer {bearer}"},
        timeout=30.0,
    )
