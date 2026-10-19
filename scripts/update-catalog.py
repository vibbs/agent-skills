#!/usr/bin/env python3
"""Regenerate the skills catalog from skills/*/SKILL.md frontmatter.

Writes two generated blocks:
  README.md         the skills table, with a preview thumbnail per skill
  docs/catalog.md   one section per skill, with the full preview GIF

The catalog also quotes the first paragraph of each overview page's
"## The problem" section, so the problem statement has one source.

Preview media is found by convention, never declared in a skill:
  docs/skills/<name>/media/preview.png   thumbnail for the README table
  docs/skills/<name>/media/tour.gif      full preview for the catalog

Frontmatter is read with the official reference library (skills-ref) via uv,
so this script has no Python dependencies of its own.

Usage:
  scripts/update-catalog.py           rewrite both blocks
  scripts/update-catalog.py --check   exit 1 if either is out of date
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SKILLS_REF_VERSION = "0.1.1"
REPO = "vibbs/agent-skills"
ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
CATALOG = ROOT / "docs" / "catalog.md"
BEGIN = "<!-- catalog:begin -->"
END = "<!-- catalog:end -->"
THUMB_WIDTH = 240
GIF_WIDTH = 960

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


def problem_statement(name: str) -> str:
    """First paragraph of the '## The problem' section of the skill's overview page."""
    page = ROOT / "docs" / "skills" / name / "README.md"
    if not page.is_file():
        return ""
    m = re.search(r"^## The problem\s*\n(.*?)(?:\n\s*\n|\Z)", page.read_text(), re.M | re.S)
    return " ".join(m.group(1).split()) if m else ""


def skills() -> list[dict]:
    out = []
    for skill_md in sorted(ROOT.glob("skills/*/SKILL.md")):
        props = read_properties(skill_md.parent)
        summary, when = split_description(props["description"])
        name = props["name"]
        media = ROOT / "docs" / "skills" / name / "media"
        out.append({
            "name": name,
            "summary": summary,
            "problem": problem_statement(name),
            "when": when,
            "thumb": (media / "preview.png").is_file(),
            "gif": (media / "tour.gif").is_file(),
        })
    return out


def readme_table(items: list[dict]) -> str:
    rows = ["| Preview | Skill | Description | When it triggers |", "|---|---|---|---|"]
    for s in items:
        n = s["name"]
        preview = "-"
        if s["thumb"]:
            preview = (f'<a href="docs/skills/{n}/"><img src="docs/skills/{n}/media/preview.png" '
                       f'width="{THUMB_WIDTH}" alt="{n} preview"></a>')
        link = f"[`{n}`](docs/skills/{n}/)"
        rows.append(f"| {preview} | {link} | {cell(s['summary'])}. | {cell(s['when']) or '-'} |")
    return "\n".join(rows)


def catalog_sections(items: list[dict]) -> str:
    parts = []
    for s in items:
        n = s["name"]
        lines = [f"## {n}", "", f"{s['summary']}.", ""]
        if s["problem"]:
            lines += [f"**The problem:** {s['problem']}", ""]
        if s["when"]:
            lines += [f"**When it triggers:** {s['when']}", ""]
        if s["gif"]:
            lines += [f'<img src="skills/{n}/media/tour.gif" width="{GIF_WIDTH}" '
                      f'alt="{n}: animated preview">', ""]
        lines += [
            "```bash",
            f"npx skills add {REPO} --skill {n}",
            "```",
            "",
            f"[Overview](skills/{n}/) · [Source](../skills/{n}/)",
        ]
        parts.append("\n".join(lines))
    return "\n\n".join(parts)


def replace_block(path: Path, body: str, check: bool) -> bool:
    """Return True if the file is (now) current; False if --check found drift."""
    rel = path.relative_to(ROOT)
    text = path.read_text()
    if BEGIN not in text or END not in text:
        print(f"{rel} is missing {BEGIN} / {END} markers", file=sys.stderr)
        return False
    head, rest = text.split(BEGIN, 1)
    _, tail = rest.split(END, 1)
    new = f"{head}{BEGIN}\n{body}\n{END}{tail}"
    if new == text:
        print(f"{rel} is up to date")
        return True
    if check:
        print(f"{rel} is out of date; run scripts/update-catalog.py", file=sys.stderr)
        return False
    path.write_text(new)
    print(f"{rel} updated")
    return True


def main() -> int:
    check = "--check" in sys.argv[1:]
    items = skills()
    ok = replace_block(README, readme_table(items), check)
    ok = replace_block(CATALOG, catalog_sections(items), check) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
