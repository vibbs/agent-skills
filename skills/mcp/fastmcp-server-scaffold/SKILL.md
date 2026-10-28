---
name: fastmcp-server-scaffold
description: 'Scaffold a production-shaped Python MCP server on FastMCP that fronts an authenticated REST API on behalf of the signed-in user. Generates stdio and streamable HTTP, OAuth (proxy or resource-server with token exchange), tool annotations and titles, isError results, both MCP protocol eras, tests through the real protocol, CI, Dockerfile and agent docs. Use when the user wants to create, start or bootstrap an MCP server in Python or FastMCP, wrap an API as MCP tools, build an MCP connector for Claude, Cursor, VS Code or Codex, or set up a new MCP project with auth.'
compatibility: Requires Python 3.12+ and uv. Generates a FastMCP 4.1.x project; the generated CI and optional Inspector check need network access.
---

# FastMCP Server Scaffold

Generates a complete, passing project for an MCP server that acts on an upstream API **as
the signed-in user**: never a service account, so the upstream's own permissions are the
backstop. The generated project is green from its first commit and demonstrates every
convention with one example read tool and one example write tool, which you then replace.

The template and its conventions were checked against MCP spec 2026-07-28, FastMCP 4.1.1,
and client behaviour as of October 2026. `references/client-compat.md` carries the date;
treat client claims older than a few months as needing a re-check.

## Workflow: follow in order

### 1. Preflight

- Confirm `python3` (3.12+) and `uv` are available.
- Check the current FastMCP release:
  `curl -s https://pypi.org/pypi/fastmcp/json | python3 -c "import json,sys; print(json.load(sys.stdin)['info']['version'])"`.
  The template pins `fastmcp>=4.1,<4.2`.
  If a newer **major** exists, stop and tell the user before generating; if a newer
  minor exists, mention it and continue (the pin is deliberate, see
  `references/lessons.md`).

### 2. Interview. Do not invent the upstream.

Ask before generating. Use the agent's structured question tool if it has one.

- **Server name** (kebab-case, e.g. `acme-tickets`) and a human title.
- **The upstream API**: base URL, what the first useful read operations are, and which
  operations change data. Writes are the ones that get every safety gate.
- **How the upstream authenticates users.** This picks the auth mode:

  | Upstream | Mode |
  |---|---|
  | OAuth with opaque tokens, or any provider where the server must hold the user's upstream token | `proxy` |
  | A standard identity provider issuing JWTs for your server, with token exchange (RFC 8693) or Entra on-behalf-of to reach the API | `resource-server` |
  | A personal API key or token, local single-user use only | `none` (stdio only) |

  Read `references/auth.md` before choosing between `proxy` and `resource-server`. Never
  pick a design that forwards the client's token to the upstream: the MCP spec forbids
  token passthrough.
- **Transports**: stdio only, or stdio plus a deployed HTTP connector (`--no-http` for
  the former).
- **Opt-ins** (`scripts/scaffold.py --list-features`): `output-schema`, `stateless`
  (more than one replica), `pypi`, `registry` (MCP Registry, in preview; needs `pypi`),
  `inspector-ci`, `coverage`, `security-scan`, `healthcheck`. Default to none unless the
  user has a reason.
- **GitHub owner/repo** (required), for links and registry names. Use the intended repo
  even if it doesn't exist yet; the generator refuses to run without it.

### 3. Generate

```bash
python3 <skill-dir>/scripts/scaffold.py --out <new-dir> --name <name> --auth <mode> \
    --repo <owner>/<repo> [--no-http] [--with feature,feature] [--title "..."]
```

It refuses to write into a non-empty directory, writes nothing outside `--out`, and needs
only the Python standard library. `--dry-run` lists the files first.

### 4. Baseline: must be green before any domain work

```bash
cd <new-dir>
git init && uv lock && uv sync --extra dev
uv run ruff check --fix --exit-zero -q . && uv run ruff format -q .   # normalise imports after renaming
uv run ruff check . && uv run pyright && uv run pytest
```

The normalising step is quiet for names up to 23 characters (repo CI renders one that
long). A longer name makes the env-var prefix longer, so a few strings can exceed the
line limit: the first command prints `E501 Line too long` and `ruff check .` fails on
them. Wrap those strings by hand. If anything else fails here, fix it before writing
domain code. Do not weaken a test to get green: every test guards a convention the
server depends on.

### 5. Domain pass: one capability wave at a time

