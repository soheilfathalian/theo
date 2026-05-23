/**
 * Called by the ElevenLabs Theo agent at the start of every call.
 * The agent must have identified the apartment (floor + letter) first.
 */
import { store } from "@/lib/server/store";
import { resolveUnit } from "@/lib/server/find-unit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface StartCallBody {
  floor?: number;
  apartment?: string;
  unit_label?: string;
  tenant_name?: string;
  initial_turn: string;
}

export async function POST(req: Request) {
  let body: StartCallBody;
  try {
    body = (await req.json()) as StartCallBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const unit = resolveUnit(body);
  const call = store.startCall({
    unit_id: unit.id,
    tenant_name: body.tenant_name ?? unit.tenant_name ?? "Mieter",
    initial_turn: body.initial_turn,
  });

  return NextResponse.json({
    ok: true,
    call_id: call.id,
    unit_id: unit.id,
    unit_label: unit.label,
  });
}
