// ============================================================================
// STUDENT BRIDGE — LOCAL LAN ZERO-INTERNET REAL-TIME EVENT BUS (SSE)
// Delivers 0ms real-time event distribution between Sender & Receiver PCs
// across the same local network (Wi-Fi/LAN) with ZERO internet dependency.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory set of connected SSE subscribers
type ClientController = ReadableStreamDefaultController<Uint8Array>;
const clients = new Set<ClientController>();

function broadcastLocalEvent(data: unknown) {
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(message);

  for (const client of Array.from(clients)) {
    try {
      client.enqueue(encoded);
    } catch {
      clients.delete(client);
    }
  }
}

/**
 * GET: Connects a client to the local LAN real-time event stream (SSE).
 */
export async function GET(_request: NextRequest) {
  let controllerRef: ClientController | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      clients.add(controller);

      // Send initial heartbeat
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));
    },
    cancel() {
      if (controllerRef) {
        clients.delete(controllerRef);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * POST: Broadcasts an event locally to all connected PCs and devices on the LAN.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    broadcastLocalEvent(body);
    return NextResponse.json({ success: true, clientCount: clients.size });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to broadcast event" }, { status: 400 });
  }
}
