"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { UNITS as SEED_UNITS } from "@/lib/unit-config";
import type { Unit, UnitStatus } from "@/lib/unit-types";
import { PROBLEMS } from "@/lib/data/problems";
import { VIDEOS } from "@/lib/data/videos";
import { pickBestVendor } from "@/lib/data/service-providers";
import { resolveUnit } from "./resolve-unit";

export type CallStatus =
  | "in_progress"
  | "deflected"
  | "escalated"
  | "dispatched"
  | "ended";

export type TranscriptTurn = {
  speaker: "tenant" | "theo";
  text: string;
  at: string;
};

export interface Call {
  id: string;
  unit_id: string;
  tenant_name: string;
  started_at: string;
  ended_at?: string;
  status: CallStatus;
  transcript: TranscriptTurn[];
  problem_id?: string;
  problem_name?: string;
  resolution?: "video" | "dispatch";
  video_url?: string;
  vendor_name?: string;
  vendor_slot?: string;
  amount_cents?: number;
}

export interface Stats {
  deflected: number;
  dispatched: number;
  savedEuros: number;
}

export interface TheoHandlers {
  start_call: (args: {
    floor: number;
    apartment: string;
    tenant_name?: string;
    initial_turn: string;
  }) => Promise<string>;
  append_turn: (args: {
    call_id: string;
    speaker: "tenant" | "theo";
    text: string;
  }) => Promise<string>;
  report_triage: (args: {
    call_id: string;
    floor: number;
    apartment: string;
    problem_id: string;
    transcript_summary?: string;
    reasoning?: string;
  }) => Promise<string>;
}

