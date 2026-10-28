"""Confirm-before-write guard.

This is a SOFT guardrail, not a security boundary: the model sets user_confirmed, so it
attests only that a deliberate second step happened. The real human-in-the-loop gates
are the client's own approval prompts, driven by destructiveHint annotations, the
`anthropic/requiresUserInteraction` tool meta, and .claude/settings.json `permissions.ask`.
Keep both kinds of gate; neither alone is sufficient. Do not delete this as redundant.

The refusal is fact-bearing on purpose: the model must restate these facts and get an
explicit yes, never ask a factless "proceed?".
"""

from typing import Any


def require_confirmed(user_confirmed: bool, facts: str) -> dict[str, Any] | None:
    if user_confirmed:
        return None
    return {
        "ok": False,
        "needs_confirmation": True,
        "message": (
            f"Not done yet. Restate this to the user and ask for an explicit yes: {facts} "
            "Then call again with user_confirmed=true."
        ),
    }
