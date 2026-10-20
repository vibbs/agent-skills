"""All three write gates come from tools/writes.py and must agree with what's registered."""

import json
from pathlib import Path

from fastmcp import Client

from scaffold_server.server import create_mcp
from scaffold_server.tools.writes import WRITE_TOOLS, claude_permission_ids
from tests.unit.helpers import clean_env

ROOT = Path(__file__).resolve().parents[2]


async def test_write_tools_are_exactly_the_destructive_ones(monkeypatch):
    clean_env(monkeypatch)
    monkeypatch.setenv("SCAFFOLD_FEATURE_WRITES", "true")
    async with Client(create_mcp()) as client:
        tools = await client.list_tools()
    destructive = {t.name for t in tools if t.annotations and t.annotations.destructive_hint}
    read_only = {t.name for t in tools if t.annotations and t.annotations.read_only_hint}
    assert destructive == WRITE_TOOLS
    assert read_only == {t.name for t in tools} - WRITE_TOOLS
    for tool in tools:
        meta = tool.meta or {}
        assert meta.get("anthropic/requiresUserInteraction") is (
            True if tool.name in WRITE_TOOLS else None
        )


def test_claude_settings_ask_for_every_write_tool():
    settings = json.loads((ROOT / ".claude" / "settings.json").read_text())
    assert sorted(settings["permissions"]["ask"]) == claude_permission_ids()
