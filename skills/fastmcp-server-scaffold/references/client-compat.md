# Client compatibility

**Last verified: 2026-10-19**, from first-party docs, changelogs and issue trackers.
"unverified" means no live source either way. Client behaviour changes monthly; re-check
anything that matters to the user before relying on it. The official client matrix on
modelcontextprotocol.io was removed in May 2026.

| Feature | Claude Code | claude.ai / Desktop | Cursor | Codex | VS Code + Copilot |
|---|---|---|---|---|---|
| stdio | yes | Desktop only | yes | yes | yes |
| Streamable HTTP + OAuth | yes | yes | yes | yes | yes |
| CIMD (OAuth client metadata) | yes | yes, if the AS advertises it | unverified | yes | yes |
| Annotations change approval | shown only | **yes**: read-only runs without asking; destructive always asks | unverified | **yes** (`writes` mode) | **yes**: read-only skips confirmation |
| `structuredContent` / `outputSchema` | yes | unverified | unverified | partial | yes |
| Server `instructions` | yes, truncated at 4,096 chars | **no** (open issue #93) | unverified | yes, first 512 chars weigh most | yes |
| Elicitation, form | yes | **no** | yes | yes | yes |
| Elicitation, URL | yes | no | unverified | behind a flag | yes |
| Progress notifications | yes | no (web) | unverified | unverified | yes |
| Icons displayed | unverified | reportedly no for custom connectors | unverified | partial | yes |
| Prompts | yes, as slash commands | partial | yes | **no** | yes |
| Resources | yes, `@` mentions | partial | yes | yes | yes |
| `list_changed` | yes | partial (cached) | partial | **no** | yes |
| MCP Apps (UI) | **no** (CLI) | yes | yes | partial | yes, experimental |
| Tasks | no | unverified | unverified | unverified | yes |
| Sampling (deprecated) | unverified | no | no | no | yes |
| Per-tool allow/ask/deny | `permissions` in settings | Customize > Connectors | `permissions.json` | `config.toml` approval modes | Manage Tool Approval |

## What this means for the template

- **Default everything that works everywhere**: tools, titles, annotations, `isError`
  results, both transports.
- **Annotations are worth the effort**: three clients use them to decide when to ask.
- **Never rely on `instructions`**: claude.ai drops them entirely.
- **Confirmation stays in the tool result** (`user_confirmed`), because claude.ai doesn't
  support elicitation.
- **`outputSchema` is opt-in**: only Claude Code and VS Code are confirmed.
- **Picker payloads and MCP Apps degrade differently**: the picker payload falls back to
  text everywhere; MCP Apps don't render in Claude Code's CLI.

## Client-specific limits worth knowing

- **Claude Code:** tool results over 10k tokens warn and over 25k are capped
  (`MAX_MCP_OUTPUT_TOKENS`); text over 50,000 characters is saved to a file unless the
  tool sets `_meta["anthropic/maxResultSizeChars"]` (up to 500k).
  `_meta["anthropic/requiresUserInteraction"]: true` forces a prompt on every call. Remote
  tools have a 5-minute idle timeout that progress notifications reset.
- **claude.ai:** 240-second tool timeout, about 150k-character results; servers must be
  publicly reachable; redirect URI `https://claude.ai/api/mcp/auth_callback`.
- **VS Code:** 128 tools per request before virtual tools kick in.
- **Codex:** 60-second default tool timeout, 10-second startup timeout.

## Sources

- Claude Code: https://code.claude.com/docs/en/mcp
- claude.ai connectors: https://claude.com/docs/connectors/building/index and
  https://claude.com/docs/connectors/building/review-criteria
- claude.ai MCP issues: https://github.com/anthropics/claude-ai-mcp/issues
- Cursor: https://cursor.com/docs/mcp
- Codex: https://developers.openai.com/codex/mcp
- VS Code: https://code.visualstudio.com/api/extension-guides/ai/mcp
