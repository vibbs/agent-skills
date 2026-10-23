"""Source-level guards: cheap regex checks for mistakes no behavioural test catches."""

import re
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"


def _sources():
    return [(p, p.read_text()) for p in SRC.rglob("*.py")]


def test_no_logging_of_raw_tokens():
    pattern = re.compile(r"log\w*\.\w+\([^)]*(access_token|refresh_token|\btoken\b)[^)]*\)", re.S)
    offenders = [str(p) for p, text in _sources() if pattern.search(text)]
    assert not offenders, f"possible token logging in: {offenders}"


def test_nothing_prints_to_stdout():
    """On stdio, stdout is the protocol stream; one print() corrupts it."""
    offenders = [str(p) for p, text in _sources() if re.search(r"^\s*print\(", text, re.M)]
    assert not offenders, offenders
