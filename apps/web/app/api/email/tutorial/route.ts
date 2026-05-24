/**
 * Send the tenant a tutorial email via Resend.
 *
 * Stateless: called from the browser when Theo deflects with a video. No-ops
 * if RESEND_API_KEY / DEMO_INBOX_EMAIL aren't set so the demo works without
 * keys.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  tenant_name?: string;
  problem_name: string;
  video_url: string;
  video_title: string;
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
      reason: "RESEND_API_KEY or DEMO_INBOX_EMAIL not set",
      preview: { to, subject: `[TO-TENANT] Theo: Anleitung für ${body.problem_name}` },
    });
  }

  const tenant = body.tenant_name ?? "Mieter";
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 560px;">
      <h2 style="color: #f59e0b;">Theo · hallo theo</h2>
      <p>Hallo ${tenant},</p>
      <p>Ich habe ein kurzes Video gefunden, das Ihnen sofort helfen sollte:</p>
      <p><strong>${body.problem_name}</strong></p>
      <p>
        <a href="${body.video_url}" style="background: #18181b; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 8px; display: inline-block;">
          ${body.video_title}
        </a>
      </p>
      <p>Wenn das Video das Problem nicht löst, rufen Sie mich einfach zurück.</p>
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
        subject: `[TO-TENANT] Theo: Anleitung für ${body.problem_name}`,
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
