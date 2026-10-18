/**
 * core.js — projection, layout and animation math.
 *
 * Pure functions, no Preact. The whole "one topology, many projections" idea
 * lives in project(): given a persona / lens / era it returns a *drawable*
 * tree plus rerouted edges, derived from the single authored topology.
 */

// ── geometry constants ──────────────────────────────────────────────────────
export const PAD = 16;
export const GAP = 16;
export const TIER_GAP = 26;
export const HEADER_H = 34;
export const LEAF_H = 58;
export const CHIP_H = 22;
export const LEAF_MIN_W = 156;
export const LEAF_MAX_W = 236;

// Average glyph width as a fraction of font-size. Set per theme — a
// monospace face is ~20% wider than a grotesque, and layout sized for the
// wrong one clips every label.
let FACTOR = 0.53;
let MAX_COLS = 99;
let LEAF_MAX = LEAF_MAX_W;

/**
 * Layout options. `maxCols` is what makes the diagram reflow on a phone:
 * collapsing grids to one column turns a wide landscape figure into a tall
 * narrow one — the same shape as the screen — so labels stay full size
 * instead of being scaled down to two pixels.
 */
export function setLayoutOpts({ charFactor, maxCols, leafMax } = {}) {
  if (charFactor) FACTOR = charFactor;
  MAX_COLS = maxCols || 99;
  LEAF_MAX = leafMax || LEAF_MAX_W;
}
export function setCharFactor(f) {
  FACTOR = f;
}
export const charW = (fontSize) => fontSize * FACTOR;

export function measure(text, size = 12.5) {
  return (text || "").length * charW(size);
}

// wrap into at most `maxLines` lines that each fit `w` px
export function wrap(text, w, maxLines = 2, size = 12.5) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? cur + " " + word : word;
    if (measure(next, size) <= w || !cur) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (measure(last + "…", size) > w && last.length > 3)
      last = last.slice(0, -1);
    kept[maxLines - 1] = last + "…";
    return kept;
  }
  return lines;
}

// ── label / detail resolution ───────────────────────────────────────────────
export function labelFor(node, personaId) {
  const l = node.label || {};
  return l[personaId] || l.default || node.id;
}

export function detailFor(node, personaId, order) {
  const d = node.detail || {};
  if (d[personaId]) return d[personaId];
  for (const p of order) if (d[p]) return d[p];
  return null;
}

function inEra(item, eraId) {
  if (!item.eras) return true;
  return item.eras.includes(eraId);
}

// ── projection ──────────────────────────────────────────────────────────────
/**
 * @returns {{ tree, nodes: Map, order: string[], edges: [], parentOf: Map }}
 *   `tree` is a fresh, pruned, persona-collapsed copy of the topology.
 */
export function project(spec, { persona, lens, era }) {
  const personaDef = spec.personas.find((p) => p.id === persona) || spec.personas[0];
  const lensDef = spec.lenses.find((l) => l.id === lens) || spec.lenses[0];
  const maxDepth = personaDef.depth;

  const nodes = new Map(); // id -> projected node
  const parentOf = new Map(); // id -> parent id (projected tree)
  const sourceParent = new Map(); // id -> parent id (full topology)

  // index full topology so we can find ancestors of hidden nodes.
  // eraGone is different from persona-collapsed: a collapsed node reroutes its
  // edges to a visible ancestor, but a node that doesn't exist in this era must
  // take its edges with it.
  const eraGone = new Set();
  (function index(n, parent, gone) {
    if (parent) sourceParent.set(n.id, parent.id);
    const dead = gone || !inEra(n, era);
    if (dead) eraGone.add(n.id);
    (n.children || []).forEach((c) => index(c, n, dead));
  })(spec.root, null, false);

  function build(node, depth) {
    if (!inEra(node, era)) return null;

    const collapsed =
      depth >= maxDepth || (node.collapseFor || []).includes(persona);

    const kids = collapsed
      ? []
      : (node.children || []).map((c) => build(c, depth + 1)).filter(Boolean);

    const out = {
      id: node.id,
      src: node,
      depth,
      kind: node.kind || (node.children ? "group" : "process"),
      isGroup: kids.length > 0,
      collapsedGroup: collapsed && (node.children || []).length > 0,
      label: labelFor(node, persona),
      why: node.why || null,
      detail: detailFor(node, persona, personaDef.facts ? [persona] : []),
      facts: node.facts || {},
      chip: lensDef.fact ? node.facts && node.facts[lensDef.fact] : null,
      cols: node.cols || 1,
      children: kids,
      w: 0,
      h: 0,
      x: 0,
      y: 0,
    };
    // richer detail fallback across personas
    if (!out.detail) {
      const order = spec.personas.map((p) => p.id);
      out.detail = detailFor(node, persona, order);
    }
    nodes.set(node.id, out);
    kids.forEach((k) => parentOf.set(k.id, node.id));
    return out;
  }

  const tree = build(spec.root, 0);

  // nearest ancestor that survived projection
  function visibleAncestor(id) {
    let cur = id;
    const guard = new Set();
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      if (nodes.has(cur)) return cur;
      cur = sourceParent.get(cur);
    }
    return null;
  }

  // ── edges ──
  function buildEdges(lensId) {
    const merged = new Map();
    for (const e of spec.edges) {
      if (!inEra(e, era)) continue;
      if (e.lenses && !e.lenses.includes(lensId)) continue;
      if (eraGone.has(e.from) || eraGone.has(e.to)) continue;
      const a = visibleAncestor(e.from);
      const b = visibleAncestor(e.to);
      if (!a || !b || a === b) continue;
      if (isAncestor(parentOf, a, b) || isAncestor(parentOf, b, a)) continue;
      const key = a + " " + b;
      const label = e.label ? e.label[lensId] || null : null;
      const prev = merged.get(key);
      if (prev) {
        if (label && !prev.label) prev.label = label;
        if (e.kind === "sensitive") prev.kind = "sensitive";
      } else {
        merged.set(key, { id: key, from: a, to: b, label, kind: e.kind || "default" });
      }
    }
    return [...merged.values()];
  }

  const edges = buildEdges(lens);
  // Under any lens other than flow, keep the structure visible as a ghost
  // layer. A lens should re-weight the picture, not delete it.
  const base = spec.lenses[0].id;
  const shown = new Set(edges.map((e) => e.id));
  const ghosts = lens === base ? [] : buildEdges(base).filter((e) => !shown.has(e.id));

  return {
    tree,
    nodes,
    parentOf,
    sourceParent,
    edges,
    ghosts,
    personaDef,
    lensDef,
    visibleAncestor,
  };
}

