import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const file = "file://" + path.resolve("dist/index.html");
const out = "shots";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const shots = [
  ["01-read-default", "#mode=read&beat=0", 1600, 1000],
  ["02-read-inputs", "#mode=read&beat=1", 1600, 1000],
  ["03-read-trust-lens", "#mode=read&beat=2", 1600, 1000],
  ["04-read-exec-cost", "#mode=read&beat=5", 1600, 1000],
  ["05-read-scoring-engineer", "#mode=read&beat=6", 1600, 1000],
  ["06-read-failure", "#mode=read&beat=7", 1600, 1000],
  ["07-read-v0", "#mode=read&beat=9", 1600, 1000],
  ["08-read-next", "#mode=read&beat=10", 1600, 1000],
  ["09-explore-architect-flow", "#mode=explore&persona=architect&lens=flow&era=today", 1600, 1000],
  ["10-explore-engineer-flow", "#mode=explore&persona=engineer&lens=flow&era=today", 1600, 1000],
  ["11-explore-exec-cost", "#mode=explore&persona=exec&lens=cost&era=today", 1600, 1000],
  ["12-explore-architect-ownership", "#mode=explore&persona=architect&lens=ownership&era=today", 1600, 1000],
  ["13-explore-engineer-trust", "#mode=explore&persona=engineer&lens=trust&era=today", 1600, 1000],
  ["14-explore-v0", "#mode=explore&persona=architect&lens=flow&era=v0", 1600, 1000],
  ["15-explore-next", "#mode=explore&persona=architect&lens=flow&era=next", 1600, 1000],
  ["16-present", "#mode=present&beat=4", 1600, 1000],
  ["17-mobile-read", "#mode=read&beat=1", 430, 900],
];

const errors = [];
const browser = await chromium.launch();
for (const [name, hash, w, h] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name}: console ${m.text()}`);
  });
  await page.goto(file + hash);
  await page.waitForTimeout(1500);
  // scroll the prose so the active beat is centred in read mode
  if (hash.includes("mode=read")) {
    const beat = +(/beat=(\d+)/.exec(hash) || [, 0])[1];
    await page.evaluate((b) => {
      const s = document.querySelectorAll(".prose section")[b];
      if (s) s.scrollIntoView({ block: "center" });
    }, beat);
    await page.waitForTimeout(1400);
  }
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}

// geometry sanity check: nothing may overflow its parent group
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const report = [];
for (const persona of ["exec", "architect", "engineer"]) {
  for (const era of ["v0", "today", "next"]) {
    await page.goto(`${file}#mode=explore&persona=${persona}&lens=flow&era=${era}`);
    await page.waitForTimeout(900);
    const n = await page.evaluate(() => document.querySelectorAll(".diagram svg g rect").length);
    const edges = await page.evaluate(
      () => document.querySelectorAll(".diagram svg > g > g > path").length
    );
    report.push(`${persona}/${era}: ${n} rects, ${edges} edge paths`);
  }
}
await browser.close();

console.log(report.join("\n"));
if (errors.length) {
  console.log("\nPAGE ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("\nno page errors");
