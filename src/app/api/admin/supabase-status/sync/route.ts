// ============================================================================
// STUDENT BRIDGE — CLOUDFLARE R2 & DATABASE SYNCHRONIZATION API
// Bucket: 'siliconlabs'
// Scans for orphaned photos in Cloudflare R2 bucket and synchronizes with PostgreSQL
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  listAllR2StorageFileKeys,
  deleteMultipleFromR2Bucket,
  getR2StorageStats,
  invalidateR2StorageCache,
} from "@/lib/r2-storage";
import {
  deleteMultipleFromSupabaseBucket,
  listAllSupabaseStorageFilePaths,
  invalidateSupabaseStorageCache,
} from "@/lib/supabase-storage";
import { createSafeAuditLog } from "@/lib/audit";

interface StorageItem {
  path: string;
  size: number;
}

/**
 * GET: Analyzes Cloudflare R2 bucket 'siliconlabs' vs active students in Prisma DB
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  try {
    const [r2Files, students] = await Promise.all([
      listAllR2StorageFileKeys(""),
      prisma.student.findMany({
        select: {
          id: true,
          studentId: true,
          fullName: true,
          grade: true,
          photoPath: true,
          originalPhotoPath: true,
        },
      }),
    ]);

    const activeStudentIds = new Set(students.map((s) => s.studentId.trim()));
    const activeFiles: StorageItem[] = [];
    const orphanedFiles: StorageItem[] = [];
    let orphanedBytes = 0;

    for (const file of r2Files) {
      const filename = file.key.split("/").pop() || "";
      const match = filename.match(/^(SB-[\d-]+)_/);
      if (match && activeStudentIds.has(match[1])) {
        activeFiles.push({ path: file.key, size: file.size });
      } else {
        orphanedFiles.push({ path: file.key, size: file.size });
        orphanedBytes += file.size;
      }
    }

    return NextResponse.json({
      totalStorageFiles: r2Files.length,
      storageBucket: "siliconlabs",
      storageProvider: "Cloudflare R2",
      activeStudentsCount: students.length,
      activeFilesCount: activeFiles.length,
      orphanedCount: orphanedFiles.length,
      orphanedBytes,
      orphanedSizeFormatted:
        orphanedBytes < 1024 * 1024
          ? `${(orphanedBytes / 1024).toFixed(1)} KB`
          : `${(orphanedBytes / (1024 * 1024)).toFixed(2)} MB`,
      orphanedFiles: orphanedFiles.slice(0, 150),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to analyze storage synchronization" },
      { status: 500 }
    );
  }
}

/**
 * POST: Purges orphaned files from Cloudflare R2 bucket 'siliconlabs'
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "PURGE_ALL_ORPHANS";
    const explicitPaths: string[] | undefined = body.paths;

    let pathsToDelete: string[] = [];

    if (mode === "PURGE_SPECIFIC" && Array.isArray(explicitPaths) && explicitPaths.length > 0) {
      pathsToDelete = explicitPaths;
    } else {
      // Analyze and get all orphans from Cloudflare R2
      const [r2Files, students] = await Promise.all([
        listAllR2StorageFileKeys(""),
        prisma.student.findMany({ select: { studentId: true } }),
      ]);

      const activeStudentIds = new Set(students.map((s) => s.studentId.trim()));
      pathsToDelete = r2Files
        .filter((file) => {
          const filename = file.key.split("/").pop() || "";
          const match = filename.match(/^(SB-[\d-]+)_/);
          return !match || !activeStudentIds.has(match[1]);
        })
        .map((f) => f.key);
    }

    let totalPurged = 0;
    if (pathsToDelete.length > 0) {
      const deleteResult = await deleteMultipleFromR2Bucket(pathsToDelete);
      totalPurged = deleteResult.deletedCount;
    }

    // Also check and clean up any legacy Supabase orphaned files
    try {
      const legacyPaths = await listAllSupabaseStorageFilePaths("");
      if (legacyPaths.length > 0) {
        const students = await prisma.student.findMany({ select: { studentId: true } });
        const activeStudentIds = new Set(students.map((s) => s.studentId.trim()));
        const sbOrphans = legacyPaths.filter((p) => {
          const filename = p.split("/").pop() || "";
          const match = filename.match(/^(SB-[\d-]+)_/);
          return !match || !activeStudentIds.has(match[1]);
        });
        if (sbOrphans.length > 0) {
          await deleteMultipleFromSupabaseBucket(sbOrphans);
          invalidateSupabaseStorageCache();
        }
      }
    } catch {}

    // Invalidate R2 storage cache and fetch fresh stats
    invalidateR2StorageCache();
    const freshStats = await getR2StorageStats(true);

    await createSafeAuditLog({
      userId: session.userId,
      action: "R2_STORAGE_ORPHANS_PURGED",
      entityType: "STORAGE",
      entityId: "CLOUDFLARE_R2",
      metadata: {
        bucket: "siliconlabs",
        purgedCount: totalPurged,
        operator: session.username,
        newStorageFileCount: freshStats.totalFiles,
        newStorageSizeFormatted: freshStats.totalSizeFormatted,
      },
    });

    return NextResponse.json({
      success: true,
      purgedCount: totalPurged,
      message: `Successfully synchronized Cloudflare R2 storage: purged ${totalPurged} orphaned photo(s).`,
      storageFileCount: freshStats.totalFiles,
      storageSizeFormatted: freshStats.totalSizeFormatted,
      storageFolders: freshStats.folders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to purge orphaned storage files" },
      { status: 500 }
    );
  }
}
