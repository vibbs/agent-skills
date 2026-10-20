import httpx
import pytest
import respx
from fastmcp.server.auth import RemoteAuthProvider

from scaffold_server.auth import token_exchange
from scaffold_server.auth.resource_server import build_resource_server
from scaffold_server.config import load_config

EXCHANGE = "https://idp.example.test/token"


def _cfg(**extra: str):
    env = {
        "SCAFFOLD_TRANSPORT": "http",
        "SCAFFOLD_UPSTREAM_BASE_URL": "https://upstream.example.test/api",
        "SCAFFOLD_PUBLIC_URL": "https://mcp.example.test",
        "SCAFFOLD_OAUTH_CLIENT_ID": "client-123",
        "SCAFFOLD_OAUTH_TOKEN_URL": EXCHANGE,
        "SCAFFOLD_JWKS_URI": "https://idp.example.test/jwks",
        "SCAFFOLD_ISSUER": "https://idp.example.test",
        "SCAFFOLD_AUDIENCE": "api://mcp",
        "SCAFFOLD_AUTHORIZATION_SERVER": "https://idp.example.test",
        "SCAFFOLD_EXCHANGE_TOKEN_URL": EXCHANGE,
        "SCAFFOLD_EXCHANGE_CLIENT_ID": "mcp-server",
        "SCAFFOLD_EXCHANGE_CLIENT_SECRET": "s3cret",
        "SCAFFOLD_UPSTREAM_AUDIENCE": "api://upstream",
        **extra,
    }
    return load_config(env, None)


def test_builds_remote_auth_provider():
    assert isinstance(build_resource_server(_cfg()), RemoteAuthProvider)


@respx.mock
async def test_rfc8693_exchange_never_forwards_inbound_token():
    token_exchange._cache.clear()
    route = respx.post(EXCHANGE).mock(
        return_value=httpx.Response(200, json={"access_token": "upstream-tok", "expires_in": 3600}))
    assert await token_exchange.exchange(_cfg(), "inbound-jwt") == "upstream-tok"
    form = route.calls.last.request.read().decode()
    assert "grant-type%3Atoken-exchange" in form and "audience=api%3A%2F%2Fupstream" in form
    # cached: a second call costs nothing
    assert await token_exchange.exchange(_cfg(), "inbound-jwt") == "upstream-tok"
    assert route.call_count == 1


@respx.mock
async def test_entra_on_behalf_of_variant():
    token_exchange._cache.clear()
    route = respx.post(EXCHANGE).mock(
        return_value=httpx.Response(200, json={"access_token": "obo", "expires_in": 3600}))
    await token_exchange.exchange(_cfg(SCAFFOLD_EXCHANGE_GRANT="entra-obo"), "inbound-jwt")
    form = route.calls.last.request.read().decode()
    assert "requested_token_use=on_behalf_of" in form
    assert "scope=api%3A%2F%2Fupstream%2F.default" in form


@respx.mock
async def test_exchange_failure_explains_what_to_check():
    token_exchange._cache.clear()
    respx.post(EXCHANGE).mock(return_value=httpx.Response(400, json={"error": "invalid_grant"}))
    with pytest.raises(token_exchange.TokenExchangeError, match="SCAFFOLD_EXCHANGE_"):
        await token_exchange.exchange(_cfg(), "inbound-jwt")
