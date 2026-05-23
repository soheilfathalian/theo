// Verify the client-tool wiring without an actual voice call:
// invoke the widget's clientTools functions directly via JS and confirm
// the dashboard updates (call appears in PM panel, unit changes color).
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

page.on("console", (m) => {
  const t = m.text();
  if (t.includes("[theo]") || m.type() === "error") console.log("PAGE>", t.slice(0, 200));
});

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4500); // let widget script load

// Manually fire the elevenlabs-convai:call event to inject clientTools,
// then call them as if the agent had triggered them.
const result = await page.evaluate(async () => {
  const widget = document.querySelector("elevenlabs-convai");
  if (!widget) return { error: "widget not found" };

  // Simulate the widget's call event so React attaches its tools.
  const detail = { config: {} };
  widget.dispatchEvent(
    new CustomEvent("elevenlabs-convai:call", { detail }),
  );
  await new Promise((r) => setTimeout(r, 300));

  const ct = detail.config.clientTools;
  if (!ct) return { error: "clientTools not attached" };

  // Run a full escalation flow through the handlers.
  const start = await ct.start_call({
    floor: 2,
    apartment: "C",
    initial_turn: "Heizung springt nicht an.",
  });
  const { call_id } = JSON.parse(start);
  await new Promise((r) => setTimeout(r, 400));
  await ct.append_turn({ call_id, speaker: "tenant", text: "Heizung springt nicht an, eiskalt." });
  await new Promise((r) => setTimeout(r, 400));
  await ct.append_turn({ call_id, speaker: "theo", text: "Welche Fehlernummer?" });
  await new Promise((r) => setTimeout(r, 400));
  await ct.append_turn({ call_id, speaker: "tenant", text: "E2 auf dem Display." });
  await new Promise((r) => setTimeout(r, 400));
  const triage = await ct.report_triage({
    call_id,
    floor: 2,
    apartment: "C",
    problem_id: "p-heizung-aus",
    transcript_summary: "Heizung defekt mit Fehlercode E2.",
  });

  return { start, triage };
});

console.log("RESULT:", JSON.stringify(result, null, 2));

// Wait for the orange dispatch animation
await page.waitForTimeout(2200);
await page.screenshot({ path: "/tmp/theo-client-tools-end.png" });
console.log("saved /tmp/theo-client-tools-end.png");

await browser.close();
