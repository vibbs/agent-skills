# Spec format

A spec is a plain JS module exporting `SPEC`. It is the *only* thing you author —
the runtime never needs editing to build a new explainer, whatever its personas, lenses
and eras.

```js
export const SPEC = {
  meta:       { title, subtitle, author, updated },
  personas:   [ … ],   // who is reading
  lenses:     [ … ],   // which concern
  eras:       [ … ],   // when
  defaultEra: "today",  // era Explore opens on; omitted = the first era (warns)
  root:       { … },   // the topology
  edges:      [ … ],
  beats:      [ … ],   // the narrative
};
```

---

## meta — title, byline and date

```js
meta: {
  title:    "How an LLM Evaluation Pipeline Actually Works",
  subtitle: "A new model candidate lands on Monday. By Friday you either ship it or you don't.",
  author:   "Jane Doe",
  updated:  "2026-07-14",
}
```

- `title` — **required.** The page heading and the browser tab title.
- `subtitle` — one or two sentences under the title.
- `author` — optional. Shown as "By <author>" under the subtitle. Use the person or team
  the user names; ask if unsure, never make one up.
- `updated` — **required.** The date the explainer was last true to the system, shown as
  "Updated <date>" under the subtitle. Use the build date (`YYYY-MM-DD`) unless the user
  gives another. The linter fails the build without it: an architecture diagram with no
  date cannot tell a reader whether it is still accurate.

---

## personas — resolution policy, not a filter

A persona does not hide parts of the system. It changes *vocabulary*, *collapse depth*,
and *which facts surface*. The exec sees the same system an engineer does, described
differently and at a different grain.

```js
personas: [
  { id: "exec",      label: "Executive", blurb: "What it costs, what it de-risks, who owns it.",
    depth: 1, facts: ["cost", "risk", "owner"] },
  { id: "architect", label: "Architect", blurb: "Boundaries, data movement, failure surface.",
    depth: 2, facts: ["tech", "runtime", "owner", "risk"] },
  { id: "engineer",  label: "Engineer",  blurb: "The moving parts and what they're built from.",
    depth: 3, facts: ["tech", "runtime", "cost", "risk", "owner"] },
]
```

- `depth` — how many levels of nesting expand. 1 = tiers only.
- `facts` — which fact keys the hover panel shows, in order.
- An `exec` persona is special: when the spec has one, the linter requires exec-level
  `detail` on everything visible to it. Specs without one skip that check.
- On phones the reader starts at the persona with the smallest `depth`.

## lenses — a concern overlay

```js
lenses: [
  { id: "flow",    label: "Data flow",  blurb: "…", fact: null },
  { id: "cost",    label: "Cost",       blurb: "…", fact: "cost" },
  { id: "trust",   label: "Governance", blurb: "…", fact: "governance" },
  { id: "failure", label: "Failure",    blurb: "…", fact: "risk" },
  { id: "latency", label: "Latency",    blurb: "…", fact: "runtime",
    accent: { light: "#7A3FB0", dark: "#C49BEA" } },
]
```

- The **first lens is the base**. Under every other lens its edges persist as a faint
  dashed ghost layer, so the topology never disappears — a lens re-weights the picture,
  it does not delete it.
- `fact` — the fact key each node advertises as a chip when this lens is active.
- `accent` — optional. A colour string, or `{ light, dark }` for the two reader modes. If
  set it wins; otherwise the theme's tuned palette is used for the ids it knows (`flow`,
  `cost`, `trust`, `failure`, `ownership`, in `src/themes.js`), and any other lens falls
  back to the ink colour. Prefer leaving the known ids to the theme.
- A lens with no edges fails the build. A lens that annotates fewer than four nodes warns.

## eras

```js
eras: [
  { id: "v0",    label: "v0 — the spreadsheet", blurb: "…" },
  { id: "today", label: "Today",                blurb: "…" },
  { id: "next",  label: "Planned",              blurb: "…" },
]
```

Era membership is explicit per node and per edge via an `eras: [...]` array. Omitting it
means "exists in every era". A node absent from an era **takes its edges with it** — this
is different from persona collapse, where edges reroute to a visible ancestor.

Nodes that don't exist in `today` render with a dashed outline and a PLANNED tag.

---

## Nodes

