// Same as screenshot.mjs but with longer wait + verbose console capture
// so we can see if the ElevenLabs widget script is failing to load.
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000/";
const out = process.argv[3] || "/tmp/theo-widget.png";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
});
const page = await ctx.newPage();

page.on("console", (m) =>
  console.log(`PAGE[${m.type()}]>`, m.text().slice(0, 240)),
);
page.on("pageerror", (e) => console.log("PAGE-ERR>", e.message));
page.on("requestfailed", (r) =>
  console.log("REQ-FAIL>", r.url(), r.failure()?.errorText),
);
page.on("response", (r) => {
  if (r.url().includes("convai") || r.url().includes("elevenlabs")) {
    console.log(`RES[${r.status()}]>`, r.url());
  }
});

await page.goto(url, { waitUntil: "domcontentloaded" });
// Wait long enough for the web component to register and self-render
await page.waitForTimeout(9000);

// Probe DOM for the custom element
const probe = await page.evaluate(() => {
  const el = document.querySelector("elevenlabs-convai");
  const defined = !!customElements.get("elevenlabs-convai");
  return {
    found: !!el,
    defined,
    outerSize: el ? el.getBoundingClientRect() : null,
    children: el ? el.childNodes.length : 0,
  };
});
console.log("WIDGET-PROBE>", JSON.stringify(probe));

await page.screenshot({ path: out, fullPage: false });
console.log(`saved: ${out}`);
await browser.close();
