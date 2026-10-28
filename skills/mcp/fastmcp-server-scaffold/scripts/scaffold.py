#!/usr/bin/env python3
"""Render the FastMCP server template into a new project directory.

Standard library only. Reads assets/template/ and assets/manifest.json next to this
script's skill folder, and writes nothing outside --out.

  - Renames tokens: scaffold_server -> --package, scaffold-server -> --name,
    "Scaffold Server" -> --title, SCAFFOLD_ -> --env-prefix, OWNER/scaffold-server -> --repo.
  - Validates option combinations: --repo is required, `registry` needs `pypi` (its
    publish step runs in the PyPI release workflow), `stateless` needs HTTP.
  - Keeps or strips blocks between `scaffold:if <cond>` and `scaffold:end` marker lines.
    A condition is terms joined by `&` (all true) and `|` (any group true), each term
    optionally negated with `!`. Terms: auth=<mode>, http, with=<feature>.
  - Drops whole files whose manifest condition is false.
  - Writes .scaffold.json recording the template version, date, FastMCP pin and options,
    and fills @TEMPLATE_VERSION@ and @GENERATED_DATE@ (the CHANGELOG's first entry).

Usage:
  scaffold.py --out ../acme-tickets-mcp --name acme-tickets --auth proxy --repo acme/tickets-mcp
  scaffold.py --out DIR --name NAME --auth none --repo OWNER/REPO --with output-schema,coverage
  scaffold.py --list-features
"""

from __future__ import annotations

import argparse
import datetime
import fnmatch
import json
import re
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL_DIR / "assets" / "template"
MANIFEST = SKILL_DIR / "assets" / "manifest.json"
MARKER = re.compile(r"scaffold:(?:if\s+(?P<cond>\S+)|(?P<end>end))\b")
SKIP_DIRS = {"__pycache__", ".ruff_cache", ".pytest_cache", ".venv", ".mypy_cache"}
NAME_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
REPO_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?/[A-Za-z0-9._-]+$")
FASTMCP_PIN = re.compile(r'^\s*"fastmcp(?P<spec>[^"]*)",?\s*$', re.M)
PROVENANCE = ".scaffold.json"


def load_manifest() -> dict:
    return json.loads(MANIFEST.read_text())


def _term(term: str, features: set[str]) -> bool:
    negate = term.startswith("!")
    name = term[1:] if negate else term
    return (name in features) != negate


def evaluate(cond: str, features: set[str]) -> bool:
    """`a|b` is true if either holds; `a&b` if both do; `&` binds tighter than `|`."""
    return any(all(_term(t, features) for t in group.split("&")) for group in cond.split("|"))


def render_text(text: str, features: set[str], where: str) -> str:
    out: list[str] = []
    stack: list[bool] = []
    for lineno, line in enumerate(text.splitlines(keepends=True), 1):
        m = MARKER.search(line)
        if m:
            if m.group("end"):
                if not stack:
                    raise SystemExit(f"{where}:{lineno}: scaffold:end without scaffold:if")
                stack.pop()
            else:
                stack.append(evaluate(m.group("cond"), features))
            continue
        if all(stack):
            out.append(line)
    if stack:
        raise SystemExit(f"{where}: unclosed scaffold:if block")
    rendered = "".join(out)
    rendered = re.sub(r"\n{4,}", "\n\n\n", rendered)  # pruned blocks leave blank runs
    return rendered


def replace_tokens(text: str, tokens: list[tuple[str, str]]) -> str:
    for old, new in tokens:
        text = text.replace(old, new)
    return text


def fastmcp_pin() -> str:
    m = FASTMCP_PIN.search((TEMPLATE / "pyproject.toml").read_text())
    if not m:
        raise SystemExit("assets/template/pyproject.toml: no fastmcp dependency line")
    return m.group("spec")


