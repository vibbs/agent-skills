# Changelog

All notable changes to this repository are recorded here. Versions apply to the
repository as a whole and to the Claude Code plugin version in `.claude-plugin/marketplace.json`.

## Unreleased

### Added

- README: install instructions for the Claude web and desktop apps (ZIP upload, untested).
- `architecture-explainer` README: note on running in Claude's code execution sandbox.
- `docs/catalog.md` and `docs/skills/<name>/` overview pages, with a recorded tour GIF
  and thumbnail for `architecture-explainer`. The README skills table gains a Preview column.
- `scripts/check-docs.py`, run in CI: every skill has an overview page, docs links resolve,
  media is 2 MB or less, and nothing under `skills/` references `docs/`.

### Changed

- The Claude Code plugin's source is now `./skills`, so only skill folders are copied into
  the plugin cache. Plugin metadata moved from `.claude-plugin/plugin.json` (removed) into
  the marketplace entry.
- README documents `--sparse` for adding the marketplace without the docs media.

## 0.1.0 - 2026-10-18

### Added

- `architecture-explainer`: builds a self-contained interactive HTML architecture
  explainer from one authored topology, with personas, lenses, eras, and a narrated tour.
- Claude Code plugin and marketplace manifests (`vibbs-agent-skills`).
- `scripts/validate.sh`: validates every skill with the official `skills-ref` validator.
- `scripts/update-catalog.py`: regenerates the README skills table from frontmatter.
- CI workflow running both scripts and `claude plugin validate` on every pull request.
