"use client";

import { useState } from "react";
import { BuildingScene } from "@/components/building-scene";
import { ScenarioControls } from "@/components/scenario-controls";
import { PmPanel } from "@/components/pm-panel";
import { TheoPhone } from "@/components/theo-phone";
import { useTheoStore } from "@/lib/client/theo-store";
import { useTheoCall } from "@/lib/client/use-theo-call";
import type { Unit } from "@/lib/unit-types";

export default function Home() {
  const { units, calls, stats, handlers, pmActions, reset } = useTheoStore();
  const call = useTheoCall({ handlers });
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  function handleUnitClick(u: Unit) {
    setSelectedUnitId(u.id);
    const callForUnit = calls.find((c) => c.unit_id === u.id);
    setSelectedCallId(callForUnit?.id ?? null);
  }

  function handleSelectCall(id: string | null) {
    setSelectedCallId(id);
    if (id) {
      const c = calls.find((c) => c.id === id);
      setSelectedUnitId(c?.unit_id ?? null);
    }
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#0a0b14] text-white">
      {/* Top bar */}
      <div className="pointer-events-none absolute left-[340px] right-[396px] top-0 z-10 flex items-start justify-between p-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
            <span>hallo theo</span>
            <span className="text-zinc-600">·</span>
            <span>theo</span>
            <span className="size-1.5 rounded-full bg-emerald-400" />
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Your AI Hausmeister</h1>
        </div>
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right backdrop-blur">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">
            Today
          </div>
          <div className="mt-0.5 text-sm">
            <span className="font-mono text-zinc-200">{stats.total}</span>{" "}
            calls ·{" "}
            <span
              className={`font-mono ${
                stats.awaiting_action > 0 ? "text-red-400" : "text-zinc-400"
              }`}
            >
              {stats.awaiting_action}
            </span>{" "}
            awaiting action ·{" "}
            <span className="font-mono text-emerald-300">{stats.resolved}</span>{" "}
            resolved
          </div>
        </div>
      </div>

      {/* Left: Theo phone */}
      <TheoPhone
        status={call.status}
        mode={call.mode}
        turns={call.turns}
        error={call.error}
        onStart={call.start}
        onEnd={call.end}
      />

      {/* Center: 3D scene with scenarios anchored at its bottom-center */}
      <div className="relative flex-1">
        <BuildingScene units={units} onUnitClick={handleUnitClick} />
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <ScenarioControls handlers={handlers} reset={reset} />
        </div>
      </div>

      {/* Right: PM panel */}
      <PmPanel
        calls={calls}
        units={units}
        selectedCallId={selectedCallId}
        selectedUnitId={selectedUnitId}
        onSelectCall={handleSelectCall}
        onSelectUnit={(id) => {
          setSelectedUnitId(id);
          setSelectedCallId(null);
        }}
        pmActions={pmActions}
      />
    </div>
  );
}
