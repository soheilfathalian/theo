"use client";

import type { Unit, UnitStatus } from "@/lib/unit-types";
import { STATUS_COLOR } from "@/lib/unit-types";

interface Props {
  units: Unit[];
  setUnits: (next: Unit[]) => void;
}

const ORDER: UnitStatus[] = ["green", "yellow", "red", "orange"];

export function MockControls({ units, setUnits }: Props) {
  function cycleAll() {
    setUnits(
      units.map((u) => ({
        ...u,
        status: ORDER[(ORDER.indexOf(u.status) + 1) % ORDER.length],
      })),
    );
  }

  function setOne(id: string, status: UnitStatus) {
    setUnits(
      units.map((u) => (u.id === id ? { ...u, status } : u)),
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">
        Demo controls
      </div>
      <button
        onClick={cycleAll}
        className="rounded-md bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
      >
        Cycle all units
      </button>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {units.slice(0, 6).map((u) => (
          <div key={u.id} className="flex items-center gap-1">
            <span className="w-8 text-[10px] text-zinc-300">{u.label.replace("Apt ", "")}</span>
            <div className="flex gap-0.5">
              {ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setOne(u.id, s)}
                  className="size-3 rounded-sm ring-1 ring-white/20 hover:ring-white"
                  style={{ background: STATUS_COLOR[s] }}
                  title={`${u.label} → ${s}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
