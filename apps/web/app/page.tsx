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
  const { units, calls, stats, handlers, reset } = useTheoStore();
  const call = useTheoCall({ handlers });
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  function handleUnitClick(u: Unit) {
    const callForUnit = calls.find((c) => c.unit_id === u.id);
    if (callForUnit) setSelectedCallId(callForUnit.id);
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
            <span className="font-mono text-green-400">{stats.deflected}</span>{" "}
            deflected ·{" "}
            <span className="font-mono text-orange-400">{stats.dispatched}</span>{" "}
            dispatched ·{" "}
            <span className="font-mono text-emerald-300">
              €{stats.savedEuros.toLocaleString("de-DE")}
            </span>{" "}
            saved
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

      {/* Center: 3D scene */}
      <div className="flex-1">
        <BuildingScene units={units} onUnitClick={handleUnitClick} />
      </div>

      {/* Right: PM panel */}
      <PmPanel
        calls={calls}
        selectedCallId={selectedCallId}
        onSelect={setSelectedCallId}
      />

      <ScenarioControls handlers={handlers} reset={reset} />
    </div>
  );
}
