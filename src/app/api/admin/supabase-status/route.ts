// ============================================================================
// STUDENT BRIDGE — SUPABASE CLOUD STATUS & KEEP-ALIVE TELEMETRY API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getR2StorageStats } from "@/lib/r2-storage";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  const startMs = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;

  // 1. Measure DB ping latency
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startMs;
    dbOk = true;
  } catch {
    dbLatencyMs = Date.now() - startMs;
    dbOk = false;
  }

  // 2. Fetch Cloudflare R2 Storage bucket stats ('siliconlabs')
  let storageStats = {
    bucketName: "siliconlabs",
    accountId: "a5b6150294de0fedb8e0cd789114b939",
    publicBaseUrl: "https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev",
    totalFiles: 0,
    totalSizeBytes: 0,
    totalSizeFormatted: "0 B",
    folders: [] as any[],
  };
  let storageOk = false;
  try {
    const r2Stats = await getR2StorageStats(forceRefresh);
    storageStats = r2Stats;
    storageOk = true;
  } catch (r2Err) {
    console.warn("[Cloudflare R2] Stats fetch warning:", r2Err);
    storageOk = false;
  }


  // 3. Database Data Inventory Counts (Students, Users, Batches, AuditLogs, Photos)
  let studentsCount = 0;
  let studentsWithPhotos = 0;
  let usersCount = 0;
  let batchesCount = 0;
  let auditLogsCount = 0;
  let studentPhotosCatalogCount = 0;
  let lastActiveAt: Date | null = null;

  try {
    const [
      stCount,
      stWithPhotos,
      uCount,
      bCount,
      aCount,
      spCount,
      latestStudent,
      latestUser,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { photoPath: { not: null } } }),
      prisma.user.count(),
      prisma.transferBatch.count(),
      prisma.auditLog.count(),
      prisma.studentPhoto.count(),
      prisma.student.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.user.findFirst({
        orderBy: { lastActiveAt: "desc" },
        select: { lastActiveAt: true },
      }),
    ]);

    studentsCount = stCount;
    studentsWithPhotos = stWithPhotos;
    usersCount = uCount;
    batchesCount = bCount;
    auditLogsCount = aCount;
    studentPhotosCatalogCount = spCount;

    const dates = [latestStudent?.updatedAt, latestUser?.lastActiveAt].filter(Boolean) as Date[];
    if (dates.length > 0) {
      lastActiveAt = new Date(Math.max(...dates.map((d) => d.getTime())));
    }
  } catch {}

  const studentsWithoutPhotos = Math.max(0, studentsCount - studentsWithPhotos);
  const totalDatabaseRecords = studentsCount + usersCount + batchesCount + auditLogsCount + studentPhotosCatalogCount;

  // 4. Compute 7-day inactivity pause safety status
  const now = Date.now();
  const lastActiveTime = lastActiveAt ? lastActiveAt.getTime() : now;
  const daysSinceActivity = Math.max(0, Math.round((now - lastActiveTime) / (1000 * 60 * 60 * 24)));
  const daysUntilPause = Math.max(0, 7 - daysSinceActivity);

  return NextResponse.json({
    databaseConnected: dbOk,
    databaseLatencyMs: dbLatencyMs,
    storageConnected: storageOk,
    storageBucket: storageStats.bucketName || "siliconlabs",
    storageProvider: "Cloudflare R2",
    storagePublicBaseUrl: (storageStats as any).publicBaseUrl || "https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev",
    storageFileCount: storageStats.totalFiles,
    storageSizeBytes: storageStats.totalSizeBytes,
    storageSizeFormatted: storageStats.totalSizeFormatted,
    storageFolders: storageStats.folders,

    database: {
      studentsCount,
      studentsWithPhotos,
      studentsWithoutPhotos,
      usersCount,
      batchesCount,
      auditLogsCount,
      studentPhotosCatalogCount,
      totalDatabaseRecords,
    },
    poolerHost: "aws-1-eu-west-1.pooler.supabase.com",
    region: "AWS EU-West (Ireland)",
    sslMode: "require",
    lastActivity: lastActiveAt ? lastActiveAt.toISOString() : new Date().toISOString(),
    daysSinceActivity,
    daysUntilPause,
    pauseWarningActive: daysSinceActivity >= 3,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  const startMs = Date.now();
  try {
    // Keep-alive touch: touch database and log audit ping
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startMs;

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "SUPABASE_KEEP_ALIVE_PING",
        entityType: "SYSTEM",
        entityId: "SUPABASE_CLOUD",
        metadata: JSON.stringify({
          latencyMs: latency,
          triggeredBy: session.username,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      latencyMs: latency,
      message: `Supabase keep-alive touch registered successfully (${latency}ms). Inactivity timer reset.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Keep-alive ping failed" },
      { status: 500 }
    );
  }
}
