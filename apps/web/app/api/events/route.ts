import { store } from "@/lib/server/store";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      // Initial full snapshot
      send("snapshot", store.getSnapshot());

      const unsub = store.subscribe((evt) => {
        send(evt.type, evt);
        // Push fresh stats whenever the running counters change
        if (evt.type === "video_sent" || evt.type === "dispatched") {
          send("stats", store.getStats());
        }
      });

      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(enc.encode(`: ping\n\n`));
      }, 25000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