Waves: reads, then scoped reads, then writes. Each new wave ships behind a feature flag
that defaults to **off** (`feature_flags.py`). **Read `references/tool-design.md` in full
before writing the first tool.**

For each wave:

1. Replace or add an upstream client in `client/` (async `httpx`, errors through
   `client/base.py`, reduced dicts, never raw vendor payloads).
2. Add business logic in `tools/<area>.py`: validation (`tools/ids.py`), confirmation for
   writes (`tools/confirmation.py`), plain dicts in and out.
3. Register tools in `tools/registry.py` with `title=`, explicit annotations
   (`READ`/`WRITE`), and a docstring written for the model, with cross-references to
   sibling tools in both directions.
4. Add write tools to `WRITE_TOOLS` in `tools/writes.py` and to `.claude/settings.json`.
5. Update the tool-set constants in `tests/unit/test_registry.py`, add description
   assertions for guidance the model must not lose, and add respx tests that assert on
   the outgoing request.
6. Remove the `example_*` tools, client and tests once real ones exist.

Re-run the full baseline after every wave.

### 6. Verify

- `uv run pytest` passes in both protocol eras (the registry tests run each twice).
- `uv run fastmcp dev inspector -m <package>`: list the tools, call a read tool, call a
  write tool unconfirmed and check the confirmation facts. Use module mode: a
  `server.py:create_mcp` spec fails on the package's relative imports. Set
  `<PREFIX>FEATURE_WRITES=true` in the Inspector's environment panel to see write tools.
  Headless equivalent: `npx @modelcontextprotocol/inspector --cli -e
  <PREFIX>FEATURE_WRITES=true uv run <name> --method tools/list`.
- **End-user simulation.** Give an agent nothing but this server's tools and ask it to do
  realistic user tasks. If it needs a hint from your notes to behave, that hint belongs in
  a tool description. The generated `.claude/agents/end-user.md` does this in Claude Code;
  in other agents, restrict a fresh session to the server's tools.

### 7. Hand off

Tell the user:

- Which auth mode and opt-ins were generated, and which **opinions** are baked in
  (`references/opinions.md`) so they can reject any.
- Which client behaviours their target clients don't support yet
  (`references/client-compat.md`), e.g. claude.ai drops server instructions.
- What remains: real tools, `infra/` (intentionally empty), deployment, the first
  runbook.
- That `.scaffold.json` at the project root records the template version, generation
  date, FastMCP pin and options used; keep it committed so later upgrades can diff
  against the template version it came from.

## Non-negotiables

- **Anything the model must know goes in a tool description**, guarded by a test. Server
  `instructions` are not a reliable channel.
- **Every tool has a `title` and all four annotations set explicitly.** Clients use them
  to decide when to ask for approval.
- **Failures are `isError` results carrying the failure dict.** Exceptions never reach
  the wire; `mask_error_details=True` stays on.
- **Writes keep every gate**: destructive annotations, `requiresUserInteraction` meta,
  `permissions.ask`, and the fact-bearing `user_confirmed` step.
- **Nothing writes to stdout.** On stdio it is the protocol stream.
- **No era-gated API without a fallback.** `ctx.elicit()` and tasks behave differently
  across protocol eras; see `references/protocol-eras.md`.
- **Never forward an inbound token upstream.**

## Reference files

Read each when its step comes up, not all at once.

| File | Read when |
|---|---|
| `references/tool-design.md` | Writing or reviewing any tool (step 5) |
| `references/auth.md` | Choosing an auth mode, or configuring sign-in |
| `references/protocol-eras.md` | Using elicitation, tasks, sessions or anything stateful |
| `references/config-and-flags.md` | Adding settings or a feature flag |
| `references/testing.md` | Adding tests, or a test fails and you're unsure why it exists |
| `references/deployment.md` | Docker, versioning, PyPI, MCP Registry, release |
| `references/client-compat.md` | Deciding whether a feature is worth using for the user's clients |
| `references/extensions.md` | The user asks for MCP Apps, elicitation, tasks, progress, resources or prompts |
| `references/lessons.md` | Before "simplifying" anything marked load-bearing |
| `references/opinions.md` | The user disagrees with a convention |

## Claude Code only

- The generated `.claude/settings.json` asks before every write tool, and
  `.claude/agents/end-user.md` is the isolated end-user subagent for step 6.
- `_meta["anthropic/requiresUserInteraction"]` on write tools makes Claude Code prompt on
  every call, even in auto modes. Other clients ignore it.
