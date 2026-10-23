"""Process entry point: picks the transport, then starts it.

stdio is the default and never loads config at startup (the auth layer loads it per
request). HTTP-only imports happen inside the HTTP branch, so stdio never pays for them.
"""

import os

from .logger import create_logger

log = create_logger("index")


def main() -> None:
    transport = os.environ.get("SCAFFOLD_TRANSPORT", "stdio").lower()
    # scaffold:if http
    if transport == "http":
        from starlette.middleware import Middleware

        from .config import load_config
        from .http.app import create_http_app
        from .http.error_handling import UnhandledErrorMiddleware

        cfg = load_config()
        # Configuration that cannot be read back after it is set must be reported by the
        # process that uses it. Fingerprints only, never credential values.
        log.info(
            "starting http (auth_mode=%s, public_url=%s, client_id=%s, allowed_hosts=%s)",
            cfg.auth_mode,
            cfg.public_url,
            cfg.client_id_fingerprint(),
            cfg.allowed_hosts,
        )
        create_http_app(cfg).run(
            transport="http",
            host=os.environ.get(
                "SCAFFOLD_HTTP_HOST", "0.0.0.0"
            ),  # container default; use 127.0.0.1 on a laptop
            port=int(os.environ.get("PORT", "8080")),
            middleware=[Middleware(UnhandledErrorMiddleware)],
            allowed_hosts=cfg.allowed_hosts or None,
            # scaffold:if with=stateless
            # No per-connection state, so any replica can serve any request. Needed for
            # more than one replica: clients drop cookies, so sticky sessions don't work.
            stateless_http=True,
            # scaffold:end
        )
        return
    # scaffold:end
    if transport != "stdio":
        raise SystemExit(f"Unknown SCAFFOLD_TRANSPORT={transport!r} (use stdio|http)")
    from .server import create_mcp

    create_mcp().run(transport="stdio", show_banner=False)
