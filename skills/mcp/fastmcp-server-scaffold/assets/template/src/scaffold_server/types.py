"""Shared id constants and user-facing alias tables.

Keep opaque upstream ids and the friendly names users type out of business logic.
Domain-specific: replace the examples.
"""

# User-facing status words -> the upstream's opaque status codes.
ITEM_STATUS_ALIASES: dict[str, str] = {
    "open": "ST_OPEN",
    "closed": "ST_CLOSED",
}
