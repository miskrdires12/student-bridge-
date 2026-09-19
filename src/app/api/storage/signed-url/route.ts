// ============================================================================
// STUDENT BRIDGE — SIGNED URL DYNAMIC GENERATION & REFRESH API
// Allows authorized client sessions to obtain or refresh time-limited signed URLs.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSignedUrl } from "@/lib/storage-service";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storageKey, expiresIn = 3600 } = body;

    if (!storageKey || typeof storageKey !== "string") {
      return NextResponse.json({ error: "Storage key is required." }, { status: 400 });
    }

    const signedUrl = await createSignedUrl(storageKey, expiresIn);
    return NextResponse.json({ signedUrl, expiresIn });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate signed URL." }, { status: 500 });
  }
}
