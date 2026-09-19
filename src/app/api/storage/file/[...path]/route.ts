// ============================================================================
// STUDENT BRIDGE — SECURE PRIVATE STORAGE FILE DELIVERY API
// Validates time-limited HMAC signatures before serving private photo binaries.
// Enforces private storage access control and prevents permanent public exposure.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifySignedToken, downloadFromStorage } from "@/lib/storage-service";
import { recordBandwidthUsage } from "@/lib/storage-quota-monitor";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const rawKey = params.path.join("/");
  const cleanKey = rawKey.replace(/^\/+/, "");

  const { searchParams } = new URL(request.url);
  const expires = searchParams.get("expires");
  const token = searchParams.get("token");

  // Enforce signed URL verification
  if (!expires || !token) {
    return NextResponse.json(
      { error: "Access denied: Missing cryptographic signature or expiration token." },
      { status: 403 }
    );
  }

  const expiresAtUnix = parseInt(expires, 10);
  if (isNaN(expiresAtUnix)) {
    return NextResponse.json({ error: "Invalid expiration format." }, { status: 400 });
  }

  const isValid = verifySignedToken(cleanKey, expiresAtUnix, token);
  if (!isValid) {
    return NextResponse.json(
      { error: "Access denied: Signed URL has expired or signature is invalid." },
      { status: 403 }
    );
  }

  const fileBuffer = await downloadFromStorage(cleanKey);
  if (!fileBuffer) {
    return NextResponse.json({ error: "Storage object not found." }, { status: 404 });
  }

  recordBandwidthUsage(fileBuffer.length);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": cleanKey.endsWith(".png") ? "image/png" : "image/jpeg",
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
