"""Cross-cutting domain constants and allow-lists.

Domain-specific: replace these when you replace the example tools.
"""

# Hard cap for bulk parameters. A refusal names the limit so the model can split
# the request or tell the user where to do the oversized operation instead.
MAX_BATCH_SIZE = 50

# Prepended to every comment this server writes upstream, at one choke point
# (tools/example.py: format_comment), so provenance is never forgotten.
AUDIT_TAG = "[via Scaffold Server]"
