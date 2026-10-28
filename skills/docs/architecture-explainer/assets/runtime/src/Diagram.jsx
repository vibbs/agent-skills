import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  project,
  layoutRoot,
  flatten,
  rectMap,
  edgeGeometry,
  easeInOut,
  lerpRect,
  substituteRect,
  bbox,
  wrap,
  HEADER_H,
  CHIP_H,
  setLayoutOpts,
} from "./core.js";
import { nodeShape } from "./shapes.js";
import { useTheme } from "./ctx.js";
import { lensAccent } from "./themes.js";

const DUR = 520;
const CAM_DUR = 640;

/* ── build a fully laid-out projection ─────────────────────────────────── */
function buildFrame(spec, sel, factor, maxCols) {
  setLayoutOpts({
    charFactor: factor,
    maxCols,
    // wider boxes in a single column: the width is free once the grid
    // is gone, and it buys full-size labels instead of wrapped ones
    leafMax: maxCols === 1 ? 300 : 236,
  });
  const proj = project(spec, sel);
  layoutRoot(proj.tree);
  const list = flatten(proj.tree);
  return { proj, list, rects: rectMap(list), size: { w: proj.tree.w, h: proj.tree.h } };
}

/* ── animation hook ────────────────────────────────────────────────────── */
function useAnimatedFrame(spec, sel, factor, maxCols) {
  const key = `${sel.persona}|${sel.lens}|${sel.era}|${factor}|${maxCols}`;
  const target = useMemo(() => buildFrame(spec, sel, factor, maxCols), [key]);
  const prevRef = useRef(target);
  const [t, setT] = useState(1);
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    if (prevRef.current === target) return;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    setT(0);
    const step = (now) => {
      const p = Math.min(1, (now - start) / DUR);
      setT(p);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else prevRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const prev = prevRef.current;
  const e = easeInOut(t);

  const items = [];
  const ids = new Set([...prev.rects.keys(), ...target.rects.keys()]);
  const prevParent = (id) => prev.proj.parentOf.get(id) || prev.proj.sourceParent.get(id);
  const nextParent = (id) => target.proj.parentOf.get(id) || target.proj.sourceParent.get(id);

  for (const id of ids) {
    const inPrev = prev.rects.has(id);
    const inNext = target.rects.has(id);
    const node = (inNext ? target.proj.nodes : prev.proj.nodes).get(id);
    if (!node) continue;
    let from = inPrev ? prev.rects.get(id) : substituteRect(id, prev.rects, prevParent);
    let to = inNext ? target.rects.get(id) : substituteRect(id, target.rects, nextParent);
    if (!from) from = to ? { ...to, w: 1, h: 1 } : null;
    if (!to) to = from ? { ...from, w: 1, h: 1 } : null;
    if (!from || !to) continue;
    items.push({
      id,
      node,
      rect: lerpRect(from, to, e),
      opacity: inPrev && inNext ? 1 : inNext ? e : 1 - e,
    });
  }
  items.sort((a, b) => a.node.depth - b.node.depth);

  const liveRects = new Map(items.map((i) => [i.id, i.rect]));
  const collect = (list, opacity, into) => {
    for (const ed of list) {
      const ra = liveRects.get(ed.from);
      const rb = liveRects.get(ed.to);
      if (!ra || !rb || ra.w < 3 || rb.w < 3) continue;
      into.push({ ...ed, geom: edgeGeometry(ra, rb), opacity });
    }
  };
  const edges = [];
  const ghosts = [];
  if (t < 1) collect(prev.proj.edges, 1 - e, edges);
  collect(target.proj.edges, t < 1 ? e : 1, edges);
  if (t < 1) collect(prev.proj.ghosts, 1 - e, ghosts);
  collect(target.proj.ghosts, t < 1 ? e : 1, ghosts);

  const size = {
    w: prev.size.w + (target.size.w - prev.size.w) * e,
    h: prev.size.h + (target.size.h - prev.size.h) * e,
  };

  return { items, edges, ghosts, size, proj: target.proj, targetRects: target.rects };
}

/* ── camera ────────────────────────────────────────────────────────────── */
/**
 * `insetBottom` is the height of chrome overlaying the stage (the prose card
 * on a phone). It shrinks the usable viewport rather than translating the
 * figure — translating pushes the focused tier off-screen entirely.
 */
function useCamera(viewport, size, focusRects, focusKey, offsetX = 0, minScale = 0, insetBottom = 0) {
  const [cam, setCam] = useState({ x: 0, y: 0, s: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const rafRef = useRef(0);

  const fitTo = (box, pad = 70, maxS = 1.9) => {
    if (!box || !viewport.w || !viewport.h) return;
    const vh = Math.max(140, viewport.h - insetBottom);
    const fit = Math.min(
      (viewport.w - pad * 2) / Math.max(box.w, 1),
      (vh - pad * 2) / Math.max(box.h, 1),
      maxS
    );
    // On a phone, never scale below legibility. If the box can't fit at that
    // floor, show its top at readable size and let the reader scroll down —
    // a two-pixel overview is worth less than a legible partial view.
    const s = Math.max(fit, minScale);
    const clamped = s > fit + 0.001;
    const target = {
      s,
      x: viewport.w / 2 + offsetX - (box.x + box.w / 2) * s,
      // when the scale floor kicks in, still centre the focus box if it fits
      // in the usable height — top-anchoring leaves a dead band under it
      y:
        !clamped || box.h * s <= vh - pad * 2
          ? vh / 2 - (box.y + box.h / 2) * s
          : pad - box.y * s,
    };
    cancelAnimationFrame(rafRef.current);
    const from = camRef.current;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / CAM_DUR);
      const e = easeInOut(p);
      setCam({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        s: from.s + (target.s - from.s) * e,
      });
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const has = focusRects && focusRects.length;
    let box = has ? bbox(focusRects) : { x: 0, y: 0, w: size.w, h: size.h };
    if (has && box) {
      // Breathe mostly vertically. Tiers already span the diagram's full
      // width, so padding horizontally by a percentage cancels the zoom
      // entirely — the focused tier ends up the same size as the whole system.
      const gx = Math.max(28, box.w * 0.05);
      // cap the vertical breathing room: reflowed single-column tiers are
      // tall, and a proportional pad would frame mostly empty space
      const gy = Math.min(Math.max(44, box.h * 0.8), 130);
      box = { x: box.x - gx, y: box.y - gy, w: box.w + gx * 2, h: box.h + gy * 2 };
    }
    fitTo(box, has ? 40 : 60, has ? 1.3 : 1.9);
  }, [focusKey, viewport.w, viewport.h]);

  return { cam, setCam, fitTo };
}

const truncate = (s, n) => (s.length > n ? s.slice(0, Math.max(3, n - 1)) + "…" : s);

/* ── node ──────────────────────────────────────────────────────────────── */
function NodeBox({ item, accent, onHover, onPick, touch, hovered, dimmed }) {
  const th = useTheme();
  const c = th.c;
  const { node, rect, opacity } = item;
  const isGroup = node.isGroup;
  const planned = node.src.eras && !node.src.eras.includes("today");
  const { d, extras } = nodeShape(isGroup ? "group" : node.kind, rect, th.shape.radius);

  const fs = isGroup ? 12.5 : node.depth >= 3 ? 11.5 : 12.5;
  const caps = th.type.caps;
  const lines = isGroup ? [node.label] : wrap(node.label, rect.w - 26, 2, fs);
  const chipY = rect.y + (isGroup ? HEADER_H - 5 : rect.h - CHIP_H - 6);
  const chipTint = th.mode === "dark" ? 0.2 : 0.13;

  return (
    <g
      opacity={opacity * (dimmed ? 0.22 : 1)}
      onMouseEnter={touch ? null : () => onHover(node.id)}
      onMouseLeave={touch ? null : () => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onPick(hovered ? null : node.id);
      }}
      style={{ cursor: "pointer" }}
    >
      <path
        d={d}
        fill={isGroup ? "none" : c.surface}
        stroke={hovered ? accent : isGroup ? c.line : c.line2}
        stroke-width={(hovered ? 1 : 0) + (isGroup ? th.shape.groupStroke : th.shape.nodeStroke)}
        stroke-dasharray={planned ? "5 4" : null}
      />
      {extras.map((ex, i) =>
        ex.type === "line" ? (
          <line key={i} x1={ex.x1} y1={ex.y1} x2={ex.x2} y2={ex.y2}
                stroke={c.ink2} stroke-opacity={ex.opacity} stroke-width="1" />
        ) : ex.type === "circle" ? (
          <circle key={i} cx={ex.cx} cy={ex.cy} r={ex.r}
                  fill={ex.fill ? c.ink2 : "none"} fill-opacity={ex.opacity} />
        ) : (
          <path key={i} d={ex.d} fill="none" stroke={c.ink2}
                stroke-opacity={ex.opacity} stroke-width="1" />
        )
      )}

      {isGroup ? (
        <text
          x={rect.x + 14}
          y={rect.y + 21}
          fill={c.ink2}
          font-size={caps ? 10.5 : 12}
          font-weight={caps ? 600 : th.type.labelWeight}
          letter-spacing={caps ? "0.13em" : "0.01em"}
        >
          {caps ? node.label.toUpperCase() : node.label}
        </text>
      ) : (
        lines.map((ln, i) => (
          <text
            key={i}
            x={rect.x + rect.w / 2}
            y={rect.y + (node.chip ? 24 : 28) + i * (fs + 3) - (lines.length - 1) * 3}
            fill={c.ink}
            font-size={fs}
            font-weight={th.type.labelWeight}
            text-anchor="middle"
            letter-spacing={th.type.tightness}
          >
            {ln}
          </text>
        ))
      )}

      {!isGroup && node.collapsedGroup && (
        <text
          x={rect.x + rect.w / 2}
          y={rect.y + rect.h - (node.chip ? CHIP_H + 10 : 12)}
          fill={c.ink3}
          font-size="9"
          text-anchor="middle"
          letter-spacing="0.09em"
        >
          + MORE INSIDE
        </text>
      )}

      {planned && !isGroup && (
        <text x={rect.x + rect.w - 9} y={rect.y + 13} fill={c.ink3}
              font-size="8.5" text-anchor="end" letter-spacing="0.1em">
          PLANNED
        </text>
      )}

      {node.chip && rect.w > 90 && (
        <g>
          <rect x={rect.x + 8} y={chipY} width={rect.w - 16} height={CHIP_H - 7}
                rx={th.shape.chipRadius} fill={accent} opacity={chipTint} />
          <text x={rect.x + rect.w / 2} y={chipY + 11} fill={accent}
                font-size="9.5" text-anchor="middle" font-weight="600">
            {truncate(node.chip, Math.floor((rect.w - 24) / (9.5 * th.metrics.charFactor)))}
          </text>
        </g>
      )}
    </g>
  );
}

