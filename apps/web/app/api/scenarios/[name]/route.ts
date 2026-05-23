import { store } from "@/lib/server/store";
import { UNITS } from "@/lib/unit-config";
import { PROBLEMS } from "@/lib/data/problems";
import { VIDEOS } from "@/lib/data/videos";
import { pickBestVendor } from "@/lib/data/service-providers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pickRandomGreenUnit() {
  const greens = store.getUnits().filter((u) => u.status === "green");
  return greens[Math.floor(Math.random() * greens.length)] ?? UNITS[0];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDeflection() {
  const unit = pickRandomGreenUnit();
  const problem = PROBLEMS.find((p) => p.id === "p-abfluss")!;
  const video = VIDEOS.find((v) => v.id === problem.video_id)!;

  const call = store.startCall({
    unit_id: unit.id,
    tenant_name: unit.tenant_name ?? "Tenant",
    initial_turn: "Hallo Theo, meine Spüle ist verstopft.",
  });

  await delay(500);
  store.appendTurn(call.id, {
    speaker: "theo",
    text: "Verstanden. Wie lange ist das schon so, und haben Sie schon eine Saugglocke probiert?",
  });

  await delay(900);
  store.appendTurn(call.id, {
    speaker: "tenant",
    text: "Seit heute Morgen. Nein, noch nicht.",
  });

  await delay(700);
  store.decideTriage(call.id, {
    problem_id: problem.id,
    problem_name: problem.name,
    resolution: "video",
    reasoning:
      "Klassischer Abflussverstopfung, leichter Fall. Saugglocke löst 80% solcher Fälle in unter 2 Minuten.",
  });
  store.setUnitStatus(unit.id, "yellow", `Video gesendet · ${problem.name}`);
  store.appendTurn(call.id, {
    speaker: "theo",
    text: "Ich schicke Ihnen ein 2-Min-Video, das genau das löst. Wenn das nicht hilft, rufen Sie zurück.",
  });

  await delay(900);
  store.recordVideoSent(call.id, video.youtube_url);

  await delay(300);
  store.endCall(call.id);

  await delay(4000);
  store.setUnitStatus(unit.id, "green");
}

async function runEscalation() {
  const unit = pickRandomGreenUnit();
  const problem = PROBLEMS.find((p) => p.id === "p-heizung-aus")!;
  const vendor = pickBestVendor(problem.category);

  const call = store.startCall({
    unit_id: unit.id,
    tenant_name: unit.tenant_name ?? "Tenant",
    initial_turn: "Hallo Theo, meine Heizung springt nicht an, es ist eiskalt!",
  });

  await delay(600);
  store.appendTurn(call.id, {
    speaker: "theo",
    text: "Das ist ein Notfall — sehe ich genauso. Sehen Sie irgendwo Wasser, oder einen Fehlercode am Brennwertgerät?",
  });

  await delay(900);
  store.appendTurn(call.id, {
    speaker: "tenant",
    text: "Nein, kein Wasser. Auf dem Display steht E2.",
  });

  await delay(700);
  store.decideTriage(call.id, {
    problem_id: problem.id,
    problem_name: problem.name,
    resolution: "dispatch",
    reasoning:
      "Heizung defekt mit Fehlercode E2, kein DIY-Fall. Notdienst-Heizung-Handwerker erforderlich.",
  });
  store.setUnitStatus(unit.id, "red", `Notfall · ${problem.name}`);
  store.appendTurn(call.id, {
    speaker: "theo",
    text: "Das ist ein Fall für einen Handwerker. Ich kümmere mich sofort darum.",
  });

  await delay(1500);
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
  store.appendTurn(call.id, {
    speaker: "theo",
    text: `${vendor.name} kommt morgen um 9 Uhr. Eine Anzahlung von €340 wurde bereits hinterlegt. Sie bekommen gleich eine Bestätigung per E-Mail.`,
  });

  await delay(300);
  store.endCall(call.id);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (name === "deflection") {
    runDeflection().catch(console.error);
    return NextResponse.json({ ok: true, kind: "deflection" });
  }

  if (name === "escalation") {
    runEscalation().catch(console.error);
    return NextResponse.json({ ok: true, kind: "escalation" });
  }

  if (name === "reset") {
    store.reset();
    return NextResponse.json({ ok: true, kind: "reset" });
  }

  return NextResponse.json({ error: "unknown scenario", name }, { status: 400 });
}
