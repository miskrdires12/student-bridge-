/**
 * StudentBridge station relay.
 *
 * The station app finds out about another station's send by asking, every ten seconds, whether
 * anything arrived. That interval is not a design choice, it is the widest gap a system can leave
 * when nothing is able to tell it otherwise. This worker closes the gap: one Durable Object holds an
 * open WebSocket for every connected station, the edge posts the fact of a write here the moment that
 * write is durable, and the hub pushes it down every socket in the same round trip. A station that
 * applied a pushed record still reconciles against the cloud copy a moment later, so a message the
 * hub never delivered costs a second of latency rather than a missing record.
 *
 * It lives in its own Worker rather than inside the Pages project because a Pages project cannot
 * create a Durable Object, and because the hub has to outlive the one-isolate-per-request lifetime
 * the Pages edge runs on.
 */

// One hub for the whole fleet: every station connects to the same instance, so a send fan-out is a
// single broadcast rather than a routing problem.
const HUB_NAME = "hub";

// The reconciler sweep. The push path is what makes delivery instant; this is what makes it certain,
// and it only has to be frequent enough to bound how stale a station can ever be.
const SWEEP_TICK_MS = 1500;
const SWEEP_PAGE = 200;
// A hub that restarts must not greet every station with the entire backlog.
const BOOT_CURSOR_MS = 60000;

// Kept well inside the idle window a proxied WebSocket can meet, and short enough that a station on
// a dead mobile link is noticed as gone before it starts silently missing sends.
const HEARTBEAT_MS = 25000;

// Nudges carry identifiers and at most one record; anything larger is a client that has mistaken
// this hub for the data plane.
const MAX_BODY_BYTES = 16384;

const TAG_ALL = "all";

const externalFetch = globalThis.fetch;

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function text(message, status) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain" } });
}

/**
 * A station's identity is the device id the edge already authenticated it with, so a socket cannot
 * claim to be some other station: the ticket is minted by the edge from that authenticated value and
 * verified by the edge that signed it. The relay holds no copy of the signing secret.
 */
