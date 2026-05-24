/**
 * Email draft composition. Templates are pure functions — they produce drafts
 * that the PM previews and (optionally) edits before send.
 *
 * Templates are content-only. The send endpoint reads DEMO_INBOX_EMAIL from
 * server env and overrides the `to` field for the demo. Drafts carry a
 * `recipient_label` for the UI so the audience sees who each email is meant for.
 */
import type { Problem } from "@/lib/data/problems";
import type { Video } from "@/lib/data/videos";
import type { ServiceProvider } from "@/lib/data/service-providers";
import type { Unit } from "@/lib/unit-types";

export type EmailKind =
  | "tutorial"
  | "tenant_quote_update"
  | "vendor_quote_request";

export interface EmailDraft {
  id: string;
  kind: EmailKind;
  /** Display-only recipient line ("Mieter · Müller", "Handwerker · Schwalm") */
  recipient_label: string;
  /** Real email address the audience expects to see in the To header */
  to_display: string;
  subject: string;
  /** Plain-text body — editable in the preview pane */
  body_text: string;
  /** Default approved; PM can untoggle per-draft */
  approved: boolean;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

/** Wrap a plain-text body into the branded HTML shell, preserving paragraphs. */
export function bodyToHtml(plainText: string, accentColor: string): string {
  const paragraphs = plainText
    .split(/\n\n+/)
    .map((p) =>
      `<p style="margin: 0 0 12px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  return `<div style="font-family: -apple-system, system-ui, sans-serif; color: #18181b; max-width: 560px; line-height: 1.55;">
  <h2 style="color: ${accentColor}; margin: 0 0 16px; font-size: 18px;">Theo · hallo theo</h2>
  ${paragraphs}
  <p style="color: #71717a; font-size: 13px; margin: 20px 0 0;">— Theo (AI Hausmeister) · hallo theo</p>
</div>`;
}

export function accentForKind(kind: EmailKind): string {
  if (kind === "tutorial") return "#f59e0b";
  if (kind === "tenant_quote_update") return "#f97316";
  return "#ef4444";
}

let _seq = 0;
function nextId(): string {
  _seq += 1;
  return `draft-${_seq.toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
}

export function tutorialDraft(input: {
  tenantName?: string;
  problem: Problem;
  video: Video;
  tenantEmailDisplay: string;
}): EmailDraft {
  const tenant = input.tenantName ?? "Mieter";
  const body = `Hallo ${tenant},

ich habe ein kurzes Video gefunden, das Ihnen sofort helfen sollte:

${input.problem.name}
${input.video.title}
${input.video.youtube_url}

Wenn das Video das Problem nicht löst, rufen Sie mich einfach zurück.`;
  return {
    id: nextId(),
    kind: "tutorial",
    recipient_label: `Mieter · ${tenant}`,
    to_display: input.tenantEmailDisplay,
    subject: `Theo: Anleitung für ${input.problem.name}`,
    body_text: body,
    approved: true,
  };
}

export function tenantQuoteUpdateDraft(input: {
  tenantName?: string;
  problem: Problem;
  vendorCount: number;
  tenantEmailDisplay: string;
}): EmailDraft {
  const tenant = input.tenantName ?? "Mieter";
  const body = `Hallo ${tenant},

vielen Dank für Ihre Meldung zu „${input.problem.name}".

Wir holen gerade Angebote von ${input.vendorCount} Handwerksbetrieben ein. Sobald uns Preis und frühester Termin vorliegen, melden wir uns bei Ihnen.`;
  return {
    id: nextId(),
    kind: "tenant_quote_update",
    recipient_label: `Mieter · ${tenant}`,
    to_display: input.tenantEmailDisplay,
    subject: `Theo: Wir holen Angebote für ${input.problem.name} ein`,
    body_text: body,
    approved: true,
  };
}

export function vendorQuoteDraft(input: {
  vendor: ServiceProvider;
  problem: Problem;
  unit: Unit;
  tenantName?: string;
}): EmailDraft {
  const tenant = input.tenantName ?? "Mieter";
  const body = `Sehr geehrtes Team von ${input.vendor.name},

wir haben eine Reparaturanfrage und bitten um ein Angebot:

Adresse:  Beispielstraße 12, ${input.unit.label}
Problem:  ${input.problem.name}
Mieter:   ${tenant}

Bitte teilen Sie uns kurz mit:
1. Voraussichtlicher Festpreis (oder Stundensatz)
2. Frühester möglicher Termin

Sie können einfach auf diese Mail antworten.`;
  return {
    id: nextId(),
    kind: "vendor_quote_request",
    recipient_label: `Handwerker · ${input.vendor.name}`,
    to_display: input.vendor.email,
    subject: `Angebotsanfrage: ${input.problem.name} – ${input.unit.label}`,
    body_text: body,
    approved: true,
  };
}
