#!/usr/bin/env bash
# Validate every skill in skills/ against the Agent Skills spec using the
# official reference validator (skills-ref). Requires uv: https://docs.astral.sh/uv/
#
# Usage: scripts/validate.sh [skill-dir ...]   (defaults to all of skills/*/)
set -euo pipefail

SKILLS_REF_VERSION="0.1.1"
root="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$#" -gt 0 ]; then
  dirs=("$@")
else
  dirs=()
  for d in "$root"/skills/*/; do
    [ -d "$d" ] && dirs+=("${d%/}")
  done
fi

if [ "${#dirs[@]}" -eq 0 ]; then
  echo "no skills found under $root/skills" >&2
  exit 1
fi

failed=0
for d in "${dirs[@]}"; do
  if ! uvx --quiet --from "skills-ref==$SKILLS_REF_VERSION" agentskills validate "$d"; then
    failed=1
  fi
done

exit "$failed"
