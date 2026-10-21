# Contributing

Contributions are welcome: new skills, fixes to existing ones, and tooling improvements.

## Rules for skills

- **General-purpose only.** No company names, internal project names, private hostnames,
  credentials, or machine-specific paths. A skill should work for anyone who installs it.
  One exception: a skill may include a single attribution link to the repository
  author's own public roadmap or article in the reports it generates (for example,
  `readiness-check` credits the BlockSimplified roadmap it is built on).
- **Follow the [Agent Skills specification](https://agentskills.io/specification).**
  `name` must be lowercase letters, digits and hyphens, and must match the folder name.
  `description` must say what the skill does and when to use it, in under 1024 characters.
  Only `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`
  are allowed in frontmatter.
- **Write for any agent.** Do not rely on tool names, slash commands, hooks or subagents
  from a single agent. If a step only works in one agent, put it in a section clearly
  marked as such (for example, "Claude Code only") and give a generic alternative.
- **Keep SKILL.md focused.** Stay under 500 lines; move detail into `references/` and
  tell the agent when to read each file.
- **Document bundled scripts** in the skill's `README.md`: what each one does and what it
  needs. Scripts must never run on install.
- **One skill per pull request.**

## Docs and preview media

Every skill has an overview page at `docs/skills/<name>/README.md`. It must open with a
`## The problem` section: the problem a reader has before using the skill, in plain
terms, before any description of features. Its first paragraph is quoted in
`docs/catalog.md`, so make that paragraph stand on its own. Follow it with how the skill
solves the problem, when to use it, and how to install it.

Preview media is optional and lives next to the overview page, never inside the skill:

- `docs/skills/<name>/media/preview.png`: a small static frame (about 640px wide) for
  the README table.
- `docs/skills/<name>/media/tour.gif`: a short animated preview (about 960px wide) for
  the catalog and the overview page.

Rules:

- **Nothing under `skills/` links to `docs/`.** Installed skills must stand alone, so a
  skill's own `README.md` stays text-only.
- **Each media file is 2 MB or less.** Git keeps every version forever and every clone
  carries it, so re-record rarely.
- **Give every image alt text** that says what the preview shows.
- **Use these exact file names.** The catalog script finds media by them.

## Before opening a pull request

Install [uv](https://docs.astral.sh/uv/), then:

```bash
scripts/validate.sh
scripts/update-catalog.py
scripts/check-docs.py
```

Commit the regenerated README table and `docs/catalog.md` with your change and fill in
the pull request template. Don't edit `CHANGELOG.md`; it is generated at release time.
CI runs the same checks plus `claude plugin validate .`.

## Pull request titles

`main` only accepts squash merges, so a PR's title becomes its commit on `main`, and
release-please builds the changelog and the next version from those titles. Titles must
follow [Conventional Commits](https://www.conventionalcommits.org/); the `pr-title`
check enforces it.

| Prefix | Use for | Version bump | Changelog section |
|---|---|---|---|
| `feat:` | a new skill, or a new capability in one | minor | Added |
| `fix:` | a bug fix in a skill or tooling | patch | Fixed |
| `refactor:` / `perf:` | behaviour-preserving changes users might notice | patch | Changed |
| `docs:` | READMEs, catalog, overview pages, media | patch | Documentation |
| `ci:` / `build:` / `test:` / `chore:` | repository plumbing | none | hidden |

Mark a breaking change with `!` (for example `feat!: rename skill X to Y`). Breaking
means a skill is removed or renamed, or the plugin name changes. Before 1.0.0 a breaking
change bumps the minor version.

To produce several changelog entries from one PR, put them in the PR body:

```
BEGIN_COMMIT_OVERRIDE
feat: first entry
docs: second entry
END_COMMIT_OVERRIDE
```

## Releases

The whole repository shares one version (`version.txt`), and the Claude Code plugin
carries the same number. Releases are cut by
[release-please](https://github.com/googleapis/release-please):

1. Every merge to `main` updates an open release PR titled `chore(main): release X.Y.Z`.
   It bumps `version.txt`, `CHANGELOG.md` and the plugin `version` in
   `.claude-plugin/marketplace.json`.
2. GitHub doesn't run workflows on PRs opened by Actions, so the release PR starts
   without the required `validate` check. Close and reopen it once to trigger CI.
3. Merge the release PR. release-please tags `vX.Y.Z` and publishes a GitHub Release.

Claude Code compares the plugin `version` to decide whether installed copies need
updating, so merged changes reach plugin users only when a release is merged. The
`skills` CLI tracks content hashes, so `npx skills update` picks up changes on `main`
without waiting for a release.

The plugin's source is `./skills`, so only skill folders are copied into users' plugin
caches. Keep it that way: anything a skill needs must live inside its own folder.
