# Readiness check: taskboard-api

2026-10-21 · **P2 Pre-launch** · You're here because you said the first teams are about to use it, and the repo has auth (src/auth.js) and a production deploy chart (deploy/helm/taskboard).

Overrides: none apply.

| Do now | Confirm | In place | Not yet |
|---|---|---|---|
| 3 | 8 | 20 | 82 |

## Do now

### 1. CORS · L1
Evidence: cors() with no options allows every origin, src/app.js:13
Why: Replace the dev-time wildcard with an explicit allow-list.
Prompt for your agent:
> Replace app.use(cors()) at src/app.js:13 with cors({ origin: process.env.ALLOWED_ORIGINS.split(",") }), and add ALLOWED_ORIGINS to .env.example and deploy/helm/taskboard/values.yaml.

### 2. Encryption in Transit · L2
Evidence: TLS to Postgres with certificate checks turned off, ssl: { rejectUnauthorized: false } at src/db.js:5
Why: TLS between app, database and third-party services too.
Prompt for your agent:
> In src/db.js:5 set ssl to { rejectUnauthorized: true, ca: process.env.PG_CA_CERT } using your database provider's CA certificate, and add PG_CA_CERT to .env.example and the Helm values.

### 3. Feature Flags · L2
Evidence: no flag library or flag module; looked for Unleash, GrowthBook, PostHog and env toggles
Why: Ship dark and switch off a broken feature without a redeploy — worth it at any size.
Prompt for your agent:
> Add a small src/flags.js backed by a `flags` table (flag name, org_id, enabled), and put task comments (the newest feature, per CHANGELOG.md) behind a per-org flag, so you can switch it off for one team without a redeploy.

## Also missing

Nothing else is red.

## Confirm

These are partly done, or live outside the repo where the check can't see them.
Tick a box once you've checked, and the next run will count it as in place.

