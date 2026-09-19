// ============================================================================
// STUDENT BRIDGE — DATABASE ↔ STORAGE RECONCILIATION ENGINE
// 1. Orphaned Storage Detection (Storage exists BUT no DB record references it)
// 2. Missing Photo Detection (DB record exists BUT binary file missing in Storage)
// 3. Automated Integrity Status Classification (PHOTO_VERIFIED, PHOTO_MISSING, etc.)
// 4. Safe Reconciliation & Historical Audit Logging
// ============================================================================

import prisma from "@/lib/prisma";
import {
  listAllStorageObjects,
  storageObjectExists,
  deleteFromStorage,
} from "@/lib/storage-service";
import { createSafeAuditLog } from "@/lib/audit";

export interface OrphanedObjectReport {
  key: string;
  sizeBytes: number;
  lastModified: Date;
  ageHours: number;
  isEligibleForPurge: boolean; // True only if ageHours >= safetyPeriodHours (e.g. 7 days / 168 hours)
  mimeType?: string;
}

export interface MissingPhotoReport {
  studentId: string;
  fullName: string;
  expectedPath: string;
  integrityStatus: "PHOTO_MISSING" | "PHOTO_REPAIR_REQUIRED";
  registeredAt: Date;
}

export interface ReconciliationSummary {
  timestamp: string;
  totalStorageObjects: number;
  totalStorageBytes: number;
  totalStudentsScanned: number;
  verifiedCount: number;
  missingPhotosCount: number;
  orphanedObjectsCount: number;
  safeOrphansEligibleForPurgeCount: number;
  orphanedBytes: number;
  missingPhotos: MissingPhotoReport[];
  orphanedObjects: OrphanedObjectReport[];
}

/**
 * Runs a comprehensive bidirectional reconciliation scan between PostgreSQL and Storage.
 */
