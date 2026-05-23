"use client";

import Script from "next/script";
import type { HTMLAttributes, DetailedHTMLProps } from "react";

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

/**
 * Mounts the ElevenLabs Conv AI floating widget. The web component handles
 * its own positioning, theming and call UI — we just render the script + tag.
 */
export function TheoWidget() {
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
