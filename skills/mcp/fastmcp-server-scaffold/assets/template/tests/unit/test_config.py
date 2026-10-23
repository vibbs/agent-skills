import json

import pytest

from scaffold_server import config
from scaffold_server.config import as_bool, fingerprint, load_config

BASE = {"SCAFFOLD_UPSTREAM_BASE_URL": "https://up.example.test"}


def _env(**extra: str) -> dict[str, str]:
    env = dict(BASE)
    # scaffold:if auth=none
    env["SCAFFOLD_UPSTREAM_TOKEN"] = "tok"
    # scaffold:end
    # scaffold:if auth=proxy|auth=resource-server
    env["SCAFFOLD_OAUTH_CLIENT_ID"] = "client-123"
    env["SCAFFOLD_OAUTH_TOKEN_URL"] = "https://idp.example.test/token"
    # scaffold:end
    env.update(extra)
    return env


def test_precedence_env_over_env_file_over_json(tmp_path):
    js = tmp_path / "config.json"
    js.write_text(json.dumps({"upstream_base_url": "https://from-json"}))
    dotenv = tmp_path / ".env"
    dotenv.write_text("SCAFFOLD_UPSTREAM_BASE_URL=https://from-dotenv\n")
    env = _env(SCAFFOLD_CONFIG_FILE=str(js))
    del env["SCAFFOLD_UPSTREAM_BASE_URL"]
    assert load_config(env, dotenv).upstream_base_url == "https://from-dotenv"
    env["SCAFFOLD_UPSTREAM_BASE_URL"] = "https://from-env"
    assert load_config(env, dotenv).upstream_base_url == "https://from-env"


def test_empty_string_falls_through(tmp_path):
    dotenv = tmp_path / ".env"
    dotenv.write_text('SCAFFOLD_UPSTREAM_BASE_URL="https://from-dotenv"\n')
    assert (
        load_config(_env(SCAFFOLD_UPSTREAM_BASE_URL=""), dotenv).upstream_base_url
        == "https://from-dotenv"
    )


def test_missing_upstream_says_what_and_how():
    env = _env()
    del env["SCAFFOLD_UPSTREAM_BASE_URL"]
    with pytest.raises(RuntimeError, match="SCAFFOLD_UPSTREAM_BASE_URL is required"):
        load_config(env, None)


def test_default_auth_mode_matches_generated_mode():
    assert load_config(_env(), None).auth_mode == config.DEFAULT_AUTH_MODE


@pytest.mark.parametrize(
    "value,expected", [("true", True), ("1", True), ("off", False), ("NO", False)]
)
def test_as_bool_accepts_vocabulary(value, expected):
    assert as_bool("X", value) is expected


@pytest.mark.parametrize("value", ["ture", "", "2", "enabled"])
def test_as_bool_raises_on_anything_else(value):
    with pytest.raises(ValueError):
        as_bool("X", value)


def test_fingerprint_never_shows_secret_prefix():
    assert fingerprint("supersecretvalue1234") == "len=20 suffix=...1234"
    assert "client" in fingerprint("client-abcdef-9999", public=True)


# scaffold:if auth=none
def test_none_mode_requires_upstream_token():
    env = _env()
    del env["SCAFFOLD_UPSTREAM_TOKEN"]
    with pytest.raises(RuntimeError, match="SCAFFOLD_UPSTREAM_TOKEN is required"):
        load_config(env, None)


def test_none_mode_refuses_http():
    with pytest.raises(RuntimeError, match="stdio only|serves stdio only"):
        load_config(_env(SCAFFOLD_TRANSPORT="http"), None)


# scaffold:end


# scaffold:if auth=proxy|auth=resource-server
def test_client_id_guard_rejects_pasted_quotes():
    with pytest.raises(RuntimeError, match="looks malformed"):
        load_config(_env(SCAFFOLD_OAUTH_CLIENT_ID='"client id"'), None)


def test_client_id_guard_escape_hatch():
    cfg = load_config(
        _env(SCAFFOLD_OAUTH_CLIENT_ID='"client id"', SCAFFOLD_SKIP_CLIENT_ID_CHECK="true"), None
    )
    assert cfg.oauth_client_id == '"client id"'


def test_escape_hatch_typo_is_only_read_when_guard_fires():
    # A malformed override must not break an otherwise valid startup.
    load_config(_env(SCAFFOLD_SKIP_CLIENT_ID_CHECK="ture"), None)


# scaffold:end


# scaffold:if http
def test_http_requires_public_url():
    with pytest.raises(RuntimeError, match="SCAFFOLD_PUBLIC_URL is required"):
        load_config(_env(SCAFFOLD_TRANSPORT="http"), None)


# scaffold:end


# scaffold:if auth=proxy&http
def test_proxy_http_requires_signing_key_and_explains_why():
    env = _env(
        SCAFFOLD_TRANSPORT="http",
        SCAFFOLD_PUBLIC_URL="https://mcp.example.test",
        SCAFFOLD_OAUTH_AUTHORIZE_URL="https://idp.example.test/authorize",
        SCAFFOLD_USERINFO_URL="https://up.example.test/me",
    )
    with pytest.raises(RuntimeError, match="rotating that secret"):
        load_config(env, None)


# scaffold:end


# scaffold:if auth=resource-server&http
def test_resource_server_http_requires_exchange_settings():
    env = _env(
        SCAFFOLD_TRANSPORT="http",
        SCAFFOLD_PUBLIC_URL="https://mcp.example.test",
        SCAFFOLD_JWKS_URI="https://idp.example.test/jwks",
        SCAFFOLD_ISSUER="https://idp.example.test",
        SCAFFOLD_AUDIENCE="api://mcp",
        SCAFFOLD_AUTHORIZATION_SERVER="https://idp.example.test",
    )
    with pytest.raises(RuntimeError, match="token passthrough"):
        load_config(env, None)


# scaffold:end
