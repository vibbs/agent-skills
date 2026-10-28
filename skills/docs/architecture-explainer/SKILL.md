---
name: architecture-explainer
description: 'Build an interactive, self-contained HTML architecture explainer — one authored topology projected through audience personas, analytical lenses, eras, and a narrated tour, delivered as a single zero-network .html file that reads as an article, presents fullscreen, and embeds in any page. Use whenever the user wants to visualize or explain a system: "how does X work", "diagram our architecture", "system overview", "component map", "explain this pipeline", "make a diagram for the blog / for a client / for the docs", HLD or LLD, data flow, or turning a codebase or design doc into something a reader can explore. Strongly prefer this over Mermaid, ASCII art, drawio, or static SVG whenever the system has nested groups, more than one audience, or will be read by someone who is not in the room to narrate it.'
compatibility: Requires Node.js 18+ and network access for npm install; Playwright for screenshot verification.
---

# Architecture Explainer

Produces **one self-contained HTML file** per explainer: runtime, topology, prose,
typeface and styling inlined, no network calls at runtime. Host it anywhere, open it
offline, `<iframe>` it into a page, or attach it to an email.

## The model

**One topology, many projections.** The system is authored once, in full depth.
Everything else is a *selector over that single graph* — never a second diagram.

```
TOPOLOGY   nodes + edges + metadata        ← the only thing you author
──────────────────────────────────────
PERSONA    resolution policy — vocabulary, collapse depth, which facts surface
LENS       concern overlay — which edges exist, which fact each node advertises
ERA        past / present / planned — presence and status styling
BEATS      narrative — camera, focus, prose, in sequence
```

Two rules the runtime enforces and you must not fight:

1. **Colour belongs to the lens.** Node kind is carried by *shape* — folded corner for
   a source, spine for a store, figure for a human step, chamfered for a gate. Never
   reintroduce a colour-per-kind scheme; it turns the diagram into a rainbow and makes
   lens switching meaningless.
2. **A diagram without a guided tour is not finished.** The linter fails the build on
   zero beats. This is the rule that keeps these self-explanatory rather than pretty.

## Workflow — follow in order

### 1. Interview. Do not invent the system.

The single biggest failure mode is generating a plausible-looking architecture the user
never described. Ask before writing anything. Use your agent's structured question tool
if it has one.

Cover:

- **The tiers.** What are the 5–8 top-level stages or groups? These become the L1 boxes.
- **Components per tier.** Only what's worth showing. "Postgres" is a box; its tables are not.
- **The lifecycle.** Walk one representative request or job end to end. This produces the edges.
- **Who reads it.** Exec / architect / engineer is the usual set, but ask — it might be
  "client / our team", or "student / practitioner".
- **Which concerns matter.** Data flow plus 2–4 of: cost, latency, trust & governance,
  failure modes, ownership, security. Each lens needs its own edges or facts.
- **Whether there's a history.** v0 → today → planned is the highest-value axis for client
  work and roadmaps. Skip it if the system has no meaningful past.
- **The argument.** What should a reader believe after reading it? This becomes the beats.
  If the user has no argument, the explainer has no spine — push for one.

### 2. Pick the primary axis

Depth is rarely the interesting one. Ask what the diagram is *for*:

| Purpose | Primary axis |
|---|---|
| Teaching how it works | Time — beats walking one request through |
| Client / stakeholder pitch | Era — what exists, what's proposed |
| Design review, risk | Lens — failure modes, trust boundaries |
| Onboarding, reference | Depth — tiers then components |

### 3. Write the spec

**Read `references/spec-format.md` in full before writing one.** It is the complete
node / edge / beat reference with every optional field.

Copy `assets/runtime/specs/llm-eval.js` as the worked example — it exercises every feature
and is a good shape to imitate. Set `meta.updated` to today's date (`YYYY-MM-DD`) and
`meta.author` to whoever the user names; the linter requires the date. Write the new spec
to `specs/<slug>.js` (see step 4), then point `src/spec.js` at it (one line — the entry point and the
linter both read it through there).

### 4. Build

Copy `assets/runtime` to a working directory first and build there. Do not run
`npm install` inside the installed skill folder — it is often a shared or symlinked
install location.

Use one shared runtime folder per project, `./architecture-explainers`, holding every
explainer's spec side by side in `specs/`. If it already exists, do not copy again — `cp -R`
into an existing folder would nest the runtime inside it. Just add the new spec, point
`src/spec.js` at it, and build. `<slug>` below is the title in lowercase, each run of
non-alphanumerics replaced by `-`, no leading or trailing `-`; name the spec
`specs/<slug>.js`.

