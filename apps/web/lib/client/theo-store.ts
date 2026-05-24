"use client";

import { useCallback, useMemo, useState } from "react";
import { UNITS as SEED_UNITS } from "@/lib/unit-config";
import type { Unit, UnitStatus } from "@/lib/unit-types";
import { PROBLEMS } from "@/lib/data/problems";
import { VIDEOS } from "@/lib/data/videos";
import { SERVICE_PROVIDERS } from "@/lib/data/service-providers";
import { resolveUnit, randomUnit } from "./resolve-unit";

export type CallStatus =
  /** Theo is on the call */
  | "in_progress"
  /** Triaged → video resolution. Yellow on the building, waiting for PM to send. */
  | "video_pending"
  /** Triaged → dispatch resolution. Red on the building, waiting for PM to pick a vendor. */
  | "dispatch_pending"
  /** PM clicked "Send video" — tenant got the tutorial, unit back to green. */
  | "video_sent"
  /** PM picked a vendor — unit orange, vendor notified. */
  | "dispatched"
  /** Call ended without a triage decision (rare). */
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
  /** Theo's triage decision */
  problem_id?: string;
  problem_name?: string;
  resolution?: "video" | "dispatch";
  /** PM action: video path */
  video_sent_at?: string;
  /** PM action: dispatch path */
  dispatched_vendor_id?: string;
  dispatched_at?: string;
}

export interface Stats {
  total: number;
  awaiting_action: number;
  resolved: number;
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

export interface PmActions {
  /** PM sends the curated tutorial video to the tenant. Yellow → green. */
  sendVideo: (callId: string) => Promise<void>;
  /** PM dispatches one of the suggested vendors. Red → orange. */
  dispatch: (callId: string, vendorId: string) => Promise<void>;
}

function newCallId(): string {
  return `c-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16)).slice(0, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function computeStats(calls: Call[]): Stats {
  let awaiting = 0;
  let resolved = 0;
  for (const c of calls) {
    if (c.status === "video_pending" || c.status === "dispatch_pending") awaiting++;
    else if (c.status === "video_sent" || c.status === "dispatched") resolved++;
  }
  return { total: calls.length, awaiting_action: awaiting, resolved };
}

/**
 * Theo only triages — the property manager makes every action decision.
 *
 * report_triage stops at red (dispatch_pending) or yellow (video_pending).
 * sendVideo() and dispatch() are explicit PM actions that fire side effects
 * (email, Stripe transfer) and move the unit forward.
 */
export function useTheoStore() {
  const [units, setUnits] = useState<Unit[]>(SEED_UNITS);
  const [calls, setCalls] = useState<Call[]>([]);

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
        if (!unit) {
          // Apartment doesn't exist. Theo must ask again.
          return JSON.stringify({
            ok: false,
            error: "apartment_not_found",
            hint: "Building has floors 0–4 and apartments A–E. Ask the tenant to repeat their floor and apartment letter.",
          });
        }
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
        if (!unit) {
          return JSON.stringify({
            ok: false,
            error: "apartment_not_found",
            hint: "Building has floors 0–4 and apartments A–E.",
          });
        }

        // Surface Theo's one-liner if it provided one, so the PM panel has
        // a clean summary even when the turn-by-turn transcript is sparse.
        if (transcript_summary) {
          setCalls((curr) =>
            curr.map((c) =>
              c.id === call_id
                ? {
                    ...c,
                    transcript: [
                      ...c.transcript,
                      {
                        speaker: "theo",
                        text: transcript_summary,
                        at: nowIso(),
                      },
                    ],
                  }
                : c,
            ),
          );
        }

        if (problem.resolution === "video") {
          patchCall(call_id, {
            problem_id: problem.id,
            problem_name: problem.name,
            resolution: "video",
            unit_id: unit.id,
            status: "video_pending",
          });
          setUnitStatus(
            unit.id,
            "yellow",
            `Tutorial vorgeschlagen · ${problem.name}`,
          );
        } else {
          patchCall(call_id, {
            problem_id: problem.id,
            problem_name: problem.name,
            resolution: "dispatch",
            unit_id: unit.id,
            status: "dispatch_pending",
          });
          setUnitStatus(unit.id, "red", `Aktion nötig · ${problem.name}`);
        }

        return JSON.stringify({
          ok: true,
          resolution: problem.resolution,
          note: "noted for property manager review",
        });
      },
    }),
    [],
  );

  const pmActions: PmActions = useMemo(
    () => ({
      async sendVideo(callId) {
        const call = calls.find((c) => c.id === callId);
        if (!call || !call.problem_id) return;
        const problem = PROBLEMS.find((p) => p.id === call.problem_id);
        const video = problem?.video_id
          ? VIDEOS.find((v) => v.id === problem.video_id)
          : undefined;
        if (!video) return;

        patchCall(callId, { status: "video_sent", video_sent_at: nowIso() });
        setUnitStatus(call.unit_id, "green", undefined);

        // Fire-and-forget email (dry-run if Resend not configured)
        void fetch("/api/email/tutorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_name: call.tenant_name,
            problem_name: problem?.name,
            video_url: video.youtube_url,
            video_title: video.title,
          }),
        }).catch(() => {});
      },

      async dispatch(callId, vendorId) {
        const call = calls.find((c) => c.id === callId);
        if (!call) return;
        const vendor = SERVICE_PROVIDERS.find((v) => v.id === vendorId);
        if (!vendor) return;
        const unit = units.find((u) => u.id === call.unit_id);
        const problem = call.problem_id
          ? PROBLEMS.find((p) => p.id === call.problem_id)
          : undefined;

        patchCall(callId, {
          status: "dispatched",
          dispatched_vendor_id: vendorId,
          dispatched_at: nowIso(),
        });
        setUnitStatus(
          call.unit_id,
          "orange",
          `${vendor.name} dispatched`,
        );

        // Fire-and-forget: Stripe deposit + tenant confirmation + vendor brief
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
            tenant_name: call.tenant_name,
            vendor_name: vendor.name,
            vendor_slot: "morgen 9:00",
            amount_cents: 34000,
          }),
        }).catch(() => {});
        void fetch("/api/email/vendor-dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor_name: vendor.name,
            vendor_email: vendor.email,
            problem_name: problem?.name ?? "Reparatur",
            unit_label: unit?.label ?? call.unit_id,
            tenant_name: call.tenant_name,
            vendor_slot: "morgen 9:00",
            amount_cents: 34000,
          }),
        }).catch(() => {});
      },
    }),
    [calls, units],
  );

  const reset = useCallback(() => {
    setUnits(SEED_UNITS);
    setCalls([]);
  }, []);

  const stats = computeStats(calls);

  return { units, calls, stats, handlers, pmActions, reset };
}
