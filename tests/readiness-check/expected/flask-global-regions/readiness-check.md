# Readiness check: recipebox

2026-10-21 · **P2 Pre-launch** · You're here because you said people are about to use it, and the repo has sign-in (app/routes.py) and a Fly.io deploy (fly.toml).

Overrides: **EU users** (you said your users are worldwide) · **Indian users** (you said your users are worldwide) · **Privacy-law regions** (you said your users are worldwide, including Brazil)

- EU users: EAA has applied since 28 Jun 2025 (WCAG 2.1 AA via EN 301 549); micro-enterprises are exempt.
- Indian users: Consent notices, breach reporting and children's-data rules apply from 13 May 2027.
- Privacy-law regions: Most comprehensive privacy laws ask for the same engineering: a privacy notice, a lawful basis or consent, and access, export and deletion paths.
- Not legal advice.

| Do now | Confirm | In place | Not yet |
|---|---|---|---|
| 4 | 7 | 22 | 80 |

## Do now

### 1. PII Handling · L2
Evidence: user emails written to the logs on sign-up and on every failed login, app/routes.py:36 and :50
Why: Collect less, keep it out of logs, know where it lives.
Prompt for your agent:
> Remove the email from the log calls at app/routes.py:36 and :50: log only user_id on sign-up, and nothing that identifies the person on a failed login. Keep email and display_name out of future log lines too.

### 2. GDPR & Privacy · L2
Evidence: no privacy policy page, no account deletion and no data export in app/routes.py
Why: Consent, export and deletion at consumer scale.
Prompt for your agent:
> Add a /privacy page (app/templates/privacy.html) saying what you store (email, name, recipes) and why, link it from app/templates/base.html and the sign-up form, and add a login-protected /account page in app/routes.py with Download my data (profile and recipes as JSON) and Delete my account (deletes their recipes and user row, then logs them out).

### 3. Accessibility (WCAG 2.1 AA) · L2
Evidence: sign-up inputs have placeholders but no labels, app/templates/signup.html:6-8; no a11y check in tests
Why: A legal requirement for many EU consumer services.
Prompt for your agent:
> Render a label for each field in app/templates/signup.html:6-8 ({{ form.email.label }} and so on, as app/templates/login.html already does), then add an axe check (pytest with Playwright and axe-core) for /signup, /login and / in tests/.

### 4. Feature Flags · L2
Evidence: no flag library or flag module; looked for Flagsmith, GrowthBook, PostHog and env toggles
Why: Ship dark and switch off a broken feature without a redeploy — worth it at any size.
Prompt for your agent:
> Add a small app/flags.py backed by a `flags` table (name, enabled), and put adding recipes (new_recipe, app/routes.py:72) behind a `recipes_enabled` flag, so you can switch it off without a redeploy.

## Also missing

Nothing else is red.

## Confirm

These are partly done, or live outside the repo where the check can't see them.
Tick a box once you've checked, and the next run will count it as in place.

