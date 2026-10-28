# Configuration and feature flags

## Settings (`config.py`)

- One Pydantic `BaseModel` (not `BaseSettings`) holds every setting, with an explicit
  `FIELD_ENV` table mapping field to environment variable. The table is the single source
  for every layer.
- **Precedence:** process environment > `.env` > JSON file named by
  `SCAFFOLD_CONFIG_FILE`. Empty strings count as unset at every layer, so a blank variable
  falls through instead of shadowing a real value.
- **Lazy on stdio.** `load_config()` is never called at startup on stdio, only per
  request inside the tools and auth layer. Startup stays instant and can't fail before
  the user has signed in.
- **Validate in the loader**, not at the point of use. `_check_mode_requirements()` knows
  which settings each transport and auth mode needs. Errors follow one house style:
  *what* is missing, *why* it's needed, and *how* to fix it, including the command to
  generate a value where there is one.
- **Mode-conditional requirements.** HTTP needs `PUBLIC_URL`; proxy mode adds the
  authorize URL, userinfo URL and JWT signing key; resource-server mode adds JWKS, issuer,
  audience and the token-exchange settings. Settings that must be set together raise if
  only one is present.
- **Strict booleans.** `as_bool()` accepts 1/0, true/false, yes/no, on/off and raises on
  anything else. A typo must never silently mean the opposite. Config and feature flags
  share it.
- **Shape guards on credentials.** `guard_client_id()` fails startup on a malformed client
  id (quotes, whitespace, a secret pasted into the id). The predicate is public so
  `scripts/verify_login.py` shares one definition. The escape hatch
  (`SCAFFOLD_SKIP_CLIENT_ID_CHECK`) is read only when the guard is about to fire, so a
  typo in a rarely used override can't crash a valid startup.
- **Fingerprints, never values.** Startup logs every setting that can't be read back
  later. Credentials appear as fingerprints: length and last four characters for anything
  possibly secret; a short prefix and suffix only for documented public identifiers such
  as OAuth client ids.
- **URL construction lives in the model**, not in clients, once there's more than one
  upstream service: one method per service composing base URLs from host, tenant and
  version parts.

### FastMCP's own settings

FastMCP reads `FASTMCP_*` environment variables (and `.env` via `FASTMCP_ENV_FILE`). The
template passes what it needs explicitly in code (`mask_error_details`, `allowed_hosts`,
`stateless_http`) rather than relying on FastMCP's environment, so there's one place to
look. If you set a `FASTMCP_*` variable in production, document it in `.env.example` too.

### `.env.example` is the documentation

Every variable appears, grouped by purpose, with what it does, whether and when it's
required, how to generate it, and what breaks without it. Variables read only from the
process environment (feature flags, transport) are marked `[env only]`.

Secrets stay out of git and the image: `.env*` (except `.env.example`), key and cert files,
`tokens.json` and `.mcp.json` are ignored, and `.dockerignore` mirrors `.gitignore`, with
one deliberate exception: `uv.lock` must be in the build context.

## Feature flags (`feature_flags.py`)

- A registry of `name -> (ENV_VAR, default)`, read straight from `os.environ`: the stdio
  path has no config loaded when tools are registered, and flags are set in the MCP
  client's `env` block or the container, never in `.env`.
- **Flags gate a capability at registration time.** A disabled capability's tools are not
  registered, so they never appear in `tools/list`. That's stronger than a registered tool
  returning "forbidden", and a client with a stale list gets the framework's standard
  unknown-tool error.
- **New capabilities ship merged-but-off.** Default `False`; turn on with an env var and a
  restart, no rebuild, no revert-and-redeploy to kill something misbehaving. The only flag
  that defaults to `True` is one retrofitted onto something already live, and that
  exception is called out loudly where it's defined.
- `active_flags()` is logged at registration, so startup output always shows what's on.
- Keep rollout flags and security policy separate. A flag decides whether a capability
  exists; authorization decides who may use it.

FastMCP 3+ also offers `tags=` plus `mcp.disable(tags=...)`, which has the same
`tools/list` semantics. The template uses plain registration-time gating because it is
simpler to read and test; either works.
