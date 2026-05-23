"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import type { HTMLAttributes, DetailedHTMLProps } from "react";
import type { TheoHandlers } from "@/lib/client/theo-store";

const AGENT_ID = process.env.NEXT_PUBLIC_THEO_AGENT_ID;

type ConvaiAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  "agent-id"?: string;
  variant?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": ConvaiAttrs;
    }
  }
}

interface Props {
  handlers: TheoHandlers;
}

/**
 * Mount the ElevenLabs Conv AI widget and bridge its `elevenlabs-convai:call`
 * event to our React handlers. The widget event fires once at conversation
 * start; we attach the client-tool map to event.detail.config.clientTools,
 * and the widget dispatches subsequent tool calls into those JS functions.
 *
 * Handlers are read through a ref so we always invoke the latest closure
 * even if React state changed after the event listener was attached.
 */
export function TheoWidget({ handlers }: Props) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!AGENT_ID) return;

    const onCall = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.config) return;
      detail.config.clientTools = {
        start_call: (args: Parameters<TheoHandlers["start_call"]>[0]) =>
          handlersRef.current.start_call(args),
        append_turn: (args: Parameters<TheoHandlers["append_turn"]>[0]) =>
          handlersRef.current.append_turn(args),
        report_triage: (args: Parameters<TheoHandlers["report_triage"]>[0]) =>
          handlersRef.current.report_triage(args),
      };
    };

    // Wait for the widget element to mount, then attach the listener.
    const interval = setInterval(() => {
      const el = document.querySelector("elevenlabs-convai");
      if (el) {
        el.addEventListener("elevenlabs-convai:call", onCall);
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      const el = document.querySelector("elevenlabs-convai");
      el?.removeEventListener("elevenlabs-convai:call", onCall);
    };
  }, []);

  if (!AGENT_ID) return null;
  return (
    <>
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        async
        type="text/javascript"
      />
      <elevenlabs-convai agent-id={AGENT_ID} />
    </>
  );
}
