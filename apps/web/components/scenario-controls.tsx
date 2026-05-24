"use client";

import { useEffect, useRef, useState } from "react";
import type { TheoHandlers } from "@/lib/client/theo-store";

interface Props {
  handlers: TheoHandlers;
  reset: () => void;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomFloorApt(): { floor: number; apartment: string } {
  return {
    floor: Math.floor(Math.random() * 5),
    apartment: ["A", "B", "C", "D", "E"][Math.floor(Math.random() * 5)],
  };
}

export function ScenarioControls({ handlers, reset }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function runDeflection() {
    setBusy("deflection");
    setOpen(false);
    try {
      const { floor, apartment } = randomFloorApt();
      const startRes = await handlers.start_call({
        floor,
        apartment,
        initial_turn: "Spüle ist verstopft.",
      });
      const { call_id } = JSON.parse(startRes);
      await sleep(500);
      await handlers.append_turn({
        call_id,
        speaker: "tenant",
        text: "Spüle ist verstopft.",
      });
      await sleep(600);
      await handlers.append_turn({
        call_id,
        speaker: "theo",
        text: "Schon Saugglocke probiert?",
      });
      await sleep(700);
      await handlers.append_turn({
        call_id,
        speaker: "tenant",
        text: "Nein, noch nicht.",
      });
      await sleep(400);
      await handlers.report_triage({
        call_id,
        floor,
        apartment,
        problem_id: "p-abfluss",
        transcript_summary: "Verstopfter Abfluss, kein DIY-Versuch.",
      });
    } finally {
      setTimeout(() => setBusy(null), 1000);
    }
  }

  async function runEscalation() {
    setBusy("escalation");
    setOpen(false);
    try {
      const { floor, apartment } = randomFloorApt();
      const startRes = await handlers.start_call({
        floor,
        apartment,
        initial_turn: "Heizung springt nicht an.",
      });
      const { call_id } = JSON.parse(startRes);
      await sleep(500);
      await handlers.append_turn({
        call_id,
        speaker: "tenant",
        text: "Heizung springt nicht an, eiskalt.",
      });
      await sleep(600);
      await handlers.append_turn({
        call_id,
        speaker: "theo",
        text: "Welche Fehlernummer?",
      });
      await sleep(700);
      await handlers.append_turn({
        call_id,
        speaker: "tenant",
        text: "E2 auf dem Display.",
      });
      await sleep(400);
      await handlers.report_triage({
        call_id,
        floor,
        apartment,
        problem_id: "p-heizung-aus",
        transcript_summary: "Heizung defekt, Fehlercode E2.",
      });
    } finally {
      setTimeout(() => setBusy(null), 1000);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        disabled={busy !== null}
        className="inline-flex h-[30px] items-center gap-2 rounded-[8px] border border-[var(--rule)] bg-white/[0.015] pl-2 pr-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-2)] transition hover:border-[var(--rule-strong)] hover:text-[var(--text)] disabled:opacity-50"
      >
        <span className="rounded border border-[var(--rule)] px-1.5 py-px text-[9px] text-[var(--text-3)]">
          ⌘K
        </span>
        Trigger scenario
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[280px] overflow-hidden rounded-[12px] border border-[var(--rule)] bg-[#0a0a0d]/95 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <div className="border-b border-[var(--rule)] px-3.5 py-2.5">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--text-3)]">
              Demo scenarios
            </div>
          </div>

          <div className="flex flex-col">
            <ScenarioRow
              onClick={runDeflection}
              accent="var(--warning)"
              title="Tutorial deflection"
              hint="unit → yellow → PM sends video"
              disabled={busy !== null}
            />
            <ScenarioRow
              onClick={runEscalation}
              accent="var(--urgent)"
              title="Vendor escalation"
              hint="unit → red → PM picks Handwerker"
              disabled={busy !== null}
            />
            <button
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={busy !== null}
              className="flex items-center gap-3 border-t border-[var(--rule)] px-3.5 py-2.5 text-left transition hover:bg-white/[0.03] disabled:opacity-50"
            >
              <span className="grid size-5 place-items-center rounded-md border border-[var(--rule)] text-[var(--text-3)]">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
              </span>
              <div className="flex-1">
                <div className="text-[12.5px] font-medium text-[var(--text)]">
                  Reset all units
                </div>
                <div className="mt-px font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-3)]">
                  clear inbox · all units back to green
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioRow({
  onClick,
  accent,
  title,
  hint,
  disabled,
}: {
  onClick: () => void;
  accent: string;
  title: string;
  hint: string;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 border-b border-[var(--rule)] px-3.5 py-2.5 text-left transition hover:bg-white/[0.03] disabled:opacity-50"
    >
      <span
        className="size-2 rounded-full shrink-0"
        style={{
          background: accent,
          boxShadow: `0 0 12px ${accent}`,
        }}
      />
      <div className="flex-1">
        <div className="text-[12.5px] font-medium text-[var(--text)]">
          {title}
        </div>
        <div className="mt-px font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-3)]">
          {hint}
        </div>
      </div>
    </button>
  );
}
