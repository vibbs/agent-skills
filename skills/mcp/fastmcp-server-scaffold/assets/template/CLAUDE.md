@AGENTS.md

## Claude Code specifics

- `.claude/settings.json` asks before every write tool (`permissions.ask`). It is
  edited by hand; `tests/unit/test_write_gates.py` checks it matches `WRITE_TOOLS` in
  `tools/writes.py`.
- `.claude/agents/end-user.md` is a subagent with nothing but this server's tools. Use it
  to test tool descriptions the way a real user meets them. If it needs a hint from
  engineering notes to behave, that hint belongs in a tool description.