- [ ] **Backups** · Check automated backups or point-in-time recovery are on for your Postgres, then restore one to a scratch database. (no backup config found in repo or infra files)
- [ ] **DNS** · Point api.taskboard.example at the ingress, and lower the TTL a day before any change. (host set in deploy/helm/taskboard/values.yaml)
- [ ] **Encryption at Rest** · Check your Postgres volume or managed database encrypts at rest.
- [ ] **IAM** · The cluster and database use scoped credentials, not an owner or root account, and each person has their own login.
- [ ] **Alerts** · An uptime check hits https://api.taskboard.example/healthz every few minutes and alerts you.
- [ ] **Monitoring** · Check whether errors are tracked anywhere (Sentry or your cluster's logging); if not, add it before the first teams arrive. (no error-tracking SDK in package.json)
- [ ] **Rollbacks** · Add a Rollback section to README.md with the helm rollback command and which migrations can't be reversed. (helm rollback is available and the migration has a down step (migrations/1729000000000_init.js:17), but no rollback step is written down)
- [ ] **PII Handling** · Note where user emails and names are stored, and keep them out of logs. (users arrive as JWT claims (src/auth.js:8); there's no users table in this repo, so where personal data lives can't be seen here)

## In place

- **Project Scaffolding** · eslint.config.js and .prettierrc, with lint and format scripts in package.json
- **Semantic Versioning** · version 0.4.0 in package.json:3 with CHANGELOG.md; Chart.yaml appVersion matches
- **Logging** · pino with authorization headers redacted, src/logger.js:3; pino-http on every request, src/app.js:15
- **Dependency Hell** · package-lock.json committed; installs with npm ci (Dockerfile:4)
- **Secrets Management** · DATABASE_URL and JWT_SECRET read from env (src/db.js:4, src/auth.js:7); .env gitignored; .env.example has no values
- **SQL Injection** · $1 placeholders on every query, src/routes/tasks.js:11 and :21
- **Input Validation** · zod schema TaskIn, src/routes/tasks.js:7, checked at :18
- **AuthN & AuthZ Middleware** · requireUser JWT check on /tasks, src/app.js:26 (src/auth.js:3)
- **Testing** · node --test with supertest; auth test in test/health.test.js
- **CI/CD** · lint and test on every push, .github/workflows/ci.yml
- **Docker** · Dockerfile, with Node pinned in .nvmrc and engines
- **Health Checks** · /healthz runs select 1, src/app.js:17-24; used as readinessProbe in the Helm chart
- **Database Migrations** · node-pg-migrate, migrations/1729000000000_init.js
- **TLS** · cert-manager issuer and TLS block on the ingress, deploy/helm/taskboard/templates/ingress.yaml:6 and :9-11
- **Timeouts** · Postgres pool connectionTimeoutMillis, src/db.js:6; no other outbound calls
- **Race Conditions** · single-statement inserts, src/routes/tasks.js:20-23; no read-modify-write
- **Database Indexing** · index on tasks (org_id, created_at), migrations/1729000000000_init.js:14, matching src/routes/tasks.js:11
- **N+1 Queries** · one query per request, src/routes/tasks.js:10 and :20
- **Reverse Proxies** · ingress-nginx in front of the app, deploy/helm/taskboard/templates/ingress.yaml
- **Tenant Isolation** · every query filtered by org_id taken from the verified token (src/auth.js:8, src/routes/tasks.js:11 and :21)

## Done early

- **Kubernetes** (P4) · deploy/helm/taskboard/templates/deployment.yaml:1-2 · Kubernetes is usually a P4 budget decision. Do you need to run a cluster now, or would a managed host cover pre-launch with less upkeep?
- **Helm Charts** (P4) · deploy/helm/taskboard/Chart.yaml · Is someone keeping the chart's versions and values in step with each release?

## Coming next: P3 Growth

Starts with real traffic, paying users or a second engineer.
First up: Production Incidents, Vertical Scaling, Latency, Throughput, Metrics, and 33 more.

Skip for now: Caching, Message Queues, Sharding, Multi-Region Deployment, Event-Driven Architecture. None of these are needed in P2; 82 items in total can wait.

---

Roadmap based on a list of 111 production topics by {{ORIGINAL_POST_HANDLE}} (https://www.instagram.com/p/DehMUh_jdbK/) · Full roadmap: {{BLOCKSIMPLIFIED_ROADMAP_URL}}

## Machine state, don't edit by hand

```json
{
  "schema": 1,
  "skill_version": "0.1.0",
  "generated_on": "2026-10-21",
  "project": {
    "name": "taskboard-api",
    "stack": [
      "Node.js 20",
      "Express",
      "PostgreSQL (pg)",
      "Docker",
      "Helm / Kubernetes"
    ],
    "commit": null,
    "dirty": false
  },
  "answers": {
    "audience": "about_to_launch",
    "growth": [
      "none"
    ],
    "market": "b2b",
    "domains": [
      "none"
    ],
    "regions": [
      "us"
    ],
    "multi_tenant": "yes",
    "answered_on": "2026-10-21"
  },
  "phase": {
    "id": "P2",
    "name": "Pre-launch",
    "why": "You said the first teams are about to use it, and the repo has auth (src/auth.js) and a production deploy chart (deploy/helm/taskboard)."
  },
  "next_phase": {
    "id": "P3",
    "name": "Growth",
    "trigger": "real traffic, paying users or a second engineer — usually the first incident or the first \"it's slow\""
  },
  "overrides": [],
  "legal_note": false,
  "confirmations": {},
  "counts": {
    "red": 3,
    "amber": 8,
    "green": 20,
    "grey": 82,
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
      "evidence": "eslint.config.js and .prettierrc, with lint and format scripts in package.json",
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
      "evidence": "version 0.4.0 in package.json:3 with CHANGELOG.md; Chart.yaml appVersion matches",
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
      "evidence": "pino with authorization headers redacted, src/logger.js:3; pino-http on every request, src/app.js:15",
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
      "evidence": "package-lock.json committed; installs with npm ci (Dockerfile:4)",
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
      "evidence": "DATABASE_URL and JWT_SECRET read from env (src/db.js:4, src/auth.js:7); .env gitignored; .env.example has no values",
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
      "evidence": "$1 placeholders on every query, src/routes/tasks.js:11 and :21",
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
      "evidence": "zod schema TaskIn, src/routes/tasks.js:7, checked at :18",
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
      "evidence": "requireUser JWT check on /tasks, src/app.js:26 (src/auth.js:3)",
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
      "evidence": "node --test with supertest; auth test in test/health.test.js",
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
      "evidence": "lint and test on every push, .github/workflows/ci.yml",
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
      "evidence": "Dockerfile, with Node pinned in .nvmrc and engines",
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
      "evidence": "no error-tracking SDK in package.json",
      "why": "Error tracking and uptime visibility from day one.",
      "prompt": null,
      "confirm": "Check whether errors are tracked anywhere (Sentry or your cluster's logging); if not, add it before the first teams arrive.",
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
      "evidence": "/healthz runs select 1, src/app.js:17-24; used as readinessProbe in the Helm chart",
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
      "evidence": "node-pg-migrate, migrations/1729000000000_init.js",
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
      "evidence": "cert-manager issuer and TLS block on the ingress, deploy/helm/taskboard/templates/ingress.yaml:6 and :9-11",
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
      "evidence": "no backup config found in repo or infra files",
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
      "evidence": "helm rollback is available and the migration has a down step (migrations/1729000000000_init.js:17), but no rollback step is written down",
      "why": "Know your one-command rollback before launch; migrations make it harder.",
      "prompt": null,
      "confirm": "Add a Rollback section to README.md with the helm rollback command and which migrations can't be reversed.",
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
      "evidence": "host set in deploy/helm/taskboard/values.yaml",
      "why": "Domain and records set up before launch; lower TTLs before you change them.",
      "prompt": null,
      "confirm": "Point api.taskboard.example at the ingress, and lower the TTL a day before any change.",
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
      "status": "red",
      "check": "repo",
      "evidence": "cors() with no options allows every origin, src/app.js:13",
      "why": "Replace the dev-time wildcard with an explicit allow-list.",
      "prompt": "Replace app.use(cors()) at src/app.js:13 with cors({ origin: process.env.ALLOWED_ORIGINS.split(\",\") }), and add ALLOWED_ORIGINS to .env.example and deploy/helm/taskboard/values.yaml.",
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
      "status": "red",
      "check": "repo+confirm",
      "evidence": "TLS to Postgres with certificate checks turned off, ssl: { rejectUnauthorized: false } at src/db.js:5",
      "why": "TLS between app, database and third-party services too.",
      "prompt": "In src/db.js:5 set ssl to { rejectUnauthorized: true, ca: process.env.PG_CA_CERT } using your database provider's CA certificate, and add PG_CA_CERT to .env.example and the Helm values.",
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
      "confirm": "Check your Postgres volume or managed database encrypts at rest.",
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
      "evidence": "bearer tokens only, no cookie sessions (src/auth.js:4-5)",
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
      "evidence": "no OAuth sign-in in this service; JWTs are verified only (src/auth.js:7)",
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
      "confirm": "The cluster and database use scoped credentials, not an owner or root account, and each person has their own login.",
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
      "evidence": "no flag library or flag module; looked for Unleash, GrowthBook, PostHog and env toggles",
      "why": "Ship dark and switch off a broken feature without a redeploy — worth it at any size.",
      "prompt": "Add a small src/flags.js backed by a `flags` table (flag name, org_id, enabled), and put task comments (the newest feature, per CHANGELOG.md) behind a per-org flag, so you can switch it off for one team without a redeploy.",
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
      "evidence": "Postgres pool connectionTimeoutMillis, src/db.js:6; no other outbound calls",
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
      "evidence": "no scheduled jobs (no CronJob in the chart)",
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
      "evidence": "single-statement inserts, src/routes/tasks.js:20-23; no read-modify-write",
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
      "evidence": "index on tasks (org_id, created_at), migrations/1729000000000_init.js:14, matching src/routes/tasks.js:11",
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
      "evidence": "one query per request, src/routes/tasks.js:10 and :20",
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
      "evidence": "long-running server on Kubernetes",
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
      "evidence": null,
      "why": "Know it's down before your users tell you — start with an uptime ping.",
      "prompt": null,
      "confirm": "An uptime check hits https://api.taskboard.example/healthz every few minutes and alerts you.",
      "pulled_by": []
    },
    {
      "name": "Reverse Proxies",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Traffic & edge",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "ingress-nginx in front of the app, deploy/helm/taskboard/templates/ingress.yaml",
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
      "status": "amber",
      "check": "repo+confirm",
      "evidence": "users arrive as JWT claims (src/auth.js:8); there's no users table in this repo, so where personal data lives can't be seen here",
      "why": "Collect less, keep it out of logs, know where it lives.",
      "prompt": null,
      "confirm": "Note where user emails and names are stored, and keep them out of logs.",
      "pulled_by": []
    },
    {
      "name": "Tenant Isolation",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Security",
      "risk": 1,
      "status": "green",
      "check": "repo",
      "evidence": "every query filtered by org_id taken from the verified token (src/auth.js:8, src/routes/tasks.js:11 and :21)",
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
    "CORS",
    "Encryption in Transit",
    "Feature Flags"
  ],
  "done_early": [
    {
      "name": "Kubernetes",
      "phase": "P4",
      "evidence": "deploy/helm/taskboard/templates/deployment.yaml:1-2",
      "question": "Kubernetes is usually a P4 budget decision. Do you need to run a cluster now, or would a managed host cover pre-launch with less upkeep?"
    },
    {
      "name": "Helm Charts",
      "phase": "P4",
      "evidence": "deploy/helm/taskboard/Chart.yaml",
      "question": "Is someone keeping the chart's versions and values in step with each release?"
    }
  ],
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
    "Caching",
    "Message Queues",
    "Sharding",
    "Multi-Region Deployment",
    "Event-Driven Architecture"
  ]
}
```
