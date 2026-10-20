"""Server icon. Shipped as PNG: the MCP spec requires clients to support PNG/JPEG and
only recommends SVG. Embedded as a data: URI so it also works on stdio, which has no
public URL to fetch from."""

import base64
from importlib.resources import files

ICON_PNG: bytes = (files("scaffold_server") / "static" / "icon.png").read_bytes()
ICON_DATA_URI = "data:image/png;base64," + base64.b64encode(ICON_PNG).decode()
