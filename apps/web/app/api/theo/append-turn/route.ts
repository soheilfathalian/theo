/**
 * Called by the ElevenLabs agent to push each conversation turn into the
 * dashboard transcript in real time.
 */
import { store } from "@/lib/server/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  call_id: string;
  speaker: "tenant" | "theo";
  text: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!body.call_id || !body.speaker || !body.text) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  store.appendTurn(body.call_id, { speaker: body.speaker, text: body.text });
  return NextResponse.json({ ok: true });
}
