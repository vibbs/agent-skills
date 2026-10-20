# fastmcp-server-scaffold

Generates a complete Python MCP server on FastMCP that acts on an upstream REST API as the
signed-in user. The generated project is green from its first commit: it lints,
type-checks and passes its tests, and includes one example read tool and one example
write tool demonstrating every convention, ready to be replaced with real ones.

The agent interviews you first (upstream API, how it authenticates users, transports,
opt-ins), then generates, verifies the baseline, and walks through adding real tools one
capability wave at a time.

## Example invocation

> Build an MCP server for our ticketing API so people can search and update their tickets
> from Claude and Cursor. It uses OAuth with opaque tokens, and we'll deploy it as a
> remote connector.

## Example output

```
$ python3 scripts/scaffold.py --out ../acme-tickets --name acme-tickets --auth proxy
Wrote 73 files to ../acme-tickets
  auth=proxy transport=stdio+http with=-

$ cd ../acme-tickets && uv lock && uv sync --extra dev && uv run pytest -q
77 passed
```

## What you get

- stdio and streamable HTTP transports; both MCP protocol eras (2026-07-28 and the
  handshake era) tested.
- Auth modes: `proxy` (FastMCP OAuthProxy), `resource-server` (JWT validation plus RFC 8693
  or Entra on-behalf-of token exchange), or `none` (stdio with an env credential).
- Titles and explicit annotations on every tool, failures as `isError` results, layered
  write gates, per-user rate limiting, audit logging.
- Tests through the real protocol, CI, Dependabot, Dockerfile, `AGENTS.md`, and optional
  PyPI, MCP Registry, Inspector, coverage and security-scan workflows.

## Requirements

- Python 3.12+ and [uv](https://docs.astral.sh/uv/).
- Network access for `uv lock` in the generated project.

## Bundled scripts

| Script | What it does |
|---|---|
| `scripts/scaffold.py` | Renders `assets/template/` into a new directory. Standard library only; refuses a non-empty target; writes nothing outside `--out`. `--dry-run` lists files first, `--list-features` shows the opt-ins. |

The generated project contains its own scripts (sign-in, login verification, version
bump), documented in its `AGENTS.md`. None run unless you run them.
