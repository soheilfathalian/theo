"use client";

import { useEffect, useState } from "react";
import { UNITS as SEED_UNITS } from "./unit-config";
import type { Unit, UnitStatus } from "./unit-types";

export interface TheoEvent {
  id: string;
  type: string;
  unit_id: string;
  call_id?: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Stats {
  deflected: number;
  dispatched: number;
  savedEuros: number;
}

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

export interface TheoState {
  units: Unit[];
  events: TheoEvent[];
  calls: Call[];
  stats: Stats;
  connected: boolean;
}

const DEFAULT_STATS: Stats = { deflected: 9, dispatched: 5, savedEuros: 1800 };

function upsertCall(curr: Call[], incoming: Call): Call[] {
  const i = curr.findIndex((c) => c.id === incoming.id);
  if (i === -1) return [incoming, ...curr].slice(0, 50);
  const next = [...curr];
  next[i] = incoming;
  return next;
}

export function useTheoEvents(): TheoState {
  const [units, setUnits] = useState<Unit[]>(SEED_UNITS);
  const [events, setEvents] = useState<TheoEvent[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.addEventListener("open", () => setConnected(true));
    source.addEventListener("error", () => setConnected(false));

    source.addEventListener("snapshot", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as {
        units?: Unit[];
        events?: TheoEvent[];
        calls?: Call[];
        stats?: Stats;
      };
      if (data.units) setUnits(data.units);
      if (data.events) setEvents(data.events);
      if (data.calls) setCalls(data.calls);
      if (data.stats) setStats(data.stats);
      setConnected(true);
    });

    source.addEventListener("unit_status_changed", (e) => {
      const evt = JSON.parse((e as MessageEvent).data) as TheoEvent;
      const status = evt.payload.status as UnitStatus;
      const badge = evt.payload.badge as string | undefined;
      setUnits((curr) =>
        curr.map((u) => (u.id === evt.unit_id ? { ...u, status, badge } : u)),
      );
    });

    const handleCallEvent = (e: Event) => {
      const evt = JSON.parse((e as MessageEvent).data) as TheoEvent;
      setEvents((curr) => [evt, ...curr].slice(0, 80));
      const callPayload = (evt.payload as { call?: Call }).call;
      if (callPayload) {
        setCalls((curr) => upsertCall(curr, callPayload));
      }
    };
    [
      "call_started",
      "triage_decided",
      "video_sent",
      "dispatched",
      "call_ended",
    ].forEach((t) => source.addEventListener(t, handleCallEvent));

    source.addEventListener("stats", (e) => {
      const next = JSON.parse((e as MessageEvent).data) as Stats;
      setStats(next);
    });

    return () => source.close();
  }, []);

  return { units, events, calls, stats, connected };
}
