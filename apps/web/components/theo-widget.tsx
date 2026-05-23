"use client";

import Script from "next/script";
import type { HTMLAttributes, DetailedHTMLProps } from "react";

const AGENT_ID = process.env.NEXT_PUBLIC_THEO_AGENT_ID;

type ConvaiAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  "agent-id"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": ConvaiAttrs;
    }
  }
}

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
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 backdrop-blur-md shadow-2xl">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Call Theo
            </span>
          </div>
          <elevenlabs-convai agent-id={AGENT_ID} />
        </div>
      </div>
    </>
  );
}
