# Auth

The server always acts as the signed-in human, with that human's own upstream token. No
service account, no shared credential, no impersonation: the upstream's permission model
is the backstop, and the server can never do something the user couldn't.

`auth/session.py` `authed_client()` is the single seam: every upstream client calls it and
knows nothing about which transport or mode is live.

## Choosing a mode

| | `proxy` | `resource-server` | `none` |
|---|---|---|---|
| HTTP clients sign in with | the upstream's own OAuth, via FastMCP `OAuthProxy` | your identity provider, which issues JWTs for this server | (stdio only) |
| Upstream token comes from | the proxy, which stores it per user | token exchange of the inbound token | `SCAFFOLD_UPSTREAM_TOKEN` env var |
| Good for | upstreams with their own OAuth and opaque tokens | enterprise IdPs (Okta, Auth0, Keycloak, Entra) in front of your APIs | personal, local use |
| stdio sign-in | `scripts/oauth_login.py` | `scripts/oauth_login.py` | none |

The MCP spec forbids **token passthrough**: a server must not accept a token that wasn't
issued for it, and must not forward the client's token to another service. Both HTTP modes
are designed around that rule.

## stdio (proxy and resource-server)

`scripts/oauth_login.py` runs an authorization-code flow with PKCE once, through a local
listener parsed from `SCAFFOLD_OAUTH_REDIRECT_URI` (default `http://127.0.0.1:8765/callback`,
an RFC 8252 loopback URI). It writes `~/.scaffold-server/tokens.json` with mode 0600.

**Load-bearing:** `save_tokens()` always stamps an absolute `expires_at` (lifetime minus a
safety margin, with a conservative fallback). Without it every call looks expired and
refreshes, which trips the upstream token endpoint's rate limit.

Confidential clients authenticate to the token endpoint with HTTP Basic; public clients
send `client_id` in the form body and rely on PKCE. `token_request()` handles both.

If the upstream only accepts https redirect URIs, set an https URI and point
`SCAFFOLD_LOGIN_CERT`/`SCAFFOLD_LOGIN_KEY` at a local certificate (the openssl command is
in the script's docstring).

## HTTP proxy mode

The server is an OAuth resource server to MCP clients and an OAuth client to the upstream.
FastMCP's `OAuthProxy` bridges the two; `auth/proxy.py` supplies:

1. **A token verifier** (`UserinfoVerifier`). Opaque upstream tokens have no JWKS or
   introspection, so the only honest check is a live call to a cheap "who am I" endpoint
   (`SCAFFOLD_USERINFO_URL`). Results are cached for 60 seconds per token.
2. **An identity-claims hook** (`IdentityProxy._extract_upstream_claims`). Identity is
   fetched once per code exchange and once per refresh, never per tool call, and embedded
   in the token the proxy issues. Later requests read it from
   `AccessToken.claims["upstream_claims"]`. This is a **private** FastMCP hook;
   `test_auth_proxy.py` fails first if an upgrade renames it.
3. **Explicit parameters**, each with a comment naming the failure it prevents:

| Parameter | Value | Why |
|---|---|---|
| `redirect_path` | `/auth/callback` | Pinned, not inherited. Many upstreams allow one redirect URI per client, so each deployed environment needs its own upstream client |
| `valid_scopes` | from `SCAFFOLD_OAUTH_SCOPES` | An empty list rejects registration from clients that request scopes, which several do by default |
| `forward_resource` | `True` | Some upstreams reject the RFC 8707 `resource` parameter; the rejection can arrive as a URL fragment the server never sees, surfacing as a bare "missing code". Set False if you see that |
| `require_authorization_consent` | `True` | Confused-deputy defence: the spec requires per-client consent when a proxy uses one static upstream client id. FastMCP's default, pinned anyway |
| `enable_cimd` | `True` | Client ID Metadata Documents are the spec's recommended registration; Dynamic Client Registration is deprecated as of 2026-07-28 |
| `jwt_signing_key` | required | Otherwise derived from the client secret, so rotating the secret signs everyone out |

**Token storage.** With no `client_storage`, FastMCP uses an encrypted, process-scoped file
store: a restart or a second replica means users sign in again. That's a reasonable trade
for one replica. For more, pass an encrypted shared store, e.g.
`FernetEncryptionWrapper(key_value=RedisStore(...), fernet=Fernet(key))` from the
`py-key-value-aio` package, and record what the degraded mode costs (for example, an admin
revoke-sessions script only works with the shared store).

**Verification probe.** A startup guard catches a malformed client id; a well-formed wrong
one only fails after the user signs in, on the upstream's own error page.
`scripts/verify_login.py <base-url>` drives the deployed proxy up to the upstream
authorize URL and checks the client id actually sent. Run it after every credential change.

**Upgrade note (FastMCP 4.0+).** If `issuer_url` differs from `base_url`, every client
must re-authorize once after upgrading.

## HTTP resource-server mode

The identity provider issues JWTs whose audience is this server. FastMCP's
`RemoteAuthProvider` serves RFC 9728 protected-resource metadata pointing clients at the
authorization server, and `JWTVerifier` validates signature (JWKS), issuer and **audience**.
Audience validation is what makes a token "for this server"; never disable it.

To call the upstream, `auth/token_exchange.py` exchanges the validated token for a per-user
upstream token and caches it until shortly before expiry:

- `SCAFFOLD_EXCHANGE_GRANT=rfc8693`: OAuth 2.0 Token Exchange
  (`urn:ietf:params:oauth:grant-type:token-exchange`) with `audience` and optional
  `scope`. Okta, Auth0, Keycloak, Ping and others.
- `SCAFFOLD_EXCHANGE_GRANT=entra-obo`: Microsoft Entra on-behalf-of
  (`urn:ietf:params:oauth:grant-type:jwt-bearer`, `requested_token_use=on_behalf_of`),
  scope defaulting to `<upstream-audience>/.default`.

The identity provider must allow this server's client to perform the exchange; that's
provider configuration, not code.

## Authorization beyond "the upstream decides"

The generated `audit/` middleware records who called which write tool, on a dedicated
logger. It is an audit hook, not access control. When you need real policy, use FastMCP's
`require_scopes`, `require_roles` or `AuthMiddleware` rather than growing a custom one.

For actions on someone other than the caller, route every such tool through one gate that
fails closed and returns `(resolved_id, refusal)`, resolves `"me"` to a concrete id, tries
the cheap relationship source before a broader fallback, and supports `allow_self=False`
for actions a person must not perform on themselves.

## Rate limiting and transport security (HTTP)

- Tool calls are rate-limited per authenticated user (`http/rate_limit.py`); buckets are
  in-process, so the limit is per replica. The spec says servers MUST rate-limit.
- Set `SCAFFOLD_ALLOWED_HOSTS` for DNS-rebinding protection. The spec requires servers to
  validate `Origin`.
- Bind `0.0.0.0` only in a container; `127.0.0.1` on a laptop.