export async function runStorageReconciliation(
  safetyWindowHours: number = 168, // Default 7 days
  operatorUserId?: string
): Promise<ReconciliationSummary> {
  const [storageObjects, students, studentPhotos, studentQRs] = await Promise.all([
    listAllStorageObjects(),
    prisma.student.findMany({
      select: {
        id: true,
        studentId: true,
        fullName: true,
        photoPath: true,
        storageKey: true,
        createdAt: true,
        photoIntegrityStatus: true,
      },
    }),
    prisma.studentPhoto.findMany({
      select: {
        id: true,
        studentId: true,
        originalPath: true,
        editedPath: true,
        previewPath: true,
        thumbnailPath: true,
        storageKey: true,
      },
    }),
    prisma.studentQR.findMany({
      select: {
        id: true,
        studentId: true,
        imagePath: true,
      },
    }),
  ]);

  // Build indexed Set of all database photo/storage keys
  const dbReferencedKeys = new Set<string>();

  for (const s of students) {
    if (s.photoPath) {
      dbReferencedKeys.add(normalizeKey(s.photoPath));
    }
    if (s.storageKey) {
      dbReferencedKeys.add(normalizeKey(s.storageKey));
    }
  }

  for (const sp of studentPhotos) {
    if (sp.originalPath) dbReferencedKeys.add(normalizeKey(sp.originalPath));
    if (sp.editedPath) dbReferencedKeys.add(normalizeKey(sp.editedPath));
    if (sp.previewPath) dbReferencedKeys.add(normalizeKey(sp.previewPath));
    if (sp.thumbnailPath) dbReferencedKeys.add(normalizeKey(sp.thumbnailPath));
    if (sp.storageKey) dbReferencedKeys.add(normalizeKey(sp.storageKey));
  }

  for (const sq of studentQRs) {
    if (sq.imagePath) dbReferencedKeys.add(normalizeKey(sq.imagePath));
  }

  // 1. Detect Orphaned Storage Objects (Storage object exists BUT not in DB)
  const now = Date.now();
  const orphanedObjects: OrphanedObjectReport[] = [];
  let orphanedBytes = 0;
  let safeOrphansEligible = 0;

  for (const obj of storageObjects) {
    const normKey = normalizeKey(obj.key);
    let isReferenced = false;

    for (const ref of dbReferencedKeys) {
      if (ref && (ref === normKey || ref.includes(normKey) || normKey.includes(ref))) {
        isReferenced = true;
        break;
      }
    }

    if (!isReferenced) {
      const ageHours = Math.max(0, (now - obj.lastModified.getTime()) / (1000 * 60 * 60));
      const isEligible = ageHours >= safetyWindowHours;

      orphanedObjects.push({
        key: obj.key,
        sizeBytes: obj.sizeBytes,
        lastModified: obj.lastModified,
        ageHours: Math.round(ageHours * 10) / 10,
        isEligibleForPurge: isEligible,
        mimeType: obj.mimeType,
      });

      orphanedBytes += obj.sizeBytes;
      if (isEligible) safeOrphansEligible++;
    }
  }

  // 2. Detect Missing Photos (DB record expects photo BUT not found in storage)
  const missingPhotos: MissingPhotoReport[] = [];
  let verifiedCount = 0;

  const storageKeyMap = new Set(storageObjects.map((o) => normalizeKey(o.key)));

  for (const s of students) {
    if (!s.photoPath && !s.storageKey) {
      // Photo intentionally absent
      if (s.photoIntegrityStatus !== "PHOTO_ABSENT_INTENTIONAL") {
        await prisma.student.update({
          where: { id: s.id },
          data: { photoIntegrityStatus: "PHOTO_ABSENT_INTENTIONAL" },
        });
      }
      continue;
    }

    const targetKey = normalizeKey(s.storageKey || s.photoPath || "");

    // Skip Data URIs (legacy or client previews)
    if (targetKey.startsWith("data:")) {
      verifiedCount++;
      continue;
    }

    let foundInStorage = false;
    for (const stKey of storageKeyMap) {
      if (stKey === targetKey || stKey.includes(targetKey) || targetKey.includes(stKey)) {
        foundInStorage = true;
        break;
      }
    }

    // Direct filesystem/API fallback check if not matched in list
    if (!foundInStorage) {
      foundInStorage = await storageObjectExists(targetKey);
    }

    if (foundInStorage) {
      verifiedCount++;
      if (s.photoIntegrityStatus !== "PHOTO_VERIFIED") {
        await prisma.student.update({
          where: { id: s.id },
          data: { photoIntegrityStatus: "PHOTO_VERIFIED", storageSyncAt: new Date() },
        });
      }
    } else {
      missingPhotos.push({
        studentId: s.studentId,
        fullName: s.fullName,
        expectedPath: s.storageKey || s.photoPath || "",
        integrityStatus: "PHOTO_MISSING",
        registeredAt: s.createdAt,
      });

      if (s.photoIntegrityStatus !== "PHOTO_MISSING") {
        await prisma.student.update({
          where: { id: s.id },
          data: { photoIntegrityStatus: "PHOTO_MISSING" },
        });
      }
    }
  }

  const totalStorageBytes = storageObjects.reduce((acc, o) => acc + o.sizeBytes, 0);

  const summary: ReconciliationSummary = {
    timestamp: new Date().toISOString(),
    totalStorageObjects: storageObjects.length,
    totalStorageBytes,
    totalStudentsScanned: students.length,
    verifiedCount,
    missingPhotosCount: missingPhotos.length,
    orphanedObjectsCount: orphanedObjects.length,
    safeOrphansEligibleForPurgeCount: safeOrphansEligible,
    orphanedBytes,
    missingPhotos,
    orphanedObjects,
  };

  // Persist reconciliation report in DB
  try {
    await prisma.storageReconciliationReport.create({
      data: {
        totalObjects: storageObjects.length,
        totalBytes: totalStorageBytes,
        orphanedCount: orphanedObjects.length,
        missingCount: missingPhotos.length,
        verifiedCount,
        detailsJson: JSON.stringify({
          safeOrphansEligible,
          orphanedBytes,
          missingPhotosSample: missingPhotos.slice(0, 10),
          orphanedObjectsSample: orphanedObjects.slice(0, 10),
        }),
        triggeredBy: operatorUserId ? `USER:${operatorUserId}` : "SYSTEM_SCHEDULE",
      },
    });

    await createSafeAuditLog({
      userId: operatorUserId || null,
      action: "STORAGE_RECONCILIATION",
      entityType: "STORAGE_REPORT",
      metadata: {
        verifiedCount,
        missingPhotosCount: missingPhotos.length,
        orphanedObjectsCount: orphanedObjects.length,
        safeOrphansEligible,
        totalStorageBytes,
      },
    });
  } catch (logErr) {
    console.warn("Notice: Reconciliation report audit save warning:", logErr);
  }

  return summary;
}

/**
 * Safely purges only orphaned objects that exceed the configurable safety period (default 7 days / 168 hrs).
 * Never purges recently uploaded files or files referenced by any DB record.
 */
export async function purgeSafeOrphanedObjects(
  safetyWindowHours: number = 168,
  operatorUserId?: string
): Promise<{ purgedCount: number; bytesReclaimed: number; purgedKeys: string[] }> {
  // 1. Run full reconciliation to find verified eligible orphans
  const report = await runStorageReconciliation(safetyWindowHours, operatorUserId);

  const eligibleOrphans = report.orphanedObjects.filter((o) => o.isEligibleForPurge);
  const purgedKeys: string[] = [];
  let bytesReclaimed = 0;

  for (const orphan of eligibleOrphans) {
    try {
      const deleted = await deleteFromStorage(orphan.key);
      if (deleted) {
        purgedKeys.push(orphan.key);
        bytesReclaimed += orphan.sizeBytes;
      }
    } catch (delErr) {
      console.warn(`Failed to delete orphan ${orphan.key}:`, delErr);
    }
  }

  // Audit log the purge operation
  await createSafeAuditLog({
    userId: operatorUserId || null,
    action: "STORAGE_ORPHAN_CLEANUP",
    entityType: "STORAGE_CLEANUP",
    metadata: {
      purgedCount: purgedKeys.length,
      bytesReclaimed,
      purgedKeys,
      safetyWindowHours,
      cleanedAt: new Date().toISOString(),
    },
  });

  return {
    purgedCount: purgedKeys.length,
    bytesReclaimed,
    purgedKeys,
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
