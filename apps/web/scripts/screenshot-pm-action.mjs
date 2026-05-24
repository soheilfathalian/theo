// Walk the new PM-action flow: scenario triggers triage → unit goes red →
// PM side panel shows vendor picker → "Dispatch" click flips to orange.
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

page.on("console", (m) => {
  const t = m.text();
  if (t.includes("[theo]") || m.type() === "error") console.log("PAGE>", t.slice(0, 200));
});

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);

// Trigger the escalation scenario from the bottom-left controls
await page.click("text=Trigger escalation call");
await page.waitForTimeout(2200);
await page.screenshot({ path: "/tmp/theo-pm-flow-1-red.png" });
console.log("→ /tmp/theo-pm-flow-1-red.png  (unit red, vendor picker visible)");

// Click the top "Dispatch" button on a vendor card
const dispatchButtons = await page.$$("button:has-text('Dispatch')");
if (dispatchButtons.length > 0) {
  await dispatchButtons[0].click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/theo-pm-flow-2-orange.png" });
  console.log("→ /tmp/theo-pm-flow-2-orange.png  (orange after PM dispatched)");
}

// Now deflection flow
await page.click("text=Reset all units");
await page.waitForTimeout(500);
await page.click("text=Trigger deflection call");
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/theo-pm-flow-3-yellow.png" });
console.log("→ /tmp/theo-pm-flow-3-yellow.png  (yellow, video preview visible)");

const sendVideo = await page.$("button:has-text('Send to tenant')");
if (sendVideo) {
  await sendVideo.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/theo-pm-flow-4-sent.png" });
  console.log("→ /tmp/theo-pm-flow-4-sent.png  (green after PM sent video)");
}

await browser.close();
