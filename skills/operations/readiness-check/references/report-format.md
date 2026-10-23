# Report format

`readiness-check.md` at the project root is the source of truth: people read the top,
the next run and `scripts/render_report.py` read the machine-state block at the bottom.
Read this file at workflow step 6, before writing the report.

## Tone

- Plain and encouraging. Short lines. Never scolding, never alarmist.
- Say what was found, where, and the next step. No "you failed to", no "critical!!!".
- Name the phase as a place, not a grade: "You're in P2 Pre-launch."
- "Not yet" is good news. Say it like good news: "Skip these for now."

## Ordering rules

- **Do now:** red items only, top 5. Sort by level (L1, then L2, then L3), then by risk
  (1, then 2, then 3, from `references/items-p1-p2.md`), then by the item's order in
  `assets/roadmap.json`.
- **Also missing:** the remaining red items in the same order.
- **Confirm:** amber items, confirm-only ones first, then the rest in the same order.
- **In place:** green items in roadmap order.
- **Coming next:** the next phase's L1 items first, then L2, up to 5, then "and N more".
  Leave out items already green or flagged done early. For a P1 project the next phase is
  P2: list pulled items first, then the rest, still up to 5.
- **The "Starts …" line** under Coming next uses these exact words:
  P2 "Starts when someone other than you is about to use it, or real data is about to go
  in." · P3 "Starts with real traffic, paying users or a second engineer." · P4 "Starts
  when a customer, a compliance requirement or the budget forces it."
- **Skip for now:** up to 5 names from the "usual over-builds" list at the end of
  `references/items-p1-p2.md`, in that list's order, leaving out any that are in scope,
  green or flagged done early. Then the total grey count. This line is the "not yet"
  verdict: always include it.

## Structure

Copy this layout exactly. Sections with nothing in them keep their heading and say so in
one line ("Nothing red. Nice."), except Done early, which is left out when empty.

````markdown
# Readiness check: <project name>

<YYYY-MM-DD> · commit <short hash>[ + uncommitted changes] · **P2 Pre-launch** · You're here because <answers + one piece of repo evidence>.

Overrides: **AI features** (calls OpenAI from app/api/chat/route.ts) · **EU users** (you said you have EU users)
<card extra lines, if any> · Not legal advice. <only when a regulatory override applies>

<P3+ only: "This version checks the P1–P2 baseline and previews the next phase; deeper P3 and P4 review comes in a later version.">

| Do now | Confirm | In place | Not yet |
|---|---|---|---|
| 4 | 6 | 18 | 77 |

## Do now

### 1. Secrets Management · L1
Evidence: `NEXT_PUBLIC_OPENAI_API_KEY` used in a client component, `components/Chat.tsx:8`
Why: Keys live in env vars or a secret store, never in git or frontend code.
Prompt for your agent:
> Move the OpenAI key server-side: rename NEXT_PUBLIC_OPENAI_API_KEY to OPENAI_API_KEY, create the client only in app/api/chat/route.ts, call that route from components/Chat.tsx, and remind me to rotate the old key.

### 2. ...

## Also missing

- **Database Indexing** · L2 · no index on `messages.user_id`, used in `lib/db.ts:22`

## Confirm

These live outside the repo, so the check can't see them. Tick the box once you've
checked, and the next run will count it as in place.

- [ ] **Backups** · Check automated backups or point-in-time recovery is on in Supabase, then restore one to a scratch project.
- [ ] **Alerts** · An uptime check hits /api/health every few minutes and alerts you.

## In place

- **Project Scaffolding** · `eslint.config.mjs`, `.prettierrc`
- **TLS** · provided by Vercel (`vercel.json`)

## Done early

- **Helm Charts** (P4) · `deploy/helm/Chart.yaml` · Kubernetes is usually a P4 budget decision. Is someone keeping these current, or would your host's own deploy be simpler for now?

## Coming next: P3 Growth

Starts with real traffic, paying users or a second engineer.
First up: Production Incidents, Vertical Scaling, Latency, Throughput, Metrics, and 32 more.

Skip for now: Kubernetes, Caching, Message Queues, Sharding, Multi-Region Deployment. These are not needed in P2; 77 items in total can wait.

---

Roadmap based on a list of 111 production topics (<ORIGINAL_POST_URL>) · Full roadmap: <BLOCKSIMPLIFIED_ROADMAP_URL>

## Machine state, don't edit by hand

```json
{ ... see schema below ... }
```
````

Notes on the layout:

- **Counts table.** "Do now" counts every red item (not just the top 5). "Not yet" counts
  every roadmap item in a later phase that wasn't pulled forward. n/a items are not
  counted anywhere.
- **Evidence** is always a `file:line`, a config file name, or "confirmed by you on
  <date>". For red items, say what was looked for and where: "no timeout passed to the
  OpenAI client, `lib/openai.ts:4`", or "no backup config found in repo or infra files".
- **The prompt** must name real files, routes and clients from this repo. One paragraph,
  ready to paste.