```bash
[ -d architecture-explainers ] || cp -R <skill-dir>/assets/runtime ./architecture-explainers
cd architecture-explainers
npm install                          # needs network; ~20s; first time only
npx playwright install chromium      # needed by step 5; first time only
npm run build                        # lints the spec first, then emits dist/index.html
```

`package.json` pins Vite through `overrides`, which is what lets a plain `npm install`
work on npm 11. If install still fails resolving peer dependencies, retry with
`npm install --legacy-peer-deps`.

The lint output tells you the projection count. If it fails, **fix the spec — never
weaken the linter.** Every rule it enforces exists because a real diagram shipped
without it and was worse. See `references/spec-format.md` for what each rule means.

### 5. Verify visually — mandatory, both form factors

This is the most-skipped step and the most consequential. The layout maths is non-trivial
and failures are silent: a clipped label, an edge routed through five boxes, a camera that
frames empty space. **Do not declare done without looking.**

```bash
node scripts/shots.mjs        # needs Chromium (see step 4) → shots/
```

The matrix is derived from your spec: every beat in Read mode, every persona × era on the
base lens, each other lens once, Present mode, and Read and Present at phone size
(390×844). Each shot loads fresh. The script fails on any page error, on a label wider
than its box, or on a page wider than the viewport. Passing is necessary, not sufficient:
open and inspect the images. Check:

- **Every persona × era combination** renders without overlap or clipping.
- **Each lens** actually changes the picture — if two lenses look identical, their edge
  sets are wrong.
- **Beat framing.** Step through beats; each should frame its focus with visible context,
  not empty space and not the whole system.
- **Labels.** Nothing clipped, nothing sitting on top of a box.
- **Phone.** Reflowed to one column, readable at 100%, controls not overflowing.
- **Console.** Zero errors, including inside a sandboxed iframe.

If something looks wrong, read `references/troubleshooting.md` before changing layout code.

### 6. Deliver

Every build writes `dist/index.html`, so the next build overwrites it. Copy it to a dated,
named file and give the user that copy, never `dist/index.html` itself:

```bash
out="<slug>-$(date +%Y-%m-%d).html"; n=2
while [ -e "$out" ]; do out="<slug>-$(date +%Y-%m-%d)-$n.html"; n=$((n+1)); done
cp dist/index.html "$out"
```

The copy lives in the runtime folder next to `dist/`; earlier builds stay as they were.
Tell the user the file name, that the page shows the date and author under the title, and
that the file is self-contained and can be hosted, embedded, or opened offline.

> **Claude Code / Claude apps only.** Hand the dated file to the user with whatever
> file-sharing tool the session offers. If they will revisit it — most explainers are —
> and the session has the `Artifact` tool, also publish it there.

## Non-negotiables

- Every node has a `why` — one sentence on why the box exists at all, not what it is.
- Anything an executive can see has exec-level `detail` in exec vocabulary.
- At least 6 beats, each with real prose. Thin beats produce a slideshow, not an argument.
- ≤34 leaf nodes. Past that, split into multiple explainers rather than cramming.
- One theme per build. Readers get a light/dark toggle, nothing more.

## Adapting

- **Different visual direction** — `src/themes.js` holds six (`house`, `swiss`,
  `editorial`, `draft`, `warm`, `shadcn`). Change `THEME_ID` at the top of that file; the
  build inlines exactly the faces the theme's font stacks lead with. Bundled faces are
  listed in `FACES` there (Archivo, Newsreader, Instrument Sans, Inter, JetBrains Mono). A
  new typeface needs an entry in `FACES` and in `scripts/fonts.mjs`, a regenerated `src/fonts.gen.js`
  (`npm run fonts`), and a measured `metrics.charFactor` or every label clips; see
  `references/troubleshooting.md`.
- **More personas / lenses / eras** — pure spec data, no code changes. A lens's colour is
  its spec `accent` if set, else the theme's palette entry for its id, else ink.
- **Generating from source** — a script that walks a repo and emits the `DIAGRAM` tree is a
  reasonable extension, but the `why`, `detail` and beats still have to come from a human.

## Scope

This builds explanatory figures, not live dashboards, not free-form drawing tools, and not
infrastructure inventories. If the user wants an editable diagram they'll keep dragging
around, they want drawio instead. If they want one number on a page, they want a chart.
