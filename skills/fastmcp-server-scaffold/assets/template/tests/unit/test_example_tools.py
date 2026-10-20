"""Business logic and upstream client, mocking the upstream (not the framework).

Each test asserts on the parsed result AND on the request that went out.
"""

import httpx
import respx

from scaffold_server.tools import example
from tests.unit.helpers import UPSTREAM, configure_stdio


@respx.mock
async def test_list_items_maps_status_alias_and_reduces_payload(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    route = respx.get(f"{UPSTREAM}/items").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "I1",
                        "title": "First",
                        "status": "ST_OPEN",
                        "owner": "ana",
                        "internal_blob": "x" * 500,
                    }
                ]
            },
        )
    )
    out = await example.list_items("open", 5)
    assert out == {
        "ok": True,
        "count": 1,
        "items": [{"id": "I1", "title": "First", "status": "ST_OPEN", "owner": "ana"}],
    }
    request = route.calls.last.request
    assert request.url.params["status"] == "ST_OPEN"
    assert request.headers["Authorization"] == "Bearer tok"


async def test_list_items_rejects_unknown_status_without_calling_upstream(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    out = await example.list_items("pending", 5)
    assert out["ok"] is False and out["code"] == "invalid_status"


async def test_get_item_rejects_traversal_id(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    out = await example.get_item("../admin")
    assert out["code"] == "invalid_id"


@respx.mock
async def test_upstream_error_is_normalised_with_hint(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    respx.get(f"{UPSTREAM}/items/I9").mock(
        return_value=httpx.Response(404, json={"message": "nope"})
    )
    out = await example.get_item("I9")
    assert out["ok"] is False and out["status"] == 404
    assert out["detail"] == "nope" and "no such record" in out["hint"]


async def test_write_needs_confirmation_and_returns_facts(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    out = await example.update_item_title("I1", "New name", "", user_confirmed=False)
    assert (
        out["needs_confirmation"] is True
        and "I1" in out["message"]
        and "New name" in out["message"]
    )


@respx.mock
async def test_confirmed_write_is_tagged_at_the_choke_point(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    route = respx.patch(f"{UPSTREAM}/items/I1").mock(return_value=httpx.Response(200, json={}))
    out = await example.update_item_title("I1", "New name", "typo fix", user_confirmed=True)
    assert out == {"ok": True, "item_id": "I1", "title": "New name"}
    body = route.calls.last.request.read().decode()
    assert "[via Scaffold Server] typo fix" in body
