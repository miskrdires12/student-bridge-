// ============================================================================
// STUDENT BRIDGE — STORAGE QUOTA MONITOR & BANDWIDTH TELEMETRY
// Tracks total storage used, capacity, percent used, remaining capacity,
// object counts, threshold alerts (<70% NORMAL, 70-80% WARNING, 80-90% HIGH, >90% CRITICAL),
// and bandwidth / download activity telemetry.
// ============================================================================

import { listAllStorageObjects } from "@/lib/storage-service";
import prisma from "@/lib/prisma";

// Configurable quota limit (default 1 GB = 1,073,741,824 bytes)
export const DEFAULT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB

export type StorageHealthStatus = "NORMAL" | "WARNING" | "HIGH" | "CRITICAL";

export interface StorageQuotaMetrics {
  totalBytesUsed: number;
  totalStorageCapacityBytes: number;
  percentageUsed: number;
  remainingCapacityBytes: number;
  totalObjectsCount: number;
  healthStatus: StorageHealthStatus;
  thresholds: {
    warningPercent: number;
    highPercent: number;
    criticalPercent: number;
  };
  tierBreakdown: {
    originalBytes: number;
    originalCount: number;
    previewBytes: number;
    previewCount: number;
    thumbnailBytes: number;
    thumbnailCount: number;
    otherBytes: number;
    otherCount: number;
  };
  bandwidthMetrics: {
    totalDownloads: number;
    totalBytesTransferred: number;
  };
}

// In-memory bandwidth counters (in serverless/Node instance)
let downloadCounter = 0;
let bytesTransferredCounter = 0;

export function recordBandwidthUsage(bytes: number) {
  downloadCounter++;
  bytesTransferredCounter += bytes;
}

export function getBandwidthUsage() {
  return {
    totalDownloads: downloadCounter,
    totalBytesTransferred: bytesTransferredCounter,
  };
}

export function calculateQuotaStatus(
  usedBytes: number,
  capacityBytes: number,
  warningPercent: number = 70,
  highPercent: number = 80,
  criticalPercent: number = 90
): StorageHealthStatus {
  const percentageUsed = capacityBytes > 0 ? (usedBytes / capacityBytes) * 100 : 0;
  if (percentageUsed >= criticalPercent) return "CRITICAL";
  if (percentageUsed >= highPercent) return "HIGH";
  if (percentageUsed >= warningPercent) return "WARNING";
  return "NORMAL";
}

/**
 * Computes storage quota telemetry across all stored objects.
 */
export async function getStorageQuotaMetrics(): Promise<StorageQuotaMetrics> {
  const capacityBytes = process.env.STORAGE_QUOTA_BYTES
    ? parseInt(process.env.STORAGE_QUOTA_BYTES, 10)
    : DEFAULT_STORAGE_QUOTA_BYTES;

  const warningPercent = process.env.STORAGE_WARN_PERCENT
    ? parseFloat(process.env.STORAGE_WARN_PERCENT)
    : 70;
  const highPercent = process.env.STORAGE_HIGH_PERCENT
    ? parseFloat(process.env.STORAGE_HIGH_PERCENT)
    : 80;
  const criticalPercent = process.env.STORAGE_CRITICAL_PERCENT
    ? parseFloat(process.env.STORAGE_CRITICAL_PERCENT)
    : 90;

  const objects = await listAllStorageObjects();

  let totalBytesUsed = 0;
  const tierBreakdown = {
    originalBytes: 0,
    originalCount: 0,
    previewBytes: 0,
    previewCount: 0,
    thumbnailBytes: 0,
    thumbnailCount: 0,
    otherBytes: 0,
    otherCount: 0,
  };

  for (const obj of objects) {
    totalBytesUsed += obj.sizeBytes;
    if (obj.tier === "original") {
      tierBreakdown.originalBytes += obj.sizeBytes;
      tierBreakdown.originalCount++;
    } else if (obj.tier === "preview") {
      tierBreakdown.previewBytes += obj.sizeBytes;
      tierBreakdown.previewCount++;
    } else if (obj.tier === "thumbnail") {
      tierBreakdown.thumbnailBytes += obj.sizeBytes;
      tierBreakdown.thumbnailCount++;
    } else {
      tierBreakdown.otherBytes += obj.sizeBytes;
      tierBreakdown.otherCount++;
    }
  }

  const percentageUsed = capacityBytes > 0 ? (totalBytesUsed / capacityBytes) * 100 : 0;
  const remainingCapacityBytes = Math.max(0, capacityBytes - totalBytesUsed);

  let healthStatus: StorageHealthStatus = "NORMAL";
  if (percentageUsed >= criticalPercent) {
    healthStatus = "CRITICAL";
  } else if (percentageUsed >= highPercent) {
    healthStatus = "HIGH";
  } else if (percentageUsed >= warningPercent) {
    healthStatus = "WARNING";
  }

  return {
    totalBytesUsed,
    totalStorageCapacityBytes: capacityBytes,
    percentageUsed: Math.round(percentageUsed * 10) / 10,
    remainingCapacityBytes,
    totalObjectsCount: objects.length,
    healthStatus,
    thresholds: {
      warningPercent,
      highPercent,
      criticalPercent,
    },
    tierBreakdown,
    bandwidthMetrics: getBandwidthUsage(),
  };
}

/**
 * Returns database growth metrics (row counts and distribution).
 */
export async function getDatabaseGrowthMetrics() {
  const [
    studentsCount,
    photosCount,
    qrsCount,
    batchesCount,
    transferRecordsCount,
    auditLogsCount,
    customValuesCount,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.studentPhoto.count(),
    prisma.studentQR.count(),
    prisma.transferBatch.count(),
    prisma.transferRecord.count(),
    prisma.auditLog.count(),
    prisma.customFieldValue.count(),
  ]);

  return {
    studentsCount,
    photosCount,
    qrsCount,
    batchesCount,
    transferRecordsCount,
    auditLogsCount,
    customValuesCount,
    totalIndexedRows:
      studentsCount +
      photosCount +
      qrsCount +
      batchesCount +
      transferRecordsCount +
      auditLogsCount +
      customValuesCount,
  };
}
