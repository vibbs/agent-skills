#!/usr/bin/env python3
"""Regenerate the skills table in README.md from skills/*/SKILL.md frontmatter.

Frontmatter is read with the official reference library (skills-ref) via uv,
so this script has no Python dependencies of its own.

Usage:
  scripts/update-catalog.py           rewrite the table in README.md
  scripts/update-catalog.py --check   exit 1 if README.md is out of date
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SKILLS_REF_VERSION = "0.1.1"
ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
BEGIN = "<!-- catalog:begin -->"
END = "<!-- catalog:end -->"

# The trigger sentence is the one that starts with "Use when", "Use whenever",
# "Use for", "Use this when", etc. The spec asks descriptions to state both what
# a skill does and when to use it, so no extra frontmatter field is needed.
TRIGGER = re.compile(r"\bUse (?:this (?:skill )?)?(?:when|whenever|for|if)\b", re.IGNORECASE)


def read_properties(skill_dir: Path) -> dict:
    out = subprocess.run(
        ["uvx", "--quiet", "--from", f"skills-ref=={SKILLS_REF_VERSION}",
         "agentskills", "read-properties", str(skill_dir)],
        check=True, capture_output=True, text=True,
    )
    return json.loads(out.stdout)


def split_description(desc: str) -> tuple[str, str]:
    """Return (summary, triggers). Summary is the first clause of the description."""
    desc = " ".join(desc.split())
    m = TRIGGER.search(desc)
    what = desc[: m.start()].strip() if m else desc
    when = ""
    if m:
        rest = desc[m.start():]
        end = re.search(r"(?<=[.!?])\s+(?=[A-Z])", rest)
        when = (rest[: end.start()] if end else rest).strip()
    # One line: cut at an em dash or the first sentence end.
    summary = re.split(r"\s+—\s+|(?<=[.!?])\s+", what, maxsplit=1)[0].rstrip(".")
    return summary, when


def cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def build_table() -> str:
    rows = ["| Skill | Description | When it triggers |", "|---|---|---|"]
    for skill_md in sorted(ROOT.glob("skills/*/SKILL.md")):
        props = read_properties(skill_md.parent)
        name = props["name"]
        summary, when = split_description(props["description"])
        link = f"[`{name}`](skills/{skill_md.parent.name}/)"
        rows.append(f"| {link} | {cell(summary)}. | {cell(when) or '-'} |")
    return "\n".join(rows)


def main() -> int:
    check = "--check" in sys.argv[1:]
    text = README.read_text()
    if BEGIN not in text or END not in text:
        print(f"README.md is missing {BEGIN} / {END} markers", file=sys.stderr)
        return 1
    head, rest = text.split(BEGIN, 1)
    _, tail = rest.split(END, 1)
    new = f"{head}{BEGIN}\n{build_table()}\n{END}{tail}"
    if new == text:
        print("README.md catalog is up to date")
        return 0
    if check:
        print("README.md catalog is out of date; run scripts/update-catalog.py", file=sys.stderr)
        return 1
    README.write_text(new)
    print("README.md catalog updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
