"use client";

import { useState } from "react";

export function ScenarioControls() {
  const [busy, setBusy] = useState<string | null>(null);

  async function trigger(name: string) {
    setBusy(name);
    try {
      await fetch(`/api/scenarios/${name}`, { method: "POST" });
    } finally {
      setTimeout(() => setBusy(null), 500);
    }
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">
        Demo scenarios
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => trigger("deflection")}
          disabled={busy !== null}
          className="rounded-md bg-yellow-400/15 px-3 py-1.5 text-left font-medium text-yellow-200 ring-1 ring-yellow-400/30 hover:bg-yellow-400/25 disabled:opacity-50"
        >
          🎥 Trigger deflection call
          <div className="text-[10px] text-zinc-400">unit → yellow → green</div>
        </button>
        <button
          onClick={() => trigger("escalation")}
          disabled={busy !== null}
          className="rounded-md bg-red-400/15 px-3 py-1.5 text-left font-medium text-red-200 ring-1 ring-red-400/30 hover:bg-red-400/25 disabled:opacity-50"
        >
          🚨 Trigger escalation call
          <div className="text-[10px] text-zinc-400">unit → red → orange</div>
        </button>
        <button
          onClick={() => trigger("reset")}
          disabled={busy !== null}
          className="rounded-md bg-white/5 px-3 py-1.5 text-left font-medium text-zinc-300 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
        >
          ↺ Reset all units
        </button>
      </div>
    </div>
  );
}
