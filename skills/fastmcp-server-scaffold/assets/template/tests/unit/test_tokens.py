"""stdio token file: the expires_at stamp is load-bearing (see auth/tokens.py)."""

import json
import time

import httpx
import pytest
import respx

from scaffold_server.auth import tokens
from scaffold_server.config import load_config
from tests.unit.helpers import configure_stdio


def _cfg(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    return load_config(env_file=None)


def test_save_always_stamps_absolute_expiry(monkeypatch, tmp_path):
    cfg = _cfg(monkeypatch, tmp_path)
    saved = tokens.save_tokens(cfg, {"access_token": "a"})  # upstream omitted expires_in
    assert saved["expires_at"] > time.time()
    assert oct(cfg.token_file.stat().st_mode)[-3:] == "600"


async def test_valid_token_is_used_without_refreshing(monkeypatch, tmp_path):
    cfg = _cfg(monkeypatch, tmp_path)
    with respx.mock(assert_all_called=False) as mock:
        route = mock.post("https://idp.example.test/token")
        assert await tokens.get_access_token(cfg) == "tok"
        assert not route.called


@respx.mock
async def test_expired_token_refreshes_and_keeps_refresh_token(monkeypatch, tmp_path):
    cfg = _cfg(monkeypatch, tmp_path)
    data = json.loads(cfg.token_file.read_text())
    data["expires_at"] = 0
    cfg.token_file.write_text(json.dumps(data))
    route = respx.post("https://idp.example.test/token").mock(
        return_value=httpx.Response(200, json={"access_token": "new", "expires_in": 3600}))
    assert await tokens.get_access_token(cfg) == "new"
    form = route.calls.last.request.read().decode()
    assert "grant_type=refresh_token" in form and "client_id=client-123" in form
    assert json.loads(cfg.token_file.read_text())["refresh_token"] == "r"


async def test_missing_login_says_how_to_fix(monkeypatch, tmp_path):
    cfg = _cfg(monkeypatch, tmp_path)
    cfg.token_file.unlink()
    with pytest.raises(RuntimeError, match="oauth_login.py"):
        await tokens.get_access_token(cfg)