- **Credit footer:** take the two values from `assets/credits.json`. If a value is
  still a `{{PLACEHOLDER}}`, print it as is; never invent a URL.
- **Confirm checkboxes:** on the next run, a ticked `- [x]` line moves that item into
  `confirmations` with today's date, and it turns green with evidence "confirmed by you
  on <date>".

## Machine state schema

One fenced `json` block, the last thing in the file, under the exact heading
`## Machine state, don't edit by hand`. The render script finds it by that heading.

```json
{
  "schema": 1,
  "skill_version": "0.1.0",
  "generated_on": "2026-10-21",
  "project": {
    "name": "acme-chat",
    "stack": ["Next.js 14", "TypeScript", "Supabase", "OpenAI SDK", "Vercel"],
    "commit": "a1b2c3d",
    "dirty": false
  },
  "answers": {
    "audience": "about_to_launch",
    "growth": ["none"],
    "market": "b2c",
    "domains": ["ai"],
    "regions": ["eu", "us"],
    "multi_tenant": "no",
    "answered_on": "2026-10-21"
  },
  "phase": {
    "id": "P2",
    "name": "Pre-launch",
    "why": "You said people are about to use it, and the repo has auth and a Vercel deploy."
  },
  "next_phase": {
    "id": "P3",
    "name": "Growth",
    "trigger": "real traffic, paying users or a second engineer"
  },
  "overrides": [
    {
      "key": "AI features",
      "reason": "Calls OpenAI from components/Chat.tsx.",
      "pulls": ["Rate Limiting", "LLM Token Budgets", "Prompt Injection", "Timeouts",
                "Serverless Limits", "SSRF", "Server-Sent Events"],
      "extra": "One unprotected endpoint calling a paid model can run up a bill overnight."
    }
  ],
  "legal_note": false,
  "confirmations": {
    "Backups": { "on": "2026-10-21", "note": "PITR on, restore tested" }
  },
  "counts": { "red": 4, "amber": 6, "green": 18, "grey": 77, "na": 4 },
  "items": [
    {
      "name": "Secrets Management",
      "phase": "P1",
      "home_phase": "P1",
      "level": "L1",
      "group": "Security",
      "risk": 1,
      "status": "red",
      "check": "repo",
      "evidence": "NEXT_PUBLIC_OPENAI_API_KEY used in a client component, components/Chat.tsx:8",
      "why": "Keys live in env vars or a secret store, never in git or frontend code.",
      "prompt": "Move the OpenAI key server-side: ...",
      "confirm": null,
      "pulled_by": []
    }
  ],
  "do_now": ["Secrets Management", "Timeouts", "Rate Limiting", "AuthN & AuthZ Middleware"],
  "done_early": [
    {
      "name": "Helm Charts",
      "phase": "P4",
      "evidence": "deploy/helm/Chart.yaml",
      "question": "Is someone keeping these current, or would your host's own deploy be simpler for now?"
    }
  ],
  "coming_next": {
    "phase": "P3",
    "name": "Growth",
    "trigger": "real traffic, paying users or a second engineer",
    "top": ["Production Incidents", "Vertical Scaling", "Latency", "Throughput", "Metrics"],
    "more": 32
  },
  "skip_for_now": ["Kubernetes", "Caching", "Message Queues", "Sharding", "Multi-Region Deployment"]
}
```

Field rules:

- `items` holds every in-scope item: all P1 and P2 items, plus pulled items. One entry
  each, keyed by the exact roadmap name. Later-phase items are not listed (they're
  counted in `counts.grey`).
- `phase` on an item is where it's reviewed now (`P2` for a pulled item); `home_phase` is
  its placement in `roadmap.json`.
- `status` is one of `red`, `amber`, `green`, `na`, or `grey` (only for P2 items in a
  P1 project: missing but not needed yet; they count towards `counts.grey`). Every `green` has `evidence`. Every
  `red` has `evidence` saying what was looked for and where, and a `prompt`. Every
  `amber` has either `evidence` or a `confirm` line saying what to check. Every `na` has
  `evidence` giving the reason ("single-tenant (you said so)", "no webhook routes").
- `check` is `repo`, `confirm` or `repo+confirm`, from the item catalog.
- `generated_on` is today's date as `YYYY-MM-DD`. The renderer names the HTML after it.
- `project.commit` is the short commit hash the scan read, or null outside git;
  `project.dirty` is true when there were uncommitted changes. Leave out the commit part
  of the header line when `commit` is null.
- `do_now` lists at most 5 names, in display order.
- `legal_note` is `true` when any regulatory override applies (all except AI features).
- `confirmations` survives between runs. Never drop an entry unless the user withdraws it.
- `answers` survives between runs; see `references/interview.md`.
- Strings are plain text, no markdown. The renderer escapes them.
- Keep the JSON valid: no comments, no trailing commas. The render script fails loudly on
  invalid JSON rather than guessing.
