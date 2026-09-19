// ============================================================================
// STUDENT BRIDGE — OPERATOR ENCODE / DOWNLOAD METRIC TRACKER
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.max(1, parseInt(body.count || "1", 10));

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { recordsEncoded: { increment: count } },
      select: { id: true, recordsEncoded: true },
    });

    return NextResponse.json({
      success: true,
      recordsEncoded: updated.recordsEncoded,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to record encode metric" },
      { status: 500 }
    );
  }
}
