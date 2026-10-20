#!/usr/bin/env python3
"""Bump the version, generate a Keep-a-Changelog entry from conventional commits since the
last tag, commit, tag vX.Y.Z, and push.

Called first, automatically, by every deploy, so a tag always matches what is running.
Generated changelog entries are marked; don't hand-edit them.

    uv run python scripts/bump_version.py [--bump patch|minor|major] [--no-push] [--dry-run]
"""

import argparse
import datetime
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PYPROJECT = ROOT / "pyproject.toml"
CHANGELOG = ROOT / "CHANGELOG.md"
SECTIONS = {"feat": "Added", "fix": "Fixed"}


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()


def next_version(current: str, bump: str) -> str:
    major, minor, patch = (int(p) for p in current.split("."))
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def changelog_entry(version: str, subjects: list[str]) -> str:
    buckets: dict[str, list[str]] = {}
    for subject in subjects:
        m = re.match(r"^(\w+)(?:\([^)]*\))?!?:\s*(.+)$", subject)
        kind, text = (m.group(1), m.group(2)) if m else ("", subject)
        buckets.setdefault(SECTIONS.get(kind, "Changed"), []).append(text)
    lines = [f"## {version} - {datetime.date.today().isoformat()} <!-- generated -->", ""]
    for section in ("Added", "Fixed", "Changed"):
        if buckets.get(section):
            lines += [f"### {section}", "", *(f"- {s}" for s in buckets[section]), ""]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bump", choices=["patch", "minor", "major"], default="patch")
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    text = PYPROJECT.read_text()
    m = re.search(r'^version = "(\d+\.\d+\.\d+)"$', text, re.M)
    if not m:
        print("No version = \"X.Y.Z\" line in pyproject.toml", file=sys.stderr)
        return 1
    version = next_version(m.group(1), args.bump)
    try:
        last_tag = git("describe", "--tags", "--abbrev=0")
        log_range = f"{last_tag}..HEAD"
    except subprocess.CalledProcessError:
        log_range = "HEAD"
    subjects = [s for s in git("log", "--format=%s", log_range).splitlines() if s]
    entry = changelog_entry(version, subjects)
    if args.dry_run:
        print(entry, file=sys.stderr)
        return 0
    PYPROJECT.write_text(text.replace(m.group(0), f'version = "{version}"', 1))
    changelog = CHANGELOG.read_text()
    head, sep, rest = changelog.partition("\n## ")
    CHANGELOG.write_text(f"{head}\n{entry}\n{sep.lstrip(chr(10))}{rest}" if sep else f"{changelog}\n{entry}")
    git("add", str(PYPROJECT), str(CHANGELOG))
    git("commit", "-m", f"chore: release {version}")
    git("tag", f"v{version}")
    if not args.no_push:
        git("push", "--follow-tags")
    print(f"Released v{version}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
