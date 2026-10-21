# Readiness check: chatnest

2026-10-21 · **P2 Pre-launch** · You're here because you said people are about to use it, and the repo has sign-in (components/Login.tsx) and a Vercel deploy (vercel.json).

Overrides: **AI features** (calls OpenAI from components/Chat.tsx and app/api/title/route.ts) · **EU users** (you said you have users in the EU)

- AI features: One unprotected endpoint calling a paid model can run up a bill overnight — rate limiting moves up from P3.
- EU users: EAA has applied since 28 Jun 2025 (WCAG 2.1 AA via EN 301 549); micro-enterprises are exempt.
- Not legal advice.

| Do now | Confirm | In place | Not yet |
|---|---|---|---|
| 11 | 16 | 12 | 79 |

## Do now

### 1. Secrets Management · L1
Evidence: OpenAI key in a browser-exposed variable: NEXT_PUBLIC_OPENAI_API_KEY used in a client component with dangerouslyAllowBrowser, components/Chat.tsx:7-8 (also .env.example:3)
Why: Keys live in env vars or a secret store — never in git or frontend code.
Prompt for your agent:
> Move the OpenAI key server-side: rename NEXT_PUBLIC_OPENAI_API_KEY to OPENAI_API_KEY in .env.example and in Vercel, delete the OpenAI client from components/Chat.tsx, add app/api/chat/route.ts that creates the client from process.env.OPENAI_API_KEY and returns the reply, and call that route from send() in components/Chat.tsx. Then remind me to rotate the old key, because it has already shipped to browsers.

### 2. Rate Limiting · L1
Evidence: no rate limit on the POST handler at app/api/title/route.ts:8, and the chat call runs in the browser where it can't be limited (components/Chat.tsx:29); looked for @upstash/ratelimit, middleware.ts and firewall rules in vercel.json
Why: Protect endpoints from abuse and runaway clients — auth endpoints first.
Prompt for your agent:
> After moving the chat call into app/api/chat/route.ts, add @upstash/ratelimit to that route and to app/api/title/route.ts: 20 requests per minute per signed-in user (falling back to IP), returning 429 with a Retry-After header.

### 3. AuthN & AuthZ Middleware · L2
Evidence: row-level security turned off on public.messages, supabase/migrations/20261001120000_init.sql:11, while the browser holds the anon key (lib/supabase.ts:5), so anyone can read every conversation; no middleware.ts and no auth check in app/api/title/route.ts
Why: Who you are and what you may do — enforced server-side on every route.
Prompt for your agent:
> Add a new migration in supabase/migrations that runs `alter table public.messages enable row level security`, makes user_id not null, and adds policies so a user can only select and insert rows where user_id = auth.uid(). Then add a Supabase session check to app/api/title/route.ts so only signed-in users can call it.

