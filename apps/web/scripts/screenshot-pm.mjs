// Watch the PM panel as a scenario plays out, taking multiple screenshots.
import { chromium } from "playwright";

const scenario = process.argv[2] || "escalation";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.text().includes("[theo]")) console.log("PAGE>", m.text());
});

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);

// Reset first to start clean
await page.evaluate(async () => {
  await fetch("/api/scenarios/reset", { method: "POST" });
});
await page.waitForTimeout(500);

// Trigger scenario
await page.evaluate(async (s) => {
  await fetch(`/api/scenarios/${s}`, { method: "POST" });
}, scenario);

const stages = [
  { delay: 800, label: "1-call-started" },
  { delay: 1700, label: "2-mid-conv" },
  { delay: 2600, label: "3-triage" },
  { delay: 4200, label: "4-action-taken" },
];
let elapsed = 0;
for (const s of stages) {
  await page.waitForTimeout(s.delay - elapsed);
  elapsed = s.delay;
  const out = `/tmp/theo-pm-${scenario}-${s.label}.png`;
  await page.screenshot({ path: out });
  console.log(`→ ${out}`);
}

await browser.close();