/* ── background ────────────────────────────────────────────────────────── */
function Background({ kind, c }) {
  if (kind === "dot")
    return (
      <>
        <defs>
          <pattern id="bgp" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={c.line2} opacity="0.45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgp)" />
      </>
    );
  if (kind === "fine")
    return (
      <>
        <defs>
          <pattern id="bgfine" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0 L0 0 0 10" fill="none" stroke={c.line} stroke-width="0.6" />
          </pattern>
          <pattern id="bgp" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#bgfine)" />
            <path d="M50 0 L0 0 0 50" fill="none" stroke={c.line2} stroke-width="0.6" opacity="0.45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgp)" />
      </>
    );
  return null;
}

/* ── main component ────────────────────────────────────────────────────── */
export default function Diagram({ spec, sel, focus, onHoverNode, hoverId, compact,
                                 offsetX = 0, insetBottom = 0, maxCols = 99, minScale = 0, touch = false }) {
  const th = useTheme();
  const c = th.c;
  const wrapRef = useRef(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const frame = useAnimatedFrame(spec, sel, th.metrics.charFactor, maxCols);
  const accent = lensAccent(th, spec.lenses.find((l) => l.id === sel.lens));

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewport({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewport({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  const focusRects = (focus || []).map((id) => frame.targetRects.get(id)).filter(Boolean);
  const focusKey = `${sel.persona}|${sel.lens}|${sel.era}|${offsetX}|${insetBottom}|${maxCols}|${(focus || []).join(",")}`;
  const { cam, setCam, fitTo } = useCamera(
    viewport, frame.size, focusRects, focusKey, offsetX, minScale, insetBottom
  );

  // Pointer events, not mouse events: a phone has no mousedown and no wheel,
  // so the diagram was previously immovable on touch.
  const drag = useRef(null);
  const ptrs = useRef(new Map());
  const pinch = useRef(null);
  const moved = useRef(false);

  const localMid = (a, b) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
  };

  const onPointerDown = (e) => {
    wrapRef.current.setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) {
      moved.current = false;
      drag.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
    } else if (ptrs.current.size === 2) {
      drag.current = null;
      const [a, b] = [...ptrs.current.values()];
      pinch.current = {
        d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: localMid(a, b),
        cam: { ...cam },
      };
    }
  };

  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const p = pinch.current;
      const s = Math.max(0.25, Math.min(3, p.cam.s * (d / p.d)));
      const k = s / p.cam.s;
      const m = localMid(a, b);
      moved.current = true;
      setCam({ s, x: m.x - (p.mid.x - p.cam.x) * k, y: m.y - (p.mid.y - p.cam.y) * k });
      return;
    }
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;
    setCam((k) => ({ ...k, x: drag.current.cx + dx, y: drag.current.cy + dy }));
  };

  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 0) drag.current = null;
  };

  const onWheel = (e) => {
    e.preventDefault();
    const el = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - el.left;
    const my = e.clientY - el.top;
    setCam((k) => {
      const s = Math.max(0.25, Math.min(3, k.s * (e.deltaY > 0 ? 0.9 : 1.11)));
      const f = s / k.s;
      return { s, x: mx - (mx - k.x) * f, y: my - (my - k.y) * f };
    });
  };

  const pick = (id) => {
    if (moved.current) return;
    onHoverNode(id);
  };

  const focusSet = new Set(focus || []);
  const hasFocus = focusSet.size > 0;
  const dimmedFor = (item) => {
    if (!hasFocus || focusSet.has(item.id)) return false;
    let cur = frame.proj.parentOf.get(item.id);
    while (cur) {
      if (focusSet.has(cur)) return false;
      cur = frame.proj.parentOf.get(cur);
    }
    return true;
  };

  const ticks = th.shape.ticks ? cornerTicks(frame.size) : null;

  return (
    <div class="diagram" ref={wrapRef}>
      <svg
        width="100%"
        height="100%"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onClick={() => pick(null)}
      >
        <Background kind={th.shape.grid} c={c} />
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.s})`}>
          {ticks && (
            <g stroke={c.ink3} stroke-width="1" fill="none" opacity="0.6">
              {ticks.map((d, i) => <path key={i} d={d} />)}
            </g>
          )}

          {frame.ghosts.map((ed) => (
            <path key={"G" + ed.id} d={ed.geom.d} fill="none" stroke={c.ghost}
                  stroke-opacity={0.9 * ed.opacity} stroke-width="1" stroke-dasharray="3 5" />
          ))}

          {frame.edges.map((ed) => {
            const dim = hasFocus && !(focusSet.has(ed.from) || focusSet.has(ed.to)) ? 0.2 : 1;
            const col = ed.kind === "sensitive" ? c.lens.failure : accent;
            return (
              <g key={ed.id} opacity={ed.opacity * dim}>
                <path d={ed.geom.d} fill="none" stroke={col} stroke-opacity="0.62" stroke-width="1.4" />
                <path d={ed.geom.arrow} fill={col} fill-opacity="0.9" />
              </g>
            );
          })}

          {frame.items.map((it) => (
            <NodeBox key={it.id} item={it} accent={accent} onHover={onHoverNode}
                     onPick={pick} touch={touch}
                     hovered={hoverId === it.id} dimmed={dimmedFor(it)} />
          ))}

          {cam.s > 0.5 &&
            (() => {
              const placed = [];
              return frame.edges.map((ed) => {
              if (!ed.label) return null;
              const lw = ed.label.length * 9.5 * th.metrics.charFactor + 14;
              const overlaps = (b, r, pad) =>
                b.x < r.x + r.w + pad && b.x + b.w > r.x - pad &&
                b.y < r.y + r.h + pad && b.y + b.h > r.y - pad;
              // avoid nodes *and* labels already placed this frame — two
              // labels stacked on the same point are as unreadable as one
              // sitting on a box
              const hits = (b) =>
                frame.items.some((it) => !it.node.isGroup && overlaps(b, it.rect, 3)) ||
                placed.some((r) => overlaps(b, r, 2));
              // Slide the label along the edge normal until it clears every
              // box. An opaque label plate sitting on a node reads as a bug,
              // but dropping the label loses information — so move it first.
              const dx = ed.geom.p2.x - ed.geom.p1.x;
              const dy = ed.geom.p2.y - ed.geom.p1.y;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;
              let lb = null;
              for (const off of [0, 15, -15, 29, -29, 44, -44]) {
                const b = {
                  x: ed.geom.mid.x + nx * off - lw / 2,
                  y: ed.geom.mid.y + ny * off - 9,
                  w: lw,
                  h: 18,
                };
                if (!hits(b)) { lb = b; break; }
              }
              if (!lb) return null;
              placed.push(lb);
              const dim = hasFocus && !(focusSet.has(ed.from) || focusSet.has(ed.to)) ? 0.2 : 1;
              const col = ed.kind === "sensitive" ? c.lens.failure : accent;
              return (
                <g key={"L" + ed.id} opacity={ed.opacity * dim}>
                  <rect x={lb.x} y={lb.y} width={lb.w} height={lb.h}
                        rx={th.shape.chipRadius} fill={c.stage} stroke={col} stroke-opacity="0.45" />
                  <text x={lb.x + lb.w / 2} y={lb.y + 12.6} fill={col}
                        font-size="9.5" text-anchor="middle">
                    {ed.label}
                  </text>
                </g>
              );
              });
            })()}
        </g>
      </svg>

      {!compact && (
        <div class="cam-controls">
          <button title="Zoom in" onClick={() => setCam((k) => ({ ...k, s: Math.min(3, k.s * 1.2) }))}>+</button>
          <button title="Zoom out" onClick={() => setCam((k) => ({ ...k, s: Math.max(0.25, k.s / 1.2) }))}>−</button>
          <button title="Fit" onClick={() => fitTo({ x: 0, y: 0, w: frame.size.w, h: frame.size.h }, 60)}>⤢</button>
        </div>
      )}
    </div>
  );
}

/** Drafting-sheet corner marks around the diagram bounds. */
function cornerTicks(size) {
  const m = 26;
  const L = 16;
  const x0 = -m, y0 = -m, x1 = size.w + m, y1 = size.h + m;
  return [
    `M ${x0} ${y0 + L} L ${x0} ${y0} L ${x0 + L} ${y0}`,
    `M ${x1 - L} ${y0} L ${x1} ${y0} L ${x1} ${y0 + L}`,
    `M ${x1} ${y1 - L} L ${x1} ${y1} L ${x1 - L} ${y1}`,
    `M ${x0 + L} ${y1} L ${x0} ${y1} L ${x0} ${y1 - L}`,
  ];
}
