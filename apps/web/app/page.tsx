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
    <div className="relative grid h-screen w-full grid-rows-[64px_1fr] overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Atmosphere layers */}
      <div className="atmos-vignette" />
      <div className="atmos-grain" />

      {/* ===== HEADER ===== */}
      <header className="relative z-10 flex items-center justify-between border-b border-[var(--rule)] bg-black/40 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="font-serif text-[19px] italic leading-none tracking-tight">
            <span>hallo</span>{" "}
            <span className="font-sans not-italic font-medium tracking-tight">
              theo
            </span>
          </div>
          <div className="mx-1 h-[18px] w-px bg-[var(--rule-strong)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">
            Stadtweg 12 · Berlin
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <StatIsland stats={stats} />
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="relative grid grid-cols-[320px_1fr_400px] overflow-hidden">
        {/* Gradient mesh behind the scene */}
        <div className="atmos-mesh" />

        {/* Left: Theo phone */}
        <div className="relative z-10 border-r border-[var(--rule)]">
          <TheoPhone
            status={call.status}
            mode={call.mode}
            turns={call.turns}
            error={call.error}
            onStart={call.start}
            onEnd={call.end}
          />
        </div>

        {/* Center: scene meta + 3D scene */}
        <section className="relative z-10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-7 py-4">
            <div className="flex items-baseline gap-3">
              <h1 className="font-serif text-[24px] leading-none tracking-tight">
                Your <em className="text-[var(--accent)] not-italic font-serif italic">AI Hausmeister</em>
              </h1>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">
                Live · 5 floors · 25 units
              </span>
            </div>
            <ScenarioControls handlers={handlers} reset={reset} />
          </div>

          <div className="relative flex-1 overflow-hidden">
            <BuildingScene units={units} onUnitClick={handleUnitClick} />
            <div className="pointer-events-none absolute bottom-3 left-7 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-4)]">
              <span className="text-[var(--text-3)]">Scene</span> · drag to rotate · click a unit
            </div>
          </div>
        </section>

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
      </main>
    </div>
  );
}

function BrandMark() {
  return (
    <div
      className="relative grid size-7 place-items-center rounded-[7px] text-[#062818]"
      style={{
        background: "linear-gradient(135deg, var(--accent) 0%, #00b873 100%)",
        boxShadow:
          "0 0 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <span className="absolute inset-px rounded-[6px] border border-white/15" />
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 5l5-3 5 3v6l-5 3-5-3V5z" />
        <path d="M7 8v3" />
      </svg>
    </div>
  );
}

function StatIsland({
  stats,
}: {
  stats: { total: number; awaiting_action: number; resolved: number };
}) {
  return (
    <div className="flex h-[34px] items-stretch overflow-hidden rounded-[10px] border border-[var(--rule)] bg-white/[0.015]">
      <Stat label="Today" value={stats.total.toString().padStart(2, "0")} />
      <Stat
        label="Awaiting"
        value={stats.awaiting_action.toString().padStart(2, "0")}
        tone={stats.awaiting_action > 0 ? "urgent" : "muted"}
        pulse={stats.awaiting_action > 0}
      />
      <Stat
        label="Resolved"
        value={stats.resolved.toString().padStart(2, "0")}
        tone="ok"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
  pulse = false,
}: {
  label: string;
  value: string;
  tone?: "muted" | "urgent" | "ok";
  pulse?: boolean;
}) {
  const valueColor =
    tone === "urgent"
      ? "text-[var(--urgent)]"
      : tone === "ok"
      ? "text-[var(--accent)]"
      : "text-[var(--text)]";
  return (
    <div className="flex items-center gap-2 border-r border-[var(--rule)] px-3.5 last:border-r-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-3)]">
        {label}
      </span>
      <span
        className={`font-mono text-[13px] font-medium tabular-nums ${valueColor}`}
      >
        {value}
      </span>
      {pulse && (
        <span
          className="size-1.5 rounded-full bg-[var(--urgent)]"
          style={{
            boxShadow: "0 0 12px var(--urgent-glow)",
            animation: "urgentPulse 2s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}
