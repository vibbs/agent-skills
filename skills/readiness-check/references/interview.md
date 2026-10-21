# Interview

The interview fills in what the repo can't say: who uses the app, where they are, and
what kind of data goes in. Read this file at workflow step 3, after the repo scan, so
each question can carry a default taken from what the scan found.

## Rules

- **Never re-ask a stored answer.** Load `answers` from the machine state in
  `readiness-check.md` first. Ask only the keys that are missing. If the user says
  something changed ("we have paying users now"), update that answer.
- **At most 6 questions, all multiple choice, each with a recommended default.** The
  default comes from the repo scan when it can (an OpenAI SDK makes "yes" the default for
  AI features). Mark it "(recommended)" and list it first.
- **Skip what the repo answers with certainty.** A repo can't prove who uses the app, so
  Q1 and Q2 are almost always asked on the first run. A repo can strongly suggest domain
  flags; ask anyway, with the scan result as the default, because a wrong guess changes
  the verdict.
- **Ask once.** If the agent has a structured question tool, use it with all questions in
  one call. Otherwise ask once as a numbered list in plain text and wait for one reply.
  Accept short replies ("1a 2b 3 b2c 4 ai 5 eu,us 6 no"), and use the default for
  anything the user skips.
- **No interview at all** when every key is already stored. Say "Using your answers from
  <date>" in the report and move on.

## The questions

Keys are the names stored in the machine state.

### Q1 · `audience`: Is anyone other than you using it, or about to? Is real user data going in?
- `just_me`: only me and maybe a friend testing; no real data. → P1
- `about_to_launch`: other people are about to use it, or real data is about to go in. → P2
- `live`: people already use it with real data. → P2 at least (check Q2)

Default: `about_to_launch` if the repo has auth, a database and a deploy config;
`just_me` otherwise.

### Q2 · `growth`: Real traffic, paying users or a second engineer yet? (pick all that apply)
- `none` (default unless the repo shows payments in production or several committers)
- `real_traffic`: steady daily users, or the first "it's slow" or incident.
- `paying_users`: people pay.
- `second_engineer`: someone else commits regularly.
- `forced`: a customer, a compliance requirement or the budget is forcing scale work.

Any of the first three → P3. `forced` → P4.
Hint from the repo: `git shortlog -sn --since="90 days ago"` showing two or more
regular authors suggests `second_engineer` (propose it, don't assume it).

### Q3 · `market`: B2B or B2C?
- `b2c`: consumers sign up themselves.
- `b2b`: other businesses buy it for their teams.
- `both`
- `not_sure` (default when the repo gives no hint): treated as `b2c` for the P4 preview.

Used for the P4 track (B2B or B2C) in "coming next" and for the multi-tenant default.

### Q4 · `domains`: Does the app handle any of these? (pick all that apply)
- `health`: health data.
- `payments`: charges money, holds balances or credits.
- `kids`: children can use it.
- `ai`: calls an LLM or other paid model API.
- `none`

Default: from the scan. LLM SDK or model API calls → `ai`; Stripe, Razorpay, Paddle,
LemonSqueezy SDK or a balance / credits table → `payments`; fields like diagnosis or
prescription → `health`. Nothing found → `none`.

### Q5 · `regions`: Where are your users? (pick all that apply)
- `eu`
- `india`
- `us`
- `elsewhere`

Default: `us` plus `elsewhere`, unless the repo shows locales, currencies or hosting
regions that suggest more (`de`, `fr` locales or EUR → suggest `eu`; INR, `hi` locale or
Razorpay → suggest `india`).

### Q6 · `multi_tenant`: Do several customer organisations share the app, each seeing only its own data?
- `no`: single tenant, or each user only sees their own data. (default for `b2c`)
- `yes`: orgs, teams or workspaces. (default for `b2b`, or if the schema has
  `org_id` / `team_id` / `workspace_id`)

`yes` turns on Tenant Isolation; `no` makes it n/a.

## Deciding the phase

Take the highest phase whose trigger has fired:

| Phase | Trigger (from roadmap.json) | Answers that fire it |
|---|---|---|
| P1 Project setup | git init, before the first feature | always (the baseline) |
| P2 Pre-launch | someone other than you is about to use it, or real data is about to go in | `audience` is `about_to_launch` or `live` |
| P3 Growth | real traffic, paying users or a second engineer | `growth` includes `real_traffic`, `paying_users` or `second_engineer` |
| P4 Scale & enterprise | a customer, a compliance requirement or the budget forces it | `growth` includes `forced` |

Write the "why" line from the answers plus one piece of repo evidence, for example:
"P2 Pre-launch: you said people are about to use it, and the repo has auth and a Vercel
deploy." If the answers and the repo disagree (the user says `just_me` but there's a
Stripe live-mode webhook), go with the user and mention the mismatch once, gently.

**P3 or later.** v1 still reviews the P1 and P2 baseline in depth and previews the next
phase. Say so in the report, plainly: "You're in P3 Growth. This version checks the P1–P2
baseline and previews P3; deeper P3 and P4 review comes in a later version." For P3,
"coming next" previews P3 items themselves (they are current, not future); for P4, it
previews the P4 core plus the track from `market`.

## Overrides

From the answers: `domains` → health, payments, kids, ai; `regions` → eu, india. Read
`references/overrides.md` for what each pulls. Multi-tenant isn't an override; it only
switches the Tenant Isolation `applies` condition.

## Confirmations

Confirm-only items (Backups, Alerts, DNS, IAM, Encryption at Rest, and others marked
confirm in `references/items-p1-p2.md`) are not interview questions. They appear in the
report's Confirm section with what to check. The user confirms them by editing
`readiness-check.md` (see `references/report-format.md`) or by telling the agent in a
later run ("backups are on and I tested a restore"). The agent then stores them in
`confirmations` and they turn green next run.

## What gets stored

Under `answers` in the machine state:

```json
{
  "audience": "about_to_launch",
  "growth": ["none"],
  "market": "b2c",
  "domains": ["ai"],
  "regions": ["eu", "us"],
  "multi_tenant": "no",
  "answered_on": "2026-10-21"
}
```

Store the user's choice, not the default, and only after they answered (an accepted
default counts as an answer). Never store guesses the user didn't see.
