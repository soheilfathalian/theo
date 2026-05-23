/**
 * Webhook the ElevenLabs Theo agent calls when it has classified the issue.
 * Drives the unit color sequence and the live action block.
 */
import { store } from "@/lib/server/store";
import { resolveUnit } from "@/lib/server/find-unit";
import { PROBLEMS } from "@/lib/data/problems";
import { VIDEOS } from "@/lib/data/videos";
import { pickBestVendor } from "@/lib/data/service-providers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface TriageBody {
  call_id?: string;
  floor?: number;
  apartment?: string;
  unit_label?: string;
  tenant_name?: string;
  transcript_summary?: string;
  problem_id: string;
  reasoning?: string;
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

  // Reuse the call started earlier in the conversation if call_id was provided;
  // otherwise create a fresh one (some agents skip start_call).
  let callId: string;
  if (body.call_id && store.getCall(body.call_id)) {
    callId = body.call_id;
  } else {
    const unit = resolveUnit(body);
    const call = store.startCall({
      unit_id: unit.id,
      tenant_name: body.tenant_name ?? unit.tenant_name ?? "Mieter",
      initial_turn: body.transcript_summary ?? "(call started)",
    });
    callId = call.id;
  }

  const call = store.getCall(callId)!;

  store.decideTriage(callId, {
    problem_id: problem.id,
    problem_name: problem.name,
    resolution: problem.resolution,
    reasoning: body.reasoning,
  });

  // Fire-and-forget visualization sequence so the dashboard streams a clear flow.
  (async () => {
    if (problem.resolution === "video") {
      store.setUnitStatus(call.unit_id, "yellow", `Video gesendet · ${problem.name}`);
      await delay(900);
      const video = VIDEOS.find((v) => v.id === problem.video_id);
      if (video) store.recordVideoSent(callId, video.youtube_url);
      await delay(300);
      store.endCall(callId);
      await delay(4500);
      store.setUnitStatus(call.unit_id, "green");
    } else {
      const vendor = pickBestVendor(problem.category);
      store.setUnitStatus(call.unit_id, "red", `Notfall · ${problem.name}`);
      await delay(1500);
      store.recordDispatch(callId, {
        vendor_name: vendor.name,
        vendor_slot: "morgen 9:00",
        amount_cents: 34000,
      });
      store.setUnitStatus(
        call.unit_id,
        "orange",
        `${vendor.name} · morgen 9:00 · €340 hinterlegt`,
      );
      await delay(300);
      store.endCall(callId);
    }
  })().catch(console.error);

  return NextResponse.json({
    ok: true,
    call_id: callId,
    unit_id: call.unit_id,
    unit_label: call.unit_id.replace("u-", "Apt ").toUpperCase(),
    problem,
  });
}
