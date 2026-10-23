#!/usr/bin/env python3
"""Render a dated HTML report from readiness-check.md.

Reads the JSON block under "## Machine state, don't edit by hand" in
<project>/readiness-check.md, adds the credit values from assets/credits.json,
injects both into assets/report-template.html, and writes
<project>/.readiness/report-<generated_on>.html. A second report on the same day
gets a -2, -3 ... suffix, so earlier reports are never overwritten. The output is
one self-contained file with no network requests.

Python 3.8+, standard library only. Writes nothing else.

Usage:
  render_report.py [project-dir]        default: the current directory
  render_report.py [project-dir] --out <file>
"""
import argparse
import json
import re
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL_DIR / "assets" / "report-template.html"
CREDITS = SKILL_DIR / "assets" / "credits.json"
HEADING = "## Machine state, don't edit by hand"
SLOT = "/*READINESS_DATA*/"
REQUIRED = ("schema", "generated_on", "project", "phase", "counts", "items")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def fail(msg: str) -> None:
    print(f"render_report: {msg}", file=sys.stderr)
    sys.exit(1)


def read_state(report: Path) -> dict:
    if not report.is_file():
        fail(f"{report} not found; write readiness-check.md first")
    text = report.read_text(encoding="utf-8")
    if HEADING not in text:
        fail(f"no '{HEADING}' heading in {report}")
    block = re.search(r"```json\s*\n(.*?)\n```", text.split(HEADING, 1)[1], re.S)
    if not block:
        fail(f"no ```json block under '{HEADING}' in {report}")
    try:
        state = json.loads(block.group(1))
    except json.JSONDecodeError as e:
        fail(f"machine state is not valid JSON (line {e.lineno}, column {e.colno}): {e.msg}")
    missing = [k for k in REQUIRED if k not in state]
    if missing:
        fail(f"machine state is missing: {', '.join(missing)}")
    return state


def next_free(folder: Path, date: str) -> Path:
    """report-<date>.html, or report-<date>-2.html and so on if that exists."""
    if not DATE.match(str(date)):
        fail(f"generated_on must be YYYY-MM-DD, got {date!r}")
    out = folder / f"report-{date}.html"
    n = 2
    while out.exists():
        out = folder / f"report-{date}-{n}.html"
        n += 1
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Render a dated HTML report from readiness-check.md.")
    ap.add_argument("project", nargs="?", default=".", help="project root (default: current directory)")
    ap.add_argument("--out", help="output file (default: <project>/.readiness/report-<date>.html)")
    args = ap.parse_args()

    project = Path(args.project).resolve()
    state = read_state(project / "readiness-check.md")
    state["credits"] = json.loads(CREDITS.read_text(encoding="utf-8"))

    template = TEMPLATE.read_text(encoding="utf-8")
    if template.count(SLOT) != 1:
        fail(f"{TEMPLATE} must contain the data slot {SLOT} exactly once")

    # Escape "<" so nothing in the data can close the <script> tag or open a comment.
    data = json.dumps(state, ensure_ascii=False).replace("<", "\\u003c")
    html = template.replace(SLOT, data)

    out = Path(args.out).resolve() if args.out else next_free(project / ".readiness", state["generated_on"])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