function isAncestor(parentOf, maybeAncestor, id) {
  let cur = parentOf.get(id);
  const guard = new Set();
  while (cur && !guard.has(cur)) {
    if (cur === maybeAncestor) return true;
    guard.add(cur);
    cur = parentOf.get(cur);
  }
  return false;
}

// ── layout ──────────────────────────────────────────────────────────────────
// Two passes: computeSize walks bottom-up writing w/h, then place() walks
// top-down writing x/y. Combining them computes wrong column widths.

export function computeSize(node) {
  if (!node.children.length) {
    const raw = measure(node.label, 13) + 34;
    node.w = Math.max(LEAF_MIN_W, Math.min(LEAF_MAX, raw));
    node.h = LEAF_H + (node.chip ? CHIP_H : 0) + (node.collapsedGroup ? 8 : 0);
    return node;
  }
  node.children.forEach(computeSize);

  const cols = Math.max(1, Math.min(node.cols, MAX_COLS, node.children.length));
  const rows = Math.ceil(node.children.length / cols);
  const colW = new Array(cols).fill(0);
  const rowH = new Array(rows).fill(0);
  node.children.forEach((c, i) => {
    const r = Math.floor(i / cols);
    const cIdx = i % cols;
    colW[cIdx] = Math.max(colW[cIdx], c.w);
    rowH[r] = Math.max(rowH[r], c.h);
  });
  const innerW = colW.reduce((a, b) => a + b, 0) + GAP * (cols - 1);
  const innerH = rowH.reduce((a, b) => a + b, 0) + GAP * (rows - 1);

  node._colW = colW;
  node._rowH = rowH;
  node._cols = cols;
  node._innerW = innerW;
  node._innerH = innerH;

  const headMin = measure(node.label, 13.5) + 60;
  node.w = Math.max(innerW + PAD * 2, headMin);
  node.h = HEADER_H + (node.chip ? CHIP_H : 0) + innerH + PAD;
  return node;
}

export function place(node, x, y) {
  node.x = x;
  node.y = y;
  if (!node.children.length) return;
  const cols = node._cols;
  const colW = node._colW;
  const rowH = node._rowH;
  const startX = x + (node.w - node._innerW) / 2;
  let cy = y + HEADER_H + (node.chip ? CHIP_H : 0);
  let i = 0;
  for (let r = 0; r < rowH.length; r++) {
    let cx = startX;
    for (let c = 0; c < cols; c++) {
      const child = node.children[i];
      if (!child) break;
      // centre each child in its column cell and vertically in its row
      place(child, cx + (colW[c] - child.w) / 2, cy + (rowH[r] - child.h) / 2);
      cx += colW[c] + GAP;
      i++;
    }
    cy += rowH[r] + GAP;
  }
}

