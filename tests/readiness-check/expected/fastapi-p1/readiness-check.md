# Readiness check: notes-api

2026-10-21 · **P1 Project setup** · You're here because you said it's just you for now, and the repo is a local FastAPI app on SQLite with no deploy config yet.

Overrides: none apply.

| Do now | Confirm | In place | Not yet |
|---|---|---|---|
| 7 | 4 | 6 | 95 |

## Do now

### 1. Secrets Management · L1
Evidence: SECRET_KEY hardcoded as a string in app/config.py:2 (DATABASE_URL too, app/config.py:1)
Why: Keys live in env vars or a secret store — never in git or frontend code.
Prompt for your agent:
> Read SECRET_KEY and DATABASE_URL from environment variables in app/config.py (fail at startup if SECRET_KEY is missing), add a .env.example with empty values, and add .env to .gitignore.

### 2. Dependency Hell · L1
Evidence: no lockfile (looked for uv.lock, poetry.lock and a pinned requirements.txt), and fastapi and uvicorn have no versions in pyproject.toml:6-8
Why: Dependency management: commit the lockfile, pin versions, add packages deliberately.
Prompt for your agent:
> Create and commit a lockfile with `uv lock` (or pip-tools), and give fastapi and uvicorn minimum versions in pyproject.toml:6-8.

