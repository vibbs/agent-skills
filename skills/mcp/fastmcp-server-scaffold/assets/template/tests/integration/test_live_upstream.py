"""Opt-in, self-skipping integration test against a real upstream. Not run in CI.

Run with:
    SCAFFOLD_LIVE_UPSTREAM=1 uv run pytest tests/integration -v
after signing in (scripts/oauth_login.py) or setting SCAFFOLD_UPSTREAM_TOKEN.
"""

import os

import pytest

from scaffold_server.tools import example

pytestmark = pytest.mark.skipif(
    os.environ.get("SCAFFOLD_LIVE_UPSTREAM") != "1",
    reason="live upstream test; set SCAFFOLD_LIVE_UPSTREAM=1 to run it",
)


async def test_list_items_against_real_upstream():
    out = await example.list_items("open", 1)
    assert out["ok"] is True, out
