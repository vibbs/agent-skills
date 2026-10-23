# Opinions baked into the template

Choices the MCP ecosystem doesn't mandate. Tell the user about these during hand-off;
any of them can be changed after generation.

| Opinion | What others do instead |
|---|---|
| Standalone `fastmcp` (PrefectHQ), not the official SDK's `MCPServer` | The SDK is lower-level and lacks `OAuthProxy`, custom routes and the in-memory test client |
| Act as the signed-in user; no service account | A service account with impersonation |
| Failure dicts carried in `isError` results | `ToolError` with a plain string, or `McpError` |
| Plain type hints and `TypedDict`, no Pydantic model per tool | Pydantic `Field` on every parameter and Pydantic result models |
| One registry file for every tool | Decorators at each definition, auto-imported tool modules, or FastMCP's `FileSystemProvider` |
| Hand-written config loader on `BaseModel` | `pydantic-settings`, or FastMCP's `FASTMCP_*` settings |
| Plain-text stderr logs | Loguru, structured JSON |
| Tools only; no resources or prompts | Reference servers often ship both |
| `user_confirmed` second call **in addition to** client approval | Rely on client approval and annotations alone |
| Registration-time feature flags | FastMCP tags with `enable`/`disable` |
| Picker payload in tool results | Elicitation enums or MCP Apps |
| Capability waves: reads, scoped reads, writes | Ship the whole surface at once |
| Async tools and clients | Sync clients run in threads |
| Fail closed on every authorization gate | Permissive default with deny rules |
| uv only, lockfile committed | pip, Poetry, PDM |
| No BuildKit cache mounts in the Dockerfile | Cache mounts for faster builds |
| Floating base-image patch tag | Base image pinned by digest |
| No task runner; bare `uv run` commands | `just` or `make` |
| No pre-commit | pre-commit with ruff, pyright and secret scanning |
| Custom `bump_version.py` | release-please, commitizen, CalVer |
| Integration tests self-skip and stay out of CI | Service containers in CI |
| `AGENTS.md` (+ `CLAUDE.md`) as the primary design doc | Architecture in README or ARCHITECTURE.md |
| `tests/unit` and `tests/integration` with no conftest | A shared `conftest.py` with fixtures |
