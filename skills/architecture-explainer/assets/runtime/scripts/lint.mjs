/**
 * Spec linter. Runs before every build.
 *
 * The point of this file: a diagram that passes these checks is one a stranger
 * can understand without you standing next to it. An untoured, un-why'd,
 * exec-illegible diagram is not finished, and the build should say so.
 */
import { SPEC } from "../src/spec.js";

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

const MAX_LEAVES = 34;
const FACT_KEYS = new Set(["cost", "runtime", "tech", "owner", "risk", "governance"]);

const personas = new Set(SPEC.personas.map((p) => p.id));
const lenses = new Set(SPEC.lenses.map((l) => l.id));
const eras = new Set(SPEC.eras.map((e) => e.id));

const all = new Map();
const depthOf = new Map();
let leaves = 0;

(function walk(n, depth) {
  if (depth > 0) {
    if (all.has(n.id)) err(`duplicate node id: ${n.id}`);
    all.set(n.id, n);
    depthOf.set(n.id, depth);
    if (!n.label || !n.label.default) err(`${n.id}: missing label.default`);
    if (!n.why) err(`${n.id}: missing "why" — every box must justify its own existence`);
    if (!n.children || !n.children.length) leaves++;
    for (const k of Object.keys(n.facts || {}))
      if (!FACT_KEYS.has(k)) warn(`${n.id}: unknown fact key "${k}"`);
    for (const e of n.eras || []) if (!eras.has(e)) err(`${n.id}: unknown era "${e}"`);
    for (const p of n.collapseFor || []) if (!personas.has(p)) err(`${n.id}: unknown persona "${p}"`);
  }
  (n.children || []).forEach((c) => walk(c, depth + 1));
})(SPEC.root, 0);

// exec legibility: anything an exec can see must speak exec
const execDepth = (SPEC.personas.find((p) => p.id === "exec") || {}).depth || 1;
for (const [id, n] of all) {
  if (depthOf.get(id) <= execDepth) {
    if (!n.label.exec) warn(`${id}: visible to exec but has no exec label`);
    if (!n.detail || !n.detail.exec) err(`${id}: visible to exec but has no exec-level detail`);
  }
}

// edges
for (const e of SPEC.edges) {
  if (!all.has(e.from)) err(`edge ${e.from}→${e.to}: unknown source "${e.from}"`);
  if (!all.has(e.to)) err(`edge ${e.from}→${e.to}: unknown target "${e.to}"`);
  for (const l of e.lenses || []) if (!lenses.has(l)) err(`edge ${e.from}→${e.to}: unknown lens "${l}"`);
  for (const l of Object.keys(e.label || {}))
    if (!lenses.has(l)) err(`edge ${e.from}→${e.to}: label keyed to unknown lens "${l}"`);
  for (const x of e.eras || []) if (!eras.has(x)) err(`edge ${e.from}→${e.to}: unknown era "${x}"`);
}

// every lens must draw something
for (const l of SPEC.lenses) {
  const n = SPEC.edges.filter((e) => (e.lenses || []).includes(l.id)).length;
  if (n === 0) err(`lens "${l.id}" has no edges — it would render an empty diagram`);
  else if (n < 3) warn(`lens "${l.id}" only has ${n} edges`);
  if (l.fact && l.fact !== null) {
    const nodesWithFact = [...all.values()].filter((x) => x.facts && x.facts[l.fact]).length;
    if (nodesWithFact < 4) warn(`lens "${l.id}" annotates only ${nodesWithFact} nodes`);
  }
}

// every era must contain something in every tier
for (const era of SPEC.eras) {
  for (const tier of SPEC.root.children) {
    const alive = (tier.children || []).filter((c) => !c.eras || c.eras.includes(era.id));
    if (!alive.length && (!tier.eras || tier.eras.includes(era.id)))
      warn(`era "${era.id}": tier "${tier.id}" renders empty`);
  }
}

// meta: every explainer carries a title and a date, so a reader can tell how old it is
if (!SPEC.meta || !SPEC.meta.title) err("meta.title missing — it becomes the page and tab title");
if (!SPEC.meta || !SPEC.meta.updated)
  err('meta.updated missing — every explainer must say when it was last true (e.g. "2026-07-14")');

// beats
if (!SPEC.beats || !SPEC.beats.length)
  err("no beats — a diagram without a guided tour is not finished");
SPEC.beats.forEach((b, i) => {
  const at = `beat ${i + 1} (${b.id})`;
  if (!b.title) err(`${at}: missing title`);
  if (!b.prose || b.prose.length < 80) err(`${at}: prose too thin to carry a beat`);
  if (!personas.has(b.persona)) err(`${at}: unknown persona "${b.persona}"`);
  if (!lenses.has(b.lens)) err(`${at}: unknown lens "${b.lens}"`);
  if (!eras.has(b.era)) err(`${at}: unknown era "${b.era}"`);
  const pd = SPEC.personas.find((p) => p.id === b.persona);
  for (const f of b.focus || []) {
    if (!all.has(f)) {
      err(`${at}: focuses on unknown node "${f}"`);
      continue;
    }
    if (depthOf.get(f) > (pd ? pd.depth : 99))
      err(`${at}: focuses on "${f}" (depth ${depthOf.get(f)}) which the "${b.persona}" persona collapses away`);
    const node = all.get(f);
    if (node.eras && !node.eras.includes(b.era))
      err(`${at}: focuses on "${f}" which does not exist in era "${b.era}"`);
  }
});

if (leaves > MAX_LEAVES)
  err(`${leaves} leaf nodes (max ${MAX_LEAVES}) — split this into multiple diagrams`);

// report
const pad = (s) => "  " + s;
console.log(`\nspec: ${SPEC.meta?.title}`);
console.log(`  ${all.size} nodes (${leaves} leaves) · ${SPEC.edges.length} edges · ${SPEC.beats.length} beats`);
console.log(`  ${SPEC.personas.length} personas · ${SPEC.lenses.length} lenses · ${SPEC.eras.length} eras`);
const combos = SPEC.personas.length * SPEC.lenses.length * SPEC.eras.length;
console.log(`  ${combos} distinct projections from one topology\n`);

if (warns.length) {
  console.log("warnings:");
  warns.forEach((w) => console.log(pad("· " + w)));
  console.log("");
}
if (errors.length) {
  console.log("errors:");
  errors.forEach((e) => console.log(pad("✗ " + e)));
  console.log(`\nlint failed with ${errors.length} error(s)\n`);
  process.exit(1);
}
console.log("lint passed\n");
