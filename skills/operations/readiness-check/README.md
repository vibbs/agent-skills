# readiness-check

Reviews a project's production readiness by phase. It works out whether the project is
in project setup, pre-launch, growth or scale, checks what the current phase needs, and
says what to skip for now. The "not yet" verdict is the point: it will tell you to skip
Kubernetes because you're pre-launch, as plainly as it tells you your API key is in the
browser.

The review runs against a roadmap of 126 production topics, each placed by phase (when
it first needs attention, started by an event, not a date) and level (the seniority of
the engineer who'd remember it). Overrides pull items forward for AI features, payments,
health data, kids as users, and where your users are: EU, India, other countries with
privacy or data-localisation laws, or a global audience.

The skill asks at most six short questions, only what the repo can't answer, and
remembers the answers for next time. It never changes your code. It writes:

- `readiness-check.md` at the project root: the source of truth, with a machine-readable
  block at the bottom that the next run reuses.
- `.readiness/report-<date>.html`: a one-page visual report with no network requests, in
  light and dark mode. Each run gets its own dated file, and the previous
  `readiness-check.md` is kept under `.readiness/history/`, so nothing is lost on a re-run.

Every report shows the date it was checked and, in a git repo, the commit.

Every finding cites evidence (`file:line` or a config file). Things that live outside
the repo, such as backups, uptime alerts and DNS, are marked "confirm", never "missing".
Every gap comes with a ready-to-paste prompt for your coding agent.

## Example invocation

> Is this ready to launch? A few friends are going to start using it next week.

## Example output

```
# Readiness check: chatnest

2026-10-21 · P2 Pre-launch · You're here because you said people are about to use it,
and the repo has sign-in (components/Login.tsx) and a Vercel deploy (vercel.json).

Overrides: AI features (calls OpenAI from components/Chat.tsx) · EU users

| Do now | Confirm | In place | Not yet |
|---|---|---|---|
| 11 | 16 | 12 | 79 |

### 1. Secrets Management · L1
Evidence: NEXT_PUBLIC_OPENAI_API_KEY used in a client component, components/Chat.tsx:7-8
Prompt for your agent:
> Move the OpenAI key server-side: rename NEXT_PUBLIC_OPENAI_API_KEY to OPENAI_API_KEY,
> add app/api/chat/route.ts ... and remind me to rotate the old key.

Skip for now: Kubernetes, Caching, Message Queues, Sharding, Multi-Region Deployment.
```

## Bundled script

Runs only when the agent or you invoke it. Nothing runs on install.

| Script | What it does | Needs |
|---|---|---|
| `scripts/render_report.py` | Reads the machine-state block from `readiness-check.md`, adds the credit values from `assets/credits.json`, fills the data slot in `assets/report-template.html`, and writes `.readiness/report-<date>.html` (adding `-2`, `-3` for a second report the same day, never overwriting). Writes nothing else. | Python 3.8+, standard library only |

Without Python, the agent can do the same by hand: the template has one marked data slot
to replace with the JSON.

## Credits

The roadmap is based on a list of 111 production topics from a public post
(https://www.instagram.com/p/DehMUh_jdbK/), sorted into phases and levels for the
[BlockSimplified Vibecoder Production Roadmap](https://www.blocksimplified.com/blog/vibe-to-prod-what-your-project-needs-for-production).
Not legal advice: the regulatory overrides say which engineering items to bring forward,
not what a law requires.
