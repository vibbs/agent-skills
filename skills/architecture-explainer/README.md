# architecture-explainer

Turns a system description into one self-contained, interactive HTML explainer. You
author the topology once; the reader can switch between audience personas (exec,
architect, engineer), analytical lenses (data flow, cost, failure modes, ...), and eras
(past, today, planned), or follow a narrated tour. The output is a single `.html` file
with no network calls, so it can be hosted, embedded in an `<iframe>`, or opened offline.

The skill interviews you about the system before drawing anything. It will not invent
an architecture you did not describe.

## Example invocation

> Explain how our order pipeline works for the engineering blog. Readers are a mix of
> engineering managers and backend engineers. I want them to see what changed between
> the monolith and today's event-driven setup.

## Example output

The agent writes a spec like this (excerpt from the bundled worked example,
`assets/runtime/specs/llm-eval.js`) and builds it. The page shows the spec's title in the
browser tab and "By <author> · Updated <date>" under the subtitle; the linter fails a spec
with no `meta.updated`. Each build is copied to `<slug-of-title>-<YYYY-MM-DD>.html` (with `-2`, `-3` if that name is
taken), so a second build never overwrites the first:

```js
{
  id: "retriever",
  kind: "process",
  label: { default: "Hybrid Retriever", exec: "Knowledge Lookup" },
  why: "Stops the model inventing answers about your documents.",
  facts: { cost: "$0.0004 / query", risk: "Stale index = confidently wrong answers" },
}
```

```
$ npm run build
spec: How an LLM Evaluation Pipeline Actually Works
  39 nodes (30 leaves) · 31 edges · 12 beats
  3 personas · 5 lenses · 3 eras
  45 distinct projections from one topology

lint passed
dist/index.html  173.87 kB │ gzip: 90.76 kB

$ cp dist/index.html how-an-llm-evaluation-pipeline-actually-works-2026-07-14.html
```

Each explainer gets its own working folder, `explainer-<slug>/`; a second explainer in
the same project reuses that runtime with a new spec.

## Requirements

- Node.js 18+ and network access for `npm install`.
- Playwright with a Chromium browser for the screenshot check
  (`npx playwright install chromium`).

Known issue: on npm 11.5, `npm install` can fail with
`Cannot read properties of null (reading 'edgesOut')` while resolving
`@preact/preset-vite`'s peer dependencies. `npm install --legacy-peer-deps` works around
it; npm 12 is not affected.

In the Claude web and desktop apps (skill uploaded as a ZIP), the build runs in Claude's
code execution sandbox. This is untested: `npm install` needs access to the npm registry,
and the screenshot step needs Playwright to download Chromium, which the sandbox's
network settings may block. If only the screenshot step fails, the built
file is still usable but has not been visually checked.

## Bundled scripts

All live in `assets/runtime/scripts/` and run only when the agent or you invoke them.

| Script | What it does |
|---|---|
| `lint.mjs` | Checks the spec (beats, `why` on every node, lens coverage). Runs before every build. |
| `shots.mjs` | Opens the built file in headless Chromium and writes screenshots to `shots/`. |
| `fonts.mjs` | Maintainer only. Re-subsets the bundled fonts with `pyftsubset` and regenerates `src/fonts.gen.js`. Not needed to build an explainer. |
