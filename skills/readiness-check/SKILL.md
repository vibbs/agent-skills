---
name: readiness-check
description: >-
  Review a project's production readiness by phase: work out whether it's in project
  setup, pre-launch, growth or scale, check what the current phase needs, and say what
  to skip for now. Writes readiness-check.md and a visual HTML report with red, amber
  and green status and a ready-to-paste fix prompt for each gap. Use when the user asks
  'is this ready to launch?', 'what am I missing before going live?', 'production
  readiness check', 'review my app for production', 'what should I add next?', or is
  about to ship a vibe-coded or AI-built app to real users.
compatibility: Python 3.8+ for the optional report renderer (standard library only). Works without it.
metadata:
  version: "0.1.0"
---

# Readiness Check

Reviews a repository against a phase-by-level production roadmap and tells the user
three things: **where they are**, **what their current phase needs**, and **what to skip
for now**. The "not yet" verdict is the point. A flat checklist either freezes people or
pushes them into over-engineering; this skill says "skip Kubernetes, you're pre-launch"
as confidently as it says "your API key is in the browser".

It writes only into these places in the user's project:

- `readiness-check.md` at the root: the source of truth, readable, with a machine-state
  block at the bottom that the next run reuses. Always this name, so the next run finds it.
- `.readiness/report-<YYYY-MM-DD>.html`: a self-contained, one-page visual report rendered
  from it. Dated, so a new run never overwrites an older report.
- `.readiness/history/readiness-check-<YYYY-MM-DD>.md`: the previous run's
  `readiness-check.md`, copied there before it is overwritten.

Every report says when it was checked and, in a git repo, at which commit, because
`file:line` evidence goes stale as soon as the code changes.

It never changes the user's code.

## The model

All data lives in `assets/roadmap.json` (126 items: 111 from the original list plus 15
additions). Each item has one placement:

```
PHASE  when the item first needs attention, started by an event, not a date
  P1 Project setup         git init, before the first feature
  P2 Pre-launch            someone other than the builder is about to use it, or real data is about to go in
  P3 Growth                real traffic, paying users or a second engineer
  P4 Scale & enterprise    a customer, a compliance requirement or the budget forces it
                           (shared core, plus a B2B track and a B2C track)
LEVEL  seniority of the engineer who'd remember it: L1 beginner, L2 intermediate, L3 advanced
GROWS INTO  where the item goes next (Logging → Metrics → Distributed Tracing)
APPLIES     a condition, or null (Tenant Isolation only applies to multi-tenant apps)
```

**Overrides** keyed by domain and region pull items forward into P2: health data,
payments, kids as users, AI features, EU users, Indian users, privacy-law regions and
data-localisation regions. Region cards are grouped by what they pull, not by country,
and a `global` answer applies the privacy cards together. AI features, for example,
pulls rate limiting, token budgets and prompt-injection defence into P2, because one
open endpoint calling a paid model can run up a bill overnight.

## Scope of this version

- **In:** deep review of every P1 and P2 item, plus anything an override pulls into P2;
  a short "coming next" preview of the next phase; one mode, review.
- **Out:** progress or diffs between runs, deep review of P3 and P4, fixing code, CI
  integration, other modes. If the user asks for these, say they're planned for a later
  version and do the review.
- **Projects already in P3 or later:** say so plainly. "You're in P3 Growth. This version
  checks the P1–P2 baseline and previews P3; deeper P3 and P4 review comes in a later
  version." Then do exactly that.

## Reference files: when to read each

| File | Read it |
|---|---|
| `references/interview.md` | at step 3, before asking anything |
| `references/overrides.md` | at step 4, to decide which overrides apply |
| `references/items-p1-p2.md` | at step 5, in full, before classifying anything |
| `references/report-format.md` | at step 6, before writing the report |
| `assets/roadmap.json` | at steps 4–6 for exact names, phases, triggers and the "coming next" list |
| `assets/credits.json` | at step 6, for the footer values |

## Workflow: follow in order

### 1. Load prior state

If `readiness-check.md` exists at the project root, read the JSON block under
`## Machine state, don't edit by hand`. Keep:

- `answers`: never re-ask a question that is already answered.
- `confirmations`: items the user confirmed earlier stay confirmed.
- Ticked boxes (`- [x]`) in the **Confirm** section: the user confirmed those by hand
  since the last run. Add each to `confirmations` with today's date.

If the block is missing or invalid JSON, say so in one line and treat it as a first run;
don't overwrite the user's notes without mentioning it.

