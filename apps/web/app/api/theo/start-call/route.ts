/**
 * Called by the ElevenLabs agent as the very first tool, when a tenant calls in.
 * Creates a call record and returns its id, which subsequent tool calls reference.
 */
import { store } from "@/lib/server/store";
import { UNITS } from "@/lib/unit-config";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface StartCallBody {
  unit_label?: string;
  tenant_name?: string;
  initial_turn: string;
}

function findUnit(label?: string) {
  if (!label) return UNITS[Math.floor(Math.random() * UNITS.length)];
  const norm = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    UNITS.find((u) => u.label.toLowerCase().replace(/[^a-z0-9]/g, "") === norm)
      ?? UNITS[Math.floor(Math.random() * UNITS.length)]
  );
}

export async function POST(req: Request) {
  let body: StartCallBody;
  try {
    body = (await req.json()) as StartCallBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const unit = findUnit(body.unit_label);
  const call = store.startCall({
    unit_id: unit.id,
    tenant_name: body.tenant_name ?? unit.tenant_name ?? "Tenant",
    initial_turn: body.initial_turn,
  });

  return NextResponse.json({ ok: true, call_id: call.id, unit_id: unit.id });
}
