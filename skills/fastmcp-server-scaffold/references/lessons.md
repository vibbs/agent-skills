# Lessons

Each of these was paid for in a production server built this way. Read before
"simplifying" anything the code marks as load-bearing.

**Tool descriptions are the only guaranteed channel to the model.** Behavioural guidance
lived in a client-side instructions file and wasn't carried into the tool descriptions;
in production the model looped a per-item tool once per person instead of making one bulk
call. Server `instructions` weren't a fix (claude.ai drops them). Rule: put it in the tool
description, then write a test that asserts the phrase is still there.

**Bulk and per-item tools must point at each other, both ways,** and roster tools must
say "don't loop this list through Y". Without all of it the model loops. When a flag
removes a tool, its cross-references must disappear too.

**Unregister capabilities; don't merely forbid them.** A rollout switch should make a tool
vanish from `tools/list`, not leave it visible and failing. Keep rollout control and
security policy as separate mechanisms.

**Ship new capabilities merged-but-off.** Off by default, on with an env var and a
restart; no rebuild, no revert-and-redeploy to kill something misbehaving.

**Pin the resolution, not just the declaration.** A `pip install` of a built wheel
re-resolved transitive dependencies on every image build, so production ran a different
framework patch than the lockfile claimed. Two of three OAuth incidents were framework
behaviour changes between patch versions. `uv sync --locked` in CI *and* the image: if
only the image build checks, a stale lockfile is first noticed after a version has
already been tagged.

**Make invisible configuration visible at startup.** A credential stored in a transformed
form raised nothing, health stayed green, and the upstream rejected it only after users
authenticated, on its own error page. It went unnoticed for days. Three defences: a
startup shape guard that fails hard, a startup log line fingerprinting the credential,
and a probe script that observes the value actually sent. Where secrets can't be read
back, capture the old value before overwriting it.

**Framework defaults will not match your upstream.** Three incidents, one shape: a
forwarded RFC parameter the upstream rejected (the error arrived as a URL fragment the
server never sees), an empty default scope list that broke client registration, and an
inherited callback path. Pin every proxy parameter with a comment naming the failure it
prevents; if a knob turns out not to be load-bearing, say so in its comment.

**Stamp token expiry.** A token file without an absolute expiry refreshes on every call
and trips the upstream's rate limit.

**Resolve identity once per session, not once per call.** Do it in the code-exchange and
refresh hooks and embed it in the issued token: one upstream call per login, not per tool
call.

**Make the fragile dependency optional, and record what that costs.** An external token
store kept failing on platform networking; making it optional (with the framework's
process-scoped store as the fallback) ended the fight. The honest follow-through: document
what the degraded mode can't do.

**Return errors; never let an exception reach the wire.** Two deployments hit unhandled
auth exceptions that surfaced as bare 500s with tracebacks. The middleware is twenty
lines; have it from day one.

**Separate the confirmation flag from the security boundary.** A model-set
`user_confirmed` attests to a deliberate second step, not to a human's approval. The
client's prompts are the real gate. Write that into the helper's docstring so nobody
deletes one as redundant.

**Annotations are product copy too.** A wrong `readOnlyHint` makes claude.ai and VS Code
run a write without asking. Review, test and snapshot annotations like docstrings.

**Normalise whitespace in description assertions,** or every docstring rewrap breaks a
test.

**Write a runbook the first time something bites,** and keep RCAs and a dated status doc
as files: they're what stops a problem being re-diagnosed from scratch by the next person
or agent.

**Automate conventions.** "Bump and tag before deploying" stayed a forgotten convention
until the deploy script called the bump script unconditionally.
