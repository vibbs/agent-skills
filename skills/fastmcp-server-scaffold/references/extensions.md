# Extensions (not generated)

Features the template deliberately leaves out, with when they're worth adding and how.
Check `client-compat.md` for the user's clients before adding any of them.

## Elicitation (planned as a future `--with elicitation`)

Ask the user a structured question mid-call: a confirmation, or a choice from titled
single-select enums. Supported by Claude Code, Cursor, Codex and VS Code; **not by
claude.ai**, so it can't replace the `user_confirmed` round trip yet.

It's era-gated (`protocol-eras.md`): `await ctx.elicit("...", response_type=...)` on
handshake-era connections, and the guard pattern (return an `InputRequiredResult`, read
`ctx.input_responses` on the retry) on 2026-07-28 connections. Implement both, branch on
`ctx.request_context.protocol_version`, and test both eras. Never use form elicitation for
passwords, API keys, tokens or payment data; the spec forbids it. URL-mode elicitation
(for out-of-band flows) is only reachable through `ctx.session.elicit_url(...)` in FastMCP.

## MCP Bundle (planned as a future `--with mcpb`)

A `.mcpb` bundle (`manifest.json`, `user_config` mapped to environment variables,
`.mcpbignore`) gives Claude Desktop users a one-click install of the stdio server. Add a
test that the manifest version matches the package version. Publish bundles as GitHub
Release assets; the MCP Registry accepts them with a `fileSha256`.

## MCP Apps

Interactive HTML UI rendered in the host: a tool's `_meta.ui.resourceUri` points to a
`ui://` resource with MIME `text/html;profile=mcp-app`, shown in a sandboxed iframe.
Rendered by claude.ai/Desktop, Cursor and VS Code (experimental); **not** by Claude Code's
CLI. FastMCP has `FastMCPApp`, `@app.ui()` and ready-made approval, choice and form
providers (`fastmcp[apps]`). Keep a text fallback in the tool result.

## Long-running tasks

The `io.modelcontextprotocol/tasks` extension (2026-07-28 era only): the call returns a
task handle and the client polls. FastMCP: `pip install "fastmcp[tasks]"`,
`mcp.add_extension(TasksExtension())`, `@mcp.tool(task=True)`. Only VS Code is confirmed to
support tasks. For most servers, a fast synchronous call plus progress notifications is
the better first step.

## Progress notifications

`await ctx.report_progress(progress=i, total=n, message="...")` from a long tool. Shown in
Claude Code and VS Code, and in Claude Code it resets the idle timeout. Cheap to add to
bulk tools; harmless where unsupported.

## Resources, prompts and resource links

The template exposes tools only, because the server's job is actions on the user's behalf.
Add **resources** (`@mcp.resource("scheme://{id}")`) for read-mostly data a user might
attach as context, **prompts** (`@mcp.prompt`) for reusable user-invoked workflows (Codex
doesn't support prompts), and `resource_link` blocks in tool results once resources exist.
Templated resources are screened for path traversal by default in FastMCP 4.

## Real authorization

`require_scopes`, `require_roles` and `AuthMiddleware` in FastMCP replace a homegrown RBAC
layer when you need per-user or per-role policy. Keep it separate from feature flags.

## Scope step-up

When a call needs more scope than the token has, return 403 with `WWW-Authenticate:
... error="insufficient_scope", scope="..."` so the client can ask the user for more
(spec 2025-11-25). Rarely needed when scopes are fixed.

## Telemetry

FastMCP has native OpenTelemetry: run under `opentelemetry-instrument` and set
`FASTMCP_TELEMETRY_MODE`; each request becomes one server span, and 2026-07-28 clients can
pass `traceparent` in `_meta`. Keep it feature-detected: export only when a collector
endpoint is configured, and the server behaves identically without it. Add the httpx
instrumentation so upstream calls appear as timed dependencies.

## Conformance suite

`@modelcontextprotocol/conformance` run from a test, with a known-failures baseline file,
blocks new protocol regressions. Emerging practice; worth it once the server is public.

## Porting a prototype

If the project starts as a port of an existing prototype, keep the prototype in its own
top-level folder with its own dependency file, and make one rule absolute: `src/` never
imports it. Packaging, the Dockerfile and CI must assume total isolation. Its value is as
a behavioural reference and a record of upstream quirks the vendor's docs don't mention.
