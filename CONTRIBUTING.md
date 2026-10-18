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

## Before opening a pull request

Install [uv](https://docs.astral.sh/uv/), then:

```bash
scripts/validate.sh
scripts/update-catalog.py
```

Commit the regenerated README table with your change, add an entry to `CHANGELOG.md`,
and fill in the pull request template. CI runs the same checks plus
`claude plugin validate .`.

## Releases

When cutting a release, bump `version` in `.claude-plugin/plugin.json` and add a
`CHANGELOG.md` heading for it. Claude Code uses that version to decide whether installed
copies need updating.
