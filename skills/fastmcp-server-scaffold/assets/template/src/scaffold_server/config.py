"""Settings model, layered loader, and startup guards.

Precedence, highest first: process environment > local `.env` file > JSON config file
(path in SCAFFOLD_CONFIG_FILE). Empty strings count as unset at every layer, so a blank
env var falls through instead of shadowing a real value.

The stdio path never calls load_config() at startup; the auth layer loads it lazily per
request. That keeps local startup instant and failure-free before login, and it is why
feature flags read os.environ directly (see feature_flags.py).

Error house style: say what is missing, why it is needed, and how to fix it.
"""

from __future__ import annotations

import json
import os
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Literal, get_args

from pydantic import BaseModel

Transport = Literal["stdio", "http"]
AuthMode = Literal["proxy", "resource-server", "none"]

# The one place the auth mode default lives. The scaffold sets it at generation time.
DEFAULT_AUTH_MODE: AuthMode = "proxy"

_TRUE = {"1", "true", "yes", "on"}
_FALSE = {"0", "false", "no", "off"}


def as_bool(name: str, value: str) -> bool:
    """Strict boolean parsing shared by config and feature flags.

    Raises on anything outside the fixed vocabulary: a typo in a boolean must never
    silently mean the opposite of what was intended.
    """
    v = value.strip().lower()
    if v in _TRUE:
        return True
    if v in _FALSE:
        return False
    raise ValueError(f"{name}={value!r} is not a boolean. Use one of: {sorted(_TRUE | _FALSE)}.")


def _as_list(value: str) -> list[str]:
    return [p for p in re.split(r"[,\s]+", value.strip()) if p]


class AppConfig(BaseModel):
    transport: Transport = "stdio"
    auth_mode: AuthMode = DEFAULT_AUTH_MODE

    # The upstream API this server fronts.
    upstream_base_url: str

    # scaffold:if auth=none
    # auth=none: one credential from the environment, as the MCP spec recommends for stdio.
    upstream_token: str | None = None
    # scaffold:end

    # scaffold:if auth=proxy|auth=resource-server
    # OAuth client used by scripts/oauth_login.py (stdio), and by the OAuth proxy (HTTP).
    oauth_client_id: str | None = None
    oauth_client_secret: str | None = None
    oauth_authorize_url: str | None = None
    oauth_token_url: str | None = None
    oauth_scopes: list[str] = []
    oauth_redirect_uri: str = "http://127.0.0.1:8765/callback"
    token_file: Path = Path.home() / ".scaffold-server" / "tokens.json"
    # scaffold:end

    # scaffold:if auth=proxy&http
    # Cheap "who am I" endpoint: verifies opaque upstream tokens and supplies identity.
    userinfo_url: str | None = None
    # scaffold:end

    # scaffold:if auth=resource-server&http
    # resource-server mode: validate JWTs issued for this server...
    jwks_uri: str | None = None
    issuer: str | None = None
    audience: str | None = None
    authorization_server: str | None = None
    # ...and exchange them for a per-user upstream token (never forward them).
    exchange_token_url: str | None = None
    exchange_client_id: str | None = None
    exchange_client_secret: str | None = None
    exchange_grant: Literal["rfc8693", "entra-obo"] = "rfc8693"
    upstream_audience: str | None = None
    upstream_scopes: list[str] = []
    # scaffold:end

    # scaffold:if http
    # HTTP transport only.
    public_url: str | None = None
    # scaffold:if auth=proxy
    jwt_signing_key: str | None = None
    # scaffold:end
    allowed_hosts: list[str] = []
    rate_limit_rps: float = 10.0
    # scaffold:end

    def client_id_fingerprint(self) -> str:
        return fingerprint(getattr(self, "oauth_client_id", None), public=True)


