"""Capability gating at registration time.

Deliberately separate from config.py: the stdio path has no config loaded when tools
are registered, and flags are set as container env vars or in the MCP client's own
`env` block, never in a `.env` file.

A disabled capability's tools are not registered at all, so they never appear in
tools/list. That is stronger than a registered tool that returns "forbidden", and it
is the right semantics for a rollout switch. Security policy is a separate mechanism.

Convention: a new capability wave ships merged-but-off (default False) and is turned on
with an env var and a restart, no rebuild. Only a flag retrofitted onto something already
live defaults to True, and that exception must be called out loudly where it is defined.
"""

import os

from .config import as_bool

_FLAGS: dict[str, tuple[str, bool]] = {
    # The example write capability. Default off: merged-but-off is the template.
    "writes": ("SCAFFOLD_FEATURE_WRITES", False),
}


def is_enabled(name: str) -> bool:
    env_var, default = _FLAGS[name]  # KeyError on an unregistered name is a code bug
    value = os.environ.get(env_var)
    if value is None or value == "":
        return default
    return as_bool(env_var, value)  # raises on a malformed value


def active_flags() -> dict[str, bool]:
    return {name: is_enabled(name) for name in _FLAGS}
