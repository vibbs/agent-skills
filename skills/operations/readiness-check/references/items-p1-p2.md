# Items: P1, P2 and override pulls

The catalog of every item the review checks in depth: all 15 P1 items, all 29 P2 items,
and the 5 later-phase items an override can pull into P2. Read this file in full before
classifying anything (workflow step 5). Names match `assets/roadmap.json` exactly; use
them as the item keys in the machine state.

## How to read an entry

```
### <Item name>
`<phase> · <level> · <group> · risk <1|2|3> · <repo | confirm | repo + confirm>`
Applies: always | <condition>
Why: <one line, from the roadmap note>
Look for: signals per stack
Status: what makes it green, amber or red
Fix prompt: template for the "Prompt for your agent" line
```

- **Risk** orders the "Do now" list inside one level: 1 = security, money or user data;
  2 = availability and recovery; 3 = hygiene and speed.
- **repo**: can be judged from files. **confirm**: lives outside the repo (hosting
  console, DNS provider, cloud account); amber until the user confirms it, never red on
  absence of evidence alone. **repo + confirm**: repo evidence can make it green, but
  its absence only makes it amber, because the host may do it.
- **Applies.** Three conditions come from `roadmap.json` (`multi-tenant apps`,
  `AI features`). The rest marked *(derived)* are feature checks this skill adds: the
  roadmap notes say these items matter "if you build that feature". When a derived
  condition is false, the status is n/a with a short reason ("no webhooks received").
  n/a items are not counted.
- **Fix prompts** are templates. Replace every `<placeholder>` with real paths, client
  names and routes from this repo. A prompt that still reads generic is not done.
- **Stacks.** "Node" covers Next.js, Express and plain Node/TypeScript. "Python" covers
  FastAPI, Django and Flask. Supabase and Firebase have their own lines where they
  change the answer. "Any" is the fallback for other stacks: apply the same idea.

## Contents

P1 L1: Project Scaffolding · Semantic Versioning · Logging · Dependency Hell · Secrets
Management · SQL Injection · XSS
P1 L2: Input Validation · AuthN & AuthZ Middleware · Testing · CI/CD · Docker ·
Monitoring · Health Checks
P1 L3: Database Migrations
P2 L1: TLS · Backups · Rollbacks · DNS · CDN · CORS
P2 L2: Encryption in Transit · Encryption at Rest · CSRF · OAuth · IAM · Feature Flags ·
Timeouts · Retries · Webhooks · Cron Jobs · Race Conditions · Database Indexing · N+1
Queries · Serverless Limits · Server-Sent Events · Alerts · Reverse Proxies · PII
Handling · Tenant Isolation · Prompt Injection · LLM Token Budgets
P2 L3: Idempotency · SSRF
Pulled by overrides: Rate Limiting (P3) · Pessimistic Locking (P3) · Audit Logs (P4-B2B)
· GDPR & Privacy (P4-B2C) · Accessibility (WCAG 2.1 AA) (P4-B2C) · Data Residency
(P4-B2B)
Then: done-early signals for later-phase items.

---

## P1 · Project setup

### Project Scaffolding
`P1 · L1 · Delivery & deploys · risk 3 · repo`
Applies: always
Why: Start from a standard layout, linter and formatter, not a blank folder.
Look for:
- Node: `eslint.config.*` or `.eslintrc*`, `biome.json`, `prettier` config or a
  `"lint"` / `"format"` script in `package.json`; `tsconfig.json` with `"strict": true`.
- Python: `ruff` / `black` / `flake8` config in `pyproject.toml`, `setup.cfg` or
  `ruff.toml`; a `src/` or package layout rather than loose scripts.
- Any: a framework starter layout plus a linter config and a formatter config.
Status: green = linter and formatter configured (cite both files). Amber = only one of
them. Red = neither.
Fix prompt: "Add <linter> and <formatter> to this <stack> project with a `lint` script,
fix what they flag in <dir>, and don't change behaviour."

### Semantic Versioning
`P1 · L1 · Delivery & deploys · risk 3 · repo`
Applies: always
Why: Version from v0.1.0 so every release and rollback has a name.
Look for:
- Node: a real `"version"` in `package.json` (not left at the template value with no
  tags), `CHANGELOG.md`, release-please / changesets / semantic-release config.
- Python: `version` in `pyproject.toml` or `__version__`, `CHANGELOG.md`.
- Any: git tags like `v0.1.0` (`git tag --list`), a `VERSION` file.
Status: green = a version that is tagged or changelogged. Amber = a version field only.
Red = no version anywhere.
Fix prompt: "Set the version to 0.1.0 in <manifest>, add a CHANGELOG.md, and tag the
current commit v0.1.0."

### Logging
`P1 · L1 · Observability & SRE · risk 2 · repo`
Applies: always
Why: Structured logs from the first endpoint; never log secrets or PII.
Look for:
- Node: `pino`, `winston`, `bunyan`, `consola`, `@vercel/otel`; a shared logger module.
  Only `console.log` in request handlers counts as unstructured.
- Python: `structlog`, `loguru`, `logging.config` / `dictConfig`, `python-json-logger`.
  Django: `LOGGING` in settings.
- Any: a logger imported in route handlers. Also grep for logged secrets and PII
  (`console.log(req.body)`, `logger.info(user)`, logging headers, tokens or emails).
Status: green = a structured logger used in handlers, no secrets logged. Amber = only
`console.log` / `print`, or a logger configured but unused. Red = handlers log request
bodies, tokens or passwords (cite the line), or there is no logging at all on server code.
Fix prompt: "Add <pino | structlog> as a shared logger in <path>, use it in <handlers>,
and remove the `<console.log(...)>` at <file:line> that logs <what>."

