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
 * Mount the ElevenLabs Conv AI widget and force it to sit at the bottom-LEFT
 * of the viewport, well clear of the property-manager panel on the right.
 *
 * The widget renders into its own shadow DOM, so we override its outermost
 * positioning via a high-specificity rule on the host element itself.
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
      <style>{`
        elevenlabs-convai {
          position: fixed !important;
          left: 24px !important;
          right: auto !important;
          bottom: 24px !important;
          z-index: 60 !important;
        }
      `}</style>
      <elevenlabs-convai agent-id={AGENT_ID} />
    </>
  );
}
