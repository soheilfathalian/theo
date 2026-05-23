"use client";

import { useState, useEffect } from "react";
import { BuildingScene } from "@/components/building-scene";
import { ScenarioControls } from "@/components/scenario-controls";
import { PmPanel } from "@/components/pm-panel";
import { TheoWidget } from "@/components/theo-widget";
import { useTheoEvents } from "@/lib/use-theo-events";
import type { Unit } from "@/lib/unit-types";

export default function Home() {
  const { units, calls, stats, connected } = useTheoEvents();
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Auto-select the most recent in-progress call so PM sees live action
  useEffect(() => {
    if (!selectedCallId && calls.length > 0) {
      const live = calls.find((c) => c.status === "in_progress");
      if (live) setSelectedCallId(live.id);
    }
  }, [calls, selectedCallId]);

  function handleUnitClick(u: Unit) {
    // When the PM clicks a unit, jump to that unit's latest call
    const callForUnit = calls.find((c) => c.unit_id === u.id);
    if (callForUnit) setSelectedCallId(callForUnit.id);
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#0a0b14] text-white">
      {/* Top bar */}
      <div className="pointer-events-none absolute top-0 left-0 right-[396px] z-10 flex items-start justify-between p-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
            <span>hallo theo</span>
            <span className="text-zinc-600">·</span>
            <span>theo</span>
            <span
              className={`size-1.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-zinc-600"
              }`}
              title={connected ? "Live" : "Disconnected"}
            />
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

      {/* 3D scene */}
      <div className="flex-1">
        <BuildingScene units={units} onUnitClick={handleUnitClick} />
      </div>

      {/* PM panel */}
      <PmPanel
        calls={calls}
        selectedCallId={selectedCallId}
        onSelect={setSelectedCallId}
      />

      <ScenarioControls />
      <TheoWidget />
    </div>
  );
}