def main(argv: list[str] | None = None) -> int:
    manifest = load_manifest()
    optional = manifest["optional_features"]
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", type=Path, help="target directory; must not exist or be empty")
    p.add_argument("--name", help="server name, kebab-case (e.g. acme-tickets)")
    p.add_argument("--package", help="Python package name (default: name with _)")
    p.add_argument("--title", help="human-readable title (default: from name)")
    p.add_argument("--env-prefix", help="environment variable prefix (default: PACKAGE upper-cased)")
    p.add_argument("--repo", help="GitHub owner/name for links and the registry name (required)")
    p.add_argument("--auth", choices=["proxy", "resource-server", "none"])
    p.add_argument("--no-http", action="store_true", help="stdio only (implied by --auth none)")
    p.add_argument("--with", dest="with_", default="", help=f"comma-separated: {', '.join(optional)}")
    p.add_argument("--dry-run", action="store_true", help="list files that would be written")
    p.add_argument("--list-features", action="store_true")
    args = p.parse_args(argv)

    if args.list_features:
        for name, desc in optional.items():
            print(f"{name:16} {desc}")
        return 0
    if not (args.out and args.name and args.auth and args.repo):
        p.error("--out, --name, --auth and --repo are required "
                "(--repo is the intended GitHub owner/name, even if it doesn't exist yet)")
    if not REPO_RE.match(args.repo):
        p.error("--repo must be owner/name, e.g. acme/acme-tickets-mcp")
    if not NAME_RE.match(args.name):
        p.error("--name must be kebab-case: lowercase letters, digits and single hyphens")
    selected = {w.strip() for w in args.with_.split(",") if w.strip()}
    unknown = selected - set(optional)
    if unknown:
        p.error(f"unknown --with feature(s): {', '.join(sorted(unknown))}")
    http = not (args.no_http or args.auth == "none")
    if "stateless" in selected and not http:
        p.error("--with stateless needs the HTTP transport")
    if "registry" in selected and "pypi" not in selected:
        p.error("--with registry needs --with pypi: the registry publish step runs in the "
                "PyPI release workflow, after the package is published")

    package = args.package or args.name.replace("-", "_")
    title = args.title or args.name.replace("-", " ").title()
    prefix = (args.env_prefix or package.upper()).rstrip("_") + "_"
    features = {f"auth={args.auth}", *(f"with={w}" for w in selected)}
    if http:
        features.add("http")

    out: Path = args.out
    if out.exists() and any(out.iterdir()):
        p.error(f"{out} exists and is not empty")

    tokens = [
        ("OWNER/scaffold-server", args.repo),
        ("scaffold_server", package),
        ("scaffold-server", args.name),
        ("Scaffold Server", title),
        ("SCAFFOLD_", prefix),
    ]
    binary_globs = manifest.get("binary", [])
    file_conditions: dict[str, str] = manifest.get("files", {})
    substitutions = manifest.get("substitutions", [])
    version = manifest["version"]
    today = datetime.date.today().isoformat()
    stamps = [("@TEMPLATE_VERSION@", version), ("@GENERATED_DATE@", today)]
    provenance = {
        "skill": "fastmcp-server-scaffold",
        "template_version": version,
        "generated": today,
        "fastmcp": fastmcp_pin(),
        "options": {
            "name": args.name,
            "package": package,
            "title": title,
            "env_prefix": prefix,
            "repo": args.repo,
            "auth": args.auth,
            "no_http": not http,
            "with": sorted(selected),
        },
        "transport": "stdio+http" if http else "stdio",
    }

    written: list[str] = []
    for src in sorted(TEMPLATE.rglob("*")):
        if not src.is_file() or SKIP_DIRS.intersection(src.parts):
            continue
        rel = src.relative_to(TEMPLATE).as_posix()
        cond = next((c for g, c in file_conditions.items() if fnmatch.fnmatch(rel, g)), None)
        if cond is not None and not evaluate(cond, features):
            continue
        dest_rel = replace_tokens(rel, tokens)
        written.append(dest_rel)
        if args.dry_run:
            continue
        dest = out / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if any(fnmatch.fnmatch(rel, g) for g in binary_globs):
            dest.write_bytes(src.read_bytes())
            continue
        text = render_text(src.read_text(), features, rel)
        for sub in substitutions:
            if fnmatch.fnmatch(rel, sub["file"]):
                value = sub["values"].get(args.auth if sub["by"] == "auth" else ("http" if http else "stdio"))
                if sub["find"] not in text:
                    raise SystemExit(f"{rel}: substitution target not found: {sub['find']!r}")
                text = text.replace(sub["find"], value)
        dest.write_text(replace_tokens(replace_tokens(text, stamps), tokens))
        if src.stat().st_mode & 0o111:
            dest.chmod(dest.stat().st_mode | 0o755)

    written.append(PROVENANCE)
    if args.dry_run:
        print("\n".join(written))
        return 0
    (out / PROVENANCE).write_text(json.dumps(provenance, indent=2) + "\n")
    print(f"Wrote {len(written)} files to {out}")
    print(f"  template {version} generated {today}; options recorded in {PROVENANCE}")
    print(f"  auth={args.auth} transport={'stdio+http' if http else 'stdio'} "
          f"with={','.join(sorted(selected)) or '-'}")
    print("Next:")
    print(f"  cd {out}")
    print("  git init && uv lock && uv sync --extra dev")
    print("  uv run ruff check --fix --exit-zero -q . && uv run ruff format -q .   # normalise renamed imports")
    print("  uv run ruff check . && uv run pyright && uv run pytest")
    return 0


if __name__ == "__main__":
    sys.exit(main())
