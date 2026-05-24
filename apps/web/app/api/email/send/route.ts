/**
 * Generic email send endpoint. Receives a pre-composed draft (subject + html +
 * a display-only `to_display`) and sends via Resend.
 *
 * The actual recipient is always the env-configured DEMO_INBOX_EMAIL — for the
 * demo, all tenant + vendor mails arrive in the same inbox so the audience sees
 * them on one phone. `to_display` is logged + returned for transparency.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  subject: string;
  html: string;
  to_display?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!body.subject || !body.html) {
    return NextResponse.json(
      { error: "subject and html required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_INBOX_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      reason: "RESEND_API_KEY or DEMO_INBOX_EMAIL not set",
      preview: { to_display: body.to_display, subject: body.subject },
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Theo <onboarding@resend.dev>",
        to: [to],
        subject: body.subject,
        html: body.html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data, mode: "live" },
        { status: res.status },
      );
    }
    return NextResponse.json({
      ok: true,
      mode: "live",
      id: data.id,
      to_display: body.to_display,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "send failed" },
      { status: 500 },
    );
  }
}