- [ ] **Backups** · Check automated backups or point-in-time recovery are on for your Postgres, then restore one to a scratch database. (no backup config found in repo; the database is only a DATABASE_URL (.env.example:2))
- [ ] **DNS** · Point your domain at the Fly app (fly certs add), and lower the TTL a day before any change. (no custom domain in fly.toml)
- [ ] **Encryption at Rest** · Check your Postgres provider encrypts the database and its backups at rest.
- [ ] **IAM** · Your Fly deploy token and database user are scoped to this app, not an org owner or superuser, and each person has their own Fly login.
- [ ] **Alerts** · An uptime check hits /health on your Fly URL every few minutes and alerts your phone or email. (Fly health checks (fly.toml:13-17) restart a machine but don't alert you)
- [ ] **Monitoring** · Check whether errors are tracked anywhere (Sentry or similar); if not, add sentry-sdk before launch. (no error-tracking SDK in pyproject.toml)
- [ ] **Rollbacks** · Add a Rollback section to README.md: redeploy the previous image with fly deploy --image, and note that the release_command only migrates forward. (Fly keeps earlier releases and the migration has a down step (migrations/versions/0001_init.py:32-34), but no rollback step is written down)

## In place

- **Project Scaffolding** · ruff configured in pyproject.toml:22-26 (ruff format covers formatting); package layout under app/
- **Semantic Versioning** · version 0.2.0 in pyproject.toml:3 with CHANGELOG.md
- **Logging** · JSON logs via python-json-logger, app/__init__.py:14-19, used in app/routes.py:13; no secrets logged (the emails it logs are covered under PII Handling)
- **Dependency Hell** · uv.lock committed; a version range on every dependency in pyproject.toml:6-17; installs with uv sync --frozen (Dockerfile:5)
- **Secrets Management** · SECRET_KEY and DATABASE_URL read from env (app/config.py:5-6); .env gitignored; .env.example has no values
- **SQL Injection** · SQLAlchemy ORM only, app/routes.py:46, :65 and :75; the only raw SQL is the constant SELECT 1 in /health (app/routes.py:19)
- **XSS** · Jinja autoescaping in app/templates (Flask turns it on for .html files); no |safe or Markup
- **Input Validation** · Flask-WTF forms with validators (app/forms.py), checked with validate_on_submit in every POST handler (app/routes.py:28, :45 and :74)
- **AuthN & AuthZ Middleware** · Flask-Login @login_required on the recipe routes (app/routes.py:62 and :71), and recipes filtered by current_user.id (app/routes.py:65)
- **Testing** · pytest with sign-up and login tests, tests/test_auth.py
- **CI/CD** · ruff and pytest on every push, .github/workflows/ci.yml:10-12
- **Docker** · Dockerfile, with Python pinned in .python-version
- **Health Checks** · /health runs SELECT 1, app/routes.py:16-22; Fly checks it (fly.toml:13-17)
- **Database Migrations** · Flask-Migrate, migrations/versions/0001_init.py; applied by the Fly release_command (fly.toml:5)
- **TLS** · provided by Fly.io, force_https in fly.toml:9
- **CORS** · same-origin forms only; no flask-cors and no Access-Control headers
- **Encryption in Transit** · sslmode=require on the Postgres connection, app/config.py:9
- **CSRF** · CSRFProtect on every form (app/__init__.py:12 and :28); session cookies Secure and SameSite=Lax (app/config.py:14-15)
- **Timeouts** · Postgres connect_timeout and statement_timeout, app/config.py:10-11; no other outbound calls
- **Race Conditions** · unique constraint on users.email (migrations/versions/0001_init.py:16); other writes are single inserts (app/routes.py:34 and :75)
- **Database Indexing** · index on recipes (user_id, created_at), migrations/versions/0001_init.py:29, matching app/routes.py:65
- **N+1 Queries** · one query per page, app/routes.py:64-66; no queries inside loops

## Coming next: P3 Growth

Starts with real traffic, paying users or a second engineer.
First up: Production Incidents, Vertical Scaling, Latency, Throughput, Metrics, and 33 more.

Skip for now: Kubernetes, Caching, Message Queues, Sharding, Multi-Region Deployment. None of these are needed in P2; 80 items in total can wait.

---

Roadmap based on a list of 111 production topics (https://www.instagram.com/p/DehMUh_jdbK/) · Full roadmap: https://www.blocksimplified.com/blog/vibe-to-prod-what-your-project-needs-for-production

## Machine state, don't edit by hand

```json
{
  "schema": 1,
  "skill_version": "0.1.0",
  "generated_on": "2026-10-21",
  "project": {
    "name": "recipebox",
    "stack": [
      "Python 3.12",
      "Flask 3",
      "Flask-SQLAlchemy",
      "PostgreSQL",
      "Fly.io"
    ],
    "commit": null,
    "dirty": false
  },
  "answers": {
    "audience": "about_to_launch",
    "growth": [
      "none"
    ],
    "market": "b2c",
    "domains": [
      "none"
    ],
    "regions": [
      "global",
      "elsewhere"
    ],
    "countries": [
      "BR"
    ],
    "multi_tenant": "no",
    "answered_on": "2026-10-21"
  },
  "phase": {
    "id": "P2",
    "name": "Pre-launch",
    "why": "You said people are about to use it, and the repo has sign-in (app/routes.py) and a Fly.io deploy (fly.toml)."
  },
  "next_phase": {
    "id": "P3",
    "name": "Growth",
    "trigger": "real traffic, paying users or a second engineer — usually the first incident or the first \"it's slow\""
  },
  "overrides": [
    {
      "key": "EU users",
      "reason": "you said your users are worldwide",
      "pulls": [
        "GDPR & Privacy",
        "Accessibility (WCAG 2.1 AA)"
      ],
      "extra": "EAA has applied since 28 Jun 2025 (WCAG 2.1 AA via EN 301 549); micro-enterprises are exempt."
    },
    {
      "key": "Indian users",
      "reason": "you said your users are worldwide",
      "pulls": [
        "PII Handling"
      ],
      "extra": "Consent notices, breach reporting and children's-data rules apply from 13 May 2027."
    },
    {
      "key": "Privacy-law regions",
      "reason": "you said your users are worldwide, including Brazil",
      "pulls": [
        "GDPR & Privacy",
        "PII Handling"
      ],
      "extra": "Most comprehensive privacy laws ask for the same engineering: a privacy notice, a lawful basis or consent, and access, export and deletion paths."
    }
  ],
  "legal_note": true,
  "confirmations": {},
  "counts": {
    "red": 4,
    "amber": 7,
    "green": 22,
    "grey": 80,
    "na": 13
  },
  "items": [
    {
      "name": "Project Scaffolding",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "green",
      "check": "repo",
      "evidence": "ruff configured in pyproject.toml:22-26 (ruff format covers formatting); package layout under app/",
      "why": "Start from a standard layout, linter and formatter — not a blank folder.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Semantic Versioning",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "green",
      "check": "repo",
      "evidence": "version 0.2.0 in pyproject.toml:3 with CHANGELOG.md",
      "why": "Version from v0.1.0 so every release and rollback has a name.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Logging",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Observability & SRE",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "JSON logs via python-json-logger, app/__init__.py:14-19, used in app/routes.py:13; no secrets logged (the emails it logs are covered under PII Handling)",
      "why": "Structured logs from the first endpoint; never log secrets or PII.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Dependency Hell",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "uv.lock committed; a version range on every dependency in pyproject.toml:6-17; installs with uv sync --frozen (Dockerfile:5)",
      "why": "Dependency management: commit the lockfile, pin versions, add packages deliberately.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Secrets Management",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "SECRET_KEY and DATABASE_URL read from env (app/config.py:5-6); .env gitignored; .env.example has no values",
      "why": "Keys live in env vars or a secret store — never in git or frontend code.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "SQL Injection",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "SQLAlchemy ORM only, app/routes.py:46, :65 and :75; the only raw SQL is the constant SELECT 1 in /health (app/routes.py:19)",
      "why": "Parameterised queries or an ORM from the very first query.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "XSS",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "Jinja autoescaping in app/templates (Flask turns it on for .html files); no |safe or Markup",
      "why": "Let the framework escape output; avoid raw HTML injection.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Input Validation",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "Flask-WTF forms with validators (app/forms.py), checked with validate_on_submit in every POST handler (app/routes.py:28, :45 and :74)",
      "why": "Validate every request at the boundary with a schema (zod, pydantic).",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "AuthN & AuthZ Middleware",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "Flask-Login @login_required on the recipe routes (app/routes.py:62 and :71), and recipes filtered by current_user.id (app/routes.py:65)",
      "why": "Who you are and what you may do — enforced server-side on every route.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Testing",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "green",
      "check": "repo",
      "evidence": "pytest with sign-up and login tests, tests/test_auth.py",
      "why": "Test runner wired in; one small test for anything touching money, auth or parsing.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "CI/CD",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Delivery & deploys",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "ruff and pytest on every push, .github/workflows/ci.yml:10-12",
      "why": "Lint and test on every push; deploy from main, not your laptop.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Docker",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "green",
      "check": "repo",
      "evidence": "Dockerfile, with Python pinned in .python-version",
      "why": "Reproducible environments — or your platform's equivalent.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Monitoring",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Observability & SRE",
      "risk": 2,
      "status": "amber",
      "check": "repo+confirm",
      "evidence": "no error-tracking SDK in pyproject.toml",
      "why": "Error tracking and uptime visibility from day one.",
      "prompt": null,
      "confirm": "Check whether errors are tracked anywhere (Sentry or similar); if not, add sentry-sdk before launch.",
      "pulled_by": []
    },
    {
      "name": "Health Checks",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Failure handling",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "/health runs SELECT 1, app/routes.py:16-22; Fly checks it (fly.toml:13-17)",
      "why": "A /health endpoint that checks the app and its database.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Database Migrations",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L3",
      "group": "Data layer",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "Flask-Migrate, migrations/versions/0001_init.py; applied by the Fly release_command (fly.toml:5)",
      "why": "A migration tool (alembic, prisma migrate) before the first schema change.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "TLS",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo+confirm",
      "evidence": "provided by Fly.io, force_https in fly.toml:9",
      "why": "HTTPS everywhere — usually free from your host.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Backups",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Disaster recovery",
      "risk": 1,
      "status": "amber",
      "check": "confirm",
      "evidence": "no backup config found in repo; the database is only a DATABASE_URL (.env.example:2)",
      "why": "Automated backups before real data — and one tested restore.",
      "prompt": null,
      "confirm": "Check automated backups or point-in-time recovery are on for your Postgres, then restore one to a scratch database.",
      "pulled_by": []
    },
    {
      "name": "Rollbacks",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 2,
      "status": "amber",
      "check": "repo+confirm",
      "evidence": "Fly keeps earlier releases and the migration has a down step (migrations/versions/0001_init.py:32-34), but no rollback step is written down",
      "why": "Know your one-command rollback before launch; migrations make it harder.",
      "prompt": null,
      "confirm": "Add a Rollback section to README.md: redeploy the previous image with fly deploy --image, and note that the release_command only migrates forward.",
      "pulled_by": []
    },
    {
      "name": "DNS",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Networking",
      "risk": 2,
      "status": "amber",
      "check": "confirm",
      "evidence": "no custom domain in fly.toml",
      "why": "Domain and records set up before launch; lower TTLs before you change them.",
      "prompt": null,
      "confirm": "Point your domain at the Fly app (fly certs add), and lower the TTL a day before any change.",
      "pulled_by": []
    },
    {
      "name": "CDN",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Traffic & edge",
      "risk": 3,
      "status": "na",
      "check": "repo+confirm",
      "evidence": "no static assets: no static/ folder, pages are server-rendered HTML",
      "why": "Static assets from a CDN — most hosts include it.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "CORS",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "same-origin forms only; no flask-cors and no Access-Control headers",
      "why": "Replace the dev-time wildcard with an explicit allow-list.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Encryption in Transit",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo+confirm",
      "evidence": "sslmode=require on the Postgres connection, app/config.py:9",
      "why": "TLS between app, database and third-party services too.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Encryption at Rest",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "amber",
      "check": "confirm",
      "evidence": null,
      "why": "Confirm your database and storage encrypt at rest (managed ones usually do).",
      "prompt": null,
      "confirm": "Check your Postgres provider encrypts the database and its backups at rest.",
      "pulled_by": []
    },
    {
      "name": "CSRF",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "CSRFProtect on every form (app/__init__.py:12 and :28); session cookies Secure and SameSite=Lax (app/config.py:14-15)",
      "why": "Needed once cookie-based sessions go live; frameworks ship tokens.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "OAuth",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "no OAuth provider; email and password sign-in (app/routes.py:42-51)",
      "why": "Use a provider or library; validate state and redirect URIs.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "IAM",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "amber",
      "check": "confirm",
      "evidence": null,
      "why": "No root keys in production; least privilege for services and people.",
      "prompt": null,
      "confirm": "Your Fly deploy token and database user are scoped to this app, not an org owner or superuser, and each person has their own Fly login.",
      "pulled_by": []
    },
    {
      "name": "Feature Flags",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "red",
      "check": "repo",
      "evidence": "no flag library or flag module; looked for Flagsmith, GrowthBook, PostHog and env toggles",
      "why": "Ship dark and switch off a broken feature without a redeploy — worth it at any size.",
      "prompt": "Add a small app/flags.py backed by a `flags` table (name, enabled), and put adding recipes (new_recipe, app/routes.py:72) behind a `recipes_enabled` flag, so you can switch it off without a redeploy.",
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Timeouts",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Failure handling",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "Postgres connect_timeout and statement_timeout, app/config.py:10-11; no other outbound calls",
      "why": "Every outbound call — LLM APIs included — gets a timeout.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Retries",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Failure handling",
      "risk": 2,
      "status": "na",
      "check": "repo",
      "evidence": "no outbound HTTP calls",
      "why": "Retry only transient failures, and only operations that are safe to repeat.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Webhooks",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Async & messaging",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "no webhook routes",
      "why": "Verify signatures, respond fast, process async, expect duplicates.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Cron Jobs",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Async & messaging",
      "risk": 2,
      "status": "na",
      "check": "repo",
      "evidence": "no scheduled jobs",
      "why": "Scheduled jobs need logs, failure alerts and protection against overlapping runs.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Race Conditions",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Concurrency & runtime",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "unique constraint on users.email (migrations/versions/0001_init.py:16); other writes are single inserts (app/routes.py:34 and :75)",
      "why": "Double-clicks and concurrent requests — lean on DB constraints and transactions.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Database Indexing",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Data layer",
      "risk": 3,
      "status": "green",
      "check": "repo",
      "evidence": "index on recipes (user_id, created_at), migrations/versions/0001_init.py:29, matching app/routes.py:65",
      "why": "Index what you filter and join on before real data arrives.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "N+1 Queries",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Data layer",
      "risk": 3,
      "status": "green",
      "check": "repo",
      "evidence": "one query per page, app/routes.py:64-66; no queries inside loops",
      "why": "AI-written ORM code loves N+1 — check query counts per request.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Serverless Limits",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Scaling & performance",
      "risk": 2,
      "status": "na",
      "check": "repo",
      "evidence": "long-running server on Fly.io (fly.toml)",
      "why": "Function timeouts and payload caps — long LLM calls hit them first.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Server-Sent Events",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Real-time",
      "risk": 3,
      "status": "na",
      "check": "repo",
      "evidence": "no AI features and no streaming",
      "why": "The simple way to stream LLM tokens to the browser.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Alerts",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Observability & SRE",
      "risk": 2,
      "status": "amber",
      "check": "confirm",
      "evidence": "Fly health checks (fly.toml:13-17) restart a machine but don't alert you",
      "why": "Know it's down before your users tell you — start with an uptime ping.",
      "prompt": null,
      "confirm": "An uptime check hits /health on your Fly URL every few minutes and alerts your phone or email.",
      "pulled_by": []
    },
    {
      "name": "Reverse Proxies",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Traffic & edge",
      "risk": 2,
      "status": "na",
      "check": "repo",
      "evidence": "managed platform (Fly.io proxy in front, fly.toml)",
      "why": "If self-hosting: TLS termination, compression and buffering in front of the app.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "PII Handling",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Compliance",
      "risk": 1,
      "status": "red",
      "check": "repo+confirm",
      "evidence": "user emails written to the logs on sign-up and on every failed login, app/routes.py:36 and :50",
      "why": "Collect less, keep it out of logs, know where it lives.",
      "prompt": "Remove the email from the log calls at app/routes.py:36 and :50: log only user_id on sign-up, and nothing that identifies the person on a failed login. Keep email and display_name out of future log lines too.",
      "confirm": null,
      "pulled_by": [
        "Indian users",
        "Privacy-law regions"
      ]
    },
    {
      "name": "Tenant Isolation",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "single-tenant (you said so)",
      "why": "Every query scoped by tenant (row-level security on) — cross-tenant leaks are launch-day bugs.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Prompt Injection",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "no AI features (you said so)",
      "why": "Treat model input and output as untrusted; limit what tools can do.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "LLM Token Budgets",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Scaling & performance",
      "risk": 1,
      "status": "na",
      "check": "repo+confirm",
      "evidence": "no AI features (you said so)",
      "why": "Per-user caps and spend alerts so one user can't burn your bill.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Idempotency",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L3",
      "group": "Failure handling",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "no payments, webhooks or retried writes",
      "why": "Idempotency keys on payments, webhooks and anything that gets retried.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "SSRF",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L3",
      "group": "Security",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "no URL fetching",
      "why": "If you fetch user-supplied URLs (agents do), block internal addresses.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "GDPR & Privacy",
      "phase": "P2",
      "home_phase": "P4-B2C",
      "level": "L2",
      "group": "Compliance",
      "risk": 1,
      "status": "red",
      "check": "repo+confirm",
      "evidence": "no privacy policy page, no account deletion and no data export in app/routes.py",
      "why": "Consent, export and deletion at consumer scale.",
      "prompt": "Add a /privacy page (app/templates/privacy.html) saying what you store (email, name, recipes) and why, link it from app/templates/base.html and the sign-up form, and add a login-protected /account page in app/routes.py with Download my data (profile and recipes as JSON) and Delete my account (deletes their recipes and user row, then logs them out).",
      "confirm": null,
      "pulled_by": [
        "EU users",
        "Privacy-law regions"
      ]
    },
    {
      "name": "Accessibility (WCAG 2.1 AA)",
      "phase": "P2",
      "home_phase": "P4-B2C",
      "level": "L2",
      "group": "Compliance",
      "risk": 2,
      "status": "red",
      "check": "repo+confirm",
      "evidence": "sign-up inputs have placeholders but no labels, app/templates/signup.html:6-8; no a11y check in tests",
      "why": "A legal requirement for many EU consumer services.",
      "prompt": "Render a label for each field in app/templates/signup.html:6-8 ({{ form.email.label }} and so on, as app/templates/login.html already does), then add an axe check (pytest with Playwright and axe-core) for /signup, /login and / in tests/.",
      "confirm": null,
      "pulled_by": [
        "EU users"
      ]
    }
  ],
  "do_now": [
    "PII Handling",
    "GDPR & Privacy",
    "Accessibility (WCAG 2.1 AA)",
    "Feature Flags"
  ],
  "done_early": [],
  "coming_next": {
    "phase": "P3",
    "name": "Growth",
    "trigger": "real traffic, paying users or a second engineer — usually the first incident or the first \"it's slow\"",
    "top": [
      "Production Incidents",
      "Vertical Scaling",
      "Latency",
      "Throughput",
      "Metrics"
    ],
    "more": 33
  },
  "skip_for_now": [
    "Kubernetes",
    "Caching",
    "Message Queues",
    "Sharding",
    "Multi-Region Deployment"
  ]
}
```
