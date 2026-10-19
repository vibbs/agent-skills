# architecture-explainer

Turns a description of a system into one self-contained, interactive HTML explainer.

## The problem

A system diagram is usually drawn once, for one reader, and then expected to serve
everyone. An executive needs a handful of boxes and what they cost. An engineer needs
the thirty components behind them. A reviewer needs to see where customer data crosses
a boundary. Draw for the executive and the engineer learns nothing; draw for the
engineer and the executive sees a wall of boxes. So teams draw several diagrams, and
those drift apart as the system changes.

The second problem is narration. A diagram that made sense in the meeting, with its
author pointing at it, is opaque to someone reading it later. Mermaid, drawio and static
SVG show what is connected, but not why it is built that way or where to look first.

## How it solves it

You author the system once, as one topology. Everything a reader sees is a view over
that single graph, never a second diagram, so the views cannot drift apart:

- **Personas:** executive, architect and engineer views of the same system, with
  different vocabulary and depth.
- **Lenses:** data flow, cost, governance, failure modes and ownership. Each lens brings
  its own edges and colour.
- **Eras:** how the system looked before, today, and as planned.
- **A narrated tour:** the prose drives the camera and switches lens and era as it goes.
  It carries the argument for readers who weren't in the room, and the build refuses to
  produce an explainer without one.

The output is a single `.html` file with no network calls, so it keeps working when it is
hosted anywhere, embedded in an `<iframe>`, emailed, or opened offline.

<img src="media/tour.gif" width="960" alt="Read mode: scrolling the narrative switches persona, lens and era, and the diagram re-frames and recolours to match">

*Read mode of the bundled example (an LLM evaluation pipeline). Each section of prose
selects a persona, lens and era, and the diagram follows.*

## When to use it

The agent reaches for this skill when you want to explain or visualise a system: "how
does X work", "diagram our architecture", a pipeline write-up, an HLD/LLD, or turning a
codebase or design doc into something a reader can explore. It suits a system with
nested groups, more than one audience, or readers who won't have you there to walk
them through it.

It is not for live dashboards or diagrams you keep editing by hand; use drawio for those.

## What the agent does

1. **Interviews you before drawing anything:** tiers, components, one end-to-end request,
   the audiences, which concerns matter, and the argument the explainer should make.
2. **Writes a spec,** a plain JS module holding the topology, edges and narrative beats.
3. **Builds it.** A linter enforces the rules: every node has a `why`, the tour has beats
   with real prose, and every lens has its own edges. Vite then inlines everything into
   one file.
4. **Checks it visually** at desktop and phone sizes before handing it over.

## Install

```bash
npx skills add vibbs/agent-skills --skill architecture-explainer
```

Claude Code users can install the whole collection as a plugin instead; see the
[repository README](../../../README.md#install).

## Requirements

- Node.js 18+ and network access for `npm install`.
- Playwright with Chromium for the screenshot check.

## Links

- [Skill source](../../../skills/architecture-explainer/)
- [Spec format reference](../../../skills/architecture-explainer/references/spec-format.md)
- [Catalog](../../catalog.md)