function newCallId(): string {
  return `c-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16)).slice(0, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Pure client-side Theo state. The ElevenLabs widget dispatches tool calls
 * into the handlers here; React state mutates immediately and the UI
 * (3D building + PM panel) updates without any server round-trip.
 *
 * Side effects (Stripe transfer, Resend email) are fired from inside the
 * handlers via stateless /api/* endpoints, which is the only place we still
 * touch the server.
 */
export function useTheoStore() {
  const [units, setUnits] = useState<Unit[]>(SEED_UNITS);
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<Stats>({
    deflected: 0,
    dispatched: 0,
    savedEuros: 0,
  });

  // Track active timers so we can clear when resetting
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  function scheduleTimeout(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      timersRef.current.delete(t);
      fn();
    }, ms);
    timersRef.current.add(t);
    return t;
  }
  function clearAllTimers() {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current.clear();
  }

  function setUnitStatus(
    unitId: string,
    status: UnitStatus,
    badge: string | undefined,
  ) {
    setUnits((curr) =>
      curr.map((u) => (u.id === unitId ? { ...u, status, badge } : u)),
    );
  }

  function patchCall(callId: string, patch: Partial<Call>) {
    setCalls((curr) =>
      curr.map((c) => (c.id === callId ? { ...c, ...patch } : c)),
    );
  }

  const handlers: TheoHandlers = useMemo(
    () => ({
      async start_call({ floor, apartment, tenant_name, initial_turn }) {
        const unit = resolveUnit({ floor, apartment });
        const callId = newCallId();
        const call: Call = {
          id: callId,
          unit_id: unit.id,
          tenant_name: tenant_name ?? unit.tenant_name ?? "Mieter",
          started_at: nowIso(),
          status: "in_progress",
          transcript: initial_turn
            ? [{ speaker: "tenant", text: initial_turn, at: nowIso() }]
            : [],
        };
        setCalls((curr) => [call, ...curr].slice(0, 50));
        return JSON.stringify({
          ok: true,
          call_id: callId,
          unit_id: unit.id,
          unit_label: unit.label,
        });
      },

      async append_turn({ call_id, speaker, text }) {
        setCalls((curr) =>
          curr.map((c) =>
            c.id === call_id
              ? {
                  ...c,
                  transcript: [
                    ...c.transcript,
                    { speaker, text, at: nowIso() },
                  ],
                }
              : c,
          ),
        );
        return JSON.stringify({ ok: true });
      },

      async report_triage({
        call_id,
        floor,
        apartment,
        problem_id,
        transcript_summary,
      }) {
        const problem = PROBLEMS.find((p) => p.id === problem_id);
        if (!problem) {
          return JSON.stringify({
            ok: false,
            error: `unknown problem_id: ${problem_id}`,
          });
        }

        const unit = resolveUnit({ floor, apartment });
        const video = problem.video_id
          ? VIDEOS.find((v) => v.id === problem.video_id)
          : undefined;

        patchCall(call_id, {
          problem_id: problem.id,
          problem_name: problem.name,
          resolution: problem.resolution,
          unit_id: unit.id,
        });

        if (transcript_summary) {
          // Surface Theo's internal one-liner as a system-style turn so the
          // PM panel reflects what Theo concluded even if append_turn was
          // skipped.
          setCalls((curr) =>
            curr.map((c) =>
              c.id === call_id
                ? {
                    ...c,
                    transcript: [
                      ...c.transcript,
                      { speaker: "theo", text: transcript_summary, at: nowIso() },
                    ],
                  }
                : c,
            ),
          );
        }

        if (problem.resolution === "video") {
          setUnitStatus(unit.id, "yellow", `Video gesendet · ${problem.name}`);
          patchCall(call_id, {
            status: "deflected",
            video_url: video?.youtube_url,
          });
          setStats((s) => ({
            deflected: s.deflected + 1,
            dispatched: s.dispatched,
            savedEuros: (s.deflected + 1) * 200,
          }));

          // Side effect: fire-and-forget email (the /api/email route will
          // either send a real Resend email when configured, or no-op in dev)
          if (video) {
            void fetch("/api/email/tutorial", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenant_name: unit.tenant_name,
                problem_name: problem.name,
                video_url: video.youtube_url,
                video_title: video.title,
              }),
            }).catch(() => {});
          }

          // Reset unit to green after a moment so the building doesn't stay yellow
          scheduleTimeout(() => {
            setUnitStatus(unit.id, "green", undefined);
            patchCall(call_id, { status: "ended", ended_at: nowIso() });
          }, 6000);

          return JSON.stringify({
            ok: true,
            resolution: "video",
            video_url: video?.youtube_url,
          });
        }

        // dispatch path
        const vendor = pickBestVendor(problem.category);
        setUnitStatus(unit.id, "red", `Notfall · ${problem.name}`);
        patchCall(call_id, { status: "escalated" });

        scheduleTimeout(() => {
          setUnitStatus(
            unit.id,
            "orange",
            `${vendor.name} · morgen 9:00 · €340 hinterlegt`,
          );
          patchCall(call_id, {
            status: "dispatched",
            vendor_name: vendor.name,
            vendor_slot: "morgen 9:00",
            amount_cents: 34000,
            ended_at: nowIso(),
          });
          setStats((s) => ({
            deflected: s.deflected,
            dispatched: s.dispatched + 1,
            savedEuros: s.savedEuros,
          }));

          // Side effects: real Stripe transfer + tenant confirmation email
          void fetch("/api/stripe/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendor_id: vendor.id,
              amount_cents: 34000,
            }),
          }).catch(() => {});
          void fetch("/api/email/dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenant_name: unit.tenant_name,
              vendor_name: vendor.name,
              vendor_slot: "morgen 9:00",
              amount_cents: 34000,
            }),
          }).catch(() => {});
        }, 1500);

        return JSON.stringify({
          ok: true,
          resolution: "dispatch",
          vendor_name: vendor.name,
          slot: "morgen 9:00",
          amount_cents: 34000,
        });
      },
    }),
    // Stable identity — all setters are functional updates that don't capture state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reset = useCallback(() => {
    clearAllTimers();
    setUnits(SEED_UNITS);
    setCalls([]);
    setStats({ deflected: 0, dispatched: 0, savedEuros: 0 });
  }, []);

  return { units, calls, stats, handlers, reset };
}
