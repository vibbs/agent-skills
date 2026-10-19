#!/usr/bin/env python3
"""Check that skill docs and preview media follow the repository conventions.

  - every skill in skills/ has docs/skills/<name>/README.md
  - every docs/skills/<name>/ belongs to a skill that exists
  - every relative link or image in docs/ points at a file that exists
  - each preview media file is at most 2 MB
  - nothing under skills/ references docs/ (skills must stay self-contained)

No dependencies. Usage: scripts/check-docs.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_MEDIA_BYTES = 2 * 1024 * 1024
LINK = re.compile(r"""(?:\]\(|src=["'])([^)"'#\s]+)""")
TEXT_SUFFIXES = {".md", ".js", ".jsx", ".mjs", ".css", ".html", ".json"}


def main() -> int:
    errors = []
    skills = {p.parent.name for p in ROOT.glob("skills/*/SKILL.md")}
    documented = {p.name for p in (ROOT / "docs" / "skills").glob("*") if p.is_dir()}

    for name in sorted(skills - documented):
        errors.append(f"skills/{name}: missing docs/skills/{name}/README.md")
    for name in sorted(documented - skills):
        errors.append(f"docs/skills/{name}: no matching skill in skills/")
    for name in sorted(skills & documented):
        if not (ROOT / "docs" / "skills" / name / "README.md").is_file():
            errors.append(f"docs/skills/{name}: missing README.md")

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
