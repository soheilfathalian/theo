"use client";

import { useState } from "react";
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

  async function runDeflection() {
    setBusy("deflection");
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
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">
        Demo scenarios
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={runDeflection}
          disabled={busy !== null}
          className="rounded-md bg-yellow-400/15 px-3 py-1.5 text-left font-medium text-yellow-200 ring-1 ring-yellow-400/30 hover:bg-yellow-400/25 disabled:opacity-50"
        >
          🎥 Trigger deflection call
          <div className="text-[10px] text-zinc-400">unit → yellow → green</div>
        </button>
        <button
          onClick={runEscalation}
          disabled={busy !== null}
          className="rounded-md bg-red-400/15 px-3 py-1.5 text-left font-medium text-red-200 ring-1 ring-red-400/30 hover:bg-red-400/25 disabled:opacity-50"
        >
          🚨 Trigger escalation call
          <div className="text-[10px] text-zinc-400">unit → red → orange</div>
        </button>
        <button
          onClick={reset}
          disabled={busy !== null}
          className="rounded-md bg-white/5 px-3 py-1.5 text-left font-medium text-zinc-300 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
        >
          ↺ Reset all units
        </button>
      </div>
    </div>
  );
}
