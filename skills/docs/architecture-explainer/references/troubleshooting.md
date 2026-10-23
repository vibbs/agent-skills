# Troubleshooting and traps

Every item here is a bug that actually shipped and had to be found by looking at a
screenshot. Read the relevant entry before editing layout, camera, or theme code.

---

## Labels are clipped inside their boxes

**Cause:** `theme.metrics.charFactor` is wrong for the typeface. It is the average glyph
width as a fraction of font-size, and the **layout depends on it** — box widths are
computed from it before anything renders.

A monospace face is ~20% wider than a grotesque. Adding JetBrains Mono with a grotesque's
factor clips every label in the diagram.

Rough values: Archivo `0.505`, Instrument Sans `0.525`, Inter `0.535`, JetBrains Mono
`0.60`. Measure before adding a face — render a long label and compare.

## An edge runs straight through five boxes

Long spans are supposed to route *around* the stack: any edge whose endpoints are more
than 130px apart vertically brackets out to the side, downward on the right and upward on
the left. If you see a line through the middle of the diagram, that threshold or the
branch in `edgeGeometry` has been changed.

## Arrowheads sit inside boxes

Edge endpoints must clip to the **rectangle border**, not the centre. `clipToRect` projects
a ray from each rect's centre toward the other and snaps to where it exits the perimeter.
This is the most commonly "simplified" function in graph-rendering code and it must not be.

Relatedly: arrowheads are inline `<path>` triangles computed from the line's actual
direction, **not** SVG `<marker>` elements. Markers fail on short edges, don't scale
predictably, and don't reorient during animation — all three happen here constantly.

## Nodes teleport instead of exploding out of their parent

The animation lerps **rect maps**, not component layout. Nodes that appear or disappear
substitute their nearest previously-visible ancestor's rect collapsed to a point. CSS
transitions and layout-animation libraries cannot produce this — they handle re-flow, not
appearance. Don't replace `useAnimatedFrame` with one.

## The camera barely zooms when a beat focuses a tier

Focus boxes get breathing room before fitting. The padding must be **mostly vertical**:
tiers already span the diagram's full width, so a percentage-based horizontal pad makes a
single focused tier as wide as the whole system and cancels the zoom entirely. Vertical
padding is also capped, because reflowed single-column tiers are tall and a proportional
pad frames mostly empty space.

## Everything renders at 2px on a phone / tablet / short window

Two mechanisms, both required:

- **Reflow**, not shrink. `maxCols` collapses grids to one column under 560px and two
  under 1000px. A landscape figure in a portrait viewport fits at ~0.15 scale no matter
  what you do to the camera.
- **The legibility floor.** The camera never renders below ~0.78–0.85. If a box can't fit
  at the floor it frames what it can and the reader pans. A legible part beats an
  unreadable whole — and this applies on desktop too, where "fit everything" at engineer
  level was producing 7px labels.

## The pinned diagram unpins after one screen of scrolling

`position: sticky` on a **grid item** is confined to its own grid row. The single-column
layout must be `display: flex; flex-direction: column`, not a one-column grid, or the
figure scrolls away immediately.

## The control bar overlaps itself / the page is wider than the viewport

Two separate causes, both hit at once on phones:

- `justify-content: space-between` on a `nowrap` flex row makes children **overlap** once
  the row exceeds its container. Use `flex-start` on narrow.
- A `nowrap` row expands its grid/flex parent past the viewport unless every ancestor in
  the chain has `min-width: 0`. Set it on the column, the stage, and the control bar.

## A lens looks identical to the base lens

Its edges have no `lenses` entry for it, so it's falling through to the ghost layer only.
Every lens needs either its own edges or facts on enough nodes to change the picture. The
linter warns below three edges and below four annotated nodes.

## An edge appears in an era where one endpoint doesn't exist

Era exclusion and persona collapse are **different**. A persona-collapsed node reroutes its
edges to a visible ancestor. An era-excluded node must take its edges with it. If you see a
"raw traces" arrow in v0 between two components that didn't exist yet, the `eraGone` check
in `project()` has been bypassed.

## Console error in an embed but not when opened directly

`history.replaceState` throws at origin `null` — sandboxed `srcdoc` iframes, artifact
panels, some CMS previews. URL deep-link writing must fail silently, not throw on every
state change. Always test inside a sandboxed iframe, not just `file://`.

## Two-pass layout

`computeSize()` walks bottom-up writing sizes; `place()` walks top-down writing positions.
Merging them computes wrong column widths, because a grid needs every child's size before
it can place any of them. Don't combine the passes.

## Touch does nothing

Input is **pointer events with two-pointer pinch**, not mouse + wheel. If you add a new
interaction, add it to the pointer path. Also: hover doesn't exist on touch, so every
hover-only affordance needs a tap equivalent — the node detail panel is tap-to-pin.

In read mode the diagram uses `touch-action: pan-y` so vertical drags scroll the story
rather than panning the figure. That's deliberate: beats drive the camera, so story
navigation wins. It does mean a reader who manually switches to engineer level on a phone
can only pinch and drag horizontally.
