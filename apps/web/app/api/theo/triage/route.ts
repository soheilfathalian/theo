/**
 * Webhook called by the ElevenLabs Theo agent during a conversation.
 *
 * The agent invokes this with the triage decision (problem + resolution).
 * We create a Call record, drive the unit state through its color sequence,
 * and the dashboard sees everything live via SSE.
 *
 * Body shape (sent by the agent's `report_triage` tool):
 * {
 *   "unit_label": "Apt 2C",           // optional, free-form; we resolve to a unit
 *   "tenant_name": "Familie Schmidt", // optional, fallback to unit's tenant
 *   "transcript_summary": "Spüle ist verstopft, Saugglocke nicht versucht.",
 *   "problem_id": "p-abfluss",        // matches lib/data/problems.ts
 *   "reasoning": "Classic clogged sink."
 * }
 */
import { store } from "@/lib/server/store";
import { UNITS } from "@/lib/unit-config";
import { PROBLEMS } from "@/lib/data/problems";
import { VIDEOS } from "@/lib/data/videos";
import { pickBestVendor } from "@/lib/data/service-providers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface TriageBody {
  unit_label?: string;
  tenant_name?: string;
  transcript_summary?: string;
  problem_id: string;
  reasoning?: string;
}

function findUnit(label?: string) {
  if (!label) return UNITS[Math.floor(Math.random() * UNITS.length)];
  const norm = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    UNITS.find((u) => u.label.toLowerCase().replace(/[^a-z0-9]/g, "") === norm)
      ?? UNITS[Math.floor(Math.random() * UNITS.length)]
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  let body: TriageBody;
  try {
    body = (await req.json()) as TriageBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const problem = PROBLEMS.find((p) => p.id === body.problem_id);
  if (!problem) {
    return NextResponse.json(
      { error: "unknown problem_id", problem_id: body.problem_id },
      { status: 404 },
    );
  }

  const unit = findUnit(body.unit_label);
  const tenantName = body.tenant_name ?? unit.tenant_name ?? "Tenant";

  const call = store.startCall({
    unit_id: unit.id,
    tenant_name: tenantName,
    initial_turn: body.transcript_summary ?? "(call started)",
  });

  // Fire-and-forget animation sequence so the PM dashboard sees a live flow.
  (async () => {
    await delay(400);
    store.decideTriage(call.id, {
      problem_id: problem.id,
      problem_name: problem.name,
      resolution: problem.resolution,
      reasoning: body.reasoning,
    });

    if (problem.resolution === "video") {
      store.setUnitStatus(unit.id, "yellow", `Video gesendet · ${problem.name}`);
      await delay(900);
      const video = VIDEOS.find((v) => v.id === problem.video_id);
      if (video) store.recordVideoSent(call.id, video.youtube_url);
      await delay(300);
      store.endCall(call.id);
      await delay(4000);
      store.setUnitStatus(unit.id, "green");
    } else {
      const vendor = pickBestVendor(problem.category);
      store.setUnitStatus(unit.id, "red", `Notfall · ${problem.name}`);
      await delay(1400);
      store.recordDispatch(call.id, {
        vendor_name: vendor.name,
        vendor_slot: "morgen 9:00",
        amount_cents: 34000,
      });
      store.setUnitStatus(
        unit.id,
        "orange",
        `${vendor.name} · morgen 9:00 · €340 hinterlegt`,
      );
      await delay(300);
      store.endCall(call.id);
    }
  })().catch(console.error);

  return NextResponse.json({
    ok: true,
    call_id: call.id,
    unit_id: unit.id,
    problem,
  });
}
