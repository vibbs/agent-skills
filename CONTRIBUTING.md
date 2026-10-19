# Contributing

Contributions are welcome: new skills, fixes to existing ones, and tooling improvements.

## Rules for skills

- **General-purpose only.** No company names, internal project names, private hostnames,
  credentials, or machine-specific paths. A skill should work for anyone who installs it.
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

Every skill has an overview page at `docs/skills/<name>/README.md`. Preview media is
optional and lives next to it, never inside the skill:

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

Commit the regenerated README table and `docs/catalog.md` with your change, add an entry
to `CHANGELOG.md`, and fill in the pull request template. CI runs the same checks plus
`claude plugin validate .`.

## Releases

When cutting a release, bump `version` in the plugin entry of
`.claude-plugin/marketplace.json` and add a `CHANGELOG.md` heading for it. Claude Code
uses that version to decide whether installed copies need updating.

The plugin's source is `./skills`, so only skill folders are copied into users' plugin
caches. Keep it that way: anything a skill needs must live inside its own folder.
