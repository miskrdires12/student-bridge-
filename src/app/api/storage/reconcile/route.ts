// ============================================================================
// STUDENT BRIDGE — STORAGE RECONCILIATION & ORPHAN CLEANUP API
// Admin-only route to run reconciliation scans and trigger safe orphan purges.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runStorageReconciliation, purgeSafeOrphanedObjects } from "@/lib/storage-reconciliation";
import { getStorageQuotaMetrics } from "@/lib/storage-quota-monitor";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const safetyHours = parseInt(searchParams.get("safetyHours") || "168", 10);

  try {
    const [summary, quota] = await Promise.all([
      runStorageReconciliation(safetyHours, session.userId),
      getStorageQuotaMetrics(),
    ]);

    return NextResponse.json({ summary, quota });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Reconciliation failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const safetyHours = parseInt(body.safetyHours || "168", 10);

    const result = await purgeSafeOrphanedObjects(safetyHours, session.userId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Safe cleanup failed." }, { status: 500 });
  }
}
