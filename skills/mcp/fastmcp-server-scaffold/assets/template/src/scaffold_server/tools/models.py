"""Typed tool results (opt-in: output-schema).

Return annotations become each tool's outputSchema, so clients can validate and render
results. Plain TypedDicts, no Pydantic models: the schema stays exactly what the model
sees. Describe the SUCCESS shape only; failures are isError results without
structuredContent (see errors.py). Claude Code and VS Code honour output schemas; the MCP
roadmap flags a coming redesign of the result shape, so keep these small.
"""

from typing import NotRequired, TypedDict


class Item(TypedDict):
    id: str | None
    title: str | None
    status: str | None
    owner: str | None


class ItemList(TypedDict):
    ok: bool
    count: int
    items: list[Item]


class ItemWithDescription(Item):
    description: str | None


class ItemDetail(TypedDict):
    ok: bool
    item: ItemWithDescription


class RenameResult(TypedDict):
    ok: bool
    item_id: NotRequired[str]
    title: NotRequired[str]
    needs_confirmation: NotRequired[bool]
    message: NotRequired[str]