# field -> environment variable. The single mapping table for every layer.
FIELD_ENV: dict[str, str] = {
    "transport": "SCAFFOLD_TRANSPORT",
    "auth_mode": "SCAFFOLD_AUTH_MODE",
    "upstream_base_url": "SCAFFOLD_UPSTREAM_BASE_URL",
    # scaffold:if auth=none
    "upstream_token": "SCAFFOLD_UPSTREAM_TOKEN",
    # scaffold:end
    # scaffold:if auth=proxy|auth=resource-server
    "oauth_client_id": "SCAFFOLD_OAUTH_CLIENT_ID",
    "oauth_client_secret": "SCAFFOLD_OAUTH_CLIENT_SECRET",
    "oauth_authorize_url": "SCAFFOLD_OAUTH_AUTHORIZE_URL",
    "oauth_token_url": "SCAFFOLD_OAUTH_TOKEN_URL",
    "oauth_scopes": "SCAFFOLD_OAUTH_SCOPES",
    "oauth_redirect_uri": "SCAFFOLD_OAUTH_REDIRECT_URI",
    "token_file": "SCAFFOLD_TOKEN_FILE",
    # scaffold:end
    # scaffold:if auth=proxy&http
    "userinfo_url": "SCAFFOLD_USERINFO_URL",
    # scaffold:end
    # scaffold:if auth=resource-server&http
    "jwks_uri": "SCAFFOLD_JWKS_URI",
    "issuer": "SCAFFOLD_ISSUER",
    "audience": "SCAFFOLD_AUDIENCE",
    "authorization_server": "SCAFFOLD_AUTHORIZATION_SERVER",
    "exchange_token_url": "SCAFFOLD_EXCHANGE_TOKEN_URL",
    "exchange_client_id": "SCAFFOLD_EXCHANGE_CLIENT_ID",
    "exchange_client_secret": "SCAFFOLD_EXCHANGE_CLIENT_SECRET",
    "exchange_grant": "SCAFFOLD_EXCHANGE_GRANT",
    "upstream_audience": "SCAFFOLD_UPSTREAM_AUDIENCE",
    "upstream_scopes": "SCAFFOLD_UPSTREAM_SCOPES",
    # scaffold:end
    # scaffold:if http
    "public_url": "SCAFFOLD_PUBLIC_URL",
    # scaffold:if auth=proxy
    "jwt_signing_key": "SCAFFOLD_JWT_SIGNING_KEY",
    # scaffold:end
    "allowed_hosts": "SCAFFOLD_ALLOWED_HOSTS",
    "rate_limit_rps": "SCAFFOLD_RATE_LIMIT_RPS",
    # scaffold:end
}

_LIST_FIELDS = {"oauth_scopes", "upstream_scopes", "allowed_hosts"}


def read_env_file(path: Path) -> dict[str, str]:
    """Minimal KEY=VALUE parser: comments, blank lines, optional quotes. No interpolation."""
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        out[key.strip()] = value
    return out


def _layered(env: Mapping[str, str], env_file: Path | None) -> dict[str, str]:
    """Merge the three sources into field -> raw string, highest precedence last."""
    merged: dict[str, str] = {}
    json_path = env.get("SCAFFOLD_CONFIG_FILE") or ""
    if json_path:
        data = json.loads(Path(json_path).read_text())
        for field, value in data.items():
            if field in FIELD_ENV and value not in (None, ""):
                merged[field] = ",".join(value) if isinstance(value, list) else str(value)
    file_values = read_env_file(env_file) if env_file else {}
    for source in (file_values, env):
        for field, var in FIELD_ENV.items():
            value = source.get(var, "")
            if value != "":
                merged[field] = value
    return merged


def load_config(env: Mapping[str, str] | None = None, env_file: Path | None = Path(".env")) -> AppConfig:
    raw = _layered(os.environ if env is None else env, env_file)
    values: dict[str, object] = {
        k: (_as_list(v) if k in _LIST_FIELDS else v) for k, v in raw.items()
    }
    if "upstream_base_url" not in values:
        raise RuntimeError(
            "SCAFFOLD_UPSTREAM_BASE_URL is required: it is the API every tool calls. "
            "Set it in the environment or .env (see .env.example)."
        )
    _check_choice(values, "transport", Transport,
                  "This server was generated without the HTTP transport; it serves stdio only.")
    _check_choice(values, "auth_mode", AuthMode,
                  "This server was generated for one auth mode; regenerate to change it.")
    cfg = AppConfig.model_validate(values)
    _check_mode_requirements(cfg)
    # scaffold:if auth=proxy|auth=resource-server
    guard_client_id(cfg.oauth_client_id, env if env is not None else os.environ)
    # scaffold:end
    return cfg


def _check_choice(values: dict[str, object], field: str, kind: object, why: str) -> None:
    allowed = get_args(kind)
    value = values.get(field)
    if value is not None and value not in allowed:
        raise RuntimeError(f"{FIELD_ENV[field]}={value!r} is not supported: {why} Allowed: {list(allowed)}.")


