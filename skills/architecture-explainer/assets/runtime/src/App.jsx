import { useEffect, useMemo, useRef, useState, useCallback } from "preact/hooks";
import Diagram from "./Diagram.jsx";
import { project } from "./core.js";
import { nodeShape, KIND_SHAPES } from "./shapes.js";
import { resolveTheme, applyTheme } from "./themes.js";
import { ThemeCtx, useTheme } from "./ctx.js";

/* ── URL state ─────────────────────────────────────────────────────────── */
function readHash() {
  try {
    const h = (location.hash || "").replace(/^#/, "");
    const out = {};
    for (const part of h.split("&")) {
      const [k, v] = part.split("=");
      if (k && v) out[k] = decodeURIComponent(v);
    }
    return out;
  } catch {
    return {};
  }
}

// Sandboxed embeds (srcdoc iframes, some CMS preview panes) run at origin
// "null", where history.replaceState throws. Deep links stop being written
// there; everything else keeps working.
let urlWritable = true;
function writeHash(state) {
  if (!urlWritable) return;
  const parts = Object.entries(state)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  const next = "#" + parts.join("&");
  try {
    if (next !== location.hash) history.replaceState(null, "", next);
  } catch {
    urlWritable = false;
  }
}

function useMedia(q) {
  const [on, setOn] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia(q).matches
  );
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia(q);
    const fn = () => setOn(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [q]);
  return on;
}

