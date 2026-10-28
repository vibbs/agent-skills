"""HTTP app: custom routes, and that /mcp demands a token."""

import httpx

from scaffold_server.config import load_config
from scaffold_server.http.app import create_http_app

ENV = {
    "SCAFFOLD_TRANSPORT": "http",
    "SCAFFOLD_UPSTREAM_BASE_URL": "https://upstream.example.test/api",
    "SCAFFOLD_PUBLIC_URL": "https://mcp.example.test",
    # scaffold:if auth=proxy|auth=resource-server
    "SCAFFOLD_OAUTH_CLIENT_ID": "client-123",
    "SCAFFOLD_OAUTH_TOKEN_URL": "https://idp.example.test/token",
    # scaffold:end
    # scaffold:if auth=proxy
    "SCAFFOLD_OAUTH_AUTHORIZE_URL": "https://idp.example.test/authorize",
    "SCAFFOLD_USERINFO_URL": "https://upstream.example.test/api/me",
    "SCAFFOLD_JWT_SIGNING_KEY": "k" * 43,
    # scaffold:end
    # scaffold:if auth=resource-server
    "SCAFFOLD_JWKS_URI": "https://idp.example.test/jwks",
    "SCAFFOLD_ISSUER": "https://idp.example.test",
    "SCAFFOLD_AUDIENCE": "api://mcp",
    "SCAFFOLD_AUTHORIZATION_SERVER": "https://idp.example.test",
    "SCAFFOLD_EXCHANGE_TOKEN_URL": "https://idp.example.test/token",
    "SCAFFOLD_EXCHANGE_CLIENT_ID": "mcp-server",
    "SCAFFOLD_UPSTREAM_AUDIENCE": "api://upstream",
    # scaffold:end
}


async def _request(method: str, path: str) -> httpx.Response:
    app = create_http_app(load_config(ENV, None)).http_app()
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as http:
            return await http.request(method, path)


async def test_health_is_unauthenticated_liveness():
    resp = await _request("GET", "/health")
    assert resp.status_code == 200 and resp.json() == {"status": "ok"}


async def test_icon_is_served_without_login():
    resp = await _request("GET", "/icon.png")
    assert resp.status_code == 200 and resp.content.startswith(b"\x89PNG")


async def test_mcp_endpoint_requires_a_token():
    resp = await _request("POST", "/mcp")
    assert resp.status_code == 401
    assert "resource_metadata" in resp.headers.get("www-authenticate", "")