def _require(cfg: AppConfig, field: str, why: str, fix: str = "") -> None:
    if getattr(cfg, field, None) in (None, "", []):
        message = f"{FIELD_ENV[field]} is required {why}."
        raise RuntimeError(f"{message} {fix}".strip())


def _check_mode_requirements(cfg: AppConfig) -> None:
    # scaffold:if auth=none
    if cfg.auth_mode == "none":
        if cfg.transport == "http":
            raise RuntimeError(
                "SCAFFOLD_AUTH_MODE=none supports stdio only: an unauthenticated HTTP "
                "server would let anyone act with the configured upstream credential. "
                "Use auth mode 'proxy' or 'resource-server' for HTTP."
            )
        _require(cfg, "upstream_token", "in auth mode 'none'",
                 "Put the upstream API key or personal access token there.")
    # scaffold:end
    # scaffold:if auth=proxy|auth=resource-server
    if cfg.auth_mode in ("proxy", "resource-server"):
        _require(cfg, "oauth_client_id", "to sign in to the upstream")
        _require(cfg, "oauth_token_url", "to exchange and refresh upstream tokens")
    # scaffold:end
    # scaffold:if http
    if cfg.transport != "http":
        return
    _require(cfg, "public_url", "in HTTP mode",
             "Set it to this server's canonical https URL; OAuth metadata and icons use it.")
    # scaffold:end
    # scaffold:if auth=proxy&http
    if cfg.transport == "http" and cfg.auth_mode == "proxy":
        _require(cfg, "oauth_authorize_url", "in HTTP proxy mode")
        _require(cfg, "userinfo_url", "in HTTP proxy mode to verify upstream tokens")
        _require(
            cfg, "jwt_signing_key", "in HTTP proxy mode",
            "Without it the proxy derives a signing key from the upstream client secret, "
            "so rotating that secret would sign every user out at once. Generate one with: "
            'python -c "import secrets; print(secrets.token_urlsafe(32))"',
        )
    # scaffold:end
    # scaffold:if auth=resource-server&http
    if cfg.transport == "http" and cfg.auth_mode == "resource-server":
        for field in ("jwks_uri", "issuer", "audience", "authorization_server"):
            _require(cfg, field, "in HTTP resource-server mode to validate inbound tokens")
        for field in ("exchange_token_url", "exchange_client_id", "upstream_audience"):
            _require(
                cfg, field, "in HTTP resource-server mode",
                "Inbound tokens are issued for this server and must be exchanged for an "
                "upstream token; forwarding them would be token passthrough.",
            )
    # scaffold:end


# scaffold:if auth=proxy|auth=resource-server
_CLIENT_ID_RE = re.compile(r"^[A-Za-z0-9._~:/@-]{4,256}$")


def client_id_looks_valid(value: str) -> bool:
    """Shape check for the OAuth client id. Public so scripts can share one definition.

    Catches the common paste errors: surrounding quotes, whitespace, a secret pasted
    into the id field. A well-formed *wrong* id still passes; scripts/verify_login.py
    is the check for that.
    """
    return bool(_CLIENT_ID_RE.match(value))


def guard_client_id(value: str | None, env: Mapping[str, str]) -> None:
    if not value or client_id_looks_valid(value):
        return
    # The escape hatch is read only when the guard is about to fire, so a typo in a
    # rarely used override cannot crash an otherwise valid startup.
    override = env.get("SCAFFOLD_SKIP_CLIENT_ID_CHECK", "")
    if override and as_bool("SCAFFOLD_SKIP_CLIENT_ID_CHECK", override):
        return
    raise RuntimeError(
        f"SCAFFOLD_OAUTH_CLIENT_ID looks malformed ({fingerprint(value, public=True)}). "
        "Check for quotes, whitespace, or a secret pasted into the id field. If the "
        "value really is correct, set SCAFFOLD_SKIP_CLIENT_ID_CHECK=true."
    )
# scaffold:end


def fingerprint(value: str | None, *, public: bool = False) -> str:
    """Identify a credential in logs without revealing it.

    Public identifiers (OAuth client ids) get a short prefix and suffix. Anything that
    might be secret gets its length and last four characters only.
    """
    if not value:
        return "unset"
    if public:
        return f"len={len(value)} prefix={value[:6]}... suffix=...{value[-4:]}"
    return f"len={len(value)} suffix=...{value[-4:]}"