async function verifyTicket(env, ticket) {
  if (!ticket) return { ok: false, reason: "missing relay ticket" };
  const origin = (env && env.PAGES_ORIGIN) || "https://student-bridge.pages.dev";
  try {
    const res = await externalFetch(`${origin}/api/relay/verify?ticket=${encodeURIComponent(ticket)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok !== true || !data.station) {
      return { ok: false, reason: "relay ticket rejected" };
    }
    return { ok: true, station: String(data.station).slice(0, 64), role: String(data.role || "").slice(0, 20) };
  } catch (err) {
    console.warn("relay ticket verification note:", err && err.message);
    return { ok: false, reason: "relay ticket could not be verified" };
  }
}

// Only the fields a directory row needs. A photo travels as its stored reference, never as bytes,
// which is what keeps a nudge inside a frame instead of turning into a download.
const STUDY_FIELDS = [
  "id", "studentId", "fullName", "phone", "sex", "grade", "school", "department", "academicYear",
  "dateOfBirth", "address", "cityRegion", "guardianFullName", "emergencyContactName",
  "emergencyContactPhone", "bloodType", "rollNumber", "photoPath", "thumbnailPath", "previewPath",
  "originalPhotoPath", "qrCodeData", "senderId", "senderName", "originStation",
  "photoIntegrityStatus", "status", "receiverHidden", "createdAt", "updatedAt", "hasMistake",
  "receiverNote",
];

function trimStudent(student) {
  const out = {};
  for (const key of STUDY_FIELDS) {
    const value = student[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") continue;
    out[key] = typeof value === "string" && value.length > 512 ? value.slice(0, 512) : value;
  }
  return out;
}

export class StationRelayHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Hibernated sockets survive a hub restart; a seen-list does not, so it is rebuilt per wake.
    this.recent = new Map();
    this.lastHeartbeat = 0;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/connect") return this.connect(request, url);
    if (url.pathname === "/publish") return this.publish(request);
    if (url.pathname === "/status") return this.status();
    return text("not found", 404);
  }

  async connect(request, url) {
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
      return text("expected Upgrade: websocket", 426);
    }
    const verified = await verifyTicket(this.env, (url.searchParams.get("ticket") || "").trim());
    if (!verified.ok) return text(verified.reason, 401);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    // Tagged twice: once so the fan-out can enumerate every socket, once so a message addressed at a
    // single station is delivered without walking the whole set.
    this.state.acceptWebSocket(server, [TAG_ALL, verified.station]);
    try {
      server.send(JSON.stringify({ type: "HELLO", station: verified.station, role: verified.role, at: new Date().toISOString() }));
    } catch (err) {
      console.warn("relay hello note:", err && err.message);
    }
    this.state.storage.setAlarm(Date.now() + SWEEP_TICK_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * The edge calls this after a write it can prove is durable. Everything it posts is an accelerator:
   * if the hub is unreachable the stations still converge on their next poll, so a failure here is
   * never surfaced to the operator as a failed send.
   */
  async publish(request) {
    let body;
    try {
      const raw = await request.text();
      if (!raw || raw.length > MAX_BODY_BYTES) return json({ error: "body too large or empty" }, 413);
      body = JSON.parse(raw);
    } catch (err) {
      return json({ error: "expected a JSON body" }, 400);
    }

    const type = String(body.type || "").toUpperCase();
    const KNOWN_TYPES = ["UPSERT", "DELETE", "HIDE", "RESTORE", "RECEIPT", "BATCH"];
    if (!KNOWN_TYPES.includes(type)) {
      return json({ error: "unknown relay message type" }, 400);
    }
    const studentId = String(body.studentId || "").trim().slice(0, 64);
    // A batch says "something landed, read what you are missing", so it names no record.
    if (!studentId && type !== "BATCH") return json({ error: "missing studentId" }, 400);

    const message = {
      type,
      studentId,
      origin: String(body.origin || "").slice(0, 64),
      at: String(body.at || new Date().toISOString()).slice(0, 40),
      batch: body.batch === true,
      sentAt: Date.now(),
    };
    if (type === "RECEIPT") {
      message.station = String(body.station || "").slice(0, 64);
      message.stationName = String(body.stationName || "").slice(0, 64);
    }
    // One record per message keeps the socket contract identical to the reconciler's. A batch push
    // sends the summary nudge only, because the receivers read the rows they are missing anyway.
    if (type === "UPSERT" && !message.batch && body.student && typeof body.student === "object") {
      message.student = trimStudent(body.student);
    }

    const delivered = this.broadcast(message);
    return json({ ok: true, delivered });
  }

  broadcast(message) {
    let sockets = [];
    try {
      sockets = this.state.getWebSockets(TAG_ALL);
    } catch (err) {
      console.warn("relay socket enumeration note:", err && err.message);
      return 0;
    }
    if (!sockets.length) return 0;

    // The stamp belongs in the key: a correction written a half-minute after the original send is a
    // different fact, and suppressing it would leave a station showing the record as it was.
    const dedupeKey = `${message.type}|${message.studentId}|${message.station || ""}|${message.origin || ""}|${message.at || ""}`;
    if (this.seen(dedupeKey)) return 0;

    const payload = JSON.stringify(message);
    // A receipt is addressed to nobody: the sending station recognises its own send, which saves the
    // edge a second read to work out which station wrote the row.
    const to = message.type === "RECEIPT" ? null : (message.to || null);
    let delivered = 0;
    for (const socket of sockets) {
      if (socket.readyState !== 1) continue;
      const tags = this.tags(socket);
      if (to) {
        if (!tags.includes(to)) continue;
      } else if (message.origin && tags.includes(message.origin)) {
        // The sender's own station: it already has the record, and confirming its own send back to it
        // is exactly the false "receiver confirmed" the receipt path exists to avoid.
        continue;
      }
      try {
        socket.send(payload);
        delivered++;
      } catch (err) {
        // A socket that refuses a send is gone; the platform closes it and webSocketClose follows.
      }
    }
    return delivered;
  }

  tags(socket) {
    try {
      return this.state.getTags(socket) || [];
    } catch (err) {
      return [];
    }
  }

  // The same send reaches this hub twice: pushed by the edge that wrote it, and found by the
  // reconciler sweep. Both are correct, so the hub says it once.
  seen(key) {
    const now = Date.now();
    const last = this.recent.get(key);
    if (last && now - last < 60000) return true;
    this.recent.set(key, now);
    if (this.recent.size > 4000) {
      for (const entry of this.recent) {
        if (now - entry[1] > 120000) this.recent.delete(entry[0]);
      }
    }
    return false;
  }

  async status() {
    const sockets = this.state.getWebSockets(TAG_ALL) || [];
    const cursor = (await this.state.storage.get("cursor")) || 0;
    const stations = new Set();
    for (const socket of sockets) {
      const named = this.tags(socket).find(tag => tag !== TAG_ALL);
      if (named) stations.add(named);
    }
    return json({
      status: "operational",
      connections: sockets.length,
      stations: stations.size,
      cursor: cursor ? new Date(cursor).toISOString() : null,
      time: new Date().toISOString(),
    });
  }

  async alarm() {
    const sockets = this.state.getWebSockets(TAG_ALL) || [];
    // Nobody is listening: leave the alarm unscheduled so the hub can be evicted, and let the next
    // station to connect restart the sweep from a minute ago rather than from the whole backlog.
    if (!sockets.length) return;

    await this.sweep();

    if (Date.now() - this.lastHeartbeat >= HEARTBEAT_MS) {
      this.lastHeartbeat = Date.now();
      for (const socket of sockets) {
        if (socket.readyState !== 1) continue;
        try {
          socket.send(JSON.stringify({ type: "PING", at: Date.now() }));
        } catch (err) {
          try { socket.close(1000, "relay heartbeat failed"); } catch (ignored) {}
        }
      }
    }

    this.state.storage.setAlarm(Date.now() + SWEEP_TICK_MS);
  }

  /**
   * The reconciler: what changed since the last cursor, read from the row store. A record the edge
   * forgot to announce still arrives here, and the moment the Pages project carries its own D1
   * binding this becomes the same strongly consistent read the feed answers from.
   */
  async sweep() {
    if (!this.env || !this.env.SB_D1 || typeof this.env.SB_D1.prepare !== "function") return;
    let cursor = (await this.state.storage.get("cursor")) || 0;
    if (!cursor) {
      cursor = Date.now() - BOOT_CURSOR_MS;
      await this.state.storage.put("cursor", cursor);
      return;
    }
    const sinceIso = new Date(cursor).toISOString();
    let rows = [];
    try {
      const res = await this.env.SB_D1.prepare(
        `SELECT studentId, updatedAt, originStation, senderId FROM students
          WHERE substr(updatedAt, 1, 19) > substr(?1, 1, 19)
          ORDER BY updatedAt ASC LIMIT ${SWEEP_PAGE}`
      ).bind(sinceIso).all();
      rows = (res && res.results) || [];
    } catch (err) {
      console.warn("relay sweep note:", err && err.message);
      return;
    }

    let maxSeen = cursor;
    for (const row of rows) {
      const stamped = Date.parse(row.updatedAt || "");
      if (Number.isFinite(stamped) && stamped > maxSeen) maxSeen = stamped;
      this.broadcast({
        type: "UPSERT",
        studentId: String(row.studentId || ""),
        origin: String(row.originStation || row.senderId || ""),
        at: row.updatedAt || sinceIso,
        sentAt: Date.now(),
      });
    }
    if (maxSeen > cursor) await this.state.storage.put("cursor", maxSeen);
  }

  webSocketMessage(socket, message) {
    if (typeof message !== "string") return;
    let body;
    try {
      body = JSON.parse(message);
    } catch (err) {
      return;
    }
    if (body && String(body.type || "").toUpperCase() === "PING") {
      try { socket.send(JSON.stringify({ type: "PONG", at: Date.now() })); } catch (ignored) {}
    }
  }

  // The platform removes a closed socket from the hibernation set itself; all that is left to decide
  // is whether the hub still has a reason to wake every tick.
  webSocketClose(socket) {
    const remaining = this.state.getWebSockets(TAG_ALL) || [];
    if (!remaining.length) this.state.storage.deleteAlarm();
  }

  webSocketError(socket) {
    this.webSocketClose(socket);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: jsonHeaders });
    const url = new URL(request.url);
    const stub = env.HUB.get(env.HUB.idFromName(HUB_NAME));
    // Everything funnels into the one hub instance: /connect because it registers a socket there,
    // /publish and /status because the state they report only exists there. The Durable Object's
    // 101 response is returned straight to the browser, which is what keeps the relay out of the
    // message path and the socket owned by the instance that holds the rest of them.
    return stub.fetch(new Request(`https://hub${url.pathname}${url.search}`, request));
  },
};
