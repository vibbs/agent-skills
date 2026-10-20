"""Shared test setup. Plain functions, not a conftest: pyproject's pythonpath makes
`from tests.unit.helpers import ...` work with no fixture plumbing."""

from pathlib import Path

import pytest

from scaffold_server import config

UPSTREAM = "https://upstream.example.test/api"

ENV_PREFIXES = ("SCAFFOLD_",)


def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Clear every SCAFFOLD_ variable so a developer's shell can't change results."""
    import os

    for key in list(os.environ):
        if key.startswith(ENV_PREFIXES):
            monkeypatch.delenv(key, raising=False)


def configure_stdio(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, token: str = "tok") -> None:
    """Point the server at a fake upstream with a valid stdio credential for this
    project's auth mode, using the real persistence path where there is one."""
    clean_env(monkeypatch)
    monkeypatch.chdir(tmp_path)  # no stray .env
    monkeypatch.setenv("SCAFFOLD_UPSTREAM_BASE_URL", UPSTREAM)
    # scaffold:if auth=none
    if config.DEFAULT_AUTH_MODE == "none":
        monkeypatch.setenv("SCAFFOLD_UPSTREAM_TOKEN", token)
        return
    # scaffold:end
    # scaffold:if auth=proxy|auth=resource-server
    from scaffold_server.auth import tokens

    monkeypatch.setenv("SCAFFOLD_OAUTH_CLIENT_ID", "client-123")
    monkeypatch.setenv("SCAFFOLD_OAUTH_TOKEN_URL", "https://idp.example.test/token")
    monkeypatch.setenv("SCAFFOLD_TOKEN_FILE", str(tmp_path / "tokens.json"))
    tokens.save_tokens(
        config.load_config(env_file=None),
        {"access_token": token, "refresh_token": "r", "expires_in": 3600},
    )
    # scaffold:end