### 3. AuthN & AuthZ Middleware · L2
Evidence: no auth dependency on any route; DELETE /notes/{note_id} (app/main.py:40) is open to anyone who can reach the API
Why: Who you are and what you may do — enforced server-side on every route.
Prompt for your agent:
> Add an auth dependency in app/auth.py (an API key from an env var is enough while it's just you; swap in real user auth later) and apply it to every route in app/main.py with Depends, so list, create and delete all require it.

### 4. CI/CD · L2
Evidence: no CI config (looked for .github/workflows, .gitlab-ci.yml and others)
Why: Lint and test on every push; deploy from main, not your laptop.
Prompt for your agent:
> Add .github/workflows/ci.yml that installs with uv, runs `ruff check` and `pytest` on every push and pull request.

### 5. Health Checks · L2
Evidence: no /health route in app/main.py
Why: A /health endpoint that checks the app and its database.
Prompt for your agent:
> Add GET /health to app/main.py that runs `SELECT 1` through a session and returns {"ok": true}, or 503 if the database call fails.

## Also missing

- **Testing** · L2 · no test runner: no pytest in pyproject.toml, no tests/ folder Prompt: Add pytest and httpx as dev dependencies and write tests/test_notes.py with FastAPI's TestClient: create a note, list it, delete it, and check a missing note returns 404.
- **Docker** · L2 · no Dockerfile or compose file, and no .python-version Prompt: Add a .python-version (3.11) and a small Dockerfile that installs from the lockfile and runs `uvicorn app.main:app --host 0.0.0.0`.

## Confirm

These are partly done, or live outside the repo where the check can't see them.
Tick a box once you've checked, and the next run will count it as in place.

- [ ] **Semantic Versioning** · Tag v0.1.0 or start a CHANGELOG.md, so every release has a name. (version 0.1.0 in pyproject.toml:3; no CHANGELOG.md or release tags)
- [ ] **Logging** · Switch print() to the logging module (or structlog) with one shared config. (print() only, app/main.py:36; no logging config)
- [ ] **Monitoring** · Add error tracking (sentry-sdk or similar) once it runs anywhere other than your laptop. (no error-tracking SDK in pyproject.toml)
- [ ] **Database Migrations** · Set up alembic before your first schema change; create_all won't change existing tables. (schema created by Base.metadata.create_all at startup, app/main.py:8; no alembic)

## In place

- **Project Scaffolding** · ruff configured in pyproject.toml:11-15 (ruff format covers formatting); package layout under app/
- **SQL Injection** · SQLAlchemy ORM only, app/main.py:28, :33 and :42; no raw SQL
- **Input Validation** · pydantic model NoteIn (app/main.py:13) on POST /notes (app/main.py:31)
- **Race Conditions** · simple inserts and deletes in one transaction each, app/main.py:33-35 and :45-46; no read-modify-write
- **Database Indexing** · lookups by primary key only, app/main.py:42
- **N+1 Queries** · no relationships and no queries inside loops (app/main.py:28)

## Coming next: P2 Pre-launch

Starts when someone other than you is about to use it, or real data is about to go in.
First up: TLS, Backups, Rollbacks, DNS, CORS, and 8 more.

Skip for now: Kubernetes, Caching, Message Queues, Sharding, Multi-Region Deployment. None of these are needed in P1; 95 items in total can wait.

---

Roadmap based on a list of 111 production topics by {{ORIGINAL_POST_HANDLE}} (https://www.instagram.com/p/DehMUh_jdbK/) · Full roadmap: {{BLOCKSIMPLIFIED_ROADMAP_URL}}

## Machine state, don't edit by hand

```json
{
  "schema": 1,
  "skill_version": "0.1.0",
  "generated_on": "2026-10-21",
  "project": {
    "name": "notes-api",
    "stack": [
      "Python 3.11",
      "FastAPI",
      "SQLAlchemy 2",
      "SQLite"
    ]
  },
  "answers": {
    "audience": "just_me",
    "growth": [
      "none"
    ],
    "market": "not_sure",
    "domains": [
      "none"
    ],
    "regions": [
      "us",
      "elsewhere"
    ],
    "multi_tenant": "no",
    "answered_on": "2026-10-21"
  },
  "phase": {
    "id": "P1",
    "name": "Project setup",
    "why": "You said it's just you for now, and the repo is a local FastAPI app on SQLite with no deploy config yet."
  },
  "next_phase": {
    "id": "P2",
    "name": "Pre-launch",
    "trigger": "someone other than you is about to use it, or real data is about to go in"
  },
  "overrides": [],
  "legal_note": false,
  "confirmations": {},
  "counts": {
    "red": 7,
    "amber": 4,
    "green": 6,
    "grey": 95,
    "na": 14
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
      "evidence": "ruff configured in pyproject.toml:11-15 (ruff format covers formatting); package layout under app/",
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
      "status": "amber",
      "check": "repo",
      "evidence": "version 0.1.0 in pyproject.toml:3; no CHANGELOG.md or release tags",
      "why": "Version from v0.1.0 so every release and rollback has a name.",
      "prompt": null,
      "confirm": "Tag v0.1.0 or start a CHANGELOG.md, so every release has a name.",
      "pulled_by": []
    },
    {
      "name": "Logging",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Observability & SRE",
      "risk": 2,
      "status": "amber",
      "check": "repo",
      "evidence": "print() only, app/main.py:36; no logging config",
      "why": "Structured logs from the first endpoint; never log secrets or PII.",
      "prompt": null,
      "confirm": "Switch print() to the logging module (or structlog) with one shared config.",
      "pulled_by": []
    },
    {
      "name": "Dependency Hell",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 2,
      "status": "red",
      "check": "repo",
      "evidence": "no lockfile (looked for uv.lock, poetry.lock and a pinned requirements.txt), and fastapi and uvicorn have no versions in pyproject.toml:6-8",
      "why": "Dependency management: commit the lockfile, pin versions, add packages deliberately.",
      "prompt": "Create and commit a lockfile with `uv lock` (or pip-tools), and give fastapi and uvicorn minimum versions in pyproject.toml:6-8.",
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
      "status": "red",
      "check": "repo",
      "evidence": "SECRET_KEY hardcoded as a string in app/config.py:2 (DATABASE_URL too, app/config.py:1)",
      "why": "Keys live in env vars or a secret store — never in git or frontend code.",
      "prompt": "Read SECRET_KEY and DATABASE_URL from environment variables in app/config.py (fail at startup if SECRET_KEY is missing), add a .env.example with empty values, and add .env to .gitignore.",
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
      "evidence": "SQLAlchemy ORM only, app/main.py:28, :33 and :42; no raw SQL",
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
      "status": "na",
      "check": "repo",
      "evidence": "JSON API; renders no HTML",
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
      "evidence": "pydantic model NoteIn (app/main.py:13) on POST /notes (app/main.py:31)",
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
      "status": "red",
      "check": "repo",
      "evidence": "no auth dependency on any route; DELETE /notes/{note_id} (app/main.py:40) is open to anyone who can reach the API",
      "why": "Who you are and what you may do — enforced server-side on every route.",
      "prompt": "Add an auth dependency in app/auth.py (an API key from an env var is enough while it's just you; swap in real user auth later) and apply it to every route in app/main.py with Depends, so list, create and delete all require it.",
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
      "status": "red",
      "check": "repo",
      "evidence": "no test runner: no pytest in pyproject.toml, no tests/ folder",
      "why": "Test runner wired in; one small test for anything touching money, auth or parsing.",
      "prompt": "Add pytest and httpx as dev dependencies and write tests/test_notes.py with FastAPI's TestClient: create a note, list it, delete it, and check a missing note returns 404.",
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
      "status": "red",
      "check": "repo",
      "evidence": "no CI config (looked for .github/workflows, .gitlab-ci.yml and others)",
      "why": "Lint and test on every push; deploy from main, not your laptop.",
      "prompt": "Add .github/workflows/ci.yml that installs with uv, runs `ruff check` and `pytest` on every push and pull request.",
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
      "status": "red",
      "check": "repo",
      "evidence": "no Dockerfile or compose file, and no .python-version",
      "why": "Reproducible environments — or your platform's equivalent.",
      "prompt": "Add a .python-version (3.11) and a small Dockerfile that installs from the lockfile and runs `uvicorn app.main:app --host 0.0.0.0`.",
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
      "confirm": "Add error tracking (sentry-sdk or similar) once it runs anywhere other than your laptop.",
      "pulled_by": []
    },
    {
      "name": "Health Checks",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Failure handling",
      "risk": 2,
      "status": "red",
      "check": "repo",
      "evidence": "no /health route in app/main.py",
      "why": "A /health endpoint that checks the app and its database.",
      "prompt": "Add GET /health to app/main.py that runs `SELECT 1` through a session and returns {\"ok\": true}, or 503 if the database call fails.",
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
      "status": "amber",
      "check": "repo",
      "evidence": "schema created by Base.metadata.create_all at startup, app/main.py:8; no alembic",
      "why": "A migration tool (alembic, prisma migrate) before the first schema change.",
      "prompt": null,
      "confirm": "Set up alembic before your first schema change; create_all won't change existing tables.",
      "pulled_by": []
    },
    {
      "name": "TLS",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "grey",
      "check": "repo+confirm",
      "evidence": null,
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
      "status": "grey",
      "check": "confirm",
      "evidence": null,
      "why": "Automated backups before real data — and one tested restore.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Rollbacks",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 2,
      "status": "grey",
      "check": "repo+confirm",
      "evidence": null,
      "why": "Know your one-command rollback before launch; migrations make it harder.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "DNS",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Networking",
      "risk": 2,
      "status": "grey",
      "check": "confirm",
      "evidence": null,
      "why": "Domain and records set up before launch; lower TTLs before you change them.",
      "prompt": null,
      "confirm": null,
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
      "evidence": "API only; no static assets",
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
      "status": "grey",
      "check": "repo",
      "evidence": null,
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
      "status": "grey",
      "check": "repo+confirm",
      "evidence": null,
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
      "status": "grey",
      "check": "confirm",
      "evidence": null,
      "why": "Confirm your database and storage encrypt at rest (managed ones usually do).",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "CSRF",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "na",
      "check": "repo",
      "evidence": "no cookie sessions",
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
      "evidence": "no OAuth sign-in",
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
      "status": "grey",
      "check": "confirm",
      "evidence": null,
      "why": "No root keys in production; least privilege for services and people.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Feature Flags",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "grey",
      "check": "repo",
      "evidence": null,
      "why": "Ship dark and switch off a broken feature without a redeploy — worth it at any size.",
      "prompt": null,
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
      "status": "na",
      "check": "repo",
      "evidence": "no outbound calls",
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
      "evidence": "no outbound calls",
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
      "evidence": "simple inserts and deletes in one transaction each, app/main.py:33-35 and :45-46; no read-modify-write",
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
      "evidence": "lookups by primary key only, app/main.py:42",
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
      "evidence": "no relationships and no queries inside loops (app/main.py:28)",
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
      "status": "grey",
      "check": "repo",
      "evidence": null,
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
      "status": "grey",
      "check": "confirm",
      "evidence": null,
      "why": "Know it's down before your users tell you — start with an uptime ping.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
    },
    {
      "name": "Reverse Proxies",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Traffic & edge",
      "risk": 2,
      "status": "grey",
      "check": "repo",
      "evidence": null,
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
      "status": "grey",
      "check": "repo+confirm",
      "evidence": null,
      "why": "Collect less, keep it out of logs, know where it lives.",
      "prompt": null,
      "confirm": null,
      "pulled_by": []
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
    }
  ],
  "do_now": [
    "Secrets Management",
    "Dependency Hell",
    "AuthN & AuthZ Middleware",
    "CI/CD",
    "Health Checks"
  ],
  "done_early": [],
  "coming_next": {
    "phase": "P2",
    "name": "Pre-launch",
    "trigger": "someone other than you is about to use it, or real data is about to go in",
    "top": [
      "TLS",
      "Backups",
      "Rollbacks",
      "DNS",
      "CORS"
    ],
    "more": 8
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
