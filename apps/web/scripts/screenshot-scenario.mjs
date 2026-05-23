// Test scenario flow: load page, fire scenario, screenshot at multiple stages.
// Usage:  node scripts/screenshot-scenario.mjs <scenario> [outputPrefix]
import { chromium } from "playwright";

const scenario = process.argv[2] || "deflection";
const prefix = process.argv[3] || `/tmp/theo-${scenario}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
});
const page = await ctx.newPage();

page.on("console", (msg) => {
  const t = msg.text();
  if (t.includes("[theo]") || t.includes("ERR")) console.log("PAGE>", t);
});

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
console.log("→ baseline rendered");

// Trigger the scenario via fetch (skips DOM event)
await page.evaluate(async (s) => {
  await fetch(`/api/scenarios/${s}`, { method: "POST" });
}, scenario);

const stages = scenario === "deflection"
  ? [
      { delay: 1000, label: "1-yellow" },
      { delay: 1500, label: "2-after-video" },
      { delay: 4000, label: "3-back-green" },
    ]
  : [
      { delay: 900, label: "1-red" },
      { delay: 1800, label: "2-orange" },
    ];

let elapsed = 0;
for (const s of stages) {
  await page.waitForTimeout(s.delay - elapsed);
  elapsed = s.delay;
  const out = `${prefix}-${s.label}.png`;
  await page.screenshot({ path: out });
  console.log(`→ saved ${out}`);
}

await browser.close();
