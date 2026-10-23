# Deployment, packaging and release

## Dependencies

- **uv only**, `uv.lock` committed, `uv sync --locked` in CI and in the image. `--locked`
  fails when the lockfile is out of step instead of quietly re-resolving.
- **FastMCP pinned to a minor version** (`fastmcp>=4.1,<4.2`). FastMCP has shipped auth
  behaviour changes in minor and patch releases; a narrow range makes every upgrade a
  deliberate, reviewed Dependabot PR (FastMCP is excluded from the grouped update).
- The template ships no `uv.lock`; the first `uv lock` after generation creates it.

## Dockerfile (generated with HTTP)

Two stages: a build stage that syncs the locked dependencies (cached separately from
source) and then the project, and a runtime stage holding only the virtualenv, running
as a non-root user. Its comments explain four deliberate choices:

1. `uv sync --locked`, never `pip install dist/*.whl`: installing a wheel re-resolves
   transitive dependencies against version ranges, so the image drifts from the lockfile.
2. A floating base patch tag (`python:3.12-slim`) so OS and interpreter fixes keep
   flowing; the application stack is pinned by the lockfile.
3. No BuildKit `--mount` caches, so the same file builds under cloud remote builders and
   plain `docker build`. (Reference servers do use cache mounts; this is an opinion.)
4. `--no-editable`, so the runtime stage needs no source tree.

`--with healthcheck` adds a `HEALTHCHECK` against `/health`. Most managed container
platforms have their own probes; add it when yours doesn't.

`/health` is liveness only. It deliberately doesn't call the upstream: with no service
account, there's no credential to check connectivity with, only per-user tokens.

## Deploying

The template provisions nothing. `infra/` is a README-only folder until there's real
infrastructure code: a stub that claims to provision something is worse than an empty
folder. A deployment needs:

- a container runtime and an HTTPS endpoint;
- the variables from `.env.example`, secrets from a secret store;
- `SCAFFOLD_PUBLIC_URL` set to the canonical URL, and `SCAFFOLD_ALLOWED_HOSTS`;
- one upstream OAuth client per environment (many upstreams allow one redirect URI per
  client);
- for more than one replica: `--with stateless`, and an encrypted shared token store in
  proxy mode (`auth.md`);
- an alert on repeated container restarts: a crash loop is otherwise invisible.

After every credential change, run `scripts/verify_login.py <url>` before telling anyone
to sign in, and remember a secret change needs a restart to reach running replicas.

## Versioning

`scripts/bump_version.py` bumps `pyproject.toml`, generates a changelog entry from
conventional-commit subjects since the last tag, commits, tags `vX.Y.Z` and pushes. The
deploy path should call it first, every time, so a tag always matches what's running. The
version reaches clients through package metadata (`serverInfo.version`).

If you publish releases through GitHub Releases instead, release-please or commitizen do
the same job; pick one mechanism.

## PyPI (`--with pypi`)

`.github/workflows/release.yml` publishes when a GitHub Release is published:

- a build job that builds, installs the wheel and boots the server once;
- a separate publish job holding only `id-token: write`, using PyPI trusted publishing
  (no stored token). Configure the trusted publisher on pypi.org first.

Users then run the server with `uvx <name>`.

## MCP Registry (`--with registry`)

The official registry (registry.modelcontextprotocol.io) is in **preview**: breaking
changes or data resets may happen.

- `server.json` (schema 2025-12-11) with name `io.github.<owner>/<name>`, a `pypi`
  package entry and/or a `remotes` entry for the HTTP deployment.
- Ownership proof: `<!-- mcp-name: io.github.<owner>/<name> -->` in the README (which
  becomes the PyPI description), and `LABEL io.modelcontextprotocol.server.name` on the
  Docker image.
- The release workflow stamps the version into `server.json`, then runs
  `mcp-publisher login github-oidc` and `mcp-publisher publish`.

Fill in the real `remotes` URL before the first publish.

## CI

`.github/workflows/ci.yml`: `uv sync --locked --extra dev`, ruff check, ruff format
--check, pyright, pytest, plus the Inspector strict check with `--with inspector-ci`.
`scripts/` is in the lint scope because it's real, tested code. Pin actions to commit
SHAs in your repository; Dependabot keeps them current. `--with security-scan` adds
gitleaks and zizmor (GitHub Actions static analysis).
