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
  video_pending: "Tutorial vorgeschlagen",
  dispatch_pending: "Aktion nötig",
  video_sent: "Tutorial gesendet",
  dispatched: "Handwerker dispatched",
  ended: "Beendet",
};

const STATUS_TONE: Record<CallStatus, string> = {
  in_progress: "ring-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  video_pending: "ring-yellow-400/40 bg-yellow-400/10 text-yellow-200",
  dispatch_pending: "ring-red-400/50 bg-red-500/15 text-red-200",
  video_sent: "ring-emerald-400/30 bg-emerald-400/5 text-emerald-300",
  dispatched: "ring-orange-400/40 bg-orange-400/10 text-orange-200",
  ended: "ring-white/15 bg-white/5 text-zinc-300",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
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
  // Auto-select the most urgent call (any awaiting-action) if nothing selected
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
    <aside className="z-10 flex h-full w-[380px] shrink-0 flex-col gap-3 border-l border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Property manager
          </div>
          <div className="text-base font-semibold">Inbox</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Awaiting action
          </div>
          <div
            className={`tabular-nums text-sm font-medium ${
              awaiting > 0 ? "text-red-300" : "text-zinc-400"
            }`}
          >
            {awaiting}
          </div>
        </div>
      </div>

      {/* Call list */}
      <div
        className="flex flex-col gap-1.5 overflow-y-auto pr-1"
        style={{ maxHeight: "26vh" }}
      >
        {calls.length === 0 && (
          <div className="rounded-md border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
            Inbox empty. Click a unit on the building for info.
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

      {/* Selected detail — call OR unit-only */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-t border-white/10 pt-3">
        {selectedCall ? (
          <CallDetail call={selectedCall} pmActions={pmActions} />
        ) : selectedUnit ? (
          <UnitDetail unit={selectedUnit} calls={calls} onClose={() => onSelectUnit(null)} />
        ) : (
          <div className="text-xs text-zinc-500">
            Click a call above or a unit on the building.
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
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left text-xs transition ${
        selected
          ? "border-white/30 bg-white/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      } ${isUrgent ? "ring-1 ring-red-400/40" : ""}`}
    >
      {isUrgent && (
        <span className="absolute left-0 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 motion-safe:animate-pulse" />
      )}
      <div className="flex items-center justify-between">
        <span className="font-medium text-zinc-100">{call.tenant_name}</span>
        <span
          className={`rounded-full px-1.5 py-px text-[9px] ring-1 ${STATUS_TONE[call.status]}`}
        >
          {STATUS_LABEL[call.status]}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>
          {call.unit_id.replace("u-", "Apt ").toUpperCase()} ·{" "}
          {call.problem_name ?? "triaging…"}
        </span>
        <span className="shrink-0">{timeAgo(call.started_at)}</span>
      </div>
    </button>
  );
}

function CallDetail({ call, pmActions }: { call: Call; pmActions: PmActions }) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400">
              {call.unit_id.replace("u-", "Apt ").toUpperCase()} ·{" "}
              {fmtTime(call.started_at)}
            </div>
            <div className="mt-0.5 text-sm font-medium text-zinc-100">
              {call.tenant_name}
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ${STATUS_TONE[call.status]}`}
          >
            {STATUS_LABEL[call.status]}
          </span>
        </div>
        {call.problem_name && (
          <div className="mt-2 text-xs text-zinc-300">
            Problem: <span className="font-medium">{call.problem_name}</span>
          </div>
        )}
      </div>

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
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">
            {unit.label} · Etage {unit.floor}
          </div>
          <div className="mt-0.5 text-sm font-medium text-zinc-100">
            {unit.tenant_name ?? "—"}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Status</span>
          <span className="capitalize">{unit.status}</span>
        </div>
        {unit.badge && (
          <div className="mt-1 text-[11px] text-zinc-400">{unit.badge}</div>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          Recent calls
        </div>
        <div className="mt-1.5 space-y-1">
          {unitCalls.length === 0 && (
            <div className="rounded-md border border-dashed border-white/10 p-3 text-center text-[11px] text-zinc-500">
              No calls yet for this apartment.
            </div>
          )}
          {unitCalls.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px]"
            >
              <span className="text-zinc-200">
                {c.problem_name ?? "triaging…"}
              </span>
              <span className="text-zinc-500">{timeAgo(c.started_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
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
      <div className="rounded-md border border-dashed border-white/10 p-3 text-center text-[11px] text-zinc-500">
        No transcript yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Transcript
      </div>
      <div
        ref={ref}
        className="max-h-40 overflow-y-auto rounded-md border border-white/10 bg-black/30 p-2 text-xs"
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
      <div className="rounded-md border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-200">
        Theo is on the call. Decision options appear after triage.
      </div>
    );
  return null;
}

function VideoCard({ video }: { video: Video }) {
  const thumb = youtubeThumb(video.youtube_url);
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={video.title}
          className="aspect-video w-full object-cover opacity-90"
        />
      )}
      <div className="p-2.5">
        <div className="text-xs font-medium text-zinc-100">{video.title}</div>
        <a
          href={video.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block break-all text-[10px] text-zinc-400 underline hover:text-zinc-200"
        >
          {video.youtube_url}
        </a>
      </div>
    </div>
  );
}

function VideoPane({
  call,
  pmActions,
}: {
  call: Call;
  pmActions: PmActions;
}) {
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          {sent ? "Tutorial gesendet" : "Suggested tutorial"}
        </div>
        {sent && call.video_sent_at && (
          <div className="text-[10px] text-emerald-300/70">
            sent {timeAgo(call.video_sent_at)}
          </div>
        )}
      </div>
      <VideoCard video={video} />
      {sent ? (
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] text-emerald-200">
          ✓ Sent to tenant. Unit back to green.
        </div>
      ) : (
        <button
          onClick={send}
          disabled={busy}
          className="mt-1 rounded-md bg-yellow-400 px-3 py-2 text-sm font-medium text-zinc-900 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          {dispatched ? "Handwerker dispatched" : "Suggested Handwerker"}
        </div>
        <div className="text-[10px] text-zinc-500">
          {dispatched ? `${vendors.length} options` : `${vendors.length} options`}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {vendors.map((v) => {
          const isWinner = dispatchedVendorId === v.id;
          return (
            <div
              key={v.id}
              className={`flex items-center justify-between gap-2 rounded-md border p-2 transition-opacity ${
                isWinner
                  ? "border-orange-400/30 bg-orange-400/5"
                  : dispatched
                  ? "border-white/5 bg-white/[0.02] opacity-40"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-zinc-100">
                  {v.name}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span>★ {v.rating.toFixed(1)}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="tabular-nums">{v.phone}</span>
                </div>
              </div>
              {isWinner ? (
                <span className="shrink-0 rounded-md bg-orange-400/15 px-2.5 py-1.5 text-[11px] font-medium text-orange-200 ring-1 ring-orange-400/30">
                  ✓ Dispatched
                </span>
              ) : (
                <button
                  onClick={() => dispatch(v.id)}
                  disabled={busy !== null || dispatched}
                  className="shrink-0 rounded-md bg-red-500 px-2.5 py-1.5 text-[11px] font-medium text-white transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-40"
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