Before this run overwrites it, copy the existing `readiness-check.md` to
`.readiness/history/readiness-check-<its generated_on>.md` (add `-2`, `-3` if that name
is taken). Earlier runs are never lost.

### 2. Scan the repo

Find the facts the classification needs. Read, don't run: no installs, no builds, no
starting the app.

- **Skip:** `node_modules`, `.venv`, `venv`, `env`, `__pycache__`, `.next`, `dist`,
  `build`, `out`, `.turbo`, `.vercel`, `coverage`, `.git`, `.readiness`, and anything
  in `.gitignore`. If `git` is available, `git ls-files` is the easiest list of what
  counts.
- **Stack:** `package.json` (dependencies, scripts, `engines`), `next.config.*`,
  `pyproject.toml` / `requirements*.txt`, `manage.py`, framework entry points.
- **Deploy:** `vercel.json`, `netlify.toml`, `fly.toml`, `render.yaml`,
  `railway.json`, `Dockerfile`, compose files, `.github/workflows/`, Terraform, Helm,
  Kubernetes manifests.
- **Auth:** Auth.js, Clerk, Supabase Auth, Firebase Auth, Django auth, FastAPI
  dependencies, `middleware.ts`.
- **Data layer:** Prisma, Drizzle, SQLAlchemy, Django ORM, `supabase/migrations/`,
  `firestore.rules`, raw drivers.
- **LLM SDKs:** `openai`, `@anthropic-ai/sdk` / `anthropic`, `ai` (Vercel AI SDK),
  `@google/generative-ai`, `langchain`, `groq`, direct calls to model APIs.
- **Payments and data hints:** Stripe / Razorpay / Paddle SDKs, balance or credits
  columns, locale files, currencies, `org_id` / `team_id` columns.

Write down each finding with its `file:line`. Everything later cites these.

Record what was checked: in a git repo, the short commit hash (`git rev-parse --short
HEAD`) and whether there are uncommitted changes (`git status --porcelain` is not empty).
They go in `project.commit` and `project.dirty`; outside git, `commit` is null.

### 3. Interview, briefly

Read `references/interview.md`. Ask **at most 6** multiple-choice questions, each with a
recommended default taken from the scan, and only for answers that are not stored and
that the repo can't settle:

1. Is anyone other than you using it, or about to? Is real user data going in?
2. Real traffic, paying users or a second engineer yet?
3. B2B or B2C?
4. Domain flags: health data, payments, kids as users, AI features?
5. Where are your users: EU, India, US, elsewhere (which countries), or global?
6. Multi-tenant (several customer orgs sharing the app)?

If the agent has a structured multiple-choice question tool, use it with all the
questions in one call. Otherwise ask once, as a numbered list in plain text, and wait for
one reply. Unanswered questions take their default.

> **Claude Code only.** Use `AskUserQuestion` (up to 4 questions per call, so two calls
> at most). Generic alternative: the numbered list above.

### 4. Decide the phase and overrides

- Phase = the highest phase whose trigger has fired (rules in `references/interview.md`).
  Write a one-line "why" from the answers plus one piece of repo evidence.
- Read `references/overrides.md`. List each override that applies, with a one-line
  reason ("AI features: calls OpenAI from `components/Chat.tsx`"), and the items it pulls.
- Note the next phase and its trigger from `assets/roadmap.json`.

### 5. Classify every in-scope item

Read `references/items-p1-p2.md` in full. In scope: every P1 and P2 item, plus each item
pulled forward by an applied override.

**If the project is in P1,** P2 is the next phase, so P2 items (pulled ones included)
can't be red yet. Still check them: present → green with evidence; missing → grey
("not yet"). "Coming next" then previews P2, pulled items first.

For each item, follow its "Look for" signals for the detected stack and assign one status:

| Status | Meaning |
|---|---|
| **red** | missing, and needed in the current phase (including items pulled forward) |
| **amber** | partly done, or can't be verified from the repo |
| **green** | in place |
| **n/a** | its `applies` condition is false; not counted anywhere |

Every item in a later phase that wasn't pulled forward is **grey** ("not yet"). Grey
items aren't reviewed; they're counted, the next phase's first few are previewed, and the
report names up to 5 "usual over-builds" to skip for now (list at the end of
`references/items-p1-p2.md`). That "skip for now" line is the point of the skill: always
include it.

