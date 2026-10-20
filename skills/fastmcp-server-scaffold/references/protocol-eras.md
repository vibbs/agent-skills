# Protocol eras

MCP spec revision **2026-07-28** made the protocol stateless. Clients are mid-migration, so
a server built today serves two eras at once:

| | Handshake era (2024-11-05 to 2025-11-25) | Stateless era (2026-07-28) |
|---|---|---|
| Connection start | `initialize` / `initialized` | none; every request carries version and capabilities in `_meta`, plus `server/discover` |
| HTTP sessions | `Mcp-Session-Id` | removed; cross-call state uses server-minted handles in tool arguments |
| Server asks the user mid-call | server-to-client request (`elicitation/create`) | tool **returns** `InputRequiredResult`; the client retries with answers (MRTR) |
| Long-running work | experimental tasks in core | `io.modelcontextprotocol/tasks` extension |
| Roots, sampling, MCP logging | supported | deprecated (still functional until at least 2027-07-28) |
| Cancellation over HTTP | `notifications/cancelled` | closing the response stream is the cancellation |

As of October 2026: Claude Code speaks 2026-07-28; Codex pins 2025-06-18; MCP Inspector
defaults to the legacy era. FastMCP 4 serves both from one server, and its `Client`
negotiates 2026-07-28 unless given `mode="legacy"`.

## What the template does

- Uses nothing era-specific: tools, annotations, titles, icons, `isError` results,
  structured content, progress and cancellation all work in both eras.
- Runs the registry tests in both eras (`ERAS = ["auto", "legacy"]` in
  `tests/unit/test_registry.py`). Keep any new protocol-level test parametrized the
  same way.
- Is async end to end, so a client disconnect on a 2026-07-28 HTTP connection cancels the
  in-flight upstream call instead of letting it finish unseen. FastMCP cannot interrupt a
  sync tool running in a thread.
- Logs to stderr, not MCP logging notifications (deprecated in 2026-07-28).
- Keeps HTTP stateless-ready: no per-session state in tools. `--with stateless` sets
  `stateless_http=True` for multi-replica deployments of legacy-era clients. FastMCP 4.1
  also expires idle legacy HTTP sessions after 30 minutes
  (`FASTMCP_HTTP_SESSION_IDLE_TIMEOUT`).

## Era-gated APIs: use only with a fallback

| API | Handshake era | Stateless era |
|---|---|---|
| `await ctx.elicit(...)` | works | **raises** |
| Guard pattern (`InputRequiredResult`, `ctx.input_responses`) | **raises** | works |
| `ctx.sample(...)` / `ctx.list_roots()` | removed from FastMCP 4 entirely | removed |
| Background tasks (`task=True` + `TasksExtension`) | not available | works |
| `Middleware.on_initialize` | runs | never runs |
| `ctx.set_state` across calls | persists per session | does not persist |

To use elicitation, implement both paths and branch on
`ctx.request_context.protocol_version`, then test both eras. Elicitation is also
unsupported by claude.ai (see `client-compat.md`), so the generated `user_confirmed`
round trip remains the default confirmation channel.

## Stateful tools

If a tool genuinely needs cross-call state, the 2026-07-28 pattern is an opaque handle
returned by one call and passed to the next as an ordinary argument:

- cryptographically random, high entropy, and expiring;
- bound server-side to the authenticated user id (`<user_id>:<handle>`), checked on every
  call. A handle is not authentication;
- with the retention policy stated in the tool description.
