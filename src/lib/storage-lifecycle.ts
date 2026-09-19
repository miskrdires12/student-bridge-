// ============================================================================
// STUDENT BRIDGE — PHOTO STORAGE LIFECYCLE PROTECTION & STATE MACHINE
// Enforces: LOCAL DRAFT -> OUTBOX QUEUED -> UPLOADING -> PHOTO VERIFIED ->
// METADATA COMMITTED -> SYNCHRONIZED -> RETENTION DECISION -> DELETE ONLY IF SAFE
// Never deletes a photo still required for recovery, processing, viewing, or printing.
// ============================================================================

import prisma from "@/lib/prisma";
import { storageObjectExists, deleteFromStorage } from "@/lib/storage-service";
import { createSafeAuditLog } from "@/lib/audit";

export type PhotoLifecycleStage =
  | "LOCAL_DRAFT"
  | "OUTBOX_QUEUED"
  | "UPLOADING"
  | "PHOTO_VERIFIED"
  | "METADATA_COMMITTED"
  | "SYNCHRONIZED"
  | "RETENTION_DECISION"
  | "PURGED";

const VALID_TRANSITIONS: Record<PhotoLifecycleStage, PhotoLifecycleStage[]> = {
  LOCAL_DRAFT: ["OUTBOX_QUEUED"],
  OUTBOX_QUEUED: ["UPLOADING", "LOCAL_DRAFT"],
  UPLOADING: ["PHOTO_VERIFIED", "OUTBOX_QUEUED"],
  PHOTO_VERIFIED: ["METADATA_COMMITTED"],
  METADATA_COMMITTED: ["SYNCHRONIZED"],
  SYNCHRONIZED: ["RETENTION_DECISION"],
  RETENTION_DECISION: ["PURGED", "SYNCHRONIZED"],
  PURGED: [],
};

export function validateStateTransition(
  fromStage: PhotoLifecycleStage,
  toStage: PhotoLifecycleStage
): boolean {
  return VALID_TRANSITIONS[fromStage]?.includes(toStage) ?? false;
}

export interface LifecycleDecision {
  safe: boolean;
  stage: PhotoLifecycleStage;
  reason?: string;
  referencedByStudentId?: string;
  activeReferencesCount: number;
}

/**
 * Validates whether a storage key is safe to delete.
 * Returns false if:
 * 1. An active student references this path as photoPath or storageKey
 * 2. A StudentPhoto record references this path (original, edited, preview, thumbnail)
 * 3. A StudentQR record references this path
 * 4. The student status is not permanently deleted/purged
 */
export async function evaluatePhotoDeletionSafety(storageKey: string): Promise<LifecycleDecision> {
  if (!storageKey || !storageKey.trim()) {
    return {
      safe: false,
      stage: "RETENTION_DECISION",
      reason: "Empty or invalid storage key provided.",
      activeReferencesCount: 0,
    };
  }

  const cleanKey = storageKey.replace(/^\/+/, "");

  // 1. Check direct Student references
  const studentsWithKey = await prisma.student.findMany({
    where: {
      OR: [
        { photoPath: { contains: cleanKey } },
        { storageKey: cleanKey },
      ],
    },
    select: { id: true, studentId: true, fullName: true, status: true },
  });

  if (studentsWithKey.length > 0) {
    const activeStudent = studentsWithKey.find((s) => s.status !== "ARCHIVED" && s.status !== "DELETED") || studentsWithKey[0];
    return {
      safe: false,
      stage: "SYNCHRONIZED",
      reason: `Photo is actively referenced by student ${activeStudent.fullName} (${activeStudent.studentId}). Deletion blocked to protect data integrity.`,
      referencedByStudentId: activeStudent.studentId,
      activeReferencesCount: studentsWithKey.length,
    };
  }

  // 2. Check StudentPhoto relation records
  const photosWithKey = await prisma.studentPhoto.findMany({
    where: {
      OR: [
        { originalPath: { contains: cleanKey } },
        { editedPath: { contains: cleanKey } },
        { previewPath: { contains: cleanKey } },
        { thumbnailPath: { contains: cleanKey } },
        { storageKey: cleanKey },
      ],
    },
    include: { student: { select: { studentId: true, fullName: true, status: true } } },
  });

  if (photosWithKey.length > 0) {
    const p = photosWithKey[0];
    return {
      safe: false,
      stage: "METADATA_COMMITTED",
      reason: `Photo is registered in StudentPhoto metadata table for student ${p.student.fullName} (${p.student.studentId}).`,
      referencedByStudentId: p.student.studentId,
      activeReferencesCount: photosWithKey.length,
    };
  }

  // 3. Check StudentQR relation records
  const qrsWithKey = await prisma.studentQR.findMany({
    where: { imagePath: { contains: cleanKey } },
    include: { student: { select: { studentId: true, fullName: true } } },
  });

  if (qrsWithKey.length > 0) {
    const qr = qrsWithKey[0];
    return {
      safe: false,
      stage: "METADATA_COMMITTED",
      reason: `Object is an active external QR code asset for student ${qr.student.fullName} (${qr.student.studentId}).`,
      referencedByStudentId: qr.student.studentId,
      activeReferencesCount: qrsWithKey.length,
    };
  }

  // If no DB record references it, deletion is safe
  return {
    safe: true,
    stage: "RETENTION_DECISION",
    reason: "No database references found. Object is eligible for safe retention cleanup.",
    activeReferencesCount: 0,
  };
}

/**
 * Safely purges a photo object ONLY IF verified safe by lifecycle evaluation.
 */
export async function executeSafePhotoPurge(
  storageKey: string,
  operatorUserId?: string,
  customReason?: string
): Promise<{ success: boolean; message: string }> {
  const decision = await evaluatePhotoDeletionSafety(storageKey);

  if (!decision.safe) {
    return {
      success: false,
      message: `Safety check failed: ${decision.reason}`,
    };
  }

  const exists = await storageObjectExists(storageKey);
  if (!exists) {
    return {
      success: true,
      message: "Storage object already unlinked or does not exist.",
    };
  }

  await deleteFromStorage(storageKey);

  // Write immutable audit log record
  await createSafeAuditLog({
    userId: operatorUserId || null,
    action: "PHOTO_SAFE_PURGE",
    entityType: "STORAGE_OBJECT",
    entityId: storageKey,
    metadata: {
      storageKey,
      decision,
      reason: customReason || "Safe storage lifecycle purge",
      purgedAt: new Date().toISOString(),
    },
  });

  return {
    success: true,
    message: `Storage object ${storageKey} was safely purged following lifecycle verification.`,
  };
}
