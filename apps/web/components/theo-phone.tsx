"use client";

import { useEffect, useRef } from "react";
import type { CallStatus, PhoneTurn, SpeakingMode } from "@/lib/client/use-theo-call";

interface Props {
  status: CallStatus;
  mode: SpeakingMode;
  turns: PhoneTurn[];
  error: string | null;
  onStart: () => void;
  onEnd: () => void;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: "always on",
  connecting: "verbinde…",
  connected: "live",
  ending: "beende…",
  ended: "fertig",
  error: "fehler",
};

function modeCopy(mode: SpeakingMode): string {
  if (mode === "speaking") return "Theo spricht";
  if (mode === "listening") return "Theo hört zu";
  return "";
}

function nowClock(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TheoPhone({
  status,
  mode,
  turns,
  error,
  onStart,
  onEnd,
}: Props) {
  // Auto-scroll transcript on new turn
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns.length]);

  const isLive = status === "connected" || status === "ending";

  return (
    <aside className="z-10 flex h-full w-[340px] shrink-0 flex-col items-center justify-center px-4">
      {/* The phone */}
      <div className="relative h-[640px] w-[300px] rounded-[44px] bg-[#1a1a1f] p-[14px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Screen */}
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[32px] bg-gradient-to-b from-[#0f1219] via-[#0c0f17] to-[#0a0d14]">
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-6 pt-3 text-[11px] font-medium text-zinc-300">
            <span className="tabular-nums">{nowClock()}</span>
            <span className="flex items-center gap-1.5 text-[9px] tracking-wider text-zinc-500">
              <span>5G</span>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                <rect x="0" y="6" width="2" height="4" rx="0.5" />
                <rect x="3" y="4" width="2" height="6" rx="0.5" />
                <rect x="6" y="2" width="2" height="8" rx="0.5" />
                <rect x="9" y="0" width="2" height="10" rx="0.5" />
              </svg>
              <span>100</span>
            </span>
          </div>

          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-[26px] w-[100px] -translate-x-1/2 rounded-[14px] bg-black" />

          {/* Header */}
          <div className="mt-3 flex flex-col items-center gap-0.5 px-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              hallo theo
            </div>
            <div className="flex items-center gap-2 text-base font-medium text-zinc-100">
              Theo
              <span
                className={`size-1.5 rounded-full transition-colors duration-500 ${
                  status === "connected"
                    ? "bg-emerald-400"
                    : status === "connecting" || status === "ending"
                    ? "bg-amber-400"
                    : status === "error"
                    ? "bg-red-400"
                    : "bg-zinc-600"
                }`}
              />
            </div>
            <div className="text-[10px] text-zinc-500">
              {STATUS_LABEL[status]}
              {isLive && mode ? ` · ${modeCopy(mode)}` : ""}
            </div>
          </div>

          {/* Body: switches on status */}
          <div className="flex flex-1 flex-col overflow-hidden px-4">
            {status === "idle" && <IdleBody onStart={onStart} />}
            {status === "connecting" && <ConnectingBody onEnd={onEnd} />}
            {(status === "connected" || status === "ending") && (
              <LiveBody turns={turns} mode={mode} scrollRef={scrollRef} />
            )}
            {status === "ended" && <EndedBody onStart={onStart} />}
            {status === "error" && (
              <ErrorBody message={error ?? "Unbekannter Fehler"} onStart={onStart} />
            )}
          </div>

          {/* Bottom action bar — call / end-call */}
          <div className="px-6 pb-7 pt-2">
            {(status === "connecting" ||
              status === "connected" ||
              status === "ending") && (
              <button
                onClick={onEnd}
                disabled={status === "ending"}
                className="group relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_8px_24px_-4px_rgba(239,68,68,0.6)] transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-60"
                aria-label="Anruf beenden"
              >
                <EndCallIcon />
              </button>
            )}
            {(status === "idle" || status === "ended" || status === "error") && (
              <button
                onClick={onStart}
                className="group relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_-4px_rgba(16,185,129,0.6)] transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96]"
                aria-label="Theo anrufen"
              >
                <span className="absolute inset-0 rounded-full bg-emerald-400/40 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <PhoneIcon />
              </button>
            )}
            <div className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {status === "idle" && "tap to call"}
              {status === "connecting" && "verbinde…"}
              {status === "connected" && "tap red to end"}
              {status === "ending" && "auflegen…"}
              {status === "ended" && "call again"}
              {status === "error" && "try again"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function IdleBody({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="size-16 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 ring-1 ring-emerald-400/20" />
      <div className="text-sm text-zinc-200">Ihr AI Hausmeister</div>
      <div className="max-w-[200px] text-xs leading-relaxed text-zinc-500">
        Defekte, Notfälle, schnelle Fragen — Theo nimmt ab.
      </div>
    </div>
  );
}

function ConnectingBody({ onEnd: _onEnd }: { onEnd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="relative size-20">
        <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 motion-safe:animate-[ping_1.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <span className="absolute inset-2 rounded-full border-2 border-amber-400/60 motion-safe:animate-[ping_1.4s_cubic-bezier(0,0,0.2,1)_infinite] motion-safe:[animation-delay:200ms]" />
        <span className="absolute inset-4 rounded-full bg-amber-400/80" />
      </div>
      <div className="text-xs text-zinc-400">verbinde mit Theo…</div>
    </div>
  );
}

function LiveBody({
  turns,
  mode,
  scrollRef,
}: {
  turns: PhoneTurn[];
  mode: SpeakingMode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden pt-2">
      <div
        ref={scrollRef}
        className="flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]"
      >
        {turns.length === 0 && (
          <div className="pt-6 text-center text-[11px] text-zinc-500">
            Theo hört zu…
          </div>
        )}
        {turns.map((t) => (
          <Bubble key={t.id} turn={t} />
        ))}
        {mode === "listening" && turns.length > 0 && (
          <div className="flex items-center gap-1.5 pl-3 pt-1">
            <span className="size-1 animate-pulse rounded-full bg-zinc-500" />
            <span className="size-1 animate-pulse rounded-full bg-zinc-500 [animation-delay:120ms]" />
            <span className="size-1 animate-pulse rounded-full bg-zinc-500 [animation-delay:240ms]" />
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: PhoneTurn }) {
  const fromTheo = turn.speaker === "theo";
  return (
    <div
      className={`flex ${fromTheo ? "" : "flex-row-reverse"}`}
      style={{
        animation: "phoneBubbleIn 220ms cubic-bezier(0.23, 1, 0.32, 1) both",
      }}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug ${
          fromTheo
            ? "rounded-bl-md bg-zinc-800/80 text-zinc-100 ring-1 ring-white/5"
            : "rounded-br-md bg-emerald-500/85 text-white shadow-sm"
        }`}
      >
        {turn.text}
      </div>
    </div>
  );
}

function EndedBody({ onStart: _onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/30">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-sm text-zinc-100">Alles erledigt</div>
      <div className="max-w-[200px] text-xs leading-relaxed text-zinc-500">
        Theo kümmert sich. Sie bekommen eine E-Mail.
      </div>
    </div>
  );
}

function ErrorBody({ message, onStart: _onStart }: { message: string; onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-sm text-zinc-100">Anruf hat nicht geklappt</div>
      <div className="max-w-[220px] text-xs leading-relaxed text-zinc-400">
        {message}
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.95 21q-3.125 0-6.175-1.362-3.05-1.363-5.55-3.863T4.362 10.225Q3 7.175 3 4.05q0-.45.3-.75T4.05 3H8.1q.35 0 .625.238.275.237.325.562l.65 3.5q.05.4-.025.675-.075.275-.275.475L6.975 10.9q.5.925 1.187 1.787.688.863 1.513 1.663.775.775 1.625 1.438.85.662 1.8 1.212l2.35-2.35q.225-.225.588-.337.362-.113.712-.063l3.45.7q.35.1.575.363.225.262.225.612v4.025q0 .45-.3.75t-.75.3Z" />
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        d="M12 10.1q-3.4 0-6.5 1.3-1.275.55-2 1.7-.725 1.15-.475 2.55l.275 1.4q.075.45.4.75t.775.3h3.5q.45 0 .787-.3.338-.3.413-.75l.375-2.6q.85-.4 1.85-.575t2.6-.175q1.6 0 2.6.175t1.85.575l.375 2.6q.075.45.413.75.337.3.787.3h3.5q.45 0 .775-.3.325-.3.4-.75l.275-1.4q.25-1.4-.475-2.55t-2-1.7Q15.4 10.1 12 10.1Z"
        transform="rotate(135 12 13)"
      />
    </svg>
  );
}
