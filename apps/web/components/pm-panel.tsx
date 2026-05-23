"use client";

import { useEffect, useRef } from "react";
import type { Call, CallStatus, TranscriptTurn } from "@/lib/client/theo-store";

interface Props {
  calls: Call[];
  selectedCallId: string | null;
  onSelect: (id: string | null) => void;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  in_progress: "Live",
  escalated: "Escalated",
  deflected: "Resolved · video",
  dispatched: "Dispatched",
  ended: "Ended",
};

const STATUS_RING: Record<CallStatus, string> = {
  in_progress: "ring-emerald-400/60 bg-emerald-400/10 text-emerald-200",
  escalated: "ring-red-400/40 bg-red-400/10 text-red-200",
  deflected: "ring-yellow-400/40 bg-yellow-400/10 text-yellow-200",
  dispatched: "ring-orange-400/40 bg-orange-400/10 text-orange-200",
  ended: "ring-white/15 bg-white/5 text-zinc-300",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function fmtSince(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function ActionBlock({ call }: { call: Call }) {
  if (call.status === "in_progress") {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-emerald-300/70">
          Action in progress
        </div>
        <div className="mt-0.5 text-emerald-100">
          Theo is on the call, triaging the issue.
        </div>
      </div>
    );
  }
  if (call.status === "deflected" && call.video_url) {
    return (
      <div className="rounded-md border border-yellow-400/30 bg-yellow-400/5 px-3 py-2 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-yellow-300/80">
          Action taken
        </div>
        <div className="mt-0.5 text-yellow-100">
          Tutorial sent to tenant · {call.problem_name}
        </div>
        <a
          href={call.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block truncate text-[11px] text-yellow-200/80 underline hover:text-yellow-100"
        >
          {call.video_url}
        </a>
      </div>
    );
  }
  if (call.status === "dispatched") {
    return (
      <div className="rounded-md border border-orange-400/30 bg-orange-400/5 px-3 py-2 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-orange-300/80">
          Action taken
        </div>
        <div className="mt-0.5 text-orange-100">
          {call.vendor_name} · {call.vendor_slot}
        </div>
        <div className="mt-0.5 text-orange-200/80">
          €{((call.amount_cents ?? 0) / 100).toFixed(0)} Anzahlung via Stripe hinterlegt
        </div>
      </div>
    );
  }
  if (call.status === "escalated") {
    return (
      <div className="rounded-md border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-red-300/80">
          Needs action
        </div>
        <div className="mt-0.5 text-red-100">
          Awaiting Handwerker dispatch · {call.problem_name}
        </div>
      </div>
    );
  }
  return null;
}

function Transcript({ turns }: { turns: TranscriptTurn[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <div
      ref={ref}
      className="max-h-44 overflow-y-auto rounded-md border border-white/10 bg-black/30 p-2 text-xs"
    >
      {turns.map((t, i) => (
        <div
          key={i}
          className={`mb-1.5 flex gap-2 last:mb-0 ${
            t.speaker === "theo" ? "" : "flex-row-reverse"
          }`}
        >
          <div
            className={`max-w-[78%] rounded-lg px-2 py-1 leading-snug ${
              t.speaker === "theo"
                ? "bg-indigo-500/20 text-indigo-50 ring-1 ring-indigo-400/20"
                : "bg-zinc-700/40 text-zinc-100 ring-1 ring-white/10"
            }`}
          >
            <div className="text-[9px] uppercase tracking-wider opacity-60">
              {t.speaker === "theo" ? "Theo" : "Tenant"}
            </div>
            <div>{t.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PmPanel({ calls, selectedCallId, onSelect }: Props) {
  const selected = calls.find((c) => c.id === selectedCallId) ?? calls[0] ?? null;

  return (
    <aside className="z-10 flex h-full w-[380px] flex-col gap-3 border-l border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Property manager
          </div>
          <div className="text-base font-semibold">Live calls</div>
        </div>
        <div className="text-[10px] text-zinc-500">{calls.length} today</div>
      </div>

      {/* List of calls */}
      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: "30vh" }}>
        {calls.length === 0 && (
          <div className="rounded-md border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
            No calls yet. Trigger a scenario or wait for an inbound call.
          </div>
        )}
        {calls.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left text-xs transition ${
              selected?.id === c.id
                ? "border-white/30 bg-white/10"
                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-100">
                {c.tenant_name}
              </span>
              <span className={`rounded-full px-1.5 py-px text-[9px] ring-1 ${STATUS_RING[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>
                {c.unit_id.replace("u-", "Apt ").toUpperCase()} ·{" "}
                {c.problem_name ?? "Triaging…"}
              </span>
              <span>{fmtTime(c.started_at)} · {fmtSince(c.started_at)} ago</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected call detail */}
      {selected && (
        <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400">
              Transcript
            </div>
            <div className="mt-1">
              <Transcript turns={selected.transcript} />
            </div>
          </div>
          <ActionBlock call={selected} />
        </div>
      )}
    </aside>
  );
}