/** Lay out the root as a vertical stack of equal-width tiers. */
export function layoutRoot(tree) {
  tree.children.forEach(computeSize);
  const maxW = Math.max(...tree.children.map((c) => c.w), 320);
  // re-flow tiers to a common width so the stack reads as one column
  tree.children.forEach((c) => {
    c.w = maxW;
  });
  let y = 0;
  tree.children.forEach((c) => {
    place(c, 0, y);
    y += c.h + TIER_GAP;
  });
  tree.x = 0;
  tree.y = 0;
  tree.w = maxW;
  tree.h = Math.max(0, y - TIER_GAP);
  return tree;
}

export function flatten(tree) {
  const out = [];
  (function walk(n) {
    if (n !== tree) out.push(n);
    n.children.forEach(walk);
  })(tree);
  return out;
}

export function rectMap(list) {
  const m = new Map();
  list.forEach((n) => m.set(n.id, { x: n.x, y: n.y, w: n.w, h: n.h }));
  return m;
}

// ── edge geometry ───────────────────────────────────────────────────────────
export function clipToRect(r, tx, ty) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx === 0 ? Infinity : r.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : r.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

export function edgeGeometry(ra, rb) {
  const ac = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 };
  const bc = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };

  // Long spans get routed *around* the stack instead of straight through it.
  // Without this, a feedback edge from the last tier to the first draws a line
  // straight down the middle of every box in between.
  const vGap = Math.max(0, Math.max(ra.y, rb.y) - Math.min(ra.y + ra.h, rb.y + rb.h));
  const hGap = Math.max(0, Math.max(ra.x, rb.x) - Math.min(ra.x + ra.w, rb.x + rb.w));
  const horizontalish = Math.abs(bc.y - ac.y) < (ra.h + rb.h) / 4;

  let p1, c1, c2, p2;

  if (vGap > 130) {
    // any edge that skips a tier gets routed around the stack
    const up = bc.y < ac.y;
    const out = 40 + Math.min(120, vGap * 0.09);
    if (up) {
      const sx = Math.min(ra.x, rb.x) - out;
      p1 = { x: ra.x, y: ac.y };
      p2 = { x: rb.x, y: bc.y };
      c1 = { x: sx, y: p1.y };
      c2 = { x: sx, y: p2.y };
    } else {
      const sx = Math.max(ra.x + ra.w, rb.x + rb.w) + out;
      p1 = { x: ra.x + ra.w, y: ac.y };
      p2 = { x: rb.x + rb.w, y: bc.y };
      c1 = { x: sx, y: p1.y };
      c2 = { x: sx, y: p2.y };
    }
  } else if (horizontalish && hGap > 300) {
    const out = 40 + Math.min(90, hGap * 0.08);
    const sy = Math.min(ra.y, rb.y) - out;
    p1 = { x: ac.x, y: ra.y };
    p2 = { x: bc.x, y: rb.y };
    c1 = { x: p1.x, y: sy };
    c2 = { x: p2.x, y: sy };
  } else {
    p1 = clipToRect(ra, bc.x, bc.y);
    p2 = clipToRect(rb, ac.x, ac.y);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const horiz = Math.abs(dx) > Math.abs(dy);
    const k = 0.42;
    c1 = horiz ? { x: p1.x + dx * k, y: p1.y } : { x: p1.x, y: p1.y + dy * k };
    c2 = horiz ? { x: p2.x - dx * k, y: p2.y } : { x: p2.x, y: p2.y - dy * k };
  }

  const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  // arrowhead: direction from c2 -> p2
  const adx = p2.x - c2.x;
  const ady = p2.y - c2.y;
  const len = Math.hypot(adx, ady) || 1;
  const ux = adx / len;
  const uy = ady / len;
  const AL = 9;
  const AH = 4.6;
  const bx = p2.x - ux * AL;
  const by = p2.y - uy * AL;
  const arrow = `M ${p2.x} ${p2.y} L ${bx - uy * AH} ${by + ux * AH} L ${
    bx + uy * AH
  } ${by - ux * AH} Z`;
  const mid = bezierPoint(p1, c1, c2, p2, 0.5);
  return { d, arrow, mid, p1, p2 };
}

function bezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

// ── animation ───────────────────────────────────────────────────────────────
export const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function lerpRect(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
  };
}

/**
 * Build the rect a node should animate *from* when it doesn't exist in the
 * previous frame: its nearest previously-visible ancestor, collapsed to a
 * point. This is what makes nodes explode out of / implode into their parent
 * instead of teleporting.
 */
export function substituteRect(id, rects, parentChain) {
  let cur = parentChain(id);
  const guard = new Set();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    if (rects.has(cur)) {
      const r = rects.get(cur);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2, w: 1, h: 1 };
    }
    cur = parentChain(cur);
  }
  return null;
}

export function bbox(rects) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  if (!isFinite(x0)) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