Separately, check the **done-early** signals at the end of `references/items-p1-p2.md`.
For each later-phase item already present, add a flag phrased as a question about upkeep,
never a scolding: "You have Helm charts in `deploy/helm/`. Is someone keeping these
current, or would your host's own deploy be simpler for now?"

### 6. Write `readiness-check.md`

Read `references/report-format.md` and follow it exactly: title and date; the phase,
its "why" and the overrides; counts; **Do now** (top 5 red, L1 → L3, then by risk), each
with level, evidence, a one-line why and a repo-specific "Prompt for your agent"; **Also
missing**; **Confirm** with checkboxes; **In place**; **Done early**; **Coming next**;
the credit footer from `assets/credits.json`; and the machine-state block last.

On a re-run, overwrite the file (after the history copy from step 1), keeping `answers`
and `confirmations`. `generated_on` is always today's date.

### 7. Render the dated HTML report

Preferred: run the bundled renderer, which needs only Python 3.8+:

```bash
python3 <skill-dir>/scripts/render_report.py <project-dir>
```

It reads the machine-state block, merges `assets/credits.json`, injects both into
`assets/report-template.html`, and writes `<project-dir>/.readiness/report-<generated_on>.html`.
A second report on the same day becomes `report-<date>-2.html`, and so on; nothing is
overwritten. It prints the path it wrote. Ask before running it if the agent normally asks
before running commands.

**No-script fallback** (no Python, or scripts not allowed): do the same by hand.

1. Read `assets/report-template.html`. It contains exactly one data slot:
   `<script type="application/json" id="readiness-data">/*READINESS_DATA*/</script>`.
2. Take the machine-state JSON, add a `"credits"` key holding the object from
   `assets/credits.json`, and serialise it.
3. Replace every `</` in the serialised JSON with `<\/` so it can't close the script tag.
4. Replace `/*READINESS_DATA*/` with it, and write the result to
   `.readiness/report-<generated_on>.html` (with `-2`, `-3` if that file exists), creating
   the folder if needed.

Then tell the user where both files are. The HTML has no network requests and opens
offline; suggest opening it in a browser.

> **Claude Code / Claude apps only.** Also send the HTML with `SendUserFile` so it shows
> inline. Generic alternative: give the path.

### 8. Ask about `.gitignore`

If `.readiness/` isn't already ignored, ask once whether to add it to `.gitignore` (it
holds the dated reports and the history copies; `readiness-check.md` stays tracked). Add
it only on a yes. Never touch any other file: no fixes, no config edits, no new
dependencies, even if a fix is one line. The fix prompts are for the user to hand to
their agent when they choose.

## Evidence rules (non-negotiable)

- **Every green cites evidence:** `file:line`, or a config file, or "confirmed by you on
  <date>", or "provided by <host>" with the host's config file.
- **Every red says what was looked for and where:** "no timeout passed to the OpenAI
  client, `lib/openai.ts:4`", or "no rate limiter on `app/api/chat/route.ts`; looked for
  @upstash/ratelimit, middleware and vercel.json". Never red on a hunch.
- **Outside-the-repo items are amber ("confirm"), not red,** unless the user confirmed
  them in the interview or ticked them in `readiness-check.md`: backups, uptime alerts,
  IAM and root keys, DNS, encryption at rest, WAF and DDoS, on-call, data residency.
  Absence of evidence in the repo is not evidence of absence there.
- **Never print a secret.** Cite the variable name and line, not the value.
- **Fix prompts are specific to this repo.** Real paths, routes and client names. A prompt
  that still reads like a template is not done.
- **Don't invent the project.** If the scan can't tell, it's amber with what to check, or
  a question in the interview. Don't guess a stack, a host or a user base.

## Tone

Plain and encouraging. Short lines. Lead with the phase as a place ("You're in P2
Pre-launch"), present "not yet" as good news, and never scold. Done-early flags are
questions, not warnings. Regulatory overrides get one "not legal advice" line.

## Non-negotiables

- At most 6 interview questions, all with defaults; none repeated across runs.
- Only `readiness-check.md` and files under `.readiness/` are written, plus `.gitignore`
  if the user says yes. Nothing is ever overwritten except `readiness-check.md`, and only
  after its history copy.
- Every report carries its check date, and its commit in a git repo.
- Every in-scope item appears in the machine state with a status; names match
  `assets/roadmap.json` exactly.
- The "Do now" list has at most 5 items. If nothing is red, say so and point at Confirm.
- The credit footer is always present. If `assets/credits.json` still holds a
  `{{PLACEHOLDER}}`, print it as is; never invent a handle or a URL.
