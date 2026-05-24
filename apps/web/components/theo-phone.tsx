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
  if (mode === "speaking") return "spricht";
  if (mode === "listening") return "hört zu";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns.length]);

  const isLive = status === "connected" || status === "ending";

  return (
    <aside className="flex h-full w-full items-center justify-center px-4 py-6">
      {/* The phone */}
      <div
        className="relative h-[560px] w-[268px] rounded-[42px] p-[10px]"
        style={{
          background: "linear-gradient(180deg, #1a1a1f 0%, #0e0e12 100%)",
          boxShadow:
            "0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Screen */}
        <div
          className="relative flex h-full w-full flex-col overflow-hidden rounded-[32px]"
          style={{
            background: "linear-gradient(180deg, #0c0e14 0%, #06070b 100%)",
          }}
        >
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-5 pt-2.5 font-mono text-[11px] text-[var(--text-2)]">
            <span className="tabular-nums">{nowClock()}</span>
            <span className="flex items-center gap-1.5 text-[9px] tracking-wider text-[var(--text-3)]">
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
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-[22px] w-[88px] -translate-x-1/2 rounded-[12px] bg-black" />

          {/* Header */}
          <div className="mt-5 flex flex-col items-center gap-0.5 px-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--text-3)]">
              hallo theo
            </div>
            <div className="mt-1 flex items-center gap-2 text-base font-medium text-[var(--text)]">
              Theo
              <span
                className="size-1.5 rounded-full transition-colors duration-500"
                style={{
                  background:
                    status === "connected"
                      ? "var(--accent)"
                      : status === "connecting" || status === "ending"
                      ? "var(--warning)"
                      : status === "error"
                      ? "var(--urgent)"
                      : "var(--text-4)",
                  boxShadow:
                    status === "connected"
                      ? "0 0 10px var(--accent-glow)"
                      : "none",
                }}
              />
            </div>
            <div className="text-[11px] text-[var(--text-3)]">
              {STATUS_LABEL[status]}
              {isLive && mode ? (
                <>
                  {" "}
                  <span className="text-[var(--text-4)]">·</span>{" "}
                  <span className="text-[var(--accent)]">{modeCopy(mode)}</span>
                </>
              ) : (
                ""
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col overflow-hidden px-3.5">
            {status === "idle" && <IdleBody />}
            {status === "connecting" && <ConnectingBody />}
            {(status === "connected" || status === "ending") && (
              <LiveBody turns={turns} mode={mode} scrollRef={scrollRef} />
            )}
            {status === "ended" && <EndedBody />}
            {status === "error" && (
              <ErrorBody message={error ?? "Unbekannter Fehler"} />
            )}
          </div>

          {/* Bottom action */}
          <div className="px-5 pb-6 pt-2">
            {(status === "connecting" ||
              status === "connected" ||
              status === "ending") && (
              <button
                onClick={onEnd}
                disabled={status === "ending"}
                className="group relative mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform duration-150 hover:scale-[1.06] active:scale-[0.96] disabled:opacity-60"
                style={{
                  background: "var(--urgent)",
                  boxShadow: "0 12px 32px -8px var(--urgent-glow)",
                }}
                aria-label="Anruf beenden"
              >
                <EndCallIcon />
              </button>
            )}
            {(status === "idle" || status === "ended" || status === "error") && (
              <button
                onClick={onStart}
                className="group relative mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[#062818] transition-transform duration-150 hover:scale-[1.06] active:scale-[0.96]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent) 0%, #00b873 100%)",
                  boxShadow:
                    "0 12px 32px -8px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
                aria-label="Theo anrufen"
              >
                <span
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background: "var(--accent)",
                    opacity: 0.4,
                    animation: "ringPulse 2.4s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
                <PhoneIcon />
              </button>
            )}
            <div className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.2em] text-[var(--text-3)]">
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

function IdleBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div
        className="size-16 rounded-full ring-1"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(0,229,143,0.35), rgba(0,229,143,0.05) 70%)",
          boxShadow: "inset 0 0 24px rgba(0,229,143,0.15)",
        }}
      />
      <div className="text-[13px] text-[var(--text)]">Ihr AI Hausmeister</div>
      <div className="max-w-[200px] text-[11px] leading-relaxed text-[var(--text-3)]">
        Defekte, Notfälle, schnelle Fragen — Theo nimmt ab.
      </div>
    </div>
  );
}

function ConnectingBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="relative size-20">
        <span
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: "rgba(245,184,66,0.4)",
            animation: "ringPulse 1.4s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <span
          className="absolute inset-2 rounded-full border-2"
          style={{
            borderColor: "rgba(245,184,66,0.6)",
            animation: "ringPulse 1.4s cubic-bezier(0,0,0.2,1) infinite",
            animationDelay: "200ms",
          }}
        />
        <span
          className="absolute inset-4 rounded-full"
          style={{ background: "rgba(245,184,66,0.85)" }}
        />
      </div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-3)]">
        verbinde mit Theo…
      </div>
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
    <div className="flex flex-1 flex-col gap-2 overflow-hidden pt-3">
      <div
        ref={scrollRef}
        className="flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]"
      >
        {turns.length === 0 && (
          <div className="pt-6 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-3)]">
            Theo hört zu…
          </div>
        )}
        {turns.map((t) => (
          <Bubble key={t.id} turn={t} />
        ))}
        {mode === "listening" && turns.length > 0 && (
          <div className="flex items-center gap-1.5 pl-3 pt-1.5">
            <span
              className="size-[3px] rounded-full bg-[var(--accent)]"
              style={{ animation: "urgentPulse 1.4s ease-in-out infinite" }}
            />
            <span
              className="size-[3px] rounded-full bg-[var(--accent)]"
              style={{
                animation: "urgentPulse 1.4s ease-in-out infinite",
                animationDelay: "150ms",
              }}
            />
            <span
              className="size-[3px] rounded-full bg-[var(--accent)]"
              style={{
                animation: "urgentPulse 1.4s ease-in-out infinite",
                animationDelay: "300ms",
              }}
            />
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
        animation: "phoneBubbleIn 240ms cubic-bezier(0.23, 1, 0.32, 1) both",
      }}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug ${
          fromTheo
            ? "rounded-bl-[6px] border border-[var(--rule)] bg-white/[0.05] text-[var(--text)]"
            : "rounded-br-[6px] font-medium text-[#062818]"
        }`}
        style={
          fromTheo
            ? undefined
            : {
                background: "var(--accent)",
                boxShadow: "0 4px 16px rgba(0,229,143,0.22)",
              }
        }
      >
        {turn.text}
      </div>
    </div>
  );
}

function EndedBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full ring-1"
        style={{
          background: "rgba(0,229,143,0.15)",
          boxShadow: "inset 0 0 0 1px rgba(0,229,143,0.3)",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--accent)]"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-[13px] text-[var(--text)]">Alles erledigt</div>
      <div className="max-w-[200px] text-[11px] leading-relaxed text-[var(--text-3)]">
        Theo kümmert sich. Sie bekommen eine E-Mail.
      </div>
    </div>
  );
}

function ErrorBody({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-[13px] text-[var(--text)]">Anruf hat nicht geklappt</div>
      <div className="max-w-[220px] text-[11px] leading-relaxed text-[var(--text-3)]">
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
