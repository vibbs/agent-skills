# Runbooks

Operational procedures for things that have burned you. Rule: when an incident reveals a
procedure that was only ever tribal knowledge, the fix includes writing it down here.

Start with these as soon as they apply:

- **Rotating upstream credentials.** Capture the current value before overwriting it
  (many secret stores can't read it back), restart every replica so the change takes
  effect, then run `scripts/verify_login.py` before telling anyone to sign in.
- **Upgrading FastMCP.** Read its changelog for auth changes, run the full test suite,
  and check that the `_extract_upstream_claims` hook test still passes.