### 4. LLM Token Budgets · L2
Evidence: no max_tokens on either call (components/Chat.tsx:29, app/api/title/route.ts:14) and no per-user usage tracking
Why: Per-user caps and spend alerts so one user can't burn your bill.
Prompt for your agent:
> Set max_tokens on both OpenAI calls (the chat call once it's in app/api/chat/route.ts, and app/api/title/route.ts:14), add a `usage` table keyed by user_id that the server routes update from res.usage.total_tokens, and refuse requests once a user passes a daily cap. Also set a monthly spend limit in the OpenAI dashboard.

### 5. GDPR & Privacy · L2
Evidence: no privacy policy page, no account deletion and no data export under app/
Why: Consent, export and deletion at consumer scale.
Prompt for your agent:
> Add app/privacy/page.tsx with a plain privacy policy (what you store, and that chat text goes to OpenAI), link it from app/layout.tsx, and add app/api/account/route.ts with DELETE (removes the user's messages and auth user using a server-only service-role client) and GET (exports their messages as JSON).

## Also missing

- **Health Checks** · L2 · no health route under app/api (only app/api/title/route.ts) Prompt: Add app/api/health/route.ts with a GET handler that runs a cheap Supabase query (count on messages with head: true) and returns 200 or 503 as JSON.
- **Timeouts** · L2 · no timeout on either OpenAI client, components/Chat.tsx:6 and app/api/title/route.ts:4 (the SDK default is 10 minutes) Prompt: Pass `timeout: 30_000` to the OpenAI client in app/api/title/route.ts:4 and in the new app/api/chat/route.ts, and return a friendly 504 JSON error when a call times out.
- **Accessibility (WCAG 2.1 AA)** · L2 · inputs without labels: the email field (components/Login.tsx:14, placeholder only) and the message field (components/Chat.tsx:49); no a11y lint or axe check Prompt: Add visible labels (or aria-label) to the email input in components/Login.tsx:14 and the message input in components/Chat.tsx:49, add eslint-plugin-jsx-a11y to .eslintrc.json, and fix what it reports.
- **Testing** · L2 · no test runner: no test script in package.json, no vitest, jest or playwright, no *.test.* files Prompt: Set up Vitest with a `test` script in package.json and write one test for the body validation in app/api/title/route.ts: a valid body, an empty body and a 2,001-character body.
- **Feature Flags** · L2 · no flag library or flag module; looked for PostHog, GrowthBook, @vercel/flags and env toggles Prompt: Add a small lib/flags.ts that reads flags from a Supabase `flags` table, and put the AI call in send() (components/Chat.tsx:29) behind a `chat_enabled` flag, so you can switch the AI off without a redeploy if costs spike.
- **Database Indexing** · L2 · no index on messages.user_id or created_at (supabase/migrations/20261001120000_init.sql:2-8), and every chat load orders by created_at (components/Chat.tsx:21) Prompt: Add a migration in supabase/migrations that creates an index on public.messages (user_id, created_at), matching the query in components/Chat.tsx:18-21 once it filters by user.

## Confirm

These are partly done, or live outside the repo where the check can't see them.
Tick a box once you've checked, and the next run will count it as in place.

- [ ] **Backups** · In the Supabase dashboard, check daily backups or point-in-time recovery are on for your plan, then restore one to a scratch project. (no backup config found in repo; Supabase handles this per plan)
- [ ] **DNS** · Point your domain at Vercel, and lower the TTL a day before any change. (no custom domain in vercel.json)
- [ ] **Encryption at Rest** · Usually on by default for Supabase; check your plan's security page.
- [ ] **IAM** · Only the anon key reaches the browser, no service-role key sits in Vercel unless a route needs it, and everyone has their own login on Supabase, OpenAI and Vercel.
- [ ] **Alerts** · Set up an uptime check on your Vercel URL (on /api/health once it exists) that alerts your phone or email.
- [ ] **Project Scaffolding** · Add Prettier or Biome so formatting is automatic. (.eslintrc.json and strict tsconfig.json; no formatter config)
- [ ] **Semantic Versioning** · Tag releases (v0.1.0) or keep a CHANGELOG.md so every rollback has a name. (version 0.1.0 in package.json:3; no CHANGELOG.md or release tags)
- [ ] **Logging** · Switch to a structured logger (pino) before launch, and keep chat text out of it. (console.log only, app/api/title/route.ts:13; no structured logger)
- [ ] **CI/CD** · Add a GitHub Actions workflow that runs npm run lint, and tests once you have them, on every push. (deploys through Vercel's git integration (vercel.json); nothing runs lint or tests on push)
- [ ] **Docker** · Pin Node with an .nvmrc or an engines field so local and Vercel match. (platform is Vercel (vercel.json); Node version not pinned (no .nvmrc or engines field))
- [ ] **Monitoring** · Check whether error tracking (Sentry or similar) is set up anywhere; if not, add it before launch. (no error-tracking SDK in package.json)
- [ ] **Rollbacks** · Add one line to README.md on how to promote the previous Vercel deployment. (Vercel supports instant rollback; nothing written down)
- [ ] **Serverless Limits** · When the chat call moves server-side, set maxDuration on that route and stream the reply. (Vercel default function limits; app/api/title/route.ts has no maxDuration (fine for a 4-word title))
- [ ] **Server-Sent Events** · Fine for short replies; stream once answers get long. (the chat reply arrives in one block, components/Chat.tsx:29-34)
- [ ] **PII Handling** · Decide what you tell users about chat text going to OpenAI, and check your OpenAI data-retention settings. (emails via Supabase Auth; chat text, which can hold personal details, goes to OpenAI (components/Chat.tsx:29))
- [ ] **Prompt Injection** · Look again the day you give the model tools or let it fetch URLs. (plain chat, no tools; user text stays in user messages (components/Chat.tsx:31, app/api/title/route.ts:18), so impact is low today)

## In place

- **Dependency Hell** · package-lock.json committed; no * or latest versions in package.json
- **SQL Injection** · Supabase query builder only, components/Chat.tsx:18-22 and :36; no raw SQL in app code
- **XSS** · React escapes message text ({m.content}, components/Chat.tsx); no dangerouslySetInnerHTML
- **Input Validation** · zod schema on the only API route, app/api/title/route.ts:6, checked at :9
- **Database Migrations** · supabase/migrations/20261001120000_init.sql
- **TLS** · provided by Vercel (vercel.json)
- **CDN** · provided by Vercel (vercel.json)
- **CORS** · same-origin API route only; no CORS headers in next.config.mjs or app/api/title/route.ts
- **Encryption in Transit** · Supabase and OpenAI SDKs use HTTPS (lib/supabase.ts:3, app/api/title/route.ts:4)
- **Retries** · OpenAI SDK default retries on both clients (components/Chat.tsx:6, app/api/title/route.ts:4); no custom retry loops
- **Race Conditions** · insert-only writes, components/Chat.tsx:36; no read-modify-write
- **N+1 Queries** · one query per page load, components/Chat.tsx:18-22; no queries inside loops

## Coming next: P3 Growth

Starts with real traffic, paying users or a second engineer.
First up: Production Incidents, Vertical Scaling, Latency, Throughput, Metrics, and 32 more.

Skip for now: Kubernetes, Caching, Message Queues, Sharding, Multi-Region Deployment. None of these are needed in P2; 79 items in total can wait.

---

Roadmap based on a list of 111 production topics by {{ORIGINAL_POST_HANDLE}} (https://www.instagram.com/p/DehMUh_jdbK/) · Full roadmap: {{BLOCKSIMPLIFIED_ROADMAP_URL}}

## Machine state, don't edit by hand

```json
{
  "schema": 1,
  "skill_version": "0.1.0",
  "generated_on": "2026-10-21",
  "project": {
    "name": "chatnest",
    "stack": [
      "Next.js 14 (App Router)",
      "TypeScript",
      "Supabase",
      "OpenAI SDK",
      "Vercel"
    ]
  },
  "answers": {
    "audience": "about_to_launch",
    "growth": [
      "none"
    ],
    "market": "b2c",
    "domains": [
      "ai"
    ],
    "regions": [
      "eu",
      "us"
    ],
    "multi_tenant": "no",
    "answered_on": "2026-10-21"
  },
  "phase": {
    "id": "P2",
    "name": "Pre-launch",
    "why": "You said people are about to use it, and the repo has sign-in (components/Login.tsx) and a Vercel deploy (vercel.json)."
  },
  "next_phase": {
    "id": "P3",
    "name": "Growth",
    "trigger": "real traffic, paying users or a second engineer — usually the first incident or the first \"it's slow\""
  },
  "overrides": [
    {
      "key": "AI features",
      "reason": "calls OpenAI from components/Chat.tsx and app/api/title/route.ts",
      "pulls": [
        "Rate Limiting",
        "LLM Token Budgets",
        "Prompt Injection",
        "Timeouts",
        "Serverless Limits",
        "SSRF",
        "Server-Sent Events"
      ],
      "extra": "One unprotected endpoint calling a paid model can run up a bill overnight — rate limiting moves up from P3."
    },
    {
      "key": "EU users",
      "reason": "you said you have users in the EU",
      "pulls": [
        "GDPR & Privacy",
        "Accessibility (WCAG 2.1 AA)"
      ],
      "extra": "EAA has applied since 28 Jun 2025 (WCAG 2.1 AA via EN 301 549); micro-enterprises are exempt."
    }
  ],
  "legal_note": true,
  "confirmations": {},
  "counts": {
    "red": 11,
    "amber": 16,
    "green": 12,
    "grey": 79,
    "na": 8
  },
  "items": [
    {
      "name": "Project Scaffolding",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "amber",
      "check": "repo",
      "evidence": ".eslintrc.json and strict tsconfig.json; no formatter config",
      "why": "Start from a standard layout, linter and formatter — not a blank folder.",
      "prompt": null,
      "confirm": "Add Prettier or Biome so formatting is automatic.",
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
      "evidence": "version 0.1.0 in package.json:3; no CHANGELOG.md or release tags",
      "why": "Version from v0.1.0 so every release and rollback has a name.",
      "prompt": null,
      "confirm": "Tag releases (v0.1.0) or keep a CHANGELOG.md so every rollback has a name.",
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
      "evidence": "console.log only, app/api/title/route.ts:13; no structured logger",
      "why": "Structured logs from the first endpoint; never log secrets or PII.",
      "prompt": null,
      "confirm": "Switch to a structured logger (pino) before launch, and keep chat text out of it.",
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
      "evidence": "package-lock.json committed; no * or latest versions in package.json",
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
      "status": "red",
      "check": "repo",
      "evidence": "OpenAI key in a browser-exposed variable: NEXT_PUBLIC_OPENAI_API_KEY used in a client component with dangerouslyAllowBrowser, components/Chat.tsx:7-8 (also .env.example:3)",
      "why": "Keys live in env vars or a secret store — never in git or frontend code.",
      "prompt": "Move the OpenAI key server-side: rename NEXT_PUBLIC_OPENAI_API_KEY to OPENAI_API_KEY in .env.example and in Vercel, delete the OpenAI client from components/Chat.tsx, add app/api/chat/route.ts that creates the client from process.env.OPENAI_API_KEY and returns the reply, and call that route from send() in components/Chat.tsx. Then remind me to rotate the old key, because it has already shipped to browsers.",
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
      "evidence": "Supabase query builder only, components/Chat.tsx:18-22 and :36; no raw SQL in app code",
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
      "evidence": "React escapes message text ({m.content}, components/Chat.tsx); no dangerouslySetInnerHTML",
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
      "evidence": "zod schema on the only API route, app/api/title/route.ts:6, checked at :9",
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
      "evidence": "row-level security turned off on public.messages, supabase/migrations/20261001120000_init.sql:11, while the browser holds the anon key (lib/supabase.ts:5), so anyone can read every conversation; no middleware.ts and no auth check in app/api/title/route.ts",
      "why": "Who you are and what you may do — enforced server-side on every route.",
      "prompt": "Add a new migration in supabase/migrations that runs `alter table public.messages enable row level security`, makes user_id not null, and adds policies so a user can only select and insert rows where user_id = auth.uid(). Then add a Supabase session check to app/api/title/route.ts so only signed-in users can call it.",
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
      "evidence": "no test runner: no test script in package.json, no vitest, jest or playwright, no *.test.* files",
      "why": "Test runner wired in; one small test for anything touching money, auth or parsing.",
      "prompt": "Set up Vitest with a `test` script in package.json and write one test for the body validation in app/api/title/route.ts: a valid body, an empty body and a 2,001-character body.",
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
      "status": "amber",
      "check": "repo",
      "evidence": "deploys through Vercel's git integration (vercel.json); nothing runs lint or tests on push",
      "why": "Lint and test on every push; deploy from main, not your laptop.",
      "prompt": null,
      "confirm": "Add a GitHub Actions workflow that runs npm run lint, and tests once you have them, on every push.",
      "pulled_by": []
    },
    {
      "name": "Docker",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L2",
      "group": "Delivery & deploys",
      "risk": 3,
      "status": "amber",
      "check": "repo",
      "evidence": "platform is Vercel (vercel.json); Node version not pinned (no .nvmrc or engines field)",
      "why": "Reproducible environments — or your platform's equivalent.",
      "prompt": null,
      "confirm": "Pin Node with an .nvmrc or an engines field so local and Vercel match.",
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
      "confirm": "Check whether error tracking (Sentry or similar) is set up anywhere; if not, add it before launch.",
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
      "evidence": "no health route under app/api (only app/api/title/route.ts)",
      "why": "A /health endpoint that checks the app and its database.",
      "prompt": "Add app/api/health/route.ts with a GET handler that runs a cheap Supabase query (count on messages with head: true) and returns 200 or 503 as JSON.",
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
      "evidence": "supabase/migrations/20261001120000_init.sql",
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
      "evidence": "provided by Vercel (vercel.json)",
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
      "evidence": "no backup config found in repo; Supabase handles this per plan",
      "why": "Automated backups before real data — and one tested restore.",
      "prompt": null,
      "confirm": "In the Supabase dashboard, check daily backups or point-in-time recovery are on for your plan, then restore one to a scratch project.",
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
      "evidence": "Vercel supports instant rollback; nothing written down",
      "why": "Know your one-command rollback before launch; migrations make it harder.",
      "prompt": null,
      "confirm": "Add one line to README.md on how to promote the previous Vercel deployment.",
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
      "evidence": "no custom domain in vercel.json",
      "why": "Domain and records set up before launch; lower TTLs before you change them.",
      "prompt": null,
      "confirm": "Point your domain at Vercel, and lower the TTL a day before any change.",
      "pulled_by": []
    },
    {
      "name": "CDN",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L1",
      "group": "Traffic & edge",
      "risk": 3,
      "status": "green",
      "check": "repo+confirm",
      "evidence": "provided by Vercel (vercel.json)",
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
      "evidence": "same-origin API route only; no CORS headers in next.config.mjs or app/api/title/route.ts",
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
      "evidence": "Supabase and OpenAI SDKs use HTTPS (lib/supabase.ts:3, app/api/title/route.ts:4)",
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
      "confirm": "Usually on by default for Supabase; check your plan's security page.",
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
      "evidence": "no cookie sessions: supabase-js keeps the session in local storage (lib/supabase.ts:3)",
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
      "evidence": "no OAuth provider; magic-link sign-in (components/Login.tsx:9)",
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
      "confirm": "Only the anon key reaches the browser, no service-role key sits in Vercel unless a route needs it, and everyone has their own login on Supabase, OpenAI and Vercel.",
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
      "evidence": "no flag library or flag module; looked for PostHog, GrowthBook, @vercel/flags and env toggles",
      "why": "Ship dark and switch off a broken feature without a redeploy — worth it at any size.",
      "prompt": "Add a small lib/flags.ts that reads flags from a Supabase `flags` table, and put the AI call in send() (components/Chat.tsx:29) behind a `chat_enabled` flag, so you can switch the AI off without a redeploy if costs spike.",
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
      "status": "red",
      "check": "repo",
      "evidence": "no timeout on either OpenAI client, components/Chat.tsx:6 and app/api/title/route.ts:4 (the SDK default is 10 minutes)",
      "why": "Every outbound call — LLM APIs included — gets a timeout.",
      "prompt": "Pass `timeout: 30_000` to the OpenAI client in app/api/title/route.ts:4 and in the new app/api/chat/route.ts, and return a friendly 504 JSON error when a call times out.",
      "confirm": null,
      "pulled_by": [
        "AI features"
      ]
    },
    {
      "name": "Retries",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Failure handling",
      "risk": 2,
      "status": "green",
      "check": "repo",
      "evidence": "OpenAI SDK default retries on both clients (components/Chat.tsx:6, app/api/title/route.ts:4); no custom retry loops",
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
      "evidence": "no scheduled jobs (no crons in vercel.json)",
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
      "evidence": "insert-only writes, components/Chat.tsx:36; no read-modify-write",
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
      "status": "red",
      "check": "repo",
      "evidence": "no index on messages.user_id or created_at (supabase/migrations/20261001120000_init.sql:2-8), and every chat load orders by created_at (components/Chat.tsx:21)",
      "why": "Index what you filter and join on before real data arrives.",
      "prompt": "Add a migration in supabase/migrations that creates an index on public.messages (user_id, created_at), matching the query in components/Chat.tsx:18-21 once it filters by user.",
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
      "evidence": "one query per page load, components/Chat.tsx:18-22; no queries inside loops",
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
      "status": "amber",
      "check": "repo",
      "evidence": "Vercel default function limits; app/api/title/route.ts has no maxDuration (fine for a 4-word title)",
      "why": "Function timeouts and payload caps — long LLM calls hit them first.",
      "prompt": null,
      "confirm": "When the chat call moves server-side, set maxDuration on that route and stream the reply.",
      "pulled_by": [
        "AI features"
      ]
    },
    {
      "name": "Server-Sent Events",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Real-time",
      "risk": 3,
      "status": "amber",
      "check": "repo",
      "evidence": "the chat reply arrives in one block, components/Chat.tsx:29-34",
      "why": "The simple way to stream LLM tokens to the browser.",
      "prompt": null,
      "confirm": "Fine for short replies; stream once answers get long.",
      "pulled_by": [
        "AI features"
      ]
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
      "confirm": "Set up an uptime check on your Vercel URL (on /api/health once it exists) that alerts your phone or email.",
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
      "evidence": "managed platform (Vercel)",
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
      "evidence": "emails via Supabase Auth; chat text, which can hold personal details, goes to OpenAI (components/Chat.tsx:29)",
      "why": "Collect less, keep it out of logs, know where it lives.",
      "prompt": null,
      "confirm": "Decide what you tell users about chat text going to OpenAI, and check your OpenAI data-retention settings.",
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
      "status": "amber",
      "check": "repo",
      "evidence": "plain chat, no tools; user text stays in user messages (components/Chat.tsx:31, app/api/title/route.ts:18), so impact is low today",
      "why": "Treat model input and output as untrusted; limit what tools can do.",
      "prompt": null,
      "confirm": "Look again the day you give the model tools or let it fetch URLs.",
      "pulled_by": [
        "AI features"
      ]
    },
    {
      "name": "LLM Token Budgets",
      "phase": "P2",
      "home_phase": "P2",
      "level": "L2",
      "group": "Scaling & performance",
      "risk": 1,
      "status": "red",
      "check": "repo+confirm",
      "evidence": "no max_tokens on either call (components/Chat.tsx:29, app/api/title/route.ts:14) and no per-user usage tracking",
      "why": "Per-user caps and spend alerts so one user can't burn your bill.",
      "prompt": "Set max_tokens on both OpenAI calls (the chat call once it's in app/api/chat/route.ts, and app/api/title/route.ts:14), add a `usage` table keyed by user_id that the server routes update from res.usage.total_tokens, and refuse requests once a user passes a daily cap. Also set a monthly spend limit in the OpenAI dashboard.",
      "confirm": null,
      "pulled_by": [
        "AI features"
      ]
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
      "evidence": "no URL fetching from user or model input",
      "why": "If you fetch user-supplied URLs (agents do), block internal addresses.",
      "prompt": null,
      "confirm": null,
      "pulled_by": [
        "AI features"
      ]
    },
    {
      "name": "Rate Limiting",
      "phase": "P2",
      "home_phase": "P3",
      "level": "L1",
      "group": "Traffic & edge",
      "risk": 1,
      "status": "red",
      "check": "repo",
      "evidence": "no rate limit on the POST handler at app/api/title/route.ts:8, and the chat call runs in the browser where it can't be limited (components/Chat.tsx:29); looked for @upstash/ratelimit, middleware.ts and firewall rules in vercel.json",
      "why": "Protect endpoints from abuse and runaway clients — auth endpoints first.",
      "prompt": "After moving the chat call into app/api/chat/route.ts, add @upstash/ratelimit to that route and to app/api/title/route.ts: 20 requests per minute per signed-in user (falling back to IP), returning 429 with a Retry-After header.",
      "confirm": null,
      "pulled_by": [
        "AI features"
      ]
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
      "evidence": "no privacy policy page, no account deletion and no data export under app/",
      "why": "Consent, export and deletion at consumer scale.",
      "prompt": "Add app/privacy/page.tsx with a plain privacy policy (what you store, and that chat text goes to OpenAI), link it from app/layout.tsx, and add app/api/account/route.ts with DELETE (removes the user's messages and auth user using a server-only service-role client) and GET (exports their messages as JSON).",
      "confirm": null,
      "pulled_by": [
        "EU users"
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
      "evidence": "inputs without labels: the email field (components/Login.tsx:14, placeholder only) and the message field (components/Chat.tsx:49); no a11y lint or axe check",
      "why": "A legal requirement for many EU consumer services.",
      "prompt": "Add visible labels (or aria-label) to the email input in components/Login.tsx:14 and the message input in components/Chat.tsx:49, add eslint-plugin-jsx-a11y to .eslintrc.json, and fix what it reports.",
      "confirm": null,
      "pulled_by": [
        "EU users"
      ]
    }
  ],
  "do_now": [
    "Secrets Management",
    "Rate Limiting",
    "AuthN & AuthZ Middleware",
    "LLM Token Budgets",
    "GDPR & Privacy"
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
    "more": 32
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
