# Gap analysis: SCAFFOLD_NOTES.md vs. the MCP ecosystem (2026-10-19)

This compares the patterns in `SCAFFOLD_NOTES.md` with the current MCP specification, the
current FastMCP release, what the major clients actually support, and conventions in
well-maintained reference servers. Every claim was checked against a live source on
2026-10-19. Claims marked *unverified* could not be confirmed. Sources are listed at the
end, with bracketed tags such as [S1] used throughout.

Effort is **low** (under an hour, mechanical), **med** (a day or less, some design), or
**high** (multi-day, or it changes the architecture). Disposition is **default** (the
generated server has it), **opt-in** (behind a scaffold flag), or **doc** (described as
an extension, not generated).

---

## 0. What changed underneath the notes

Read this first. Six facts drive most of the recommendations below.

1. **The protocol went stateless.** The latest stable spec revision is **2026-07-28** [S1].
   - It removes the `initialize` handshake and HTTP sessions (`Mcp-Session-Id`).
   - It adds a mandatory `server/discover`.
   - Servers no longer send requests to clients mid-call. Instead, a tool *returns* an
     `InputRequiredResult` and the client retries with the answers ("multi round-trip
     requests", MRTR).
   - It **deprecates Roots, Sampling, Logging and Dynamic Client Registration**. They
     remain functional until at least 2027-07-28 [S1][S2].
   - It moves Tasks out of the core spec into an official extension [S3].
2. **Clients are mid-migration.** Codex pins protocol 2025-06-18 [C11]. Claude Code
   speaks 2026-07-28 [C1]. MCP Inspector defaults to the "legacy" era [S9]. **A server
   built today must work in both eras.** FastMCP 4 does this from one server [F2].
3. **FastMCP is now at 4.1.1 (2026-10-18)** [F1]. It is built on the MCP Python SDK v2 and
   on spec 2026-07-28.
   - The notes most likely target **FastMCP 3.2.1–3.4.x** [F2]. The evidence is the
     `_extract_upstream_claims` hook, `list_tools()` returning a list, and camelCase
     `Icon(mimeType=...)`.
   - 3.4.9 is still receiving security backports [F1].
4. **"FastMCP" is now ambiguous.** The official SDK `mcp` 2.x renamed its bundled
   `FastMCP` to `MCPServer` (`mcp.server.mcpserver`) [R2]. The standalone `fastmcp`
   package still exports `FastMCP`. The notes depend on standalone-only features:
   `OAuthProxy`, `custom_route` and in-memory `Client`. **The scaffold must name
   `fastmcp` (PrefectHQ) explicitly and pin it.**
5. **Tool annotations now drive permissions in real clients.**
   - claude.ai/Desktop runs `readOnlyHint` tools without confirmation and always prompts
     for `destructiveHint` tools. Its connector directory requires a `title` plus the hints
     [C5].
   - VS Code skips confirmation for read-only tools [C14].
   - Codex's `writes` approval mode keys off them [C10].
   - The notes use no annotations at all.
6. **The notes' instructions caveat is now pinned to one client.** claude.ai/Desktop does
   not pass server `instructions` to the model; issue #93 is open and labelled triaged,
   backlog [C6]. Claude Code passes them but truncates at 4,096 characters [C1]. Codex says
   the first 512 characters matter most [C10]. The rule "anything the model must know goes
   in tool descriptions" is more justified than ever.

### Client support, condensed

This covers the features that decide defaults. The full matrix with footnotes is in the
research notes; the rows below are the verified subset.

| Feature | Claude Code | claude.ai / Desktop | Cursor | Codex | VS Code + Copilot |
|---|---|---|---|---|---|
| Streamable HTTP + OAuth | yes | yes | yes | yes | yes |
| CIMD (OAuth client metadata) | yes | yes (conditional) | unverified | yes | yes |
| Tool annotations change approval | shown only | **yes** | unverified | **yes** | **yes** |
| `structuredContent` / `outputSchema` | yes | unverified | unverified | partial | yes |
| Server `instructions` | yes (≤4,096 chars) | **no** | unverified | yes (512 matter) | yes |
| Elicitation (form) | yes | **no** | yes | yes | yes |
| Elicitation (URL) | yes | no | unverified | flag-gated | yes |
| Progress notifications | yes | no (web) | unverified | unverified | yes |
| Icons displayed | unverified | no (custom connectors, 3p) | unverified | partial | yes |
| Prompts | yes | partial | yes | **no** | yes |
| Resources | yes | partial | yes | yes | yes |
| MCP Apps (UI) | **no** (CLI) | yes | yes | partial | yes (experimental) |
| Tasks (long-running) | no | unverified | unverified | unverified | yes |
| Sampling (deprecated) | unverified | no | no | no | yes |

---

## 1. Repo layout

**Keep**
- `src/` layout, a thin `__main__.py`, and the console script.
- The registry as the only module that imports FastMCP. Business logic deals in plain
  dicts. This matches FastMCP's own advice to use factory entrypoints [F6].
- The domain-free vs. domain-specific file split, and `client/base.py` as the single
  error choke point.
- `infra/` as a README-only folder. No reference server ships fake IaC.
- The frozen-prototype isolation rule, kept as a conditional section (see Open questions).
- Committing `uv.lock`, `.env.example` and `CHANGELOG.md`.

**Update**
- `static/logo.svg` becomes **`static/icon.png` (plus optional SVG)**. The spec says
  clients MUST support PNG/JPEG but only SHOULD support SVG, and warns consumers to treat
  SVG with care [S4].
- `rbac/` should be **renamed `audit/` or cut** at its current maturity. It is a
  default-allow audit hook, not access control, and a public scaffold must not imply
  otherwise. FastMCP 4 has real authorization primitives to point at instead:
  `require_scopes`, `require_roles` and `AuthMiddleware` [F3].
- `test/` should be renamed **`tests/`**. Every reference repo checked uses `tests/`
  [R1][R2][R3][R4][R5][R6]. This is cosmetic but reduces friction.
- `CLAUDE.md` becomes **`AGENTS.md` as the primary file, with `CLAUDE.md` importing it**
  (`@AGENTS.md`). Codex, Cursor and Copilot read `AGENTS.md`. python-sdk,
  fastmcp and servers ship both [R1][R2][R3].

**Add**

| Item | What it is | Why it matters for a scaffold | Effort | Disposition |
|---|---|---|---|---|
| `SECURITY.md` | Vulnerability reporting policy | Expected of a public server that handles OAuth tokens. It is in servers, python-sdk and fastmcp [R1][R2][R3] | low | default |
| `.github/dependabot.yml` | Grouped uv + github-actions updates with a cooldown | Lockfile pinning without update automation means pinned-and-stale [R2] | low | default |
| `server.json` | MCP Registry manifest | Makes the server discoverable in the official registry. The registry is still **preview** [S7] | low | opt-in |
| `mcpb/manifest.json` + `.mcpbignore` | MCP Bundle for one-click Claude Desktop install of the stdio server | Desktop is the only Claude surface that runs local stdio servers [C4][C8]. Only one reference repo does this [R6] | med | opt-in |
| `pyproject.toml` `[project.urls]`, license, classifiers | Package metadata | Needed if the package is ever published to PyPI for `uvx` use | low | default |

---

## 2. Server setup, transports, entry points

**Keep**
- Three files, three jobs: `server.py` factory, `index.py` transport selection, and a
  thin `__main__.py`.
- `version=` read from package metadata. The `servers` repo has a test asserting the
  reported version is the package's, not the SDK's [R1].
- Lazy HTTP-only imports inside the HTTP branch.
- The stdio path never loads config at startup.
- `/health` that deliberately does not call upstream.
- No SSE. It is formally Deprecated as of 2026-07-28 [S1].
- `TRANSPORT` raising on an unknown value.

**Update**
- **Icons can be `data:` URIs** [S4][R2]. That removes the "no icon in stdio mode" rule:
  - Embed a small PNG as a data URI so the icon works in stdio mode too.
  - Keep `/logo.svg` (or `/icon.png`) only if HTTP clients need a fetchable URL.
  - Add `theme: light|dark` variants if wanted. FastMCP added `theme` in 4.0 [F3].
  - Use the snake_case `mime_type=` spelling. FastMCP 4 docs use it; camelCase still
    works through a compatibility bridge that emits warnings [F2].
- **Add `website_url=` and a `description`** to server metadata. Both arrived in spec
  2025-11-25 [S1] and are supported by FastMCP [F3].
- **`instructions=` budget:**
  - Keep it under ~500 characters. Codex weighs the first 512, Claude Code truncates at
    4,096, and claude.ai drops it entirely [C1][C6][C10].
  - Duplicate anything critical into tool descriptions (already the rule).
- **The `.run(transport="http")` deployment needs explicit protocol-era settings for
  multi-instance use:**
  - On 2026-07-28 connections there are no sessions.
  - On legacy connections FastMCP 4.1 expires idle HTTP sessions after 30 minutes
    (`FASTMCP_HTTP_SESSION_IDLE_TIMEOUT`) [F2].
  - For more than one replica, set `stateless_http=True`. FastMCP's docs say sticky
    sessions don't work because clients drop cookies [F6].
- **Host/Origin protection:**
  - The spec requires servers to validate `Origin`, returning 403 if it is invalid [S5].
  - FastMCP exposes `FASTMCP_HTTP_HOST_ORIGIN_PROTECTION` and `FASTMCP_HTTP_ALLOWED_HOSTS`
    [F3].
  - The scaffold should set them explicitly, in line with the notes' own rule to pin
    every framework knob.
  - Document why `0.0.0.0` is correct in a container and wrong on a laptop.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| Dual-era support | Serve both 2025-11-25 (handshake) and 2026-07-28 (stateless) clients | Codex pins 2025-06-18 while Claude Code speaks 2026-07-28. FastMCP 4 does both automatically; the scaffold just must not use era-specific APIs unguarded [C11][F2] | low | default |
| `mask_error_details=True` | Only `ToolError` messages reach clients; other exceptions become "Error calling tool X" | Verified on 4.1.1. Covers tool-level leaks that the ASGI middleware can't see [F3] | low | default |
| Explicit `stateless_http` | FastMCP setting | Required for horizontal scaling on legacy-era clients [F6] | low | opt-in (multi-instance) |

---

## 3. Tool registration

**Keep**
- Access check, delegate, return. No logic in the registry.
- Docstrings as product copy, and the bulk/per-item cross-references in both directions.
  No reference server does this as deliberately; it is the strongest part of the notes.
- `snake_case` verb_noun names. They fit SEP-986: 1–128 characters, ASCII
  `[A-Za-z0-9_.-]` [S6].
- The `choice_tool` decorator with explicit `inspect.cleandoc`, and the dedent test.
- Fail-closed authorization gates returning `(id, refusal)`.
- Never passing raw vendor payloads through.

**Update**
- **Return failures with `isError: true`.** Today the `{"ok": False, ...}` dicts are sent
  as *successful* results. The spec says tool execution errors (validation, business
  rules, upstream failures) SHOULD be reported with `isError: true` so models
  self-correct [S6]. On FastMCP 4.1.1, verified in both eras:
  - `raise ToolError(json.dumps(failure_dict))` sets `isError: true`.
  - `return ToolResult(structured_content=failure_dict, is_error=True)` does the same
    without raising.

  Keep the dict shape (`ok`, `code`, `message`, `hint`), which the model reads well, but
  carry it in an error result. This is the main change to the "return, don't raise"
  opinion: *return*, but mark it as an error. Effort: med, because one helper in
  `client/base.py` plus the registry wrapper changes and the tests follow.

  **Decided:** send the dict as JSON **text** (the `ToolError` route) and put no
  `structuredContent` on error results. FastMCP's own client doesn't check error payloads
  against `outputSchema` (verified), but the spec's MUST-conform wording isn't scoped to
  successes, and other clients' validators are unknown. Text-only errors are safe
  everywhere.
- **Plain type hints still work, with two additions:**
  - **Return annotations.** A `TypedDict` return type produces an `outputSchema`
    (verified). That stays within the "plain type hints, no Pydantic models" opinion.
  - **`Annotated[str, Field(description=...)]`** for parameters whose meaning isn't
    obvious. Clients render it in the schema itself, not only the docstring
    [R1][R4]. Optional; docstrings still work.
- **Tool name length: keep names at or under 64 characters.** The spec allows 128, but the
  claude.ai directory requires 64 or fewer [C5]. Add a test.
- **`tools/list` order should be deterministic** (a SHOULD in 2026-07-28) [S1].
  Registration order already is. Assert the order in the existing exact-set tests rather
  than only comparing sets.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| Tool annotations on every tool | `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`, set explicitly | claude.ai, VS Code and Codex all use them for approval [C5][C10][C14]. The spec defaults are pessimistic (destructive true, open-world true) [S6]. One reference repo has a test asserting them, noting that `idempotentHint=true` on an insert invites duplicate retries [R6] | low | **default** |
| `title=` on every tool | Human-readable display name | Required by the claude.ai directory [C5]. FastMCP derives one from the name if omitted [F2], but an explicit title is better copy | low | **default** |
| Annotation-aware `choice_tool` / write decorators | Decorators set annotations: write families get `destructiveHint`, read families get `readOnlyHint` | Keeps annotations consistent with the existing read/write split instead of hand-set per tool | low | default |
| `_meta["anthropic/requiresUserInteraction"]: true` on irreversible writes | Claude Code-specific: forces approval on every call, even in bypass/auto modes [C1] | Server-side backstop for the `.claude/settings.json` `ask` list, which users can override | low | default (writes only, noted as Claude Code-specific) |
| `outputSchema` via `TypedDict` returns | Typed structured result | Lets clients validate and render results. Supported by Claude Code and VS Code [C1][C14]. The spec roadmap flags a coming redesign of the result shape [S8], so don't over-invest | med | opt-in |
| `_meta["anthropic/maxResultSizeChars"]` | Raises Claude Code's 50k-char persist-to-disk threshold for one tool [C1] | Only for tools that legitimately return large payloads | low | doc |
| Progress notifications (`ctx.report_progress`) | Incremental progress on long calls | Resets Claude Code's idle timeout [C1]. Shown in Claude Code and VS Code. Not shown on claude.ai web | low | doc (for bulk tools) |
| Elicitation as a confirmation channel | Ask the user directly instead of the `user_confirmed` round trip | Supported by Claude Code, Cursor, Codex and VS Code, **but not claude.ai** [C1][C7]. It also needs two code paths: `ctx.elicit()` on handshake-era connections, the guard pattern on 2026-07-28 [F4] | high | opt-in |

---

## 4. Resources and prompts

**Keep**
- **No resources and no prompts as the default.** This matches the server type
  (authenticated actions on behalf of a user). Codex doesn't support prompts at all [C12],
  and claude.ai's prompt UI support is partial [C6].
- The picker payload conventions: option cap, paging, sentinel id, `{}` rather than a
  degenerate question, shaping in the tools layer.

**Update**
- **State plainly that the picker payload is a host-specific convention, not an MCP
  primitive.** It works only where a host's interactive-choice UI recognises it. The spec
  has two native ways to present choices:
  - Elicitation single-select enums with titles (since 2025-11-25) [S1].
  - MCP Apps [S10].

  The scaffold should keep the payload as the default, because it degrades to plain text
  everywhere, and describe the native alternatives.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| Elicitation enum picker | Native choice UI via form elicitation with `oneOf` titled options | Native in Claude Code, Cursor, Codex and VS Code; not claude.ai | high (dual-era) | opt-in |
| MCP Apps (`ui://` resource + tool `_meta.ui`) | Interactive HTML UI rendered in the host | Supported on claude.ai/Desktop, Cursor and VS Code (experimental); **not** in Claude Code CLI [C1][C4][C14]. FastMCP has `FastMCPApp` and ready-made approval/choice/form providers [F3] | high | doc |
| Resource links in tool results | `resource_link` content blocks | Only useful once resources exist | low | doc |

---

## 5. Configuration

**Keep**
- One settings model, explicit precedence, empty-string-is-unset.
- Validating in the loader, with what/why/fix error messages.
- Mode-conditional requirements, and "set together or not at all" pairs.
- Strict boolean parsing shared by config and feature flags.
- Credential-shape guards with a public predicate and a lazily-checked escape hatch.
- `.env.example` as the main documentation surface.
- Feature flags separate from config, gating at registration time, merged-but-off by
  default.

**Update**
- **Say how this interacts with FastMCP's own `FASTMCP_*` settings.** FastMCP reads its
  own environment variables and `.env` files (`FASTMCP_ENV_FILE`) [F3]. The scaffold's
  `.env` loader and FastMCP's can both read the same `.env`. Document which prefix each
  owns, and list the `FASTMCP_*` settings the scaffold pins in `.env.example`.
- **Feature flags vs. FastMCP visibility.** FastMCP 3+ has `tags=` plus `mcp.disable(tags=...)`,
  which removes components from `tools/list` [F3]. Equivalent semantics, so keep the
  registration-time gate (simpler and already tested) and say why in the opinions table.
  Neither needs `list_changed`, because flags change only on restart.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| `.env.example` section for pinned `FASTMCP_*` settings | Mask errors, origin protection, allowed hosts, telemetry mode, log level | Applies the notes' own "pin every framework default" rule to framework settings, not just proxy parameters | low | default |

---

## 6. Auth and security

**Keep**
- Acting as the signed-in human, with no service account.
- `authed_client()` as the single transport seam.
- A mandatory absolute `expires_at` on stored tokens.
- The OAuth proxy with a live "who am I" verifier for opaque tokens.
- Identity resolved once per code exchange or refresh, not per call.
- Optional encrypted token store with an honest description of the degraded mode.
- Pinning every proxy parameter with a comment.
- `safe_id` allow-lists, two gates on writes, fact-bearing confirmations.
- The untrusted-free-text label. The spec's new local-server-security page treats tool
  inputs and outputs as untrusted [S5], so keep this as a general rule, not a conditional
  one.
- Do-not-retry markers, the audit tag at one choke point, and the audit logger.

All of this aligns with the 2026 spec's security best practices: no token passthrough,
audience-bound tokens, and the confused-deputy guidance [S5].

**Update**
- **Pin `require_authorization_consent=True` on the OAuth proxy, with its own comment.**
  The spec's confused-deputy section says a proxy that uses a static upstream client id
  MUST get per-client user consent before forwarding [S5]. FastMCP exposes the parameter
  [F2]. It defaults to `True` in 4.1.1 (`oauth_proxy/proxy.py`). Pin it anyway, so a
  future default change can't silently remove consent.
- **Pin `enable_cimd=True`.**
  - CIMD (Client ID Metadata Documents) is now the spec's SHOULD, and Dynamic Client
    Registration is deprecated [S1].
  - FastMCP turns CIMD on by default since 3.0 [F3].
  - Claude Code, claude.ai (conditionally), Codex and VS Code all use it [C1][C2][C10][C14].
- **Watch `issuer_url` when upgrading to FastMCP 4.** It now sets the `iss` claim. If it
  differs from `base_url`, every user must re-authorize once [F2]. Add this to the upgrade
  runbook.
- **`_extract_upstream_claims` is still a private (underscore) hook in 4.1.1** [F2]. The
  scaffold depends on it, so pin FastMCP tightly, add a test that fails if the hook stops
  being called, and say so in the AGENTS.md invariants.
- **FastMCP 4 switched to `httpx2` internally** [F2]. The scaffold's own `httpx` + `respx`
  code is unaffected, but any `except httpx.X` wrapped around FastMCP calls (such as in the
  verifier) silently stops matching. Audit for this.
- **Return a scope challenge on 403.** The spec SHOULD is `WWW-Authenticate` with `scope`
  and `insufficient_scope` for step-up [S1]. Rarely relevant when scopes are fixed;
  document it.
- **The `.mcp.json` remote entry should use native HTTP, not a bridge CLI.** All five
  clients support streamable HTTP with OAuth natively. Use `{"type": "http", "url": ...}`.
  Keep a stdio bridge only for clients that need one; `fastmcp-remote` exists since 3.4 [F2].

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| Rate limiting | FastMCP `RateLimitingMiddleware` / `SlidingWindowRateLimitingMiddleware` [F3] | The spec says servers MUST rate-limit tool invocations [S6]. The notes list it as "not started". Verified in 4.1.1 source: pass `get_client_id=` (key it on the token's user id); without it, one global bucket is used. Buckets are in-process, so limits are per replica | low | default (HTTP path) |
| Real authorization | `require_scopes` / `require_roles` / `AuthMiddleware` [F3] | Replaces the default-allow RBAC placeholder with framework primitives when policy is actually needed | med | doc |
| Stateful handles guidance | Opaque, high-entropy, expiring handles bound to the user id | The 2026-07-28 replacement for sessions [S1][S5]. The scaffold is stateless, so this only matters if a tool needs cross-call state | low | doc |

---

## 7. Logging, observability, error handling

**Keep**
- Plain stderr logging with per-module loggers and a separate audit logger. **The spec
  now endorses this:** 2026-07-28 deprecates MCP protocol logging in favour of stderr and
  OpenTelemetry [S1].
- Startup visibility lines and credential fingerprints.
- The source-grep test for token logging.
- The ASGI unhandled-error middleware, which is still needed for the auth layer, outside
  tool calls.
- The crash-loop alert.

**Update**
- **Telemetry: use FastMCP's native OpenTelemetry instead of a vendor SDK wired by hand.**
  - FastMCP has had native OTel since 3.0. `FASTMCP_TELEMETRY_MODE` (4.0) and
    `opentelemetry-instrument` emit one server span per request [F3].
  - The 2026-07-28 spec also carries `traceparent` in `_meta`, so traces join across
    client and server [S1].
  - Keep it feature-detected: export only when a collector endpoint is set. Effort: med.
- **Fingerprints: recommend length plus the last 4 characters for anything that might be
  secret.** Keep prefix and suffix only for identifiers documented as public, such as
  OAuth client ids. This resolves the notes' open question 3.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| Don't use `ctx.info()` / protocol logging | MCP logging notifications | Deprecated in 2026-07-28 [S1]. On modern connections servers MUST NOT emit them unless the request opted in. Stating this prevents someone "upgrading" to it | low | doc (as a non-goal) |
| Docker `HEALTHCHECK` | Container-level liveness | Only if the deploy target lacks its own probes; most managed container services have them | low | opt-in |

---

## 8. Testing

**Keep**
- No-network unit tests with respx, asserting the outgoing request.
- Fails-closed authorization tests.
- In-memory store substitution.
- **Tests on the tool surface:** exact tool-name sets per flag state, description-phrase
  assertions with normalised whitespace, no dangling cross-references. No reference
  server tests descriptions this thoroughly.
- The source-grep guard test.
- Self-skipping integration tests with the start command in the skip reason.

**Update**
- **Run registry tests through the protocol, not just `list_tools()` on the server
  object.** Use FastMCP's in-memory `Client(mcp)`, which is the documented way to test a
  FastMCP server [F5]. This closes the notes' "no end-to-end protocol test" gap without a
  subprocess or network.
- **Run them in both eras:** `Client(mcp)` (2026-07-28) and `Client(mcp, mode="legacy")`
  (handshake era). Verified working on 4.1.1. This catches era-gated API use (for example
  `ctx.elicit`) before a Codex user does.
- **Add `pytest-asyncio` with `asyncio_mode="auto"`** [F5][R1]. The "no conftest" rule
  still works with per-module fixtures.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| Snapshot of `tools/list` | `inline-snapshot` of names, titles, annotations, input/output schemas [F5][R2] | Complements the phrase assertions. Any schema or annotation drift becomes a reviewed diff | low | **default** |
| Annotation assertions | Every write tool has `destructiveHint=true`, every read tool `readOnlyHint=true`, idempotency is deliberate | Annotations now gate approvals in three clients. A wrong `readOnlyHint` on a write auto-runs it on claude.ai [C5] | low | **default** |
| Error-result assertions | Failures come back with `isError: true` and the dict shape | Guards the §3 change | low | default |
| Entry-point smoke test | Spawn the installed console script over real stdio, call `tools/list`, exit | Catches stdout pollution and packaging errors that in-memory tests can't [R1] | low | **default** |
| MCP Inspector CLI in CI | `npx @modelcontextprotocol/inspector --cli ... --method tools/list --strict` exits 6 on schema-portability errors [S9] | Cross-client schema check for free. Needs Node 22.19+ in CI | low | opt-in |
| MCP conformance suite | `@modelcontextprotocol/conformance` with a known-failures baseline [R6] | Protocol-level conformance. Emerging practice (one reference repo) | med | doc |
| Coverage gate | `--cov-fail-under` | Common in reference servers (80–90%) [R1][R5]; a policy choice | low | opt-in |
| Type checker | pyright, mypy or `ty` | Every reference repo runs one; the notes run ruff only [R1][R2][R3][R4] | low | **default** (pyright) |

---

## 9. Local dev workflow

**Keep**
- Bare `uv run` commands with no task runner, listed verbatim in the agent file.
- The login script with the listener parsed from one redirect-URI value.
- The pure-Python cert script.
- Operator scripts as tested, linted code.
- The verification probe that shares the guard predicate.
- `.mcp.json.example` copied to a gitignored `.mcp.json`.

**Update**
- **Add MCP Inspector to the dev loop.** Reference READMEs document it as the debugging
  step [R1][R5].
  - Use `fastmcp dev inspector -m <pkg>`, which gives auto-reload [F3]. Module mode is
    required: a `src/<pkg>/server.py:create_mcp` spec fails with "attempted relative
    import with no known parent package", because FastMCP loads the file standalone.
  - Or `npx @modelcontextprotocol/inspector uv run python -m <pkg>`.
  - The notes list "MCP Inspector: never used" as a fact about the old project. The
    scaffold should not carry that forward.
- **`.mcp.json` remote entry:** native `type: http` (see §6).

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| `fastmcp inspect` | Prints the server's component summary [F3] | Quick sanity check after adding a tool | low | doc |
| `fastmcp install <client>` | Registers the server with Claude Code, Claude Desktop, Cursor and others [F3] | Faster than hand-editing client config for local testing | low | doc |

---

## 10. Dependencies and packaging

**Keep**
- uv only, lockfile committed, `uv sync --locked` in both CI and the Dockerfile. Reference
  servers converge on the same thing [R1][R4].
- The two-stage Dockerfile, `--no-editable`, the dependency layer cached separately.
- No BuildKit mounts. Keep this, but state it as an opinion: `servers` and awslabs both
  use cache mounts [R1][R4].
- `bump_version.py` called by deploy, and the generated changelog.

**Update**
- **Pin `fastmcp` to a minor version (`fastmcp>=4.1,<4.2`)**, not just through the
  lockfile:
  - 4.1.0 shipped breaking security tightenings in a minor release [F2].
  - Both of the notes' OAuth incidents came from patch-level behaviour changes.
  - A narrow declared range makes Dependabot PRs for FastMCP explicit, reviewable events.
- **`requires-python >=3.12` is fine.** FastMCP supports 3.10+ [F1]. Reference servers use
  3.10 for reach, which only matters if the package will be published for `uvx`.
- **Dockerfile:**
  - Add a **non-root user** [R1][R4].
  - Set `UV_COMPILE_BYTECODE=1` for faster cold start [R1][R4].
  - Label the image `io.modelcontextprotocol.server.name` if publishing to the registry
    [S7].
- **Ruff:** add `ruff format --check` and a small rule selection (`E,F,I,UP,B`), as python-sdk
  does [R2]. "Ruff defaults" leaves import sorting and bugbear checks off.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| SHA-pin **all** actions | Not just setup-uv | The notes pin one action. Reference servers pin all of them [R1][R4][R6] | low | default |
| PyPI release with trusted publishing | Separate build and publish jobs, OIDC, `uvx <pkg>` install path [R1][R5] | The standard distribution route for stdio servers. The notes' server was container-only | med | opt-in |
| MCP Registry publish | `mcp-publisher` in the release workflow, `mcp-name:` marker in the README [S7][R5] | Discoverability. The registry is in preview | low | opt-in |
| MCPB bundle | See §1 | One-click Claude Desktop install | med | opt-in |
| Security scanning | gitleaks, zizmor (Actions), bandit [R3][R4][R6] | Cheap for a server that brokers OAuth tokens | low | opt-in |

---

## 11. Agent-facing files

**Keep**
- The agent file's structure: commands, an ASCII flow, a module-map table, named
  invariants with rationale, capability waves, testing conventions. This is better than
  anything in the reference repos.
- `permissions.ask` for every write tool.
- The isolated end-user subagent, and the "only honest test of descriptions" rule.
- `docs/{specs,plans,runbooks,rca}` with dated filenames.

**Update**
- **Primary file `AGENTS.md`; `CLAUDE.md` contains `@AGENTS.md`** plus Claude-specific
  notes (see §1).
- **Label the subagent technique as Claude Code-specific** (`.claude/agents/`), and give
  the portable form: any agent harness restricted to the server's own tools. That keeps a
  public skill honest about which parts are portable.
- **Explain `permissions.ask` relative to annotations.**
  - `permissions.ask` is Claude Code's client-side boundary.
  - Annotations are the cross-client signal; they are hints, and the spec says clients
    MUST treat them as untrusted [S6].
  - `anthropic/requiresUserInteraction` is the server-side Claude Code backstop.

  The scaffold should generate all three from one list of write tools, so they cannot
  drift.

**Add**

| Item | What it is | Why | Effort | Disposition |
|---|---|---|---|---|
| One source of truth for write tools | A constant consumed by the annotations, `.claude/settings.json` generation and the `requiresUserInteraction` meta | Three mechanisms, one list. A test asserts they agree | low | default |
| README install section per client | Claude Code `claude mcp add`, VS Code install badge, Cursor deeplink, Codex `config.toml`, plus an env var table and an Inspector section [R1][R4][R5] | The notes only list README.md as a file. Every reference server leads with per-client install | low | default |

---

## 12. Decisions and lessons

**Keep:** all of them. Nothing in the current ecosystem contradicts a lesson in §12.
Several are now backed by the spec:
- "Return errors" matches SEP-1303: input validation errors are tool execution errors,
  not protocol errors.
- "Plain stderr logging" matches the deprecation of MCP logging.
- "Pin every proxy parameter" matches the spec's confused-deputy rules.

**Update**
- **"Tool descriptions are the only guaranteed channel"** can now name the client:
  claude.ai/Desktop drops server instructions (issue #93) [C6].
- **"Return errors; never let an exception reach the wire"** now reads: return error
  *results* with `isError: true`, and set `mask_error_details=True` as a second net. See §3.

**Add**
- **"Annotations are product copy too."** A wrong `readOnlyHint` auto-runs a write on
  claude.ai and VS Code. Treat annotations like docstrings: reviewed, tested, and
  snapshotted.
- **"Build for two protocol eras until the ecosystem finishes migrating."** Test both.
  Don't adopt era-specific features (elicitation, tasks) without a fallback.

---

## Recommended scaffold defaults

Out of the box, the generated server should include:

1. **Pinned `fastmcp`**, standalone (PrefectHQ), at `>=4.1,<4.2`, with `uv.lock` and
   `--locked` everywhere.
2. **Both protocol eras** working, with tests for each (`Client(mcp)` and
   `Client(mcp, mode="legacy")`).
3. **stdio and streamable HTTP**; no SSE.
4. **Server metadata:** name, `title`, `description`, `version` from package metadata,
   `website_url`, a PNG icon as a data URI (so it works in stdio), and a short
   `instructions` (under 500 characters) that duplicates nothing critical.
5. **Every tool** has `title=`, all four annotations set explicitly, a model-facing
   docstring with cross-references, and a name of 64 characters or fewer.
6. **Errors** are returned as `isError: true` results carrying the `{ok, code, message,
   hint}` dict as JSON text (no `structuredContent` on errors), with
   `mask_error_details=True` behind them.
7. **Async throughout:** async tools and `httpx.AsyncClient` upstream clients, so a
   client disconnect (cancellation on 2026-07-28 HTTP) stops in-flight work. respx
   mocks async clients the same way.
8. **Writes:**
   - `destructiveHint=true` annotations.
   - `_meta["anthropic/requiresUserInteraction"]: true` on irreversible writes.
   - A `.claude/settings.json` `permissions.ask` list.
   - The `user_confirmed` second-step guard.
   - All of the above generated from one write-tool list, with a test asserting they
     agree.
9. **Feature flags** gate capabilities at registration time, merged-but-off.
10. **Config loader** with what/why/fix errors, strict booleans and shape guards, plus the
    pinned `FASTMCP_*` settings documented in `.env.example`.
11. **HTTP auth, two modes behind one setting:**
    - **`proxy`:** the notes' `OAuthProxy` shape for vendors with opaque tokens.
      `require_authorization_consent=True`, `enable_cimd=True`, every other parameter
      pinned with a comment, and an optional encrypted store documented as optional.
    - **`resource-server`:** `RemoteAuthProvider` + `JWTVerifier` (or
      `IntrospectionTokenVerifier`) for identity providers that issue JWTs or support
      CIMD/DCR.
    - Both modes share the rate-limiting middleware, keyed on the authenticated user id,
      and explicit Host/Origin protection.
    - stdio uses environment credentials or the local token file, with no MCP auth layer.
12. **Plain stderr logging**, startup fingerprint lines, an audit logger, and the ASGI
    unhandled-error middleware.
13. **Tests:**
    - respx unit tests.
    - In-memory protocol tests in both eras.
    - Exact tool-set tests, description-phrase tests, and a `tools/list` inline snapshot.
    - Annotation and error-shape assertions.
    - A source-grep guard.
    - An entry-point stdio smoke test.
    - Self-skipping integration tests.
14. **CI:** `uv sync --locked`, `ruff check`, `ruff format --check`, `pyright`, unit
    tests, all actions SHA-pinned, Dependabot for uv and Actions.
15. **Dockerfile:** two-stage, non-root, `UV_COMPILE_BYTECODE=1`, no BuildKit mounts.
16. **Files:** `AGENTS.md` (with `CLAUDE.md` importing it), `README.md` with per-client
    install and an Inspector section, `SECURITY.md`, `CHANGELOG.md`, `.env.example`,
    `.gitattributes` (`* text=auto eol=lf`), and `infra/README.md`.

**Opt-in flags**, which most clients don't support yet or which depend on deployment
choices:
- `outputSchema` via `TypedDict` returns.
- Elicitation (confirmation and choice).
- Inspector `--strict` in CI.
- Coverage gate.
- `stateless_http` for multi-instance deployments.
- PyPI trusted publishing.
- MCP Registry `server.json` + `mcp-publisher` release step, with a preview-status warning.
- MCPB bundle.
- Security scanners.
- Docker `HEALTHCHECK`.

**Documented extensions only:**
- MCP Apps.
- Tasks.
- Progress notifications.
- Resources, prompts and resource links.
- Real authorization (`require_scopes`/`require_roles`).
- Stateful handles.
- Scope step-up.
- Conformance suite.
- `fastmcp inspect` / `install`.

**Deliberately not adopted** (deprecated in 2026-07-28): sampling, roots, MCP protocol
logging, SSE, Dynamic Client Registration as the primary registration path.

---

## Opinions to state

The ecosystem doesn't mandate any of these. Say so in the skill so users can reject them.

| Opinion | What the ecosystem does instead |
|---|---|
| Standalone `fastmcp` rather than the official SDK's `MCPServer` | The official SDK is lower-level and lacks `OAuthProxy`, `custom_route` and the in-memory `Client`. Reference servers are split [R1][R4] |
| Error **dicts** carried in `isError` results | `ToolError` with a plain string (awslabs) or `McpError` (servers) [R1][R4] |
| Async tools and clients | The notes' original sync clients; most reference servers mix both |
| Plain type hints and `TypedDict`, no Pydantic models per tool | awslabs mandates Pydantic `Field` on every parameter [R4] |
| One registry file for every tool | Auto-imported tool modules with decorators at definition (redis), FastMCP `FileSystemProvider` [R5][F6] |
| Hand-written config loader on `BaseModel` | `pydantic-settings`, and FastMCP's own `FASTMCP_*` settings |
| Plain-text stderr logs | Loguru (awslabs), structured JSON [R4] |
| No resources or prompts | Reference examples ship both [R1][R2] |
| `user_confirmed` second call **in addition to** client prompts | Rely on client approval plus annotations alone |
| Registration-time feature flags | FastMCP tags plus `enable`/`disable` [F3] |
| Picker payload in tool results | Elicitation enums or MCP Apps |
| No BuildKit cache mounts | servers and awslabs use them [R1][R4] |
| Floating base-image patch tag | awslabs pins the base by digest [R4] |
| No task runner | fastmcp uses `just`, jupyter uses `make` [R3][R6] |
| No pre-commit | python-sdk, fastmcp and awslabs use it [R2][R3][R4] |
| `src/` + hatchling + console script | Same as `servers` [R1]; listed for completeness |
| Custom `bump_version.py` | commitizen (awslabs), CalVer (servers) [R1][R4] |
| Integration tests out of CI | Service containers in CI (redis) [R5] |
| AGENTS.md + CLAUDE.md as primary design docs | Most repos keep architecture in README/ARCHITECTURE.md |

---

## Decisions (2026-10-19)

Resolved with you, or verified in the FastMCP 4.1.1 source:

1. **Framework:** `fastmcp` (PrefectHQ) 4.1.x, pinned `>=4.1,<4.2`, with both protocol
   eras supported and tested.
2. **Auth modes** (amended 2026-10-20):
   - **`proxy`:** the notes' `OAuthProxy` shape, for HTTP. The proxy holds a real
     upstream token per user. stdio uses the local token file from the login script.
   - **`resource-server`:** `RemoteAuthProvider` + `JWTVerifier` validate a token issued
     for this server. Upstream calls use **RFC 8693 token exchange**, with Entra's
     on-behalf-of grant documented as the variant, to get a per-user upstream token.
     Forwarding the inbound token would be token passthrough, which the spec forbids.
   - **`none`:** stdio only, with no MCP auth layer. The upstream credential comes from
     an environment variable, as the spec recommends for stdio. Implies `--no-http`.
3. **Error transport:** the failure dict as JSON text in an `isError: true` result, with
   no `structuredContent` on errors (see §3).
4. **Rate limiting:** `RateLimitingMiddleware(get_client_id=...)` keyed on the
   authenticated user id. Without `get_client_id` it is one global bucket. Limits are
   per replica (in-process buckets); document that.
5. **Consent:** `require_authorization_consent` defaults to `True` in 4.1.1. Pin it
   explicitly anyway.
6. **Concurrency:** async tools and `httpx.AsyncClient`, so client disconnects cancel
   in-flight work.
7. **The notes' "Needs my decision" items:**
   - **(1) Platform:** stays generic.
   - **(2) RBAC:** becomes an audit hook (`audit/`); real authorization points to
     `require_scopes`/`require_roles`/`AuthMiddleware`.
   - **(3) Fingerprints:** length plus last 4 characters for anything that might be
     secret; prefix and suffix only for documented public identifiers.
   - **(4) `types.py`:** promoted to a generic "id constants and alias tables" convention.
   - **(5) Untrusted-text labelling:** a general rule.
   - **(6) `accept_warnings` and full-set replace semantics:** documented patterns, not
     defaults.
   - **(7) Line endings:** `.gitattributes` with `* text=auto eol=lf` is a default.
   - **(8) Frozen prototype:** a conditional section ("if porting a prototype").
8. **MCP Registry:** opt-in now (`server.json` plus an `mcp-publisher` release step), with
   a warning that the registry is in preview.
9. **Skill shape** (2026-10-20):
   - **Name:** `fastmcp-server-scaffold`.
   - **Generation:** a runnable template in `assets/template/` rendered by a stdlib
     `scripts/scaffold.py`. Repo CI renders and tests it for each auth mode.
   - **Example tools:** one read and one write example against a fake upstream, so the
     generated project is green from the first commit.
   - **v1 opt-in flags:** `output-schema`, `stateless`, `pypi`, `registry`,
     `inspector-ci`, `coverage`, `security-scan`, `healthcheck`. `elicitation` and `mcpb`
     are deferred to a later release and documented as extensions.
   - **No `uv.lock` in the template.** The generated project locks on first sync, so a
     shipped lockfile can't go stale.

## Still open

These need a hands-on check against a scaffolded server; research couldn't settle them.

1. **Icon display.** Verified only in VS Code. claude.ai custom connectors reportedly
   ignore icons (third-party issue). Check before the README promises anything.
2. **Thinly verified client behaviour:**
   - annotations (Cursor)
   - `outputSchema` (Cursor, claude.ai)
   - instructions (Cursor)
   - progress (Cursor)

   About 30 minutes of manual testing would settle these and fill in the skill's
   compatibility notes.

---

## Sources

**MCP specification and official docs**
- [S1] Spec 2026-07-28 changelog (major changes, deprecations): https://modelcontextprotocol.io/specification/2026-07-28/changelog. Earlier changelogs: [/2025-11-25/changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog), [/2025-06-18/changelog](https://modelcontextprotocol.io/specification/2025-06-18/changelog), [/2025-03-26/changelog](https://modelcontextprotocol.io/specification/2025-03-26/changelog)
- [S2] Deprecated features registry: https://modelcontextprotocol.io/specification/2026-07-28/deprecated
- [S3] Tasks extension: https://modelcontextprotocol.io/extensions/tasks/overview
- [S4] Icons (basic): https://modelcontextprotocol.io/specification/2026-07-28/basic#icons
- [S5] Security best practices: https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices and local server security: https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/local-server-security. Streamable HTTP (Origin validation): https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- [S6] Tools (names, annotations, error handling, security considerations): https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- [S7] MCP Registry (preview, server.json, namespaces, package verification): https://modelcontextprotocol.io/registry/about, https://modelcontextprotocol.io/registry/package-types, https://github.com/modelcontextprotocol/registry
- [S8] Roadmap: https://modelcontextprotocol.io/development/roadmap
- [S9] MCP Inspector: https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector, https://github.com/modelcontextprotocol/inspector
- [S10] MCP Apps extension: https://modelcontextprotocol.io/extensions/apps/overview

**FastMCP**
- [F1] PyPI: https://pypi.org/project/fastmcp/ (4.1.1, 2026-10-18); releases: https://github.com/PrefectHQ/fastmcp/releases
- [F2] Upgrading from FastMCP 3: https://gofastmcp.com/getting-started/upgrading/from-fastmcp-3; from 2: https://gofastmcp.com/getting-started/upgrading/from-fastmcp-2
- [F3] Docs: tools https://gofastmcp.com/servers/tools, icons https://gofastmcp.com/servers/icons, visibility https://gofastmcp.com/servers/visibility, middleware https://gofastmcp.com/servers/middleware, auth https://gofastmcp.com/servers/auth/authentication, OAuth proxy https://gofastmcp.com/servers/auth/oauth-proxy, telemetry https://gofastmcp.com/servers/telemetry, settings https://gofastmcp.com/more/settings, apps https://gofastmcp.com/apps/overview, CLI https://gofastmcp.com/patterns/cli
- [F4] Elicitation (era-gated): https://gofastmcp.com/servers/elicitation
- [F5] Testing: https://gofastmcp.com/servers/testing
- [F6] HTTP deployment: https://gofastmcp.com/deployment/http
- Local verification: `fastmcp==4.1.1` probe on 2026-10-19 (TypedDict produces `outputSchema`; `ToolError` and `ToolResult(is_error=True)` produce `isError: true`; `mask_error_details` hides internals; both `Client` eras work).

**Clients**
- [C1] Claude Code MCP docs (instructions truncation, `_meta` extensions, timeouts, elicitation, MCP Apps not rendered): https://code.claude.com/docs/en/mcp; permissions: https://code.claude.com/docs/en/permissions
- [C2] claude.ai connector auth (CIMD/DCR): https://claude.com/docs/connectors/building/authentication
- [C4] claude.ai connectors getting started (MCP Apps, tool permissions): https://claude.com/docs/connectors/getting-started
- [C5] claude.ai connector review criteria (title + annotations drive auto-permissions, ≤64-char names): https://claude.com/docs/connectors/building/review-criteria
- [C6] claude-ai-mcp issues: instructions not passed (#93) https://github.com/anthropics/claude-ai-mcp/issues/93; prompts UI (#333) https://github.com/anthropics/claude-ai-mcp/issues/333
- [C7] claude-ai-mcp elicitation request (#153): https://github.com/anthropics/claude-ai-mcp/issues/153
- [C8] claude.ai MCPB: https://claude.com/docs/connectors/building/mcpb
- [C10] Codex MCP docs (approval modes, instructions, OAuth): https://developers.openai.com/codex/mcp
- [C11] Codex source (pinned protocol version, declared capabilities): https://github.com/openai/codex/tree/main/codex-rs/codex-mcp/src
- [C12] Codex prompts request (#5059): https://github.com/openai/codex/issues/5059
- [C13] Cursor MCP docs: https://cursor.com/docs/mcp
- [C14] VS Code MCP developer guide (readOnlyHint skips confirmation, icons, tasks, elicitation): https://code.visualstudio.com/api/extension-guides/ai/mcp; release notes https://code.visualstudio.com/updates/v1_107

**Reference implementations**
- [R1] modelcontextprotocol/servers (fetch, git, time): https://github.com/modelcontextprotocol/servers
- [R2] modelcontextprotocol/python-sdk (examples, migration guide, testing docs): https://github.com/modelcontextprotocol/python-sdk
- [R3] PrefectHQ/fastmcp: https://github.com/PrefectHQ/fastmcp
- [R4] awslabs/mcp (DESIGN_GUIDELINES.md, CI): https://github.com/awslabs/mcp
- [R5] redis/mcp-redis (server.json + registry publish workflow): https://github.com/redis/mcp-redis
- [R6] datalayer/jupyter-mcp-server (annotation tests, conformance suite, MCPB): https://github.com/datalayer/jupyter-mcp-server
