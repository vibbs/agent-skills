# Changelog

All notable changes to this repository are recorded here. Versions apply to the
repository as a whole and to the Claude Code plugin version in `.claude-plugin/plugin.json`.

## 0.1.0 - 2026-10-18

### Added

- `architecture-explainer`: builds a self-contained interactive HTML architecture
  explainer from one authored topology, with personas, lenses, eras, and a narrated tour.
- Claude Code plugin and marketplace manifests (`vibbs-agent-skills`).
- `scripts/validate.sh`: validates every skill with the official `skills-ref` validator.
- `scripts/update-catalog.py`: regenerates the README skills table from frontmatter.
- CI workflow running both scripts and `claude plugin validate` on every pull request.
