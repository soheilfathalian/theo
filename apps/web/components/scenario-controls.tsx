"use client";

import { useState } from "react";

export function ScenarioControls() {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function trigger(name: string) {
    setBusy(name);
    try {
      await fetch(`/api/scenarios/${name}`, { method: "POST" });
    } finally {
      setTimeout(() => setBusy(null), 500);
    }
  }

  return (
    <div className="absolute left-6 top-24 z-10 flex flex-col gap-2 text-xs text-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="self-start rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400 backdrop-blur hover:bg-black/60"
      >
        {open ? "− Demo scenarios" : "+ Demo scenarios"}
      </button>
      {open && (
        <div className="flex w-56 flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur">
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
      )}
    </div>
  );
}
