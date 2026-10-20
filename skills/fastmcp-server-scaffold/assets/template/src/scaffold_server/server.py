"""Builds the FastMCP instance and nothing else.

Transport-agnostic: stdio passes auth=None, HTTP passes a configured provider.
"""

import importlib.metadata

from fastmcp import FastMCP
from mcp.types import Icon

from .audit import AuditMiddleware
from .icon import ICON_DATA_URI
from .tools.registry import register_tools

# Keep this short (Codex weighs the first 512 characters, Claude Code truncates at 4,096,
# claude.ai drops it entirely). Never put anything here that the model MUST know; that
# belongs in tool descriptions.
INSTRUCTIONS = (
    "Acts on the upstream service as the signed-in user. Read before writing, and confirm "
    "every change with the user using the facts the tool returns."
)


def create_mcp(auth=None, public_url: str | None = None, *, http: bool = False,
               rate_limit_rps: float | None = None) -> FastMCP:
    middleware: list = [AuditMiddleware()]
    # scaffold:if http
    if http and rate_limit_rps:
        from .http.rate_limit import user_rate_limiter

        middleware.insert(0, user_rate_limiter(rate_limit_rps))
    # scaffold:end
    mcp = FastMCP(
        "scaffold-server",
        instructions=INSTRUCTIONS,
        version=importlib.metadata.version("scaffold-server"),
        website_url=public_url,
        # A data: URI works on every transport; an http URL would not exist on stdio.
        icons=[Icon(src=ICON_DATA_URI, mime_type="image/png", sizes=["64x64"])],
        auth=auth,
        # Only ToolError messages reach clients; other exceptions become a generic error
        # with the traceback in the server log. Second net behind returned failures.
        mask_error_details=True,
        middleware=middleware,
    )
    register_tools(mcp)
    return mcp
