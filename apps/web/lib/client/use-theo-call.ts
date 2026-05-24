"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import type { TheoHandlers } from "./theo-store";

const AGENT_ID = process.env.NEXT_PUBLIC_THEO_AGENT_ID;

export type CallStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "ending"
  | "ended"
  | "error";

export type SpeakingMode = "speaking" | "listening" | null;

export interface PhoneTurn {
  id: string;
  speaker: "tenant" | "theo";
  text: string;
  at: number;
}

interface UseTheoCallArgs {
  handlers: TheoHandlers;
}

/**
 * Owns one ElevenLabs voice session at a time. Exposes status, the running
 * transcript that's safe to render on the phone screen, and start/end.
 *
 * Lives in client components — needs window.{AudioContext, MediaRecorder, ...}.
 */
export function useTheoCall({ handlers }: UseTheoCallArgs) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [mode, setMode] = useState<SpeakingMode>(null);
  const [turns, setTurns] = useState<PhoneTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Awaited<
    ReturnType<typeof Conversation.startSession>
  > | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const start = useCallback(async () => {
    if (!AGENT_ID) {
      setError("Missing NEXT_PUBLIC_THEO_AGENT_ID");
      setStatus("error");
      return;
    }
    if (sessionRef.current) return;
    setError(null);
    setTurns([]);
    setStatus("connecting");

    try {
      // Request mic up-front so a denied permission shows as a clean error.
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const session = await Conversation.startSession({
        agentId: AGENT_ID,
        clientTools: {
          start_call: (args) => handlersRef.current.start_call(args as never),
          append_turn: (args) =>
            handlersRef.current.append_turn(args as never),
          report_triage: (args) =>
            handlersRef.current.report_triage(args as never),
        },
        onStatusChange: ({ status: s }) => {
          // SDK values: "connected" | "disconnected" | "connecting" | "disconnecting"
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnecting") setStatus("ending");
          else if (s === "disconnected") {
            setStatus("ended");
            setMode(null);
            sessionRef.current = null;
          }
        },
        onModeChange: ({ mode: m }) => {
          if (m === "speaking" || m === "listening") setMode(m);
        },
        onMessage: ({ source, message }) => {
          if (!message) return;
          const speaker: "tenant" | "theo" = source === "user" ? "tenant" : "theo";
          setTurns((curr) => [
            ...curr,
            {
              id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
              speaker,
              text: message,
              at: Date.now(),
            },
          ].slice(-30));
        },
        onError: (err) => {
          setError(typeof err === "string" ? err : String(err));
        },
      });
      sessionRef.current = session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start call");
      setStatus("error");
      sessionRef.current = null;
    }
  }, []);

  const end = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) {
      setStatus("ended");
      return;
    }
    setStatus("ending");
    try {
      await s.endSession();
    } catch {
      // ignore
    }
    sessionRef.current = null;
    setStatus("ended");
    setMode(null);
  }, []);

  // Auto-reset back to idle a moment after ended so the UI returns to call-CTA
  useEffect(() => {
    if (status !== "ended") return;
    const t = setTimeout(() => setStatus("idle"), 3500);
    return () => clearTimeout(t);
  }, [status]);

  // Tear down on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.endSession().catch(() => {});
      sessionRef.current = null;
    };
  }, []);

  return { status, mode, turns, error, start, end };
}