### Dependency Hell
`P1 · L1 · Delivery & deploys · risk 2 · repo`
Applies: always
Why: Commit the lockfile, pin versions, add packages deliberately.
Look for:
- Node: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` or `bun.lockb` committed;
  `"*"` or `"latest"` versions in `package.json`; Dependabot or Renovate config.
- Python: `uv.lock`, `poetry.lock`, `Pipfile.lock`, or pinned `requirements.txt`
  (`==`); unpinned `requirements.txt` lines.
- Any: a lockfile in git (check it isn't in `.gitignore`).
Status: green = lockfile committed and no wildcard versions. Amber = lockfile present
but some `"*"` / `latest` or unpinned lines. Red = no lockfile.
Fix prompt: "Generate and commit a lockfile with <npm install | uv lock>, replace the
`<latest>` version of <package> in <manifest> with a pinned range, and add Dependabot."

### Secrets Management
`P1 · L1 · Security · risk 1 · repo`
Applies: always
Why: Keys live in env vars or a secret store, never in git or frontend code.
Look for:
- Node / Next.js: secrets in client-exposed env vars (`NEXT_PUBLIC_*`, `VITE_*`,
  `REACT_APP_*`, `EXPO_PUBLIC_*`) whose name contains KEY, SECRET or TOKEN, other than
  public keys meant for the browser (Supabase anon key, Stripe publishable key, Firebase
  web config). LLM SDK clients created in client components (`"use client"` files, or
  `dangerouslyAllowBrowser: true`). Hardcoded keys: `sk-`, `sk-ant-`, `sk_live_`,
  `AKIA`, `ghp_`, `xoxb-`, private key blocks.
- Python: keys assigned as string literals; `settings.py` `SECRET_KEY` literal with
  `DEBUG = True` in the same file.
- Supabase: the `service_role` key anywhere in client code or a `NEXT_PUBLIC_` var.
- Firebase: service-account JSON committed.
- Any: committed `.env` files (check `git ls-files`), `.env` missing from `.gitignore`,
  an `.env.example` that holds real values.
Status: green = secrets read from env on the server only, `.env` gitignored, an
`.env.example` without values. Amber = env vars used but `.env` isn't gitignored, or a
secret in git history only (can't verify rotation). Red = a secret key reachable from the
browser or committed (cite the line; never print the key itself).
Fix prompt: "Move the <OpenAI> key server-side: rename `<NEXT_PUBLIC_OPENAI_API_KEY>` to
`<OPENAI_API_KEY>`, create the client only in <app/api/chat/route.ts>, call that route
from <client file>, and tell me to rotate the old key."

### SQL Injection
`P1 · L1 · Security · risk 1 · repo`
Applies: *(derived)* the app talks to a SQL database
Why: Parameterised queries or an ORM from the very first query.
Look for:
- Node: template strings or `+` concatenation inside `query(`, `execute(`,
  `$queryRawUnsafe`, `sequelize.query`, `knex.raw` with user input. Safe: Prisma / Drizzle
  query builders, tagged `sql\`\`` templates, `$1` placeholders.
- Python: f-strings or `%` / `.format` in `cursor.execute(`, `text(f"...")`,
  `.raw(f"...")`, `.extra(`. Safe: ORM querysets, `execute(sql, params)`.
- Supabase / Firebase: query builders are parameterised; check `.rpc()` SQL functions
  that build dynamic SQL with `EXECUTE format(...)`.
Status: green = all queries via an ORM / builder / placeholders (cite the data module).
Red = any string-built query with request data (cite it). Amber = raw SQL whose inputs
you can't trace.
Fix prompt: "Rewrite the query at <file:line> to use bound parameters instead of
<string interpolation>, and check <dir> for other raw queries."

### XSS
`P1 · L1 · Security · risk 1 · repo`
Applies: *(derived)* the app renders HTML
Why: Let the framework escape output; avoid raw HTML injection.
Look for:
- Node: `dangerouslySetInnerHTML`, `innerHTML =`, `v-html`, `{@html`, `document.write`;
  rendering model output as HTML (markdown → HTML without `DOMPurify` / `rehype-sanitize`).
- Python: `|safe`, `mark_safe(`, `Markup(`, `autoescape false`, Jinja `Environment` without
  autoescape.
- Any: user or model output inserted as HTML.
Status: green = framework escaping only, or raw HTML always sanitised (cite sanitiser).
Red = unsanitised raw HTML from user or model input (cite it). Amber = raw HTML from a
source you can't trace.
Fix prompt: "Sanitise the HTML rendered at <file:line> with <DOMPurify | rehype-sanitize>,
or render it as text."

### Input Validation
`P1 · L2 · Security · risk 1 · repo`
Applies: always (server code that accepts input)
Why: Validate every request at the boundary with a schema (zod, pydantic).
Look for:
- Node: `zod`, `valibot`, `yup`, `joi`, `class-validator`, `@hono/zod-validator`, used
  in route handlers and server actions on `req.body` / `await req.json()` / `formData`.
- Python: FastAPI pydantic models as body params (green by default for those routes;
  watch for `request.json()` / `dict` params). Django forms / DRF serializers.
  Flask: `marshmallow`, `pydantic`, `flask-smorest`; raw `request.json[...]` is unvalidated.
- Any: a schema check before input reaches the database or an LLM prompt.
Status: green = every handler validates (cite one or two). Amber = some do. Red = handlers
read raw bodies with no schema (cite one).
Fix prompt: "Add a <zod | pydantic> schema for the body of <route at file:line>, reject
invalid input with 400, and do the same for <other routes>."

### AuthN & AuthZ Middleware
`P1 · L2 · Security · risk 1 · repo`
Applies: *(derived)* the app has users or non-public endpoints
Why: Who you are and what you may do, enforced server-side on every route.
Look for:
- Next.js: `middleware.ts` with matcher; `auth()` / `getServerSession` / `getUser()` in
  route handlers and server actions; Clerk / Auth.js / Supabase SSR helpers. Client-only
  checks (`if (!user) router.push`) do not count.
- Express: `app.use(auth)`, passport, per-route guards.
- Python: FastAPI `Depends(get_current_user)`; Django `@login_required`,
  `permission_classes`; Flask-Login `@login_required`.
- Supabase: row-level security is the authorization layer whenever the browser holds
  the anon key. Look in `supabase/migrations/*.sql` for
  `alter table ... enable row level security` and `create policy` on every table the
  client reads or writes. A table created without RLS, or `disable row level security`,
  means anyone with the public anon key can read and write it: red.
- Firebase: `firestore.rules` / `storage.rules` with `allow read, write: if true` or no
  `request.auth` checks: red.
Status: green = server-side checks on every non-public route (cite middleware or guard),
and RLS / rules on every client-reachable table. Amber = checks on some routes. Red =
no server-side check, RLS off, or open rules (cite the file:line).
Fix prompt: "Enable row level security on <table> in a new migration under
<supabase/migrations>, add policies so users only read and write their own rows
(`auth.uid() = user_id`), and add a server-side auth check to <route>."

### Testing
`P1 · L2 · Delivery & deploys · risk 3 · repo`
Applies: always
Why: Test runner wired in; one small test for anything touching money, auth or parsing.
Look for:
- Node: `vitest`, `jest`, `@playwright/test`, `node:test`; a `"test"` script that isn't
  the npm placeholder; `*.test.*` / `*.spec.*` files.
- Python: `pytest` in dev deps, `tests/` with `test_*.py`, `TestCase` classes.
- Any: at least one test that touches auth, payments or parsing.
Status: green = runner plus tests on a risky path. Amber = runner with no or trivial tests.
Red = no runner.
Fix prompt: "Set up <vitest | pytest> with a `test` script and write one test for
<auth | payment | parsing code at file>."

### CI/CD
`P1 · L2 · Delivery & deploys · risk 2 · repo`
Applies: always
Why: Lint and test on every push; deploy from main, not your laptop.
Look for: `.github/workflows/*.yml`, `.gitlab-ci.yml`, `.circleci/config.yml`,
`bitbucket-pipelines.yml`, `azure-pipelines.yml`; steps that run lint and tests.
Host git integration (Vercel, Netlify, Render, Railway, Fly) counts for deploy but
not for lint and test: check for `vercel.json`, `netlify.toml`, `render.yaml`,
`railway.json`, `fly.toml`.
Status: green = CI runs lint and tests on push (cite workflow). Amber = deploy via host
integration only, or CI without tests. Red = nothing.
Fix prompt: "Add a GitHub Actions workflow at .github/workflows/ci.yml that installs with
<package manager>, runs <lint> and <test> on every push and pull request."

### Docker
`P1 · L2 · Delivery & deploys · risk 3 · repo`
Applies: always ("or your platform's equivalent")
Why: Reproducible environments, or your platform's equivalent.
Look for: `Dockerfile`, `compose.yaml` / `docker-compose.yml`, `.devcontainer/`,
`.dockerignore`. Platform equivalents count: `vercel.json` or Next.js on Vercel,
`netlify.toml`, `fly.toml`, `render.yaml`, Supabase `config.toml` for local DB,
`.nvmrc` / `.node-version` / `.python-version` / `engines` field.
Status: green = Dockerfile or a platform config plus a pinned runtime version. Amber = a
platform but no pinned runtime version. Red = neither.
Fix prompt: "Pin the runtime with <.nvmrc | .python-version> and add a <Dockerfile |
compose.yaml> so the app and <database> start with one command."

### Monitoring
`P1 · L2 · Observability & SRE · risk 2 · repo + confirm`
Applies: always
Why: Error tracking and uptime visibility from day one.
Look for:
- Node: `@sentry/nextjs` / `@sentry/node`, `sentry.*.config.*`, `instrumentation.ts`,
  `@highlight-run`, `posthog` error capture, `@vercel/analytics` (analytics alone isn't
  error tracking), `dd-trace`, `newrelic`.
- Python: `sentry_sdk.init`, `rollbar`, `opentelemetry` instrumentation, `ddtrace`.
- Any: an error-tracking SDK initialised in server code.
Status: green = error tracking initialised with a DSN from env (cite). Amber = none in
repo (the host may provide it: confirm). Uptime visibility is checked under Alerts.
Fix prompt: "Add <Sentry> error tracking to the <server and client> with the DSN from an
env var, and capture errors in <error boundary or handler>."

### Health Checks
`P1 · L2 · Failure handling · risk 2 · repo`
Applies: *(derived)* the app has a server or API
Why: A /health endpoint that checks the app and its database.
Look for: routes named `/health`, `/healthz`, `/api/health`, `/ready`, `/status`;
`app/api/health/route.ts`; FastAPI `@app.get("/health")`; Django `health_check` app;
`HEALTHCHECK` in Dockerfile. Check whether it touches the database (`SELECT 1`, a
ping) or just returns 200.
Status: green = endpoint that checks the database (cite). Amber = endpoint that only
returns 200. Red = none.
Fix prompt: "Add a GET <path>/health endpoint in <file> that runs a cheap database query
and returns 200 or 503 with a JSON body."

### Database Migrations
`P1 · L3 · Data layer · risk 2 · repo`
Applies: *(derived)* the app has a database it owns the schema of
Why: A migration tool (alembic, prisma migrate) before the first schema change.
Look for: `prisma/migrations/`, `drizzle/` with `drizzle.config.*`, `migrations/`
with knex / TypeORM / Sequelize, `supabase/migrations/*.sql`, `alembic.ini` +
`alembic/versions/`, Django `*/migrations/0*.py`, Rails `db/migrate`. Red flags:
`prisma db push` as the only schema step, `Base.metadata.create_all()` at startup,
`sequelize.sync({ alter: true })`.
Status: green = migrations folder with versioned files (cite). Amber = schema managed by
`db push` / `create_all` / dashboard edits. Red = a database with no schema management.
Fix prompt: "Set up <alembic | prisma migrate> for the models in <file>, generate an
initial migration from the current schema, and remove <create_all at file:line>."

---

## P2 · Pre-launch

### TLS
`P2 · L1 · Security · risk 1 · repo + confirm`
Applies: always
Why: HTTPS everywhere, usually free from your host.
Look for: managed hosts (Vercel, Netlify, Render, Fly, Railway, Cloudflare Pages,
Firebase Hosting) terminate TLS: cite the host config and mark green with "provided by
<host>". Self-hosted: nginx / Caddy / Traefik config with certificates, certbot,
HTTP → HTTPS redirect, HSTS headers. Red flags: `http://` URLs for the app's own API
in production config, cookies without `Secure`.
Status: green = managed host or TLS config in repo. Amber = self-hosted with no TLS in
repo (confirm). Red = production config points to the app over `http://` (cite).
Fix prompt: "Serve <app> over HTTPS: <add a Caddy reverse proxy with automatic
certificates | switch <file:line> to https://>, and add an HTTP→HTTPS redirect."

### Backups
`P2 · L1 · Disaster recovery · risk 1 · confirm` · pulled by health data
Applies: *(derived)* the app stores data
Why: Automated backups before real data, and one tested restore.
Look for: backup config in infra code (Terraform `backup_retention_period`,
`point_in_time_recovery`), a backup cron or script, a restore runbook. Managed
databases (Supabase, Neon, RDS, PlanetScale, Firebase) have backups depending on plan:
the repo can't show the plan or whether a restore was tested.
Status: amber unless the user confirmed it ("backups on, restore tested"), or a backup
config and a restore runbook are both in the repo. Never red on absence alone.
Confirm: "In <provider> settings, check automated backups or point-in-time recovery is
on for <plan>, then restore one backup to a scratch database."
Fix prompt: "Write a docs/runbooks/restore.md for <provider>: where backups live, how to
restore to a new database, and how to point the app at it."

### Rollbacks
`P2 · L1 · Delivery & deploys · risk 2 · repo + confirm`
Applies: always
Why: Know your one-command rollback before launch; migrations make it harder.
Look for: managed hosts with instant rollback (Vercel, Netlify, Render, Fly
`fly releases`) count once confirmed. A rollback section in README or a runbook,
`helm rollback`, down migrations (alembic `downgrade`, reversible Django migrations).
Status: green = documented rollback step (cite). Amber = host supports it but nothing is
written down (confirm). Red = self-hosted deploy script with no way back (cite).
Fix prompt: "Add a 'Rollback' section to <README> with the exact command for <host>, and
note which migrations in <dir> can't be reversed."

### DNS
`P2 · L1 · Networking · risk 2 · confirm`
Applies: *(derived)* the app will have its own domain
Why: Domain and records set up before launch; lower TTLs before you change them.
Look for: custom domain in `vercel.json`, `CNAME` file, `fly.toml`, Terraform DNS
records. Mostly outside the repo.
Status: amber (confirm) unless confirmed. Never red.
Confirm: "Domain points at <host>, TTLs are low before any change, and email records
(SPF, DKIM) are set if the app sends mail."

### CDN
`P2 · L1 · Traffic & edge · risk 3 · repo + confirm`
Applies: *(derived)* the app serves static assets to browsers
Why: Static assets from a CDN; most hosts include it.
Look for: managed hosts serve static assets from a CDN (Vercel, Netlify, Cloudflare,
Firebase Hosting): green with "provided by <host>". Self-hosted: Cloudflare / CloudFront
config, `assetPrefix`, `STATIC_URL` on a CDN domain, `whitenoise` with cache headers.
Status: green = managed host or CDN config. Amber = self-hosted, nothing in repo.
Fix prompt: "Serve <static dir> from <CDN> with long cache headers on hashed assets."

### CORS
`P2 · L1 · Security · risk 1 · repo`
Applies: *(derived)* the app exposes an API to browsers
Why: Replace the dev-time wildcard with an explicit allow-list.
Look for:
- Node: `cors()` with no options or `origin: '*'` / `origin: true`;
  `Access-Control-Allow-Origin: *` in `next.config.*` headers, `vercel.json`, route
  responses. Next.js same-origin API routes with no CORS headers are fine (green).
- Python: FastAPI `CORSMiddleware(allow_origins=["*"], allow_credentials=True)`;
  Django `CORS_ALLOW_ALL_ORIGINS = True`; Flask `CORS(app)` with defaults.
Status: green = allow-list from env, or same-origin only. Red = wildcard, especially with
credentials (cite). Amber = allow-list hardcoded to localhost only.
Fix prompt: "Replace the wildcard CORS at <file:line> with an allow-list read from
<ALLOWED_ORIGINS>, and keep credentials only for those origins."

### Encryption in Transit
`P2 · L2 · Security · risk 1 · repo + confirm`
Applies: always
Why: TLS between app, database and third-party services too.
Look for: database URLs with `sslmode=require` / `ssl: true` / `?ssl=true`;
`sslmode=disable` or `ssl: false` / `rejectUnauthorized: false` are red flags;
`http://` URLs to third-party APIs; Redis `redis://` vs `rediss://`. Managed SDKs
(Supabase, Firebase, OpenAI, Stripe) use HTTPS by default: count as green for those calls.
Status: green = every connection is TLS (cite DB config or managed SDK). Red = TLS turned
off or a plain `http://` call to an external service (cite). Amber = DB URL only in env
(confirm it uses TLS).
Fix prompt: "Turn on TLS for the <database> connection at <file:line> (`sslmode=require`)
and switch <http:// call> to https://."

### Encryption at Rest
`P2 · L2 · Security · risk 1 · confirm` · pulled by health data
Applies: *(derived)* the app stores data
Why: Confirm your database and storage encrypt at rest (managed ones usually do).
Look for: Terraform `storage_encrypted = true`, KMS keys, S3 bucket encryption.
Managed providers (Supabase, Neon, Firebase, RDS defaults) encrypt at rest.
Status: amber (confirm) unless confirmed or infra code sets it. With a known managed
provider, the confirm line can say "usually on by default for <provider>; check your
plan". Never red.

### CSRF
`P2 · L2 · Security · risk 1 · repo`
Applies: *(derived)* the app uses cookie-based sessions
Why: Needed once cookie-based sessions go live; frameworks ship tokens.
Look for: session cookies (`express-session`, `iron-session`, Auth.js, Django sessions,
Flask `session`, Supabase SSR cookies). Protection: `SameSite=Lax/Strict` cookies,
`csrf` middleware, Django `CsrfViewMiddleware` (check it isn't removed and `@csrf_exempt`
isn't widespread), Next.js server actions (origin-checked by the framework).
Status: n/a = bearer tokens only, no session cookies. Green = SameSite cookies or CSRF
tokens (cite). Red = cookie sessions with `SameSite=None` and no token, or CSRF middleware
removed (cite).
Fix prompt: "Set `SameSite=Lax` and `Secure` on the session cookie at <file:line> and add
<csrf middleware> to state-changing routes."

### OAuth
`P2 · L2 · Security · risk 1 · repo`
Applies: *(derived)* the app signs users in with an OAuth / social provider
Why: Use a provider or library; validate state and redirect URIs.
Look for: Auth.js / NextAuth providers, Clerk, Supabase `signInWithOAuth`, Firebase
`signInWithPopup`, `authlib`, `django-allauth`, `python-social-auth` (all green: they
handle state). Hand-rolled flows: `/callback` routes that read `code` without checking
`state`, open `redirect_uri` / `next` params passed straight to a redirect.
Status: green = provider or library (cite). Red = hand-rolled flow without state check, or
an open redirect (cite).
Fix prompt: "Replace the hand-rolled OAuth callback at <file> with <library>, or verify
`state` and allow-list redirect targets."

### IAM
`P2 · L2 · Security · risk 1 · confirm` · pulled by health data
Applies: *(derived)* the app uses a cloud account or service credentials
Why: No root keys in production; least privilege for services and people.
Look for: Terraform / CDK IAM policies with `"Action": "*"` or `"Resource": "*"`
(red flag in repo); AWS root keys; one shared admin key used everywhere; Supabase
`service_role` used in routes that don't need it.
Status: amber (confirm) unless confirmed. Red only on repo evidence: a wildcard policy
or a service-role / admin key used where a scoped key would do (cite).
Confirm: "No root or owner keys in production env vars; each service has its own scoped
key; people have their own logins."

### Feature Flags
`P2 · L2 · Delivery & deploys · risk 3 · repo`
Applies: always
Why: Ship dark and switch off a broken feature without a redeploy; worth it at any size.
Look for: LaunchDarkly, GrowthBook, Unleash, Flagsmith, PostHog flags, Statsig,
`@vercel/flags`, `django-waffle`; or a simple env / DB driven flag module.
Status: green = flag library or flag module used (cite). Amber = env-var toggles only
(need a redeploy). Red = none.
Fix prompt: "Add a small feature-flag helper backed by <env | PostHog> and put
<riskiest new feature at file> behind a flag."

### Timeouts
`P2 · L2 · Failure handling · risk 2 · repo` · pulled by AI features
Applies: *(derived)* the app makes outbound calls
Why: Every outbound call, LLM APIs included, gets a timeout.
Look for:
- Node: `new OpenAI({ timeout })` / `new Anthropic({ timeout })` (SDK defaults are about
  10 minutes: treat an SDK client without `timeout` as missing), `fetch(url, { signal:
  AbortSignal.timeout(ms) })`, axios `timeout:`, `ky` `timeout`, Vercel AI SDK
  `abortSignal`.
- Python: `requests.*(..., timeout=)` (no default: missing means none), `httpx`
  `timeout=` (default 5s: fine), `OpenAI(timeout=)`, `Anthropic(timeout=)`,
  `aiohttp.ClientTimeout`.
- Database: `statement_timeout`, pool `connectionTimeoutMillis`.
Status: green = every outbound client sets a timeout (cite each). Amber = some do. Red =
LLM or HTTP clients with no timeout (cite the constructor or call line). With the AI
override, an LLM client without a timeout is always red.
Fix prompt: "Pass `timeout: <30_000>` to the <OpenAI> client at <file:line>, add
`AbortSignal.timeout` to the fetch at <file:line>, and return a friendly error on timeout."

### Retries
`P2 · L2 · Failure handling · risk 2 · repo`
Applies: *(derived)* the app makes outbound calls
Why: Retry only transient failures, and only operations that are safe to repeat.
Look for: `p-retry`, `async-retry`, `tenacity`, `backoff`, `urllib3.Retry`, SDK
`maxRetries` / `max_retries` options (OpenAI and Anthropic SDKs retry twice by default:
green if left at default or set deliberately). Red flags: retry loops around payment or
write calls with no idempotency key; `while True` retries with no cap.
Status: green = SDK defaults or a retry helper on idempotent calls. Amber = no retries on
flaky third-party calls. Red = uncapped retries or retried non-idempotent writes (cite).
Fix prompt: "Wrap <call at file:line> in <p-retry | tenacity> with 3 attempts and
backoff, retrying only on 429/5xx/network errors."

### Webhooks
`P2 · L2 · Async & messaging · risk 1 · repo` · pulled by payments
Applies: *(derived)* the app receives webhooks
Why: Verify signatures, respond fast, process async, expect duplicates.
Look for: routes like `/api/webhooks/*`, `/stripe/webhook`. Verification:
`stripe.webhooks.constructEvent`, `svix` `verify`, `crypto.timingSafeEqual` on an HMAC,
`hmac.compare_digest`. Red flags: `JSON.parse(body)` with no signature check, slow work
(LLM calls, emails) before responding, no dedupe on event id.
Status: n/a = no webhook routes. Green = signature verified and event id deduped (cite).
Amber = verified but no dedupe. Red = no signature check (cite).
Fix prompt: "Verify the <Stripe> signature in <route> with the raw body and
<STRIPE_WEBHOOK_SECRET>, store processed event ids, and return 200 before slow work."

### Cron Jobs
`P2 · L2 · Async & messaging · risk 2 · repo`
Applies: *(derived)* the app runs scheduled jobs
Why: Scheduled jobs need logs, failure alerts and protection against overlapping runs.
Look for: `vercel.json` `crons`, `node-cron`, `bull` repeatable jobs, GitHub Actions
`schedule:`, `celery beat`, `APScheduler`, Supabase `pg_cron`, Kubernetes `CronJob`.
Check for a secret on the cron route (`CRON_SECRET`), logging, and a lock.
Status: n/a = no scheduled jobs. Green = protected route, logged, overlap-safe. Amber =
missing logging or lock. Red = public cron endpoint with no secret (cite).
Fix prompt: "Protect <cron route> with a CRON_SECRET header check, log start, end and
failures, and skip the run if the previous one holds <lock>."

### Race Conditions
`P2 · L2 · Concurrency & runtime · risk 1 · repo`
Applies: *(derived)* the app writes to a database
Why: Double-clicks and concurrent requests; lean on DB constraints and transactions.
Look for: read-then-write patterns (`findFirst` then `create`, `get` then `save`) on
balances, counts, usernames, bookings; `$transaction` / `atomic()` / `BEGIN`; unique
constraints in schema (`@unique`, `unique=True`, `UNIQUE`); `upsert`; disabled buttons
alone don't count.
Status: green = writes that matter use transactions or unique constraints (cite). Amber =
can't tell which writes matter. Red = read-modify-write on money or counters without a
transaction (cite).
Fix prompt: "Make <operation at file:line> atomic: add a unique constraint on <column>
and wrap the read and write in a transaction."

### Database Indexing
`P2 · L2 · Data layer · risk 3 · repo`
Applies: *(derived)* the app has a database
Why: Index what you filter and join on before real data arrives.
Look for: `@@index` / `@unique` in Prisma, `index()` in Drizzle, `CREATE INDEX` in SQL
migrations, `db_index=True` / `Meta.indexes` in Django, `index=True` in SQLAlchemy. Compare
with columns used in `where` / `filter` / `order by` / foreign keys (`user_id`,
`created_at`). Firebase: `firestore.indexes.json`.
Status: green = filtered columns indexed (cite). Amber = some missing. Red = foreign keys
and hot filters (e.g. `user_id`) with no index (cite the query and the schema).
Fix prompt: "Add a migration that indexes <table.column> (used in <query at file:line>)."

### N+1 Queries
`P2 · L2 · Data layer · risk 3 · repo`
Applies: *(derived)* the app uses an ORM or query builder
Why: AI-written ORM code loves N+1; check query counts per request.
Look for: queries inside `for` / `.map(async` / `Promise.all(items.map(` loops; Django
loops over querysets touching relations without `select_related` / `prefetch_related`;
SQLAlchemy lazy relationships in loops without `selectinload`; Supabase `.from()` inside
loops.
Status: green = includes / joins used, no queries in loops. Red = a query inside a loop
over results (cite). Amber = can't tell.
Fix prompt: "Replace the per-item query in the loop at <file:line> with one query using
<include | select_related | an `in` filter>."

### Serverless Limits
`P2 · L2 · Scaling & performance · risk 2 · repo` · pulled by AI features
Applies: *(derived)* the app deploys to serverless functions
Why: Function timeouts and payload caps; long LLM calls hit them first.
Look for: Vercel / Netlify / Lambda / Cloud Functions deploys; `export const maxDuration`
in Next.js routes, `vercel.json` `functions.maxDuration`, `runtime = 'edge'`,
`serverless.yml` `timeout`. Long work (LLM calls, file processing) in a plain request
handler without streaming or a queue.
Status: n/a = long-running server. Green = maxDuration set and long work streamed or
queued (cite). Amber = defaults, short calls. Red = LLM or long calls on default limits
without streaming (cite route).
Fix prompt: "Set `maxDuration` for <route>, stream the model response, and move <long
job> to a background job."

### Server-Sent Events
`P2 · L2 · Real-time · risk 3 · repo` · pulled by AI features
Applies: *(derived)* the app streams responses, or has AI features
Why: The simple way to stream LLM tokens to the browser.
Look for: `stream: true` on model calls, Vercel AI SDK `streamText` /
`toDataStreamResponse`, `ReadableStream` responses, `text/event-stream`, FastAPI
`StreamingResponse` / `sse-starlette`, `EventSource` in client.
Status: n/a = no AI features and no streaming. Green = streamed (cite). Amber = AI
responses returned in one block (users wait for the whole answer; fine if responses are
short).
Fix prompt: "Stream the model response from <route> with <streamText | StreamingResponse>
and render tokens as they arrive in <component>."

### Alerts
`P2 · L2 · Observability & SRE · risk 2 · confirm`
Applies: always
Why: Know it's down before your users tell you; start with an uptime ping.
Look for: uptime / alert config in repo (Checkly checks, Better Stack / UptimeRobot
Terraform, Prometheus alert rules, Sentry alert config, a GitHub Actions ping). Mostly
outside the repo.
Status: amber (confirm) unless confirmed or config is in repo. Never red.
Confirm: "An uptime check hits <health URL> every few minutes and alerts your phone or
email; error-rate alerts are on in <error tracker>."

### Reverse Proxies
`P2 · L2 · Traffic & edge · risk 2 · repo`
Applies: *(derived)* the app is self-hosted (VM, container, bare metal)
Why: If self-hosting: TLS termination, compression and buffering in front of the app.
Look for: `nginx.conf`, `Caddyfile`, Traefik labels in compose, `uvicorn` / `gunicorn`
behind a proxy, `--proxy-headers`, Django `SECURE_PROXY_SSL_HEADER`, Express
`trust proxy`.
Status: n/a = managed platform. Green = proxy config (cite). Red = app server exposed
directly on a public port (cite compose / Dockerfile).
Fix prompt: "Put <Caddy> in front of <app service> in <compose file> for TLS and
compression, and stop publishing <port> publicly."

### PII Handling
`P2 · L2 · Compliance · risk 1 · repo + confirm` · pulled by health data, kids, Indian users, privacy-law regions
Applies: *(derived)* the app stores personal data
Why: Collect less, keep it out of logs, know where it lives.
Look for: personal fields in schema (email, phone, address, date of birth, government
ids, health fields); those fields in log calls, analytics events, or LLM prompts sent to
third parties; a privacy policy page; a data-deletion path.
Status: green = minimal fields, kept out of logs and prompts, deletion path exists. Amber
= can't tell where it flows (confirm). Red = PII logged or sent to analytics / LLMs (cite).
Fix prompt: "Stop logging <field> at <file:line>, redact <fields> before sending to
<LLM | analytics>, and add an account-deletion route."

### Tenant Isolation
`P2 · L2 · Security · risk 1 · repo`
Applies: multi-tenant apps (from roadmap.json)
Why: Every query scoped by tenant (row-level security on); cross-tenant leaks are
launch-day bugs.
Look for: `org_id` / `tenant_id` / `team_id` / `workspace_id` columns; queries that
filter by them; Supabase RLS policies using the tenant column; Postgres RLS; a tenant
scope helper; Django `django-tenants`. Red flags: queries on tenant tables without the
tenant filter, tenant id taken from the request body instead of the session.
Status: n/a = single-tenant (from the interview). Green = RLS or a scoped data layer
(cite). Red = an unscoped query on tenant data (cite).
Fix prompt: "Scope every query on <tables> by the session's <org_id>: add RLS policies in
<migrations> and take the tenant from the session, not the request, in <file:line>."

### Prompt Injection
`P2 · L2 · Security · risk 1 · repo`
Applies: AI features (from roadmap.json)
Why: Treat model input and output as untrusted; limit what tools can do.
Look for: user input concatenated into system prompts; model output passed to `eval`,
SQL, shell, `fetch`, or rendered as HTML; tool / function calling with write or delete
tools and no confirmation; retrieved web or document content mixed into prompts; no
`max_tokens`.
Status: green = user input kept in user messages, outputs validated (schema / allow-list),
tools scoped and confirmed (cite). Amber = plain chat with no tools (low impact; say so).
Red = model output executed or used to call tools / URLs unchecked (cite).
Fix prompt: "Keep user text out of the system prompt in <file:line>, validate the model's
output with <schema> before using it, and require confirmation for <tool>."

### LLM Token Budgets
`P2 · L2 · Scaling & performance · risk 1 · repo + confirm`
Applies: AI features (from roadmap.json)
Why: Per-user caps and spend alerts so one user can't burn your bill.
Look for: `max_tokens` / `maxTokens` / `max_output_tokens` on calls; per-user usage
tracking (a `usage` / `credits` table, Redis counters); input length limits; spend
alerts (provider dashboard, Helicone / Portkey / LiteLLM budgets: confirm).
Status: green = max tokens set and per-user caps (cite). Amber = max tokens only, or spend
alerts unconfirmed. Red = no limits on an endpoint anyone can call (cite).
Fix prompt: "Set `max_tokens` on the call at <file:line>, cap input length, track tokens
per user in <table>, and refuse requests over <daily limit>."

### Idempotency
`P2 · L3 · Failure handling · risk 1 · repo` · pulled by payments
Applies: *(derived)* the app takes payments, receives webhooks, or retries writes
Why: Idempotency keys on payments, webhooks and anything that gets retried.
Look for: `idempotencyKey` / `Idempotency-Key` header on Stripe and payment calls;
processed-event tables; unique constraints on external ids; upserts.
Status: n/a = none of those. Green = keys or dedupe on each (cite). Red = payment or
webhook handler without them (cite).
Fix prompt: "Pass an idempotency key on the <Stripe call at file:line> and dedupe
<webhook> events by id with a unique constraint."

### SSRF
`P2 · L3 · Security · risk 1 · repo` · pulled by AI features
Applies: *(derived)* the app fetches URLs supplied by users or by a model
Why: If you fetch user-supplied URLs (agents do), block internal addresses.
Look for: `fetch(req.body.url)`, `requests.get(user_url)`, link previews, "import from
URL", web-browsing or fetch tools given to a model, image proxies. Protection: allow-list
of hosts, blocking private IP ranges and `169.254.169.254`, `ssrf-req-filter`.
Status: n/a = no such fetches. Green = allow-list or private-range blocking (cite). Red =
unchecked fetch of a user or model URL (cite).
Fix prompt: "Before fetching the URL at <file:line>, resolve it and reject private,
loopback and link-local addresses, or allow-list <hosts>."

---

## Pulled into P2 by overrides

These are checked only when their override applies. Otherwise they stay grey at their
home phase.

### Rate Limiting
`P3 · L1 · Traffic & edge · risk 1 · repo` · pulled by AI features
Why: Protect endpoints from abuse and runaway clients; auth endpoints first.
Look for: `@upstash/ratelimit`, `express-rate-limit`, `rate-limiter-flexible`,
`slowapi`, `django-ratelimit`, `flask-limiter`, Cloudflare / Vercel firewall rules in
repo, API gateway throttling. Check the LLM-calling routes and auth routes specifically.
Status: green = limits on model-calling and auth routes (cite). Amber = only when there
is a hint the limit lives outside the code (a WAF, gateway or firewall config in the
repo, or the user said so) and it needs confirming. Red = a model-calling route with no
limit in code and no such hint (cite the route). Absence of a limit is repo-visible, so
this item is not confirm-only.
Fix prompt: "Add <@upstash/ratelimit> to <app/api/chat/route.ts>: N requests per minute
per user or IP, return 429 with a retry-after."

### Pessimistic Locking
`P3 · L3 · Concurrency & runtime · risk 1 · repo` · pulled by payments
Why: Lock rows for balances and inventory (SELECT … FOR UPDATE).
Look for: `FOR UPDATE`, `select_for_update()`, `with_for_update()`, Prisma
`$queryRaw` with `FOR UPDATE`, atomic increments (`increment`, `F('balance') - x`).
Status: green = balance or stock changes locked or atomic (cite). Red = read-then-write on
balances (cite). n/a = no balances, credits or stock.
Fix prompt: "Lock the <balance> row with <select_for_update | FOR UPDATE> inside a
transaction in <file:line>, or use an atomic decrement."

### Audit Logs
`P4-B2B · L2 · Compliance · risk 1 · repo` · pulled by health data, payments
Why: Who did what, and when; a standard enterprise request.
Look for: an `audit_log` / `events` table with actor, action, target, timestamp;
`django-auditlog`, `django-simple-history`, `paper_trail`; writes to it on sensitive
actions (login, payment, data access, role change).
Status: green = audit table written on sensitive actions (cite). Amber = general logs only.
Red = none.
Fix prompt: "Add an append-only audit_log table (actor, action, target, ip, at) and write
to it from <payment | record-access handlers>."

### GDPR & Privacy
`P4-B2C · L2 · Compliance · risk 1 · repo + confirm` · pulled by EU users, privacy-law regions
Why: Consent, export and deletion at consumer scale. The checks are the same for UK GDPR,
LGPD, PIPEDA, CCPA/CPRA and similar laws; name the law that pulled it.
Look for: privacy policy page, cookie consent banner (only needed for non-essential
cookies / analytics), account deletion and data export routes, analytics configured
without PII, DPAs with processors (confirm).
Status: green = policy, deletion and export present (cite). Amber = some present, or
processor agreements unconfirmed. Red = analytics or tracking cookies with no consent,
or no way to delete an account (cite).
Fix prompt: "Add a data export and account deletion endpoint in <file>, gate <analytics
script> behind consent, and link a privacy policy from <footer>."

### Accessibility (WCAG 2.1 AA)
`P4-B2C · L2 · Compliance · risk 2 · repo + confirm` · pulled by EU users
Why: A legal requirement for many EU consumer services.
Look for: `eslint-plugin-jsx-a11y`, `@axe-core/*`, `jest-axe`, Playwright axe tests,
`pa11y`; images without `alt`, `<div onClick>` without role / keyboard handler, inputs
without labels, `outline: none` without a focus style, `user-scalable=no`.
Status: green = a11y lint plus an automated check in tests (cite). Amber = no automated
check; a manual audit is still needed (confirm). Red = clear violations in code (cite
file:line).
Fix prompt: "Add eslint-plugin-jsx-a11y and an axe check in <tests>, then fix the missing
labels and alt text it reports in <components>."

### Data Residency
`P4-B2B · L3 · Compliance · risk 1 · repo + confirm` · pulled by data-localisation regions
Why: Customers require their data kept in their region; some countries' laws may too.
Look for: where personal data is stored and processed: hosting and database regions in
`vercel.json` (`regions`), `fly.toml` (`primary_region`), Terraform / CDK region
settings, `AWS_REGION` or similar in config, a Supabase or managed-database region noted
in docs or env examples; third parties that receive personal data (analytics, LLM
providers, email) and where they process it.
Status: green = storage region confirmed for the country that requires it (cite config,
or "confirmed by you"). Amber = region unknown from the repo, or personal data goes to a
third party outside the country (confirm what applies). Never red from the repo alone:
whether data may leave depends on facts outside it.
Fix prompt: "List every place <app> stores or sends personal data of users in <country>
(<database>, <analytics>, <LLM provider>) with its region, and draft the options for
keeping it in <country> or covering the transfer, for review with a lawyer."

---

## Done-early signals (later phases)

Not reviewed in depth. When a signal is present in a project whose phase is earlier than
the item's phase, add a "done early" flag phrased as a question about upkeep, for
example: "You have Helm charts (deploy/helm/). Kubernetes is usually a P4 budget decision:
is someone keeping these current, or would your host's own deploy be simpler for now?"

| Item (phase) | Signals |
|---|---|
| Kubernetes (P4) | `apiVersion:` + `kind: Deployment` YAML, `k8s/`, `kustomization.yaml` |
| Helm Charts (P4) | `Chart.yaml`, `values.yaml`, `templates/` beside them |
| Caching (P3) | Redis / Memcached client used for reads, `@cache` decorators, `unstable_cache` with custom revalidation layers |
| Message Queues (P3) | BullMQ, RabbitMQ, SQS, Kafka, Celery |
| Pub/Sub (P3) | Kafka topics, Redis pub/sub, SNS, Google Pub/Sub |
| Circuit Breakers (P3) | `opossum`, `pybreaker`, `resilience4j` |
| Load Balancing (P3) | load balancer config in Terraform, nginx `upstream` with several servers |
| Distributed Tracing (P4) | OpenTelemetry exporters, Jaeger, Tempo |
| Multi-Region Deployment (P4-B2C) | several regions in Terraform / `fly.toml` / deploy config |
| Sharding (P4-B2C) | shard keys, Vitess / Citus config |

Use `assets/roadmap.json` for the exact name and phase of any item you flag. Only flag
what has a signal in the repo; never guess.

## Usual over-builds

The later-phase items vibecoders most often build too early. The report's "Skip for now"
line names up to 5 of these, in this order, so the "not yet" verdict is concrete:

1. Kubernetes (P4)
2. Caching (P3)
3. Message Queues (P3)
4. Sharding (P4-B2C)
5. Multi-Region Deployment (P4-B2C)
6. Event-Driven Architecture (P4)
7. Read Replicas (P4)
8. Autoscaling (P4)
9. Distributed Tracing (P4)
10. Terraform (P4)

Leave out any that are in scope (pulled forward), already present (flag those as done
early instead), or in the current phase (for a P3 project, Caching and Message Queues
are current, not over-builds).
