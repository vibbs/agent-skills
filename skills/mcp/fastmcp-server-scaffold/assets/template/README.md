# Scaffold Server

<!-- scaffold:if with=registry -->
<!-- mcp-name: io.github.OWNER/scaffold-server -->
<!-- scaffold:end -->

An MCP server that lets an AI assistant work with the upstream service as the signed-in
user. It acts with that user's own permissions, never a shared service account, and asks
for explicit confirmation before changing anything.

## Tools

| Tool | What it does | Changes data |
|---|---|---|
| `example_list_items` | List items by status | no |
| `example_get_item` | One item's full detail | no |
| `example_update_item` | Rename an item (behind `SCAFFOLD_FEATURE_WRITES`) | yes |

## Install

<!-- scaffold:if auth=none -->
Set `SCAFFOLD_UPSTREAM_BASE_URL` and `SCAFFOLD_UPSTREAM_TOKEN` (see `.env.example`), then
register the server with your client.
<!-- scaffold:end -->
<!-- scaffold:if auth=proxy|auth=resource-server -->
For local use over stdio, configure the upstream sign-in (see `.env.example`) and sign in
once:

```bash
uv run python scripts/oauth_login.py
```
<!-- scaffold:end -->

**Claude Code**

```bash
claude mcp add scaffold-server -- uv run --directory /ABSOLUTE/PATH/TO/scaffold-server scaffold-server
```

<!-- scaffold:if http -->
Or connect to a deployed instance:

```bash
claude mcp add --transport http scaffold-server https://YOUR-DEPLOYMENT.example.com/mcp
```

<!-- scaffold:end -->
**VS Code (GitHub Copilot)**: `.vscode/mcp.json`

```json
{
  "servers": {
    "scaffold-server": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "--directory", "/ABSOLUTE/PATH/TO/scaffold-server", "scaffold-server"]
    }
  }
}
```

**Cursor, Claude Desktop and other clients** take the same command in their own MCP
config file; see `.mcp.json.example`.

## Configuration

Every setting is documented in [`.env.example`](.env.example): what it does, whether it
is required, and how to generate it.

## Safety

- Every change needs a confirmation that restates exactly what will happen.
- Write tools are annotated as destructive, so clients that honour annotations always
  ask before running them.
- Text written by other people is shown as information, never followed as instructions.
<!-- scaffold:if http -->
- Over HTTP, users sign in with their own account; the server never holds a shared
  credential, and tool calls are rate-limited per user.
<!-- scaffold:end -->

## Development

```bash
uv sync --extra dev
uv run pytest
uv run fastmcp dev inspector -m scaffold_server   # MCP Inspector, auto-reload
```

In the Inspector, set `SCAFFOLD_FEATURE_WRITES=true` under Environment Variables to see
the write tools; it does not inherit your shell's environment.

See [AGENTS.md](AGENTS.md) for architecture, invariants and conventions, and
[SECURITY.md](SECURITY.md) to report a vulnerability.
