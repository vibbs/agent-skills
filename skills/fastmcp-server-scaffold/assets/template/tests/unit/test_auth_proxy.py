import httpx
import respx
from fastmcp.server.auth import OAuthProxy

from scaffold_server.auth.proxy import IdentityProxy, UserinfoVerifier, build_proxy
from scaffold_server.config import load_config
from tests.unit.helpers import clean_env

ME = "https://upstream.example.test/api/me"


@respx.mock
async def test_verifier_accepts_known_user_and_caches():
    route = respx.get(ME).mock(return_value=httpx.Response(200, json={"id": "u1", "email": "a@x"}))
    verifier = UserinfoVerifier(ME, ["read"])
    first = await verifier.verify_token("opaque")
    second = await verifier.verify_token("opaque")
    assert first is not None and first.subject == "u1" and first.token == "opaque"
    assert second is first and route.call_count == 1


@respx.mock
async def test_verifier_rejects_unknown_token():
    respx.get(ME).mock(return_value=httpx.Response(401))
    assert await UserinfoVerifier(ME, []).verify_token("bad") is None


def test_private_claims_hook_still_exists_in_fastmcp():
    """IdentityProxy overrides a private FastMCP hook. If an upgrade renames it, identity
    silently stops being embedded. This fails first."""
    assert "_extract_upstream_claims" in vars(OAuthProxy)
    assert "_extract_upstream_claims" in vars(IdentityProxy)


@respx.mock
async def test_claims_hook_embeds_identity_once_per_login(monkeypatch):
    clean_env(monkeypatch)
    route = respx.get(ME).mock(return_value=httpx.Response(200, json={"id": "u1", "email": "a@x"}))
    proxy = build_proxy(_http_cfg(monkeypatch))
    assert isinstance(proxy, IdentityProxy)
    claims = await proxy._extract_upstream_claims({"access_token": "opaque"})
    assert claims == {"sub": "u1", "email": "a@x"} and route.call_count == 1


def _http_cfg(monkeypatch):
    env = {
        "SCAFFOLD_TRANSPORT": "http",
        "SCAFFOLD_UPSTREAM_BASE_URL": "https://upstream.example.test/api",
        "SCAFFOLD_PUBLIC_URL": "https://mcp.example.test",
        "SCAFFOLD_OAUTH_CLIENT_ID": "client-123",
        "SCAFFOLD_OAUTH_AUTHORIZE_URL": "https://idp.example.test/authorize",
        "SCAFFOLD_OAUTH_TOKEN_URL": "https://idp.example.test/token",
        "SCAFFOLD_USERINFO_URL": ME,
        "SCAFFOLD_JWT_SIGNING_KEY": "k" * 43,
    }
    return load_config(env, None)
