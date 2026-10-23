"""The single list of write tools.

Three mechanisms protect writes. None is generated from this list (the registry applies
WRITE/WRITE_META per tool, and .claude/settings.json is edited by hand), but all three
must match it, and tests/unit/test_write_gates.py fails if they drift:

1. destructive_hint annotations: claude.ai, VS Code and Codex use them to require approval.
2. `_meta["anthropic/requiresUserInteraction"]`: Claude Code prompts on every call, even
   in auto or bypass modes.
3. `.claude/settings.json` `permissions.ask`: Claude Code's client-side prompt.
"""

from mcp.types import ToolAnnotations

# Server name as clients see it; Claude Code tool ids are mcp__<server>__<tool>.
SERVER_NAME = "scaffold-server"

WRITE_TOOLS: frozenset[str] = frozenset({"example_update_item"})

READ = ToolAnnotations(
    read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=True
)
# Writes: idempotent_hint is a deliberate per-tool decision. True invites clients to
# retry; never set it on anything that creates or appends.
WRITE = ToolAnnotations(
    read_only_hint=False, destructive_hint=True, idempotent_hint=False, open_world_hint=True
)
WRITE_META = {"anthropic/requiresUserInteraction": True}


def claude_permission_ids() -> list[str]:
    return sorted(f"mcp__{SERVER_NAME}__{name}" for name in WRITE_TOOLS)
