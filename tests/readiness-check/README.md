# readiness-check test fixtures

Not shipped with the skill (only `skills/` goes into the plugin).

- `fixtures/<name>/`: tiny repos to run the skill against.
  - `nextjs-supabase-openai`: P2, AI features and EU users. Planted gaps: OpenAI key in
    a client component, no timeouts, no rate limit, row-level security turned off.
  - `fastapi-p1`: P1, just the builder. Hardcoded secret, no lockfile, no auth.
  - `p2-with-helm`: P2, B2B and multi-tenant, mostly in good shape, with Kubernetes and
    a Helm chart (done early).
- `answers/<name>.json`: the interview answers used for each run.
- `expected/<name>/readiness-check.md`: the report the skill should produce, verdicts
  checked by hand. `nextjs-supabase-openai/readiness-check.second-run.md` is a second
  run after ticking Backups: no questions asked, Backups moves to In place.

To try the skill, copy a fixture to a scratch folder first so the reports it writes don't
land inside this repository.
