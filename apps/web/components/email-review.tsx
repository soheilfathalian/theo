"use client";

import { useState } from "react";
import type { EmailDraft, EmailKind } from "@/lib/email/templates";

interface Props {
  drafts: EmailDraft[];
  /** Label shown in header, e.g. "Tutorial-Mail" or "Angebotsanfragen" */
  contextLabel: string;
  onBack: () => void;
  /** Fires only with the drafts the PM has approved. Returns when all settled. */
  onSend: (approvedDrafts: EmailDraft[]) => Promise<void>;
}

const KIND_TAG: Record<EmailKind, { label: string; tone: string }> = {
  tutorial: {
    label: "Tutorial",
    tone: "border-[rgba(245,184,66,0.3)] bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  tenant_quote_update: {
    label: "Mieter-Info",
    tone: "border-[rgba(255,138,77,0.3)] bg-[var(--dispatch-soft)] text-[var(--dispatch)]",
  },
  vendor_quote_request: {
    label: "Angebotsanfrage",
    tone: "border-[rgba(255,77,94,0.3)] bg-[var(--urgent-soft)] text-[var(--urgent)]",
  },
};

export function EmailReview({ drafts: initial, contextLabel, onBack, onSend }: Props) {
  const [drafts, setDrafts] = useState<EmailDraft[]>(initial);
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);

  function patch(id: string, patch: Partial<EmailDraft>) {
    setDrafts((curr) => curr.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  const approvedCount = drafts.filter((d) => d.approved).length;

  async function handleSend() {
    if (approvedCount === 0) return;
    setSending(true);
    try {
      await onSend(drafts.filter((d) => d.approved));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={sending}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)] transition hover:text-[var(--text)] disabled:opacity-40"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
            {contextLabel}
          </span>
          <span className="rounded-full border border-[var(--rule)] bg-[var(--card)] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[var(--text-2)]">
            {drafts.length}
          </span>
        </div>
      </div>

      {/* Draft list */}
      <div className="flex flex-col gap-2">
        {drafts.map((d) => {
          const isOpen = openId === d.id;
          const tag = KIND_TAG[d.kind];
          return (
            <div
              key={d.id}
              className={`overflow-hidden rounded-[10px] border bg-[var(--card)] transition ${
                d.approved
                  ? "border-[var(--rule)]"
                  : "border-[var(--rule)] opacity-55"
              }`}
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <button
                  onClick={() => patch(d.id, { approved: !d.approved })}
                  disabled={sending}
                  className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition ${
                    d.approved
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[#062818]"
                      : "border-[var(--rule-strong)] bg-transparent"
                  }`}
                  aria-label={d.approved ? "Approved" : "Not approved"}
                >
                  {d.approved && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setOpenId(isOpen ? null : d.id)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`shrink-0 rounded-[5px] border px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em] ${tag.tone}`}
                      >
                        {tag.label}
                      </span>
                      <span className="truncate text-[12px] text-[var(--text)]">
                        {d.recipient_label}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-[var(--text-3)]">
                      {d.to_display}
                    </div>
                  </div>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-[var(--text-3)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Editable body when open */}
              {isOpen && (
                <div className="flex flex-col gap-2 border-t border-[var(--rule)] px-3.5 py-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-3)]">
                      Subject
                    </span>
                    <input
                      type="text"
                      value={d.subject}
                      disabled={sending}
                      onChange={(e) => patch(d.id, { subject: e.target.value })}
                      className="rounded-[7px] border border-[var(--rule)] bg-[var(--bg-elev)] px-2.5 py-1.5 text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--rule-strong)] disabled:opacity-60"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-3)]">
                      Body
                    </span>
                    <textarea
                      value={d.body_text}
                      disabled={sending}
                      onChange={(e) => patch(d.id, { body_text: e.target.value })}
                      rows={Math.max(6, d.body_text.split("\n").length + 1)}
                      className="resize-none rounded-[7px] border border-[var(--rule)] bg-[var(--bg-elev)] p-2.5 font-mono text-[11.5px] leading-[1.55] text-[var(--text)] outline-none transition focus:border-[var(--rule-strong)] disabled:opacity-60"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer action */}
      <button
        onClick={handleSend}
        disabled={sending || approvedCount === 0}
        className="mt-1 rounded-[8px] bg-[var(--accent)] px-3 py-2.5 text-[13px] font-medium text-[#062818] shadow-[0_4px_14px_-4px_var(--accent-glow)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_20px_-4px_var(--accent-glow)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {sending
          ? "Sending…"
          : approvedCount === 0
          ? "Nothing approved"
          : `Approve & send ${approvedCount} ${approvedCount === 1 ? "email" : "emails"}`}
      </button>
    </div>
  );
}