/* ── atoms ─────────────────────────────────────────────────────────────── */
function Seg({ label, options, value, onChange, accent }) {
  return (
    <div class="seg">
      <span class="seg-label">{label}</span>
      <div class="seg-btns">
        {options.map((o) => (
          <button
            key={o.id}
            class={"seg-btn" + (o.id === value ? " on" : "")}
            style={o.id === value && accent ? { color: accent, borderColor: accent } : null}
            onClick={() => onChange(o.id)}
            title={o.blurb || ""}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({ node, personaDef, lensDef, accent }) {
  if (!node) return null;
  const factKeys = personaDef.facts.filter((k) => node.facts && node.facts[k]);
  const LABELS = {
    cost: "Cost",
    runtime: "Runtime",
    tech: "Built with",
    owner: "Owned by",
    risk: "Fails by",
    governance: "Governance",
  };
  if (lensDef.fact && node.facts[lensDef.fact] && !factKeys.includes(lensDef.fact))
    factKeys.unshift(lensDef.fact);

  return (
    <div class="info">
      <div class="info-kind" style={{ color: accent }}>
        {node.isGroup ? "TIER" : (node.kind || "").toUpperCase()}
      </div>
      <h4>{node.label}</h4>
      {node.why && <p class="info-why">{node.why}</p>}
      {node.detail && <p class="info-detail">{node.detail}</p>}
      {factKeys.length > 0 && (
        <dl class="facts">
          {factKeys.map((k) => (
            <div key={k}>
              <dt>{LABELS[k] || k}</dt>
              <dd>{node.facts[k]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Legend now teaches SHAPE, because shape is what carries node kind. */
function Legend({ lensDef, eraDef, personaDef, accent }) {
  const th = useTheme();
  const c = th.c;
  return (
    <div class="legend">
      <div class="legend-row">
        {KIND_SHAPES.map(([kind, label]) => {
          const { d, extras } = nodeShape(kind, { x: 1, y: 1, w: 26, h: 15 }, Math.min(th.shape.radius, 3));
          return (
            <span class="legend-item" key={kind}>
              <svg width="30" height="18" aria-hidden="true">
                <path d={d} fill={c.surface} stroke={c.line2} stroke-width="1" />
                {extras.map((ex, i) =>
                  ex.type === "line" ? (
                    <line key={i} x1={ex.x1} y1={Math.max(ex.y1, 3)} x2={ex.x2} y2={Math.min(ex.y2, 13)}
                          stroke={c.ink2} stroke-opacity={ex.opacity} stroke-width="0.9" />
                  ) : ex.type === "circle" ? (
                    <circle key={i} cx={7} cy={6} r={2} fill={c.ink2} fill-opacity={ex.opacity} />
                  ) : (
                    <path key={i} d={ex.d} fill="none" stroke={c.ink2} stroke-opacity={ex.opacity} stroke-width="0.9" />
                  )
                )}
              </svg>
              {label}
            </span>
          );
        })}
        <span class="legend-item">
          <svg width="30" height="18" aria-hidden="true">
            <rect x="1" y="1" width="26" height="15" rx={Math.min(th.shape.radius, 3)}
                  fill="none" stroke={c.line2} stroke-width="1" stroke-dasharray="4 3" />
          </svg>
          Planned
        </span>
      </div>
      <div class="legend-notes">
        <span>
          <b style={{ color: accent }}>{lensDef.label}</b> — {lensDef.blurb}
        </span>
        <span>
          <b>{personaDef.label}</b> — {personaDef.blurb}
        </span>
        <span>
          <b>{eraDef.label}</b> — {eraDef.blurb}
        </span>
      </div>
    </div>
  );
}

/* ── explainer ─────────────────────────────────────────────────────────── */
function Explainer({ spec, colour, setColour }) {
  const th = useTheme();
  const narrow = useMedia("(max-width: 760px)");
  const touch = useMedia("(hover: none)");
  // Reflow is graded, not binary: a tablet or a phone in landscape is too
  // wide for one column and too narrow for the full grid.
  const oneCol = useMedia("(max-width: 560px)");
  const twoCol = useMedia("(max-width: 1000px)");
  const shortViewport = useMedia("(max-height: 520px)");
  const maxCols = oneCol ? 1 : twoCol ? 2 : 99;
  // The legibility floor is universal, not a mobile special case: a 7px label
  // is a smudge on a desktop too. Never render below it — show a legible part
  // of the system and let the reader pan, rather than an unreadable whole.
  const minScale = narrow ? 0.85 : shortViewport ? 0.82 : 0.78;
  const init = readHash();
  const [mode, setMode] = useState(init.mode || "read");
  const [beat, setBeat] = useState(Math.max(0, Math.min(spec.beats.length - 1, +init.beat || 0)));
  const [ov, setOv] = useState({
    persona: init.persona || null,
    lens: init.lens || null,
    era: init.era || null,
  });
  const [hoverId, setHoverId] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const beatObj = spec.beats[beat] || spec.beats[0];
  const inTour = mode === "read" || mode === "present";

  // Free-roam exploration is the weakest fit for a small screen; phones get
  // the narrated shells only.
  useEffect(() => {
    if (narrow && mode === "explore") setMode("read");
  }, [narrow, mode]);

  // Phones open at tier level whatever the beat asks for: engineer-level
  // detail is unreadable at this width, and an explicit tap can still go deeper.
  const sel = {
    persona:
      ov.persona || (narrow ? "exec" : inTour ? beatObj.persona : spec.personas[1].id),
    lens: ov.lens || (inTour ? beatObj.lens : spec.lenses[0].id),
    era: ov.era || (inTour ? beatObj.era : spec.defaultEra),
  };
  const focus = ov.persona || ov.lens || ov.era ? [] : inTour ? beatObj.focus || [] : [];

  const personaDef = spec.personas.find((p) => p.id === sel.persona);
  const lensDef = spec.lenses.find((l) => l.id === sel.lens);
  const eraDef = spec.eras.find((e) => e.id === sel.era);
  const accent = th.c.lens[sel.lens] || th.c.ink;

  useEffect(() => {
    writeHash({ mode, beat: inTour ? beat : null, colour: th.mode, ...ov });
  }, [mode, beat, ov.persona, ov.lens, ov.era, th.mode]);

  const goBeat = useCallback((i) => {
    setBeat((b) => {
      const n = Math.max(0, Math.min(spec.beats.length - 1, i));
      if (n !== b) setOv({ persona: null, lens: null, era: null });
      return n;
    });
  }, []);

  useEffect(() => {
    if (mode !== "present") return;
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goBeat(beat + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goBeat(beat - 1);
      } else if (e.key === "Escape") setMode("read");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, beat, goBeat]);

  const swipe = useRef(null);
  const sectionRefs = useRef([]);
  const didInitScroll = useRef(false);
  useEffect(() => {
    if (mode !== "read") return;
    // A deep link scrolls to its beat once — but the listener must still be
    // attached afterwards, or scrolling stops driving the diagram entirely.
    if (!didInitScroll.current) {
      didInitScroll.current = true;
      const el = beat > 0 ? sectionRefs.current[beat] : null;
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
    }
    const onScroll = () => {
      const line = window.innerHeight * 0.4;
      let idx = 0;
      sectionRefs.current.filter(Boolean).forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) idx = i;
      });
      goBeat(idx);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode, goBeat]);

  const hoverNode = useMemo(() => {
    if (!hoverId) return null;
    return project(spec, sel).nodes.get(hoverId) || null;
  }, [hoverId, sel.persona, sel.lens, sel.era]);

  const controls = (
    <div class="controls">
      <Seg label="Reading as" options={spec.personas} value={sel.persona}
           onChange={(v) => setOv((o) => ({ ...o, persona: v }))} />
      <Seg label="Lens" options={spec.lenses} value={sel.lens} accent={accent}
           onChange={(v) => setOv((o) => ({ ...o, lens: v }))} />
      <Seg label="Era" options={spec.eras.map((e) => ({ ...e, label: e.label.split(" — ")[0] }))}
           value={sel.era} onChange={(v) => setOv((o) => ({ ...o, era: v }))} />
    </div>
  );

  const stage = (compact, offsetX = 0, insetBottom = 0) => (
    <div class="stage">
      <Diagram spec={spec} sel={sel} offsetX={offsetX} insetBottom={insetBottom} focus={focus}
               maxCols={maxCols} minScale={minScale} touch={touch}
               hoverId={hoverId} onHoverNode={setHoverId} compact={compact} />
      {hoverNode && <InfoPanel node={hoverNode} personaDef={personaDef} lensDef={lensDef} accent={accent} />}
    </div>
  );

  const modeSwitch = (
    <div class="modes">
      {[["read", "Read"], ["explore", "Explore"], ["present", "Present"]]
        .filter(([m]) => !(narrow && m === "explore"))
        .map(([m, label]) => (
        <button key={m} class={"mode-btn" + (mode === m ? " on" : "")} onClick={() => setMode(m)}>
          {label}
        </button>
      ))}
      <button class="mode-btn tone" title="Switch light / dark"
              onClick={() => setColour(colour === "light" ? "dark" : "light")}>
        {colour === "light" ? "☾" : "☀"}
      </button>
    </div>
  );

  if (mode === "present") {
    const nav = (
      <div class={"present-nav" + (narrow ? " in-card" : "")}>
        <button onClick={() => goBeat(beat - 1)} disabled={beat === 0} aria-label="Previous">←</button>
        <button onClick={() => goBeat(beat + 1)} disabled={beat === spec.beats.length - 1} aria-label="Next">→</button>
        <button class="exit" onClick={() => setMode("read")}>Exit</button>
      </div>
    );
    return (
      <div class="present">
        {/* the prose card sits left on a desktop and bottom on a phone; on a
            phone it takes the viewport away rather than displacing the figure */}
        {stage(
          true,
          narrow ? 0 : Math.min(180, window.innerWidth * 0.12),
          narrow ? Math.round(window.innerHeight * 0.46) : 0
        )}
        <div
          class="present-card"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const st = swipe.current;
            swipe.current = null;
            if (!st) return;
            const dx = e.clientX - st.x;
            if (Math.abs(dx) > 55 && Math.abs(e.clientY - st.y) < 60)
              goBeat(beat + (dx < 0 ? 1 : -1));
          }}
        >
          <div class="present-head">
            <div class="present-meta">
              <span>{beat + 1} / {spec.beats.length}</span>
              <span class="dot" />
              <span>{personaDef.label}</span>
              <span class="dot" />
              <span style={{ color: accent }}>{lensDef.label}</span>
              {!narrow && <span class="dot" />}
              {!narrow && <span>{eraDef.label.split(" — ")[0]}</span>}
            </div>
            {narrow && nav}
          </div>
          <h2>{beatObj.title}</h2>
          {beatObj.prose.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {!narrow && nav}
        <div class="present-controls">{controls}</div>
      </div>
    );
  }

  if (mode === "explore") {
    return (
      <div class="app explore-mode">
        <Header spec={spec} right={modeSwitch} />
        <div class="explore-bar">
          {controls}
          <button class="tour-btn" onClick={() => { setOv({ persona: null, lens: null, era: null }); setMode("read"); }}>
            ↩ Guided tour
          </button>
        </div>
        <div class="explore-stage">{stage(false)}</div>
        <Legend lensDef={lensDef} eraDef={eraDef} personaDef={personaDef} accent={accent} />
      </div>
    );
  }

  return (
    <div class="app read-mode">
      <Header spec={spec} right={null} />
      <div class="read">
        <div class="prose">
          {spec.beats.map((b, i) => (
            <section key={b.id} ref={(el) => (sectionRefs.current[i] = el)}
                     class={"beat" + (i === beat ? " active" : "")}>
              <div class="beat-meta">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{spec.personas.find((p) => p.id === b.persona).label}</span>
                <span style={{ color: th.c.lens[b.lens] }}>
                  {spec.lenses.find((l) => l.id === b.lens).label}
                </span>
              </div>
              <h2>{b.title}</h2>
              {b.prose.split("\n\n").map((p, j) => <p key={j}>{p}</p>)}
            </section>
          ))}
          <section class="beat outro">
            <h2>Built as one file</h2>
            <p>
              Runtime, topology, prose, typeface and styling in a single self-contained HTML
              document with no network calls. Host it anywhere, open it offline, embed it in a
              page, or hand it to someone as an attachment.
            </p>
          </section>
        </div>
        <div class="sticky">
          <div class="stage-controls">{controls}{modeSwitch}</div>
          {stage(false)}
          {narrow ? (
            <div class="key-strip">
              <button class="key-btn" onClick={() => setShowKey((v) => !v)}>
                {showKey ? "Hide key ▲" : "Key ▼"}
              </button>
              {showKey && (
                <Legend lensDef={lensDef} eraDef={eraDef} personaDef={personaDef} accent={accent} />
              )}
            </div>
          ) : (
            <Legend lensDef={lensDef} eraDef={eraDef} personaDef={personaDef} accent={accent} />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ spec, right }) {
  return (
    <header class="hdr">
      <div>
        <h1>{spec.meta.title}</h1>
        <p>{spec.meta.subtitle}</p>
      </div>
      {right}
    </header>
  );
}

/* ── root ──────────────────────────────────────────────────────────────── */
export const THEME_ID = "house";

export default function Root({ spec }) {
  const init = readHash();
  const [colour, setColour] = useState(init.colour === "dark" ? "dark" : "light");
  const th = useMemo(() => resolveTheme(THEME_ID, colour), [colour]);

  useEffect(() => applyTheme(th), [th]);

  return (
    <ThemeCtx.Provider value={th}>
      <Explainer spec={spec} colour={colour} setColour={setColour} key={colour} />
    </ThemeCtx.Provider>
  );
}