```js
{
  id: "retriever",              // unique across the whole spec
  kind: "process",              // source | process | store | human | gate | group
  cols: 3,                      // children per row (nodes with children only)
  eras: ["today", "next"],      // omit = every era
  collapseFor: ["exec"],        // personas that see this node closed, children hidden

  label: {                      // per-persona vocabulary
    default:   "Hybrid Retriever",
    exec:      "Knowledge Lookup",
    engineer:  "pgvector + BM25, RRF fusion",
  },

  why: "Stops the model inventing answers about your documents.",   // REQUIRED

  detail: {
    exec:      "Finds the right source material before the model answers.",
    architect: "Dense + sparse hybrid, RRF, top-k=20 → cross-encoder rerank to 5.",
    engineer:  "Embedding dedup at 0.92 cosine; rerank on a 10% sample for cost.",
  },

  facts: {
    cost:       "$0.0004 / query",
    runtime:    "p95 240ms",
    tech:       "pgvector, HNSW m=16",
    owner:      "Platform team",
    risk:       "Stale index = confidently wrong answers",
    governance: "Post-scrub data only",
  },

  children: [ /* nested nodes */ ],
}
```

**`why` vs `detail`.** `why` is one sentence on why the box exists at all — the argument
for its existence, not a description. "Immutable versions are what let you tell a model
regression from a dataset change" is a `why`. "Stores datasets" is not.

**Fact keys are a fixed set**: `cost`, `runtime`, `tech`, `owner`, `risk`, `governance`.
Anything else warns. `risk` should describe *how it fails*, not that it might.

**Kinds** map to shapes, not colours:

| kind | shape | use for |
|---|---|---|
| `source` | folded top-left corner | where data originates |
| `process` | plain box | anything that transforms |
| `store` | box with a left spine | registries, databases, queues |
| `human` | box with a figure mark | steps requiring a person |
| `gate` | chamfered on all corners | decisions, blocks, releases |
| `group` | hairline container | tiers and nested groups (implicit) |

**`cols`** only matters at desktop width; phones collapse everything to one column and
tablets to two, so never rely on grid position to carry meaning.

---

## Edges

```js
{
  from: "retriever",
  to: "generator",
  lenses: ["flow", "cost"],                        // which lenses draw this
  label: { flow: "top-5 chunks", cost: "$0.02" },  // keyed by lens
  kind: "sensitive",                                // draws in the danger colour
  eras: ["next"],                                   // optional
}
```

- Endpoints may be nodes nested inside collapsed groups — the router reroutes to the
  nearest visible ancestor automatically.
- Labels are optional and get suppressed automatically when they'd collide with a box or
  another label. Use them for wire formats, sequence numbers, and costs — not prose.
- `kind: "sensitive"` is for trust boundaries: the one edge carrying raw customer data.
  Use it sparingly or it stops meaning anything.

---

## Beats

Beats are narrated selector states. The same beats drive Read mode (scroll), Present mode
(arrow keys / swipe), and the deep-link URL.

```js
{
  id: "b_cost",
  title: "Where the money actually goes",
  persona: "exec",
  lens: "cost",
  era: "today",
  focus: ["t_exec"],           // camera targets; [] = frame the whole system
  prose: "First paragraph.\n\nSecond paragraph.",
}
```

Rules the linter enforces:

- `prose` under 80 characters fails — a beat that thin is a caption, not an argument.
- `focus` may not name a node the beat's own persona collapses away — deeper than its
  `depth`, or inside an ancestor whose `collapseFor` names it — or one that doesn't exist
  in the beat's era.
- `defaultEra`, if given, must be a declared era. Missing `personas`, `lenses`, `eras`,
  `edges` or `root.children` are reported as lint errors.
- Zero beats fails the build outright.

Guidance that isn't enforced but matters:

- **Open at the whole system**, exec persona, base lens. Give the reader the shape before
  any detail.
- **One idea per beat.** If a beat's prose has two arguments, it's two beats.
- **Vary the axis.** A tour that only ever changes `focus` is a slideshow. The good ones
  switch lens to reframe, then switch era to show movement.
- **Close by handing over control** — tell the reader the controls exist and that every
  view is a link.

---

## Worked example

`assets/runtime/specs/llm-eval.js` is a complete, linted spec: 39 nodes, 31 edges,
12 beats, 3 personas × 5 lenses × 3 eras = 45 projections. It exercises every feature
including nested groups, `collapseFor`, per-lens edge sets, era-scoped nodes and edges,
and a feedback loop that routes around the stack. Read it before writing your own.
