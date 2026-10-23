# AGENTS.md

Guidance for coding agents working in this repository. Humans: start with README.md.

## What this is

Scaffold Server is an MCP server, built on FastMCP, that fronts one upstream API on behalf
of the signed-in user. It acts as that user with that user's own token, never with a
service account, so the upstream's permission model is the backstop.

Read `docs/specs/` before any structural change.

## Commands

```bash
uv sync --extra dev                                   # install
uv run ruff check src tests scripts                   # lint
uv run ruff format src tests scripts                  # format
uv run pyright                                        # type-check
uv run pytest                                         # unit tests (what CI runs)
uv run pytest tests/unit/test_registry.py::test_exact_tool_set_in_registration_order -v
uv run scaffold-server                                # run on stdio
uv run fastmcp dev inspector src/scaffold_server/server.py:create_mcp   # MCP Inspector
```

CI runs: `uv sync --locked --extra dev`, ruff check, ruff format --check, pyright, pytest.
CI deliberately does not run `tests/integration/` (live upstream, opt-in).

## Architecture

```
MCP client ──stdio──▶ index.py ─▶ server.py (FastMCP) ─▶ tools/registry.py
           ──http───▶ http/app.py (auth, /health, /icon.png) ─┘        │
                                                                       ▼
                                   tools/<area>.py (validation, confirmation, plain dicts)
                                                                       │
                                   client/<api>.py ─▶ auth/session.py authed_client() ─▶ upstream API
```

| File | Responsibility |
|---|---|
| `index.py` | Picks the transport from SCAFFOLD_TRANSPORT; HTTP imports stay inside the HTTP branch |
| `server.py` | Builds the FastMCP instance: metadata, icon, middleware, `mask_error_details` |
| `config.py` | Settings model, layered loader, mode requirements, startup guards, fingerprints |
| `feature_flags.py` | Registration-time capability gating from os.environ |
| `logger.py` | stderr logger factory and the audit logger |
| `tools/registry.py` | The only module importing FastMCP and tool modules together; tool descriptions |
| `tools/writes.py` | The single write-tool list; annotations and meta for reads and writes |
| `tools/errors.py` | Failure dicts and their conversion to `isError` results |
| `tools/confirmation.py` | Fact-bearing confirm-before-write guard (soft guardrail) |
| `tools/ids.py` | Input validators |
| `tools/picker.py` | Host interactive-choice payloads |
| `tools/example.py` | Example capability logic; replace per capability area |
| `client/base.py` | Upstream error normalisation |
| `client/example.py` | Example upstream client; replace per upstream API |
| `auth/session.py` | `authed_client()`: the one seam hiding transport and auth mode |
| `audit/__init__.py` | Audit middleware for write tools |
<!-- scaffold:if http -->
| `http/app.py` | HTTP auth wiring and custom routes |
<!-- scaffold:end -->

## Invariants

### Tool descriptions are the only guaranteed channel to the model
Server `instructions` are dropped by some clients (claude.ai). Anything the model must
know goes in a tool docstring, and a test in `tests/unit/test_registry.py` asserts the
phrase is still there. Both halves matter.

### Bulk and per-item tools cross-reference each other, both ways
Without it the model loops a per-item tool. When a flag removes a tool, references to it
must disappear too; `test_no_description_mentions_an_unregistered_tool` enforces it.

### Errors are results, never exceptions on the wire
Tools return failure dicts; the registry converts them to `isError` results. Unexpected
exceptions are masked (`mask_error_details=True`) and logged server-side.

### Writes have three gates, from one list
`tools/writes.py` drives destructiveHint annotations, the Claude Code
`requiresUserInteraction` meta, and `.claude/settings.json` `permissions.ask`.
`user_confirmed` is a fourth, soft guardrail: the model sets it, so it is never the
security boundary. Keep all of them.

### Unregister capabilities; don't merely forbid them
Rollout switches remove tools from `tools/list`. New capabilities ship merged-but-off.

<!-- scaffold:if auth=proxy|auth=resource-server -->
### The stdio token file always carries an absolute expiry
`auth/tokens.py`. Without it every call refreshes and trips the upstream's rate limit.

<!-- scaffold:end -->
<!-- scaffold:if auth=resource-server&http -->
### Never forward an inbound token upstream
Resource-server mode exchanges it (`auth/token_exchange.py`). Passthrough is forbidden by
the MCP spec.

<!-- scaffold:end -->
<!-- scaffold:if auth=proxy&http -->
### The OAuth proxy depends on a private FastMCP hook
`IdentityProxy._extract_upstream_claims` overrides an underscore-prefixed method.
`tests/unit/test_auth_proxy.py` fails first if an upgrade renames it.

<!-- scaffold:end -->
### Pin every framework knob, with the failure it prevents
Auth parameters and the FastMCP version range in `pyproject.toml`. FastMCP minor and
patch releases have changed auth behaviour.

### Support both protocol eras
Clients speak either the 2026-07-28 stateless protocol or the older handshake protocol.
Registry tests run in both (`ERAS`). Don't use era-gated APIs (`ctx.elicit`, tasks)
without a fallback.

## Capability waves

| Wave | Tools | Flag | Status |
|---|---|---|---|
| Reads | `example_list_items`, `example_get_item` | none | example |
| Writes | `example_update_item` | `SCAFFOLD_FEATURE_WRITES` (default off) | example |

Convention for the next wave: new flag in `feature_flags.py` defaulting to False, new
constant in `test_registry.py`, plan in `docs/plans/`.

## Testing conventions

- Mock the upstream with respx, not the framework. Assert on the result and the request.
- Use `tests/unit/helpers.py` (`configure_stdio`, `clean_env`); there is no conftest.
- Adding a tool: update `CORE_TOOLS`/`WRITE_TOOLS` in `test_registry.py`, and
  `WRITE_TOOLS` in `tools/writes.py` if it writes. Add description assertions for any
  guidance the model must not lose.
- Normalise whitespace before matching descriptions so docstrings can be rewrapped.
