"""Smoke test of the installed console script over real stdio. Catches stdout pollution
and packaging errors that in-memory tests can't."""

import shutil

import pytest
from fastmcp import Client
from fastmcp.client.transports import StdioTransport


async def test_console_script_serves_tools_over_stdio():
    exe = shutil.which("scaffold-server")
    if exe is None:
        pytest.fail("console script not installed; run: uv sync --extra dev")
    env = {"SCAFFOLD_TRANSPORT": "stdio"}
    transport = StdioTransport(command=exe, args=[], env=env)
    async with Client(transport) as client:
        names = [t.name for t in await client.list_tools()]
    assert "example_list_items" in names
