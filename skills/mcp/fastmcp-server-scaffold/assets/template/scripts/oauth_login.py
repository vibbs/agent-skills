#!/usr/bin/env python3
"""One-time browser login for the stdio transport.

Runs a short-lived local listener, opens the authorize URL, catches the redirect, checks
`state`, exchanges the code with PKCE, and writes the token file (auth/tokens.py).

Everything about the listener (scheme, host, port, path) is parsed from one value,
SCAFFOLD_OAUTH_REDIRECT_URI, so re-registering a different redirect is a
config change, not a code change. The default is an http://127.0.0.1 loopback URI
(RFC 8252). If your upstream only accepts https redirects, set an https URI and
provide a local certificate via SCAFFOLD_LOGIN_CERT and
SCAFFOLD_LOGIN_KEY, for example:
    openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj /CN=localhost \\
        -keyout localhost.key -out localhost.crt

Exit codes: 0 signed in, 1 configuration error, 2 login failed or timed out.
"""

import argparse
import asyncio
import base64
import hashlib
import http.server
import os
import secrets
import ssl
import sys
import threading
import urllib.parse
import webbrowser

import httpx

from scaffold_server.auth.tokens import save_tokens, token_request
from scaffold_server.config import AppConfig, load_config


def pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    )
    return verifier, challenge


def authorize_url(cfg: AppConfig, state: str, challenge: str) -> str:
    params = {
        "response_type": "code",
        "client_id": cfg.oauth_client_id or "",
        "redirect_uri": cfg.oauth_redirect_uri,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    if cfg.oauth_scopes:
        params["scope"] = " ".join(cfg.oauth_scopes)
    return f"{cfg.oauth_authorize_url}?{urllib.parse.urlencode(params)}"


def wait_for_code(redirect_uri: str, expected_state: str, timeout_s: float) -> str:
    target = urllib.parse.urlparse(redirect_uri)
    result: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            url = urllib.parse.urlparse(self.path)
            if url.path != target.path:
                self.send_error(404)
                return
            query = dict(urllib.parse.parse_qsl(url.query))
            ok = query.get("state") == expected_state and "code" in query
            if ok:
                result["code"] = query["code"]
            else:
                result["error"] = query.get("error", "state mismatch or missing code")
            self.send_response(200 if ok else 400)
            self.end_headers()
            self.wfile.write(b"Signed in. You can close this tab." if ok else b"Login failed.")

        def log_message(self, format: str, *args: object) -> None:
            pass  # keep the terminal quiet; stdout/stderr noise hides the prompt

    server = http.server.HTTPServer((target.hostname or "127.0.0.1", target.port or 80), Handler)
    if target.scheme == "https":
        cert = os.environ.get("SCAFFOLD_LOGIN_CERT")
        key = os.environ.get("SCAFFOLD_LOGIN_KEY")
        if not (cert and key):
            raise SystemExit(
                "https redirect URI needs SCAFFOLD_LOGIN_CERT and "
                "SCAFFOLD_LOGIN_KEY"
            )
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert, key)
        server.socket = context.wrap_socket(server.socket, server_side=True)
    server.timeout = timeout_s
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()
    thread.join(timeout_s + 1)
    server.server_close()
    if "code" not in result:
        raise TimeoutError(result.get("error", f"no redirect within {timeout_s:.0f}s"))
    return result["code"]


async def exchange_code(cfg: AppConfig, code: str, verifier: str) -> dict:
    request = token_request(
        cfg,
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": cfg.oauth_redirect_uri,
            "code_verifier": verifier,
        },
    )
    async with httpx.AsyncClient(timeout=30.0) as http:
        resp = await http.post(cfg.oauth_token_url or "", **request)
    resp.raise_for_status()
    return resp.json()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--timeout", type=float, default=180.0)
    parser.add_argument(
        "--no-browser", action="store_true", help="print the URL instead of opening it"
    )
    args = parser.parse_args(argv)
    try:
        cfg = load_config()
    except RuntimeError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1
    if not cfg.oauth_authorize_url:
        print("Set SCAFFOLD_OAUTH_AUTHORIZE_URL to sign in.", file=sys.stderr)
        return 1
    verifier, challenge = pkce_pair()
    state = secrets.token_urlsafe(24)
    url = authorize_url(cfg, state, challenge)
    print(f"Open this URL to sign in:\n{url}", file=sys.stderr)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        code = wait_for_code(cfg.oauth_redirect_uri, state, args.timeout)
        payload = asyncio.run(exchange_code(cfg, code, verifier))
    except (TimeoutError, httpx.HTTPError) as exc:
        print(f"Login failed: {exc}", file=sys.stderr)
        return 2
    save_tokens(cfg, payload)
    if not payload.get("refresh_token"):
        print(
            "Warning: no refresh token returned; you will need to sign in again when the "
            "access token expires.",
            file=sys.stderr,
        )
    print(f"Signed in. Tokens saved to {cfg.token_file}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
