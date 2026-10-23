"""Input validators. Everything is checked before it touches a URL path or query string.

Allow-list, bounded length, explicit traversal check. Where a query language needs string
interpolation, only a safe_id-validated value is ever interpolated: the regex is the
injection defence.
"""

import re
from datetime import date

_ID_RE = re.compile(r"^[A-Za-z0-9_=.-]{1,80}$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def safe_id(value: object) -> bool:
    return isinstance(value, str) and bool(_ID_RE.match(value)) and ".." not in value


def safe_subject(value: object) -> bool:
    """'me' or a concrete id."""
    return value == "me" or safe_id(value)


def safe_date(value: object) -> bool:
    """YYYY-MM-DD, shape-checked and then parsed (so 2026-02-30 is rejected too)."""
    if not isinstance(value, str) or not _DATE_RE.match(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True
