/**
 * Stateless Stripe transfer endpoint.
 *
 * Called from the browser when Theo decides to dispatch a Handwerker.
 * Fires a real Stripe Connect Transfer to the vendor's pre-onboarded
 * Express account if STRIPE_SECRET_KEY is set; otherwise no-ops so dev
 * works without keys.
 */
import { NextResponse } from "next/server";
import { SERVICE_PROVIDERS } from "@/lib/data/service-providers";

export const runtime = "nodejs";

interface Body {
  vendor_id: string;
  amount_cents: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const vendor = SERVICE_PROVIDERS.find((v) => v.id === body.vendor_id);
  if (!vendor) {
    return NextResponse.json({ error: "unknown vendor" }, { status: 404 });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      reason: "STRIPE_SECRET_KEY not set",
      vendor: vendor.name,
      amount_cents: body.amount_cents,
    });
  }

  // Lazy-import so the package isn't required when keys aren't configured.
  let StripeMod;
  try {
    StripeMod = (await import("stripe")).default;
  } catch {
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      reason: "stripe package not installed",
    });
  }
  const stripe = new StripeMod(key, { apiVersion: "2024-06-20" } as never);

  try {
    const transfer = await stripe.transfers.create({
      amount: body.amount_cents,
      currency: "eur",
      destination: vendor.stripe_account_id,
      description: `Theo dispatch · ${vendor.name}`,
      metadata: { vendor_id: vendor.id },
    });
    return NextResponse.json({
      ok: true,
      mode: "live",
      transfer_id: transfer.id,
      destination: transfer.destination,
      amount: transfer.amount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "stripe error",
      },
      { status: 500 },
    );
  }
}
