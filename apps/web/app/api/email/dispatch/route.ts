/**
 * Send the tenant a confirmation email when Theo dispatches a Handwerker.
 *
 * Stateless: called from the browser. No-ops if RESEND_API_KEY / DEMO_INBOX_EMAIL
 * aren't set.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  tenant_name?: string;
  vendor_name: string;
  vendor_slot: string;
  amount_cents: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_INBOX_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      preview: {
        to,
        subject: `[TO-TENANT] Theo: Handwerker organisiert`,
      },
    });
  }

  const tenant = body.tenant_name ?? "Mieter";
  const amount = (body.amount_cents / 100).toFixed(0);
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 560px;">
      <h2 style="color: #f97316;">Theo · hallo theo</h2>
      <p>Hallo ${tenant},</p>
      <p>Ich habe einen Handwerker für Sie organisiert:</p>
      <ul>
        <li><strong>Firma:</strong> ${body.vendor_name}</li>
        <li><strong>Termin:</strong> ${body.vendor_slot}</li>
        <li><strong>Anzahlung:</strong> €${amount} (via Stripe hinterlegt)</li>
      </ul>
      <p>Eine Bestätigung des Handwerkers folgt separat.</p>
      <p style="color: #71717a; font-size: 13px;">— Theo (AI Hausmeister) · hallo theo</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Theo <theo@resend.dev>",
        to: [to],
        subject: `[TO-TENANT] Theo: Handwerker organisiert · ${body.vendor_name}`,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data, mode: "live" },
        { status: res.status },
      );
    }
    return NextResponse.json({ ok: true, mode: "live", id: data.id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "send failed" },
      { status: 500 },
    );
  }
}
