# fastmcp-server-scaffold

Generates a production-shaped Python MCP server on FastMCP that acts on an upstream API as
the signed-in user.

## The problem

Getting an MCP server to work in a demo takes an afternoon. Getting one that is safe to
hand to real users takes weeks, because the hard parts aren't in the quickstarts:
per-user OAuth without a shared service account, tool descriptions that stop the model
looping a per-item tool, write confirmations a model can't skip, errors the model can
explain, annotations that real clients now use to decide when to ask permission, and a
protocol that changed underneath everyone in 2026. Most servers rediscover these one
incident at a time.

The second problem is drift. The MCP spec, FastMCP and the clients all move monthly. A
scaffold that was right last quarter quietly isn't, and nothing tells you which of your
conventions went stale.

## How it solves it

The skill generates a complete project from a template that already passes its own
checks, then guides the agent through replacing the example tools with real ones. Each
convention either was paid for in a production server or is what the current spec and
clients expect, and each is enforced by a test, so a later change can't quietly undo it:

- **Acts as the user.** Three auth modes, none of which forwards a client token upstream
  (token passthrough is forbidden by the spec): an OAuth proxy, a resource server with
  RFC 8693 or Entra on-behalf-of token exchange, or a local env credential.
- **Tool descriptions as product copy,** with tests asserting that bulk/per-item
  cross-references, confirmation protocols and non-goals stay in place.
- **Writes behind four gates:** destructive annotations, Claude Code's per-call prompt,
  `permissions.ask`, and a fact-bearing confirmation step, all generated from one list.
- **Both protocol eras.** Every protocol test runs against the 2026-07-28 stateless
  revision and the older handshake era that many clients still speak.
- **Kept current in CI.** This repository renders the template in five configurations on
  every change and weekly, and runs each generated project's lint, type-check, tests,
  Docker build and MCP Inspector check.

The design notes behind each choice, checked against the MCP spec, FastMCP 4.1 and five
clients, are in [design/gap-analysis.md](design/gap-analysis.md).

## When to use it

Starting a new MCP server in Python that wraps an authenticated API, especially one that
will be deployed as a remote connector for Claude, Cursor, VS Code or Codex. It is not for
servers that expose a local filesystem or database without per-user auth, or for
TypeScript servers.

## What the agent does

1. Checks the FastMCP version and interviews you: the upstream API, how it authenticates
   users (this picks the auth mode), transports, and opt-ins.
2. Generates the project with `scripts/scaffold.py` and makes sure it is green before
   any domain code is written.
3. Adds real tools one capability wave at a time (reads, scoped reads, writes), each
   behind a feature flag that ships off.
4. Verifies with the tests, the MCP Inspector and an end-user simulation that has nothing
   but the server's tools, then tells you which opinions are baked in.

## Install

```bash
npx skills add vibbs/agent-skills --skill fastmcp-server-scaffold
```

Claude Code users can install the whole collection as a plugin instead; see the
[repository README](../../../README.md#install).

## Requirements

- Python 3.12+ and uv.
- Network access when the generated project first locks its dependencies.

## Links

- [Skill source](../../../skills/fastmcp-server-scaffold/)
- [Design notes and gap analysis](design/gap-analysis.md)
- [Catalog](../../catalog.md)
