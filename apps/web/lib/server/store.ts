import { EventEmitter } from "node:events";
import { UNITS } from "@/lib/unit-config";
import type { Unit, UnitStatus } from "@/lib/unit-types";

export type EventType =
  | "call_started"
  | "triage_decided"
  | "video_sent"
  | "dispatched"
  | "call_ended"
  | "unit_status_changed";

export interface TheoEvent {
  id: string;
  type: EventType;
  unit_id: string;
  call_id?: string;
  payload: Record<string, unknown>;
  created_at: string;
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
  // Theo's decision
  problem_id?: string;
  problem_name?: string;
  resolution?: "video" | "dispatch";
  // Action taken
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

class TheoStore {
  private unitStatus = new Map<string, UnitStatus>();
  private unitBadge = new Map<string, string | undefined>();
  private events: TheoEvent[] = [];
  private calls = new Map<string, Call>();
  private bus = new EventEmitter();
  private deflected = 9;
  private dispatched = 5;

  constructor() {
    UNITS.forEach((u) => {
      this.unitStatus.set(u.id, "green");
      this.unitBadge.set(u.id, undefined);
    });
    this.bus.setMaxListeners(50);
  }

  getUnits(): Unit[] {
    return UNITS.map((u) => ({
      ...u,
      status: this.unitStatus.get(u.id) ?? "green",
      badge: this.unitBadge.get(u.id),
    }));
  }

  getCalls(): Call[] {
    return [...this.calls.values()].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );
  }

  getCall(id: string): Call | undefined {
    return this.calls.get(id);
  }

  getStats(): Stats {
    return {
      deflected: this.deflected,
      dispatched: this.dispatched,
      savedEuros: this.deflected * 200,
    };
  }

  getSnapshot() {
    return {
      units: this.getUnits(),
      events: this.events.slice(-50),
      calls: this.getCalls().slice(0, 20),
      stats: this.getStats(),
    };
  }

  setUnitStatus(unitId: string, status: UnitStatus, badge?: string) {
    this.unitStatus.set(unitId, status);
    this.unitBadge.set(unitId, badge);
    this.emit({
      type: "unit_status_changed",
      unit_id: unitId,
      payload: { status, badge },
    });
  }

  startCall(input: {
    unit_id: string;
    tenant_name: string;
    initial_turn: string;
  }): Call {
    const id = `c-${crypto.randomUUID().slice(0, 8)}`;
    const call: Call = {
      id,
      unit_id: input.unit_id,
      tenant_name: input.tenant_name,
      started_at: new Date().toISOString(),
      status: "in_progress",
      transcript: [
        { speaker: "tenant", text: input.initial_turn, at: new Date().toISOString() },
      ],
    };
    this.calls.set(id, call);
    this.emit({
      type: "call_started",
      unit_id: input.unit_id,
      call_id: id,
      payload: { call },
    });
    return call;
  }

  appendTurn(callId: string, turn: Omit<TranscriptTurn, "at">) {
    const call = this.calls.get(callId);
    if (!call) return;
    call.transcript.push({ ...turn, at: new Date().toISOString() });
    this.emit({
      type: "call_started", // re-use to push call updates; client merges
      unit_id: call.unit_id,
      call_id: callId,
      payload: { call },
    });
  }

  decideTriage(
    callId: string,
    decision: {
      problem_id: string;
      problem_name: string;
      resolution: "video" | "dispatch";
      reasoning?: string;
    },
  ) {
    const call = this.calls.get(callId);
    if (!call) return;
    call.problem_id = decision.problem_id;
    call.problem_name = decision.problem_name;
    call.resolution = decision.resolution;
    call.status = decision.resolution === "video" ? "deflected" : "escalated";
    this.emit({
      type: "triage_decided",
      unit_id: call.unit_id,
      call_id: callId,
      payload: { ...decision, call },
    });
  }

  recordVideoSent(callId: string, video_url: string) {
    const call = this.calls.get(callId);
    if (!call) return;
    call.video_url = video_url;
    call.status = "deflected";
    this.deflected += 1;
    this.emit({
      type: "video_sent",
      unit_id: call.unit_id,
      call_id: callId,
      payload: { video_url, call },
    });
  }

  recordDispatch(
    callId: string,
    info: { vendor_name: string; vendor_slot: string; amount_cents: number },
  ) {
    const call = this.calls.get(callId);
    if (!call) return;
    call.vendor_name = info.vendor_name;
    call.vendor_slot = info.vendor_slot;
    call.amount_cents = info.amount_cents;
    call.status = "dispatched";
    this.dispatched += 1;
    this.emit({
      type: "dispatched",
      unit_id: call.unit_id,
      call_id: callId,
      payload: { ...info, call },
    });
  }

  endCall(callId: string) {
    const call = this.calls.get(callId);
    if (!call) return;
    call.ended_at = new Date().toISOString();
    if (call.status === "in_progress") call.status = "ended";
    this.emit({
      type: "call_ended",
      unit_id: call.unit_id,
      call_id: callId,
      payload: { call },
    });
  }

  emit(evt: Omit<TheoEvent, "id" | "created_at">) {
    const full: TheoEvent = {
      ...evt,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.events.push(full);
    if (this.events.length > 200) this.events = this.events.slice(-200);
    this.bus.emit("event", full);
  }

  subscribe(listener: (evt: TheoEvent) => void) {
    this.bus.on("event", listener);
    return () => this.bus.off("event", listener);
  }

  reset() {
    UNITS.forEach((u) => {
      this.unitStatus.set(u.id, "green");
      this.unitBadge.set(u.id, undefined);
    });
    this.calls.clear();
  }
}

const g = globalThis as unknown as { __theoStore?: TheoStore };
export const store: TheoStore = g.__theoStore ?? new TheoStore();
g.__theoStore = store;
