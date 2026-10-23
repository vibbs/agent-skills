#!/usr/bin/env python3
"""Check that skill docs and preview media follow the repository conventions.

  - every skill sits in a bucket, at skills/<bucket>/<skill>/, and skill names
    are unique across buckets
  - every bucket has a README.md, and the plugin's "skills" list in
    .claude-plugin/marketplace.json names every bucket except in-progress/
  - every shipped skill has docs/skills/<name>/README.md with a
    "## The problem" section
  - every docs/skills/<name>/ belongs to a skill that exists
  - every relative link or image in docs/ points at a file that exists
  - each preview media file is at most 2 MB
  - nothing under skills/ references docs/ (skills must stay self-contained)

No dependencies. Usage: scripts/check-docs.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNSHIPPED = {"in-progress"}
MAX_MEDIA_BYTES = 2 * 1024 * 1024
LINK = re.compile(r"""(?:\]\(|src=["'])([^)"'#\s]+)""")
TEXT_SUFFIXES = {".md", ".js", ".jsx", ".mjs", ".css", ".html", ".json"}


def main() -> int:
    errors = []
    for p in sorted(ROOT.glob("skills/*/SKILL.md")):
        errors.append(f"{p.parent.relative_to(ROOT)}: skills belong in a bucket, skills/<bucket>/<skill>/")

    buckets = sorted(p.name for p in (ROOT / "skills").iterdir() if p.is_dir())
    for b in buckets:
        if not (ROOT / "skills" / b / "README.md").is_file():
            errors.append(f"skills/{b}: missing README.md for the bucket")
    plugin = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text())["plugins"][0]
    listed = {Path(p).name for p in plugin.get("skills", [])}
    for b in sorted(set(buckets) - UNSHIPPED - listed):
        errors.append(f"skills/{b}: bucket missing from the plugin's skills list in marketplace.json")
    for b in sorted(listed - set(buckets)):
        errors.append(f"marketplace.json: plugin lists ./{b} but skills/{b}/ does not exist")
    for b in sorted(listed & UNSHIPPED):
        errors.append(f"marketplace.json: {b}/ must not ship in the plugin")

    found = {}
    for p in sorted(ROOT.glob("skills/*/*/SKILL.md")):
        found.setdefault(p.parent.name, []).append(p.parent.parent.name)
    for name, where in found.items():
        if len(where) > 1:
            errors.append(f"skill name {name} is used in more than one bucket: {', '.join(where)}")
    skills = {n for n, where in found.items() if where[0] not in UNSHIPPED}
    documented = {p.name for p in (ROOT / "docs" / "skills").glob("*") if p.is_dir()}

    for name in sorted(skills - documented):
        errors.append(f"skills/{name}: missing docs/skills/{name}/README.md")
    for name in sorted(documented - skills):
        errors.append(f"docs/skills/{name}: no matching skill in skills/")
    for name in sorted(skills & documented):
        page = ROOT / "docs" / "skills" / name / "README.md"
        if not page.is_file():
            errors.append(f"docs/skills/{name}: missing README.md")
        elif not re.search(r"^## The problem\s*\n\s*\S", page.read_text(), re.M):
            errors.append(f"docs/skills/{name}/README.md: missing a '## The problem' section")

    for md in sorted((ROOT / "docs").rglob("*.md")):
        for target in LINK.findall(md.read_text()):
            if re.match(r"^[a-z]+:", target):
                continue
            if not (md.parent / target).resolve().exists():
                errors.append(f"{md.relative_to(ROOT)}: broken link {target}")

    for media in sorted((ROOT / "docs" / "skills").glob("*/media/*")):
        size = media.stat().st_size
        if size > MAX_MEDIA_BYTES:
            errors.append(f"{media.relative_to(ROOT)}: {size / 1048576:.1f} MB exceeds 2 MB")

    for f in sorted((ROOT / "skills").rglob("*")):
        if f.is_file() and f.suffix in TEXT_SUFFIXES and "docs/skills/" in f.read_text(errors="ignore"):
            errors.append(f"{f.relative_to(ROOT)}: references docs/skills/; skills must be self-contained")

    for e in errors:
        print(e, file=sys.stderr)
    if not errors:
        print(f"docs OK ({len(skills)} skill(s))")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
