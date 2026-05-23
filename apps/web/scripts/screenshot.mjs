// Screenshot the running dev server so I can iterate on the 3D layout visually.
// Usage:  node scripts/screenshot.mjs [url] [outputPath] [clickSelector] [clickCount]
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000/";
const out = process.argv[3] || "/tmp/theo-shot.png";
const clickSelector = process.argv[4]; // e.g. "text=Cycle all units"
const clickCount = parseInt(process.argv[5] ?? "0", 10);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("[theo]")) console.log("PAGE>", text);
});

await page.goto(url, { waitUntil: "domcontentloaded" });
// Wait for GLB load + R3F render + SSE snapshot
await page.waitForTimeout(3500);

if (clickSelector && clickCount > 0) {
  for (let i = 0; i < clickCount; i++) {
    await page.click(clickSelector);
    await page.waitForTimeout(400);
  }
}

await page.screenshot({ path: out, fullPage: false });
await browser.close();

console.log(`saved: ${out}`);
