"""Picker payload: a ready-made question/options block a host can render as its own
interactive-choice UI.

This is a host convention, not an MCP primitive. It degrades to plain text in hosts
that don't recognise it. The spec-native alternatives (elicitation enums, MCP Apps) are
documented extensions.
"""

from typing import Any

MAX_OPTIONS = 4  # what typical host pickers accept; page instead of dumping everything
MORE_ID = "__more__"  # double-underscored so it can never collide with an upstream id


def picker(
    question: str,
    items: list[dict[str, Any]],
    *,
    label_key: str = "label",
    id_key: str = "id",
    offset: int = 0,
    note: str = "",
) -> dict[str, Any]:
    usable = [i for i in items if i.get(label_key) and i.get(id_key)]
    page = usable[offset : offset + MAX_OPTIONS - 1]
    if len(page) < 2:
        return {}  # never ask a degenerate one-option question
    options = [{"label": str(i[label_key]), "id": str(i[id_key])} for i in page]
    if len(usable) > offset + len(page):
        options.append({"label": "Something else", "id": MORE_ID})
    out: dict[str, Any] = {"ui": "interactive_choice", "question": question, "options": options}
    if note:
        out["options_note"] = note
    return out
