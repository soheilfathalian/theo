/**
 * Vendor-facing job brief email. Sent when the PM dispatches a Handwerker.
 *
 * For the demo, the recipient is the shared DEMO_INBOX_EMAIL so the audience
 * sees both the [TO-VENDOR] and [TO-TENANT] emails arrive on the same phone.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  vendor_name: string;
  vendor_email: string;
  problem_name: string;
  unit_label: string;
  tenant_name?: string;
  tenant_phone?: string;
  vendor_slot: string;
  amount_cents: number;
  stripe_transfer_id?: string;
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
        subject: `[TO-VENDOR] Auftrag: ${body.problem_name} – ${body.unit_label}`,
      },
    });
  }

  const tenant = body.tenant_name ?? "Mieter";
  const amount = (body.amount_cents / 100).toFixed(0);
  const transferRef = body.stripe_transfer_id ?? "tr_demo_pending";

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 560px;">
      <h2 style="color: #ef4444;">Auftrag von Theo · hallo theo</h2>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>wir haben einen Auftrag für Sie:</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #71717a;">Adresse</td><td>Beispielstraße 12, ${body.unit_label}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #71717a;">Problem</td><td><strong>${body.problem_name}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #71717a;">Mieter</td><td>${tenant}${body.tenant_phone ? ` · ${body.tenant_phone}` : ""}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #71717a;">Termin</td><td>${body.vendor_slot}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #71717a;">Anzahlung</td><td>€${amount} via Stripe (Ref: <code>${transferRef}</code>)</td></tr>
      </table>
      <p>Bitte bestätigen Sie kurz per Antwortmail.</p>
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
        from: "Theo <onboarding@resend.dev>",
        to: [to],
        subject: `[TO-VENDOR] Auftrag: ${body.problem_name} – ${body.unit_label} · ${body.vendor_name}`,
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
