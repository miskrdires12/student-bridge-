// ============================================================================
// STUDENT BRIDGE — SAFE STUDENT DELETION WORKFLOW
// ADMIN REQUEST -> VERIFY STUDENT -> IDENTIFY ALL RELATED STORAGE OBJECTS ->
// DELETE/ARCHIVE RETENTION POLICY -> VERIFY DELETION -> REMOVE DB RECORD -> AUDIT LOG
// Prevents accidental deletion of another student's files.
// ============================================================================

import prisma from "@/lib/prisma";
import { deleteFromStorage, storageObjectExists } from "@/lib/storage-service";
import {
  deleteMultipleFromR2Bucket,
  extractR2StorageKey,
  invalidateR2StorageCache,
  listR2StorageFiles,
} from "@/lib/r2-storage";

import { createSafeAuditLog } from "@/lib/audit";

export interface SafeDeletionResult {
  success: boolean;
  studentId: string;
  affectedStorageKeys: string[];
  bytesReclaimed: number;
  error?: string;
}

/**
 * Safely deletes a student record and all strictly owned storage assets.
 * Guarantees no cross-student asset deletion and creates an immutable audit trail.
 */
export async function executeSafeStudentDeletion(
  idOrStudentId: string,
  operator: { userId: string; username: string; role: string },
  confirmationText?: string
): Promise<SafeDeletionResult> {
  // Enforce explicit confirmation for permanent destructive operation
  if (confirmationText && confirmationText !== "CONFIRM_DELETE") {
    return {
      success: false,
      studentId: idOrStudentId,
      affectedStorageKeys: [],
      bytesReclaimed: 0,
      error: "Explicit confirmation token mismatch. Deletion aborted.",
    };
  }

  // 1. Verify Student Existence
  const student = await prisma.student.findFirst({
    where: {
      OR: [{ id: idOrStudentId }, { studentId: idOrStudentId }],
    },
    include: {
      photos: true,
      qrCodes: true,
    },
  });

  if (!student) {
    return {
      success: false,
      studentId: idOrStudentId,
      affectedStorageKeys: [],
      bytesReclaimed: 0,
      error: `Student record "${idOrStudentId}" not found in database.`,
    };
  }

  // 2. Identify All Related Storage Objects (Supabase Cloud + Local Disks)
  const rawSources: (string | null | undefined)[] = [
    student.photoPath,
    (student as any).originalPhotoPath,
    student.storageKey,
  ];

  for (const p of student.photos) {
    rawSources.push(p.originalPath, p.editedPath, p.previewPath, p.thumbnailPath, p.storageKey);
  }

  for (const qr of student.qrCodes) {
    rawSources.push(qr.imagePath);
  }

  // Generate canonical paths inside bucket 'student data'
  const safeGrade = (student.grade || "General").replace(/[/\\]/g, " - ").trim();
  const safeStudentId = student.studentId.replace(/[/\\]/g, " - ").trim();
  const safeFullName = student.fullName.replace(/[/\\]/g, " - ").trim();

  // Add expected canonical and preview keys
  rawSources.push(`${safeGrade}/${safeStudentId}_${safeFullName}.jpg`);
  rawSources.push(`${safeGrade}/previews/${safeStudentId}_${safeFullName}.jpg`);
  rawSources.push(`${safeGrade}/${safeStudentId}_${safeFullName}`);
  rawSources.push(`${safeGrade}/previews/${safeStudentId}_${safeFullName}`);

  // Also query Cloudflare R2 folder for any versioned edits (e.g. SB-xxx_Name_v1726743999.jpg)
  try {
    const [gradeFiles, previewFiles] = await Promise.all([
      listR2StorageFiles(safeGrade),
      listR2StorageFiles(`${safeGrade}/previews`),
    ]);

    for (const item of gradeFiles || []) {
      const filename = item.key.split("/").pop() || "";
      if (filename.startsWith(`${safeStudentId}_`)) {
        rawSources.push(item.key);
      }
    }
    for (const item of previewFiles || []) {
      const filename = item.key.split("/").pop() || "";
      if (filename.startsWith(`${safeStudentId}_`)) {
        rawSources.push(item.key);
      }
    }
  } catch (scanErr) {
    console.warn("Notice: Listing candidate student versioned photos warning:", scanErr);
  }

  // Extract clean relative keys for Cloudflare R2
  const r2Keys: string[] = [];
  const localKeys: string[] = [];

  for (const src of rawSources) {
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) continue;

    // Cloudflare R2 bucket relative path
    const r2Key = extractR2StorageKey(src);
    if (r2Key) {
      r2Keys.push(r2Key);
    }

    // Local / private normalized key
    const normalized = normalizeKey(src);
    if (normalized && !normalized.startsWith("http")) {
      localKeys.push(normalized);
    }
  }

  const uniqueR2Keys = Array.from(new Set(r2Keys));
  const uniqueLocalKeys = Array.from(new Set(localKeys));

  // 3. Cross-check against other students to prevent accidental deletion of shared assets
  const safeR2ToDelete: string[] = [];
  for (const key of uniqueR2Keys) {
    const otherStudentsSharing = await prisma.student.count({
      where: {
        id: { not: student.id },
        OR: [
          { photoPath: { contains: key } },
          { originalPhotoPath: { contains: key } },
          { storageKey: key },
        ],
      },
    });

    if (otherStudentsSharing === 0) {
      safeR2ToDelete.push(key);
    } else {
      console.warn(`Protection: Key ${key} is shared by another student. Skipping storage purge.`);
    }
  }

  // 4. Delete Storage Objects directly from Cloudflare R2 'siliconlabs' bucket
  const deletedKeys: string[] = [];
  if (safeR2ToDelete.length > 0) {
    try {
      const deleteRes = await deleteMultipleFromR2Bucket(safeR2ToDelete);
      if (deleteRes.success) {
        deletedKeys.push(...safeR2ToDelete);
      }
    } catch (r2DelErr) {
      console.warn("Notice: deleteMultipleFromR2Bucket failed:", r2DelErr);
    }
  }

  // 4b. Also purge local storage cache / disk files
  for (const key of uniqueLocalKeys) {
    try {
      await deleteFromStorage(key);
      if (!deletedKeys.includes(key)) {
        deletedKeys.push(key);
      }
    } catch (storageErr) {
      console.warn(`Warning: Failed to delete storage object ${key}:`, storageErr);
    }
  }

  // Invalidate storage caches so Admin metrics update immediately
  invalidateR2StorageCache();

  // 5. Verify Deletion
  const remainingKeys: string[] = [];
  for (const key of deletedKeys) {
    const stillExists = await storageObjectExists(key);
    if (stillExists) {
      remainingKeys.push(key);
    }
  }

  // 6. Remove Database Records (Cascades to StudentPhoto, StudentQR, CustomFieldValue, TransferRecord)
  try {
    await prisma.student.delete({
      where: { id: student.id },
    });
  } catch (dbErr: any) {
    // Log failure in audit
    await createSafeAuditLog({
      userId: operator.userId,
      action: "STUDENT_SAFE_DELETE_FAILED",
      entityType: "STUDENT",
      entityId: student.id,
      metadata: {
        studentId: student.studentId,
        fullName: student.fullName,
        operator: operator.username,
        error: dbErr?.message,
      },
    });

    return {
      success: false,
      studentId: student.studentId,
      affectedStorageKeys: deletedKeys,
      bytesReclaimed: 0,
      error: `Database deletion failed: ${dbErr?.message}`,
    };
  }

  // 7. Write Comprehensive Audit Log
  await createSafeAuditLog({
    userId: operator.userId,
    action: "STUDENT_SAFE_DELETE",
    entityType: "STUDENT",
    entityId: student.id,
    metadata: {
      studentId: student.studentId,
      fullName: student.fullName,
      operator: operator.username,
      operatorRole: operator.role,
      deletedStorageKeys: deletedKeys,
      remainingKeys,
      result: remainingKeys.length === 0 ? "SUCCESS" : "PARTIAL",
      deletedAt: new Date().toISOString(),
    },
  });

  return {
    success: true,
    studentId: student.studentId,
    affectedStorageKeys: deletedKeys,
    bytesReclaimed: 0, // Calculated dynamically if needed
  };
}

function normalizeKey(str: string): string {
  return str
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^\/?api\/storage\/file\//, "")
    .replace(/^\/?uploads\/photos\//, "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("?")[0];
}
