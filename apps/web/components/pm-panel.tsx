"use client";

import { useEffect, useRef, useState } from "react";
import type { Call, CallStatus, PmActions, TranscriptTurn } from "@/lib/client/theo-store";
import type { Unit } from "@/lib/unit-types";
import { PROBLEMS } from "@/lib/data/problems";
import { VIDEOS, type Video } from "@/lib/data/videos";
import { SERVICE_PROVIDERS } from "@/lib/data/service-providers";

interface Props {
  calls: Call[];
  units: Unit[];
  selectedCallId: string | null;
  selectedUnitId: string | null;
  onSelectCall: (id: string | null) => void;
  onSelectUnit: (id: string | null) => void;
  pmActions: PmActions;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  in_progress: "Live",
  video_pending: "Tutorial",
  dispatch_pending: "Aktion nötig",
  video_sent: "Tutorial gesendet",
  dispatched: "Handwerker",
  ended: "Beendet",
};

const STATUS_TONE: Record<CallStatus, string> = {
  in_progress: "text-[var(--accent)]",
  video_pending: "text-[var(--warning)]",
  dispatch_pending: "text-[var(--urgent)]",
  video_sent: "text-[var(--accent)]",
  dispatched: "text-[var(--dispatch)]",
  ended: "text-[var(--text-3)]",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function youtubeThumb(url: string): string | null {
  const m = url.match(/[?&]v=([\w-]{6,15})/);
  if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  return null;
}

export function PmPanel({
  calls,
  units,
  selectedCallId,
  selectedUnitId,
  onSelectCall,
  onSelectUnit,
  pmActions,
}: Props) {
  useEffect(() => {
    if (selectedCallId || selectedUnitId) return;
    const urgent = calls.find(
      (c) => c.status === "dispatch_pending" || c.status === "video_pending",
    );
    if (urgent) onSelectCall(urgent.id);
    else if (calls[0]) onSelectCall(calls[0].id);
  }, [calls, selectedCallId, selectedUnitId, onSelectCall]);

  const selectedCall =
    (selectedCallId && calls.find((c) => c.id === selectedCallId)) ||
    (selectedUnitId && calls.find((c) => c.unit_id === selectedUnitId)) ||
    null;
  const selectedUnit =
    (selectedUnitId && units.find((u) => u.id === selectedUnitId)) ||
    (selectedCall && units.find((u) => u.id === selectedCall.unit_id)) ||
    null;

  const awaiting = calls.filter(
    (c) => c.status === "dispatch_pending" || c.status === "video_pending",
  ).length;

  return (
    <aside className="relative z-10 flex h-full w-[400px] shrink-0 flex-col overflow-hidden border-l border-[var(--rule)] bg-black/30 backdrop-blur-xl">
      {/* Inbox header */}
      <div className="flex items-baseline justify-between border-b border-[var(--rule)] px-[22px] pb-3.5 pt-[18px]">
        <h2 className="font-serif text-[22px] leading-none tracking-tight">
          Inbox
        </h2>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">
          {calls.length.toString().padStart(2, "0")} calls
          {awaiting > 0 && (
            <>
              {" · "}
              <span className="font-medium text-[var(--urgent)]">
                {awaiting.toString().padStart(2, "0")} urgent
              </span>
            </>
          )}
        </div>
      </div>

      {/* Call list */}
      <div className="max-h-[36%] shrink-0 overflow-y-auto border-b border-[var(--rule)]">
        {calls.length === 0 && (
          <div className="px-[22px] py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
            Inbox empty · click a unit on the building
          </div>
        )}
        {calls.map((c) => (
          <CallRow
            key={c.id}
            call={c}
            selected={selectedCall?.id === c.id}
            onClick={() => {
              onSelectCall(c.id);
              onSelectUnit(null);
            }}
          />
        ))}
      </div>

      {/* Detail */}
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto p-[22px]">
        {selectedCall ? (
          <CallDetail call={selectedCall} pmActions={pmActions} />
        ) : selectedUnit ? (
          <UnitDetail
            unit={selectedUnit}
            calls={calls}
            onClose={() => onSelectUnit(null)}
          />
        ) : (
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
            Click a call above · or a unit on the building
          </div>
        )}
      </div>
    </aside>
  );
}

function CallRow({
  call,
  selected,
  onClick,
}: {
  call: Call;
  selected: boolean;
  onClick: () => void;
}) {
  const isUrgent = call.status === "dispatch_pending";
  const isLive = call.status === "in_progress";

  return (
    <button
      onClick={onClick}
      className={`relative block w-full border-b border-[var(--rule)] px-[22px] py-3.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-white/[0.025] ${
        selected ? "bg-[rgba(0,229,143,0.03)]" : ""
      }`}
      style={{ animation: "rowArrive 1.6s ease-out" }}
    >
      {/* Left accent rail */}
      {isUrgent && (
        <span
          className="absolute inset-y-0 left-0 w-0.5 bg-[var(--urgent)]"
          style={{ boxShadow: "0 0 12px var(--urgent-glow)" }}
        />
      )}
      {selected && !isUrgent && (
        <span
          className="absolute inset-y-0 left-0 w-0.5 bg-[var(--accent)]"
          style={{ boxShadow: "0 0 12px var(--accent-glow)" }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-3)]">
          {fmtTime(call.started_at)} · {timeAgo(call.started_at)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] ${STATUS_TONE[call.status]}`}
        >
          <StatusDot pulsing={isUrgent || isLive} />
          {STATUS_LABEL[call.status]}
        </span>
      </div>
      <div className="mt-1.5 text-[14px] font-medium leading-tight tracking-tight text-[var(--text)]">
        {call.tenant_name}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--text-2)]">
        <span className="rounded border border-[var(--rule)] px-1.5 py-px font-mono text-[10.5px] text-[var(--text-3)]">
          {call.unit_id.replace("u-", "APT ").toUpperCase()}
        </span>
        <span className="truncate">{call.problem_name ?? "triaging…"}</span>
      </div>
    </button>
  );
}

function StatusDot({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <span
      className="size-[5px] rounded-full bg-current"
      style={{
        boxShadow: "0 0 8px currentColor",
        animation: pulsing ? "urgentPulse 2s ease-in-out infinite" : undefined,
      }}
    />
  );
}

function CallDetail({ call, pmActions }: { call: Call; pmActions: PmActions }) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
          {call.unit_id.replace("u-", "APT ").toUpperCase()} ·{" "}
          {fmtTime(call.started_at)} · {call.tenant_name.toUpperCase()}
        </div>
        <h3 className="font-serif text-[22px] leading-tight tracking-tight">
          {call.problem_name ?? "Triaging…"}
        </h3>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${STATUS_TONE[call.status]}`}
          >
            <StatusDot
              pulsing={
                call.status === "in_progress" ||
                call.status === "dispatch_pending"
              }
            />
            {STATUS_LABEL[call.status]}
          </span>
        </div>
      </header>

      <TranscriptBox turns={call.transcript} />

      <DecisionPane call={call} pmActions={pmActions} />
    </>
  );
}

function UnitDetail({
  unit,
  calls,
  onClose,
}: {
  unit: Unit;
  calls: Call[];
  onClose: () => void;
}) {
  const unitCalls = calls
    .filter((c) => c.unit_id === unit.id)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
            {unit.label} · ETAGE {unit.floor}
          </div>
          <h3 className="font-serif text-[22px] leading-tight tracking-tight">
            {unit.tenant_name ?? "—"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="grid size-7 place-items-center rounded-[7px] border border-[var(--rule)] text-[var(--text-3)] transition hover:border-[var(--rule-strong)] hover:text-[var(--text)]"
          aria-label="Close"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex flex-col gap-2">
        <SectionLabel label="Status" />
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--rule)] bg-[var(--card)] px-3.5 py-2.5">
          <span className="text-[13px] capitalize">{unit.status}</span>
          {unit.badge && (
            <span className="font-mono text-[10.5px] text-[var(--text-3)]">
              {unit.badge}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel
          label="Recent calls"
          right={`${unitCalls.length.toString().padStart(2, "0")} total`}
        />
        {unitCalls.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-[var(--rule)] px-3.5 py-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
            No calls yet for this apartment
          </div>
        )}
        <div className="flex flex-col">
          {unitCalls.slice(0, 5).map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-2 py-2.5 ${
                i < unitCalls.slice(0, 5).length - 1
                  ? "border-b border-[var(--rule)]"
                  : ""
              }`}
            >
              <span className="text-[12.5px] text-[var(--text)]">
                {c.problem_name ?? "triaging…"}
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--text-3)]">
                {timeAgo(c.started_at)} ago
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SectionLabel({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-3)]">
        {label}
      </span>
      {right && (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">
          {right}
        </span>
      )}
    </div>
  );
}

function TranscriptBox({ turns }: { turns: TranscriptTurn[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns.length]);

  if (turns.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[var(--rule)] px-3.5 py-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-3)]">
        No transcript yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionLabel label="Transcript" right={`${turns.length} turns`} />
      <div
        ref={ref}
        className="max-h-44 overflow-y-auto rounded-[10px] border border-[var(--rule)] bg-black/30 p-3"
      >
        {turns.map((t, i) => (
          <div
            key={i}
            className={`mb-2 flex last:mb-0 ${
              t.speaker === "theo" ? "" : "flex-row-reverse"
            }`}
          >
            <div
              className={`max-w-[82%] rounded-[12px] px-2.5 py-1.5 text-[12px] leading-snug ${
                t.speaker === "theo"
                  ? "rounded-bl-[5px] border border-[var(--rule)] bg-white/[0.04] text-[var(--text)]"
                  : "rounded-br-[5px] bg-[var(--accent)] font-medium text-[#062818] shadow-[0_4px_16px_rgba(0,229,143,0.2)]"
              }`}
            >
              <div className="mb-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] opacity-60">
                {t.speaker === "theo" ? "Theo" : "Mieter"}
              </div>
              <div>{t.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionPane({
  call,
  pmActions,
}: {
  call: Call;
  pmActions: PmActions;
}) {
  if (call.status === "video_pending" || call.status === "video_sent")
    return <VideoPane call={call} pmActions={pmActions} />;
  if (call.status === "dispatch_pending" || call.status === "dispatched")
    return <DispatchPane call={call} pmActions={pmActions} />;
  if (call.status === "in_progress")
    return (
      <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(0,229,143,0.2)] bg-[var(--accent-soft)] px-3.5 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--accent)]">
        <StatusDot pulsing />
        Theo is on the call · decision options appear after triage
      </div>
    );
  return null;
}

function VideoCard({ video }: { video: Video }) {
  const thumb = youtubeThumb(video.youtube_url);
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--rule)] bg-[var(--card)]">
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={video.title}
          className="aspect-video w-full object-cover opacity-90"
        />
      )}
      <div className="p-3">
        <div className="text-[13px] font-medium leading-tight text-[var(--text)]">
          {video.title}
        </div>
        <a
          href={video.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block break-all font-mono text-[10px] text-[var(--text-3)] underline-offset-2 hover:text-[var(--text-2)] hover:underline"
        >
          {video.youtube_url}
        </a>
      </div>
    </div>
  );
}

function VideoPane({ call, pmActions }: { call: Call; pmActions: PmActions }) {
  const [busy, setBusy] = useState(false);
  const problem = PROBLEMS.find((p) => p.id === call.problem_id);
  const video = problem?.video_id
    ? VIDEOS.find((v) => v.id === problem.video_id)
    : undefined;
  if (!video) return null;

  const sent = call.status === "video_sent";

  async function send() {
    setBusy(true);
    try {
      await pmActions.sendVideo(call.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel
        label={sent ? "Tutorial gesendet" : "Suggested tutorial"}
        right={
          sent && call.video_sent_at ? `sent ${timeAgo(call.video_sent_at)}` : undefined
        }
      />
      <VideoCard video={video} />
      {sent ? (
        <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(0,229,143,0.2)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-[11.5px] text-[var(--accent)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Sent to tenant · unit back to green
        </div>
      ) : (
        <button
          onClick={send}
          disabled={busy}
          className="rounded-[8px] bg-[var(--warning)] px-3 py-2.5 text-[13px] font-medium text-[#3a2a05] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_20px_-4px_rgba(245,184,66,0.45)] active:translate-y-0 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send to tenant"}
        </button>
      )}
    </div>
  );
}

function DispatchPane({
  call,
  pmActions,
}: {
  call: Call;
  pmActions: PmActions;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const problem = PROBLEMS.find((p) => p.id === call.problem_id);
  const vendors = problem
    ? SERVICE_PROVIDERS.filter((v) => v.category === problem.category)
    : SERVICE_PROVIDERS;
  const dispatched = call.status === "dispatched";
  const dispatchedVendorId = call.dispatched_vendor_id;

  async function dispatch(vendorId: string) {
    setBusy(vendorId);
    try {
      await pmActions.dispatch(call.id, vendorId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel
        label={dispatched ? "Handwerker dispatched" : "Suggested Handwerker"}
        right={`${vendors.length.toString().padStart(2, "0")} options`}
      />
      <div className="flex flex-col gap-2">
        {vendors.map((v) => {
          const isWinner = dispatchedVendorId === v.id;
          return (
            <div
              key={v.id}
              className={`flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3 transition ${
                isWinner
                  ? "border-[rgba(255,138,77,0.3)] bg-[var(--dispatch-soft)]"
                  : dispatched
                  ? "border-[var(--rule)] bg-[var(--card)] opacity-40"
                  : "border-[var(--rule)] bg-[var(--card)] hover:border-[var(--rule-strong)] hover:bg-[var(--card-hover)]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--text)]">
                  {v.name}
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.02em] text-[var(--text-3)]">
                  ★ {v.rating.toFixed(1)}
                  <span className="mx-1.5 text-[var(--text-4)]">·</span>
                  <span className="tabular-nums">{v.phone}</span>
                </div>
              </div>
              {isWinner ? (
                <span className="shrink-0 rounded-[7px] border border-[rgba(255,138,77,0.3)] bg-[rgba(255,138,77,0.12)] px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--dispatch)]">
                  ✓ Dispatched
                </span>
              ) : (
                <button
                  onClick={() => dispatch(v.id)}
                  disabled={busy !== null || dispatched}
                  className="shrink-0 rounded-[7px] bg-[var(--urgent)] px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_4px_14px_-4px_var(--urgent-glow)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_8px_20px_-4px_var(--urgent-glow)] active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {busy === v.id ? "Dispatching…" : "Dispatch"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
