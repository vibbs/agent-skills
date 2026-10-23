/**
 * Screenshot matrix + geometry check for the built file.
 *
 * Everything is derived from the spec being built (src/spec.js), so any
 * persona / lens / era / beat set works — nothing here names the example.
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { SPEC } from "../src/spec.js";

const file = "file://" + path.resolve("dist/index.html");
const out = "shots";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const P = SPEC.personas.map((p) => p.id);
const L = SPEC.lenses.map((l) => l.id);
const E = SPEC.eras.map((e) => e.id);
const base = L[0];
const mid = P[Math.min(1, P.length - 1)];
const era0 = E.includes(SPEC.defaultEra) ? SPEC.defaultEra : E[0];
const nn = (i) => String(i).padStart(2, "0");
const DESK = [1600, 1000];
const PHONE = [390, 844];

const shots = [];
const add = (name, hash, [w, h]) => shots.push([`${nn(shots.length + 1)}-${name}`, hash, w, h]);
// every beat in Read mode, then every persona × era on the base lens, then
// every other lens once, then the two phone shells
SPEC.beats.forEach((b, i) => add(`read-${b.id}`, `#mode=read&beat=${i}`, DESK));
for (const p of P)
  for (const e of E) add(`explore-${p}-${base}-${e}`, `#mode=explore&persona=${p}&lens=${base}&era=${e}`, DESK);
for (const l of L.slice(1)) add(`explore-${mid}-${l}-${era0}`, `#mode=explore&persona=${mid}&lens=${l}&era=${era0}`, DESK);
const midBeat = Math.min(4, SPEC.beats.length - 1);
add("present", `#mode=present&beat=${midBeat}`, DESK);
add("phone-read", `#mode=read&beat=${Math.min(1, SPEC.beats.length - 1)}`, PHONE);
add("phone-present", `#mode=present&beat=${midBeat}`, PHONE);

/**
 * Runs in the page. Reports label text that spills out of its own box (the
 * symptom of a wrong charFactor or a missing @font-face) and a page wider
 * than the viewport (the symptom of a nowrap row escaping its column).
 */
function measure() {
  const problems = [];
  const boxes = document.querySelectorAll('.diagram svg g[style*="cursor"]');
  for (const g of boxes) {
    const shape = g.querySelector(":scope > path");
    if (!shape) continue;
    const r = shape.getBBox();
    for (const t of g.querySelectorAll(":scope > text")) {
      const b = t.getBBox();
      if (b.x < r.x - 1 || b.x + b.width > r.x + r.width + 1)
        problems.push(`label "${t.textContent}" overflows its box by ${Math.ceil(Math.max(r.x - b.x, b.x + b.width - r.x - r.width))}px`);
    }
  }
  const sw = document.documentElement.scrollWidth;
  if (sw > innerWidth + 1) problems.push(`page is ${sw}px wide in a ${innerWidth}px viewport`);
  return { boxes: boxes.length, problems };
}

const errors = [];
const report = [];
const browser = await chromium.launch();
// The app reads the hash once at startup, so every shot gets a fresh page.
for (const [name, hash, w, h] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name}: console ${m.text()}`);
  });
  await page.goto(file + hash);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  // scroll the prose so the active beat is centred in read mode
  if (hash.includes("mode=read")) {
    const beat = +(/beat=(\d+)/.exec(hash) || [, 0])[1];
    await page.evaluate((b) => {
      const s = document.querySelectorAll(".prose section")[b];
      if (s) s.scrollIntoView({ block: "center" });
    }, beat);
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: `${out}/${name}.png` });
  const m = await page.evaluate(measure);
  if (!m.boxes) errors.push(`${name}: no node boxes rendered`);
  m.problems.forEach((p) => errors.push(`${name}: ${p}`));
  report.push(`${name.padEnd(44)} ${m.boxes} boxes`);
  await ctx.close();
}
await browser.close();

console.log(report.join("\n"));
console.log(`\n${shots.length} shots → ${out}/`);
if (errors.length) {
  console.log("\nPROBLEMS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("no page errors, no label or page overflow");
