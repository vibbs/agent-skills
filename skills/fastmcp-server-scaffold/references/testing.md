# Testing

```
tests/
├── unit/         everything CI runs; no network, no live services
└── integration/  opt-in, self-skipping, excluded from CI
```

pytest with `asyncio_mode = "auto"`, respx for HTTP mocking, inline-snapshot available
for snapshots. `pyproject.toml` sets `testpaths` and `pythonpath = ["src", "."]`, so tests
import the package and `scripts/` with no install step. Shared setup lives in
`tests/unit/helpers.py` (`configure_stdio`, `clean_env`) rather than a conftest.

## Mock the upstream, not the framework

The standard unit test: point the config at a fake host, seed a token through the real
persistence path (`configure_stdio`), mock the exact URL with respx, call the real code,
and assert on **both** the parsed result and the request that went out:

```python
@respx.mock
async def test_list_items_maps_status_alias(monkeypatch, tmp_path):
    configure_stdio(monkeypatch, tmp_path)
    route = respx.get(f"{UPSTREAM}/items").mock(return_value=httpx.Response(200, json={"data": []}))
    out = await example.list_items("open", 5)
    assert out["ok"] is True
    assert route.calls.last.request.url.params["status"] == "ST_OPEN"
```

Authorization tests assert the allowed path **and** the fails-closed paths: an
out-of-scope id, and an upstream error during the scope check.

## The tool surface is behaviour under test

`tests/unit/test_registry.py` drives the real server through FastMCP's in-memory
`Client(mcp)`, in **both protocol eras** (`mode="auto"` and `mode="legacy"`):

- **Exact tool lists in registration order**, built from one constant per capability
  group, for every flag state. Adding, removing or gating a tool forces a deliberate
  update. Flag tests clear the ambient environment first (`clean_env`).
- **Description assertions** for guidance that must not be lost: bulk/per-item
  cross-references, confirmation protocol, non-goals, the untrusted-text rule. Normalise
  whitespace first. Each test's docstring names the regression it guards.
- **No dangling cross-references** in any flag state.
- **Formatting**: no description line starts with a space.
- **Titles and all four annotations** on every tool; names of 64 characters or fewer.
- **Error shape**: failures come back with `isError: true` and the failure dict;
  unexpected exceptions are masked; a confirmation request is *not* an error.
- **Server metadata**: version matches package metadata; icon present.

`test_write_gates.py` asserts that destructive annotations, `requiresUserInteraction` meta
and `.claude/settings.json` all match `WRITE_TOOLS`.

To snapshot whole tool definitions, use inline-snapshot:
`assert [t.model_dump() for t in tools] == snapshot()`, then
`uv run pytest --inline-snapshot=create`. Review snapshot diffs; never re-record blindly.

## Guards no behavioural test catches

`test_source_guards.py` regex-scans `src/` for raw token logging and for `print(`, which
would corrupt the stdio protocol stream. Cheap, and it catches a whole class of mistake.

`test_entrypoint.py` spawns the installed console script over real stdio and lists tools.
It catches stdout pollution and packaging errors that in-memory tests can't.

## Auth tests

- Token file: `expires_at` is always stamped; a valid token is used without refreshing;
  an expired one refreshes and keeps the refresh token.
- Proxy: the verifier caches; unknown tokens are rejected; the private claims hook still
  exists on `OAuthProxy` (this fails first on a FastMCP upgrade that renames it).
- Resource server: both exchange grants send the right form; results are cached; failures
  explain what to check.
- HTTP app: `/health` and `/icon.png` are unauthenticated; `/mcp` returns 401 with a
  `resource_metadata` challenge.

External infrastructure (a token store, a queue) is replaced by an in-memory
implementation of the same interface, so the full path is unit-tested with no live
service.

## Integration tests

One module, excluded from CI, with a module-level `skipif` whose reason contains the exact
command to run it. The goal: real plumbing, fake (or real) vendor at the edges only.

## Beyond unit tests

- **MCP Inspector** (`--with inspector-ci`): `npx @modelcontextprotocol/inspector --cli
  -e FLAG=true uv run <server> --method tools/list --strict` exits non-zero on
  cross-client schema-portability problems. Needs Node 22.19+. Pass feature flags with
  `-e`: the Inspector does not forward the parent environment.
- **Conformance suite**: `@modelcontextprotocol/conformance` with a known-failures
  baseline is emerging practice for protocol-level conformance. Not generated.
- **End-user simulation**: an agent with only the server's tools (SKILL.md step 6).
