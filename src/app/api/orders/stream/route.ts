import { NextRequest } from "next/server";
import { orderListeners, type OrderEvent } from "@/lib/sse";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let listener: ((ev: OrderEvent)=>void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      listener = function send(ev: OrderEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };
      orderListeners.add(listener);
      controller.enqueue(encoder.encode(`: connected\n\n`));
      keepAlive = setInterval(()=>{
        controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
      }, 15000);
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive);
      if (listener) orderListeners.delete(listener);
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

