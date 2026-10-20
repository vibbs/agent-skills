"""The only place HTTP-specific routes and auth wiring exist."""

from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from ..config import AppConfig
from ..icon import ICON_PNG
from ..server import create_mcp


def build_auth(cfg: AppConfig):
    # scaffold:if auth=proxy
    if cfg.auth_mode == "proxy":
        from ..auth.proxy import build_proxy

        return build_proxy(cfg)
    # scaffold:end
    # scaffold:if auth=resource-server
    if cfg.auth_mode == "resource-server":
        from ..auth.resource_server import build_resource_server

        return build_resource_server(cfg)
    # scaffold:end
    raise RuntimeError(f"Auth mode {cfg.auth_mode!r} does not support HTTP.")


def create_http_app(cfg: AppConfig) -> FastMCP:
    mcp = create_mcp(auth=build_auth(cfg), public_url=cfg.public_url, http=True,
                     rate_limit_rps=cfg.rate_limit_rps)

    @mcp.custom_route("/health", methods=["GET"])
    async def health(_: Request) -> Response:
        """Liveness only: the process is up and config parsed.

        Deliberately does NOT call the upstream. With no service account there is no
        credential to check connectivity with, only per-user tokens. Do not mistake this
        for a dependency check.
        """
        return JSONResponse({"status": "ok"})

    @mcp.custom_route("/icon.png", methods=["GET"])
    async def icon(_: Request) -> Response:
        """Unauthenticated: connector UIs fetch the icon before anyone signs in."""
        return Response(ICON_PNG, media_type="image/png")

    return mcp
