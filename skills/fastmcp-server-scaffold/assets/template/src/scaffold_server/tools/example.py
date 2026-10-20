"""Example capability: business logic between the registry and the upstream client.

Plain dicts in, plain dicts out; no MCP imports. Replace with one module per capability
area. Validation and confirmation live here so they are testable without a server.
"""

from typing import Any

from ..client.example import ExampleClient
from ..config import load_config
from ..constants import AUDIT_TAG, MAX_BATCH_SIZE
from ..types import ITEM_STATUS_ALIASES
from .confirmation import require_confirmed
from .errors import failure
from .ids import safe_id


def format_comment(comment: str) -> str:
    """The one choke point that tags upstream writes with their provenance. Callers never
    add the tag themselves, and it is present even when the user gave no comment."""
    text = comment.strip()
    return f"{AUDIT_TAG} {text}" if text else AUDIT_TAG


async def list_items(status: str, limit: int) -> dict[str, Any]:
    code = ITEM_STATUS_ALIASES.get(status.lower())
    if code is None:
        return failure("invalid_status", f"Status must be one of: {sorted(ITEM_STATUS_ALIASES)}.")
    if not 1 <= limit <= MAX_BATCH_SIZE:
        return failure("limit_out_of_range", f"limit must be between 1 and {MAX_BATCH_SIZE}.")
    return await ExampleClient(load_config()).list_items(code, limit)


async def get_item(item_id: str) -> dict[str, Any]:
    if not safe_id(item_id):
        return failure("invalid_id", "item_id must be an id returned by example_list_items.")
    return await ExampleClient(load_config()).get_item(item_id)


async def update_item_title(item_id: str, title: str, comment: str, user_confirmed: bool) -> dict[str, Any]:
    if not safe_id(item_id):
        return failure("invalid_id", "item_id must be an id returned by example_list_items.")
    title = title.strip()
    if not 1 <= len(title) <= 200:
        return failure("invalid_title", "title must be 1 to 200 characters.")
    refusal = require_confirmed(
        user_confirmed, f"rename item {item_id} to {title!r} (comment: {comment or 'none'})."
    )
    if refusal:
        return refusal
    return await ExampleClient(load_config()).update_item_title(item_id, title, format_comment(comment))
