# Design: cleanup skills for the operations bucket

Status: draft, not started. The first skill to build is `dead-code-sweep`.

## The problem

Agents write code quickly, so they also leave clutter quickly: dead code, near-duplicate
helpers, unused imports and dependencies, stale feature flags, and comments that no
longer match the code. People rarely make time for cleanup. Worse, an agent that reads
dead code assumes it is live and starts calling it. A single "make the codebase better"
pass doesn't fix this: it rewrites things it should leave alone and produces diffs too
big to review.

## Approach

A set of narrow cleanup skills, each doing one kind of change, each producing one small
pull request that the existing tests and review step must pass.

These are **skills, not agents.** The repository is skills-only and must work in any
agent, so the playbook lives in a skill. Running one on a schedule, or as a background
agent, is a deployment choice documented separately (see [Scheduling](#scheduling)).

## Lineup

| Order | Skill | Does | Never does | Risk |
|---|---|---|---|---|
| 1 | `dead-code-sweep` | Removes unreferenced functions, classes, exports, files and imports | Touch public API, generated code, or anything reached dynamically | Low, if evidence rules hold |
| 2 | `stale-docs-sync` | Fixes comments, docstrings and README sections that contradict the code | Change code | Very low |
| 3 | `unused-deps-prune` | Removes declared dependencies that are never imported | Remove build tools, plugins, peer deps or anything loaded by config | Low |
| 4 | `duplicate-merge` | Picks one of several near-duplicate helpers, moves callers to it, deletes the rest | Merge helpers whose behaviour differs in any tested or documented way | Medium: a real refactor |
| 5 | `stale-flag-cleanup` | Removes flags that are fully rolled out or never enabled, and the dead branch | Guess flag state; it needs the provider's state or the user's confirmation | Medium; starts in `in-progress/` |

Each skill is its own pull request, per CONTRIBUTING.

## Shared cleanup contract

Every cleanup skill follows the same contract. Installed skills must stand alone, so
each skill bundles its own copy as `references/cleanup-contract.md`; this section is the
source those copies are kept in sync with.

### 1. Baseline before any change

- Find and run the project's checks: tests, type checker, linter, build. Record the
  commands and results.
- If the baseline fails, or there are no tests that cover the area, switch to
  **report-only mode**: write findings, change nothing, and say why.
- Work on a fresh branch from a clean tree. Never on the default branch.

### 2. One kind of change, small

- One skill makes one kind of change per run. No drive-by fixes, formatting or renames.
- Size cap per run: about 300 changed lines or 15 files, whichever comes first. The
  rest goes into the report as "next batch".
- Each item should be revertible on its own. Prefer one commit per item.

### 3. Evidence for every change

Each item in the report carries:

- `file:line` of what changed
- why it qualifies (for dead code: the search that found no references, and where it
  searched)
- the commit at which it was checked

### 4. Never touch

- Public or exported API of a published package, and anything listed in an exports map,
  `__all__`, or a public index file
- Generated code, vendored code, lock files, migrations
- Code reached by reflection, dynamic imports, string-based routing, dependency
  injection containers, decorators that register handlers, serializers, or framework
  conventions (for example `pages/`, `app/` routes, Django `admin.py`, test fixtures)
- Anything the project marks to keep (`# keep`, `@public`, `// eslint-disable` comments
  that explain why, or a project-level allowlist)

Each skill adds its own "looks dead but isn't" checklist in `references/`.

### 5. The tests decide

- Re-run the same baseline checks after the change.
- If anything fails, **drop that item**. Never edit a test to make a cleanup pass.
- Behaviour must be unchanged. A cleanup that needs a behaviour change is a finding for
  a person, not a cleanup.

### 6. Output

In the user's project:

- `cleanup-report.md`: what changed, what was skipped and why, what is left for next
  time, the baseline and after results, and the commit checked.
- A ready-to-paste pull request title and description. The skill does not open the PR
  or push unless the user asks.

## Skill 1: `dead-code-sweep` (build first)

### Detection, by language

Use the project's own tools when present, and fall back to search:

| Ecosystem | Tools |
|---|---|
| TypeScript / JavaScript | `knip`, `ts-prune`, `tsc --noUnusedLocals`, ESLint `no-unused-vars` |
| Python | `vulture`, `ruff` (F401, F841) |
| Go | `deadcode`, `staticcheck` (U1000) |
| Rust | compiler `dead_code` warnings, `cargo udeps` for deps |
| Anything else | symbol search across the repo, including non-code files (configs, templates, YAML) |

Tool output is a list of candidates, never a verdict. Each candidate is confirmed by a
text search across the whole repository, including config, templates and docs, before it
is removed.

### Order inside a run

1. Unused imports (safest, and often the bulk of the diff)
2. Unused private functions and locals
3. Unused exports inside an application (not a published library)
4. Whole unused files

Stop at the size cap.

### Tests

`tests/dead-code-sweep/` with small fixture repositories that include traps the skill
must not remove:

- a function called only through `getattr` or a string lookup
- a public export of a library package
- a generated file
- a route file found by framework convention
- a symbol referenced only from a YAML config

plus real dead code it must remove. The expected `cleanup-report.md` for each fixture
lives next to it, like `tests/readiness-check/expected/`.

## Skills 2 to 5: notes

- **`stale-docs-sync`**: compares signatures, parameters, return values, CLI flags,
  environment variables and file paths mentioned in docs and comments against the code.
  It rewrites text only, and flags any case where it can't tell whether the code or the
  doc is wrong.
- **`unused-deps-prune`**: reads the manifest, searches for imports, and checks config
  files, scripts and plugin lists before removing anything. It runs install and build
  after.
- **`duplicate-merge`**: needs a similarity pass (same name stem, same body shape, or a
  tool such as `jscpd`). It only merges when the behaviours are the same, which the tests
  must prove. Otherwise it reports the pair.
- **`stale-flag-cleanup`**: needs flag state from the provider, a config file, or the
  user. Without that, it lists flags and their call sites and changes nothing.

## Scheduling

A separate docs page, "Running cleanup skills on a schedule", once at least one skill
ships:

- a generic route: a cron job or GitHub Actions workflow that runs an agent with the
  skill and opens a draft PR
- a clearly marked "Claude Code only" section: scheduled routines and background agents
- guidance: one skill per run, stagger the schedules, and cap open cleanup PRs so
  reviewers aren't flooded

## Open questions

- Do the cleanup skills share a report file name (`cleanup-report.md` with a section per
  skill) or use one per skill (`dead-code-report.md`)? One per skill avoids overwrites
  when two run close together.
- Should report-only mode be the default for the first run in a repository, with apply
  mode opt-in?
- Where does `stale-flag-cleanup` get flag state in a provider-neutral way?
