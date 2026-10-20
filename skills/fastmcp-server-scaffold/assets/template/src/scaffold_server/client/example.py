"""Example upstream client. Replace with one module per upstream API.

Returns plain dicts, already reduced to what the model needs. Knows nothing about MCP.
"""

from typing import Any

import httpx

from ..auth.session import authed_client
from ..config import AppConfig
from .base import transport_error, upstream_error


def _item(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": raw.get("id"),
        "title": raw.get("title"),
        "status": raw.get("status"),
        "owner": raw.get("owner"),
    }


class ExampleClient:
    def __init__(self, cfg: AppConfig) -> None:
        self.cfg = cfg

    async def list_items(self, status: str, limit: int) -> dict[str, Any]:
        try:
            async with await authed_client(self.cfg) as http:
                resp = await http.get("/items", params={"status": status, "limit": limit})
        except httpx.HTTPError as exc:
            return transport_error(exc)
        if resp.status_code != 200:
            return upstream_error(resp)
        items = [_item(i) for i in resp.json().get("data", [])]
        return {"ok": True, "count": len(items), "items": items}

    async def get_item(self, item_id: str) -> dict[str, Any]:
        try:
            async with await authed_client(self.cfg) as http:
                resp = await http.get(f"/items/{item_id}")
        except httpx.HTTPError as exc:
            return transport_error(exc)
        if resp.status_code != 200:
            return upstream_error(resp)
        raw = resp.json()
        return {"ok": True, "item": {**_item(raw), "description": raw.get("description")}}

    async def update_item_title(self, item_id: str, title: str, comment: str) -> dict[str, Any]:
        try:
            async with await authed_client(self.cfg) as http:
                resp = await http.patch(f"/items/{item_id}", json={"title": title, "comment": comment})
        except httpx.HTTPError as exc:
            return transport_error(exc)
        if resp.status_code not in (200, 204):
            return upstream_error(resp)
        return {"ok": True, "item_id": item_id, "title": title}
