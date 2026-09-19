"use server";

// ============================================================================
// STUDENT BRIDGE — SENDER / RECEIVER TRANSFER BATCH ACTIONS
// Manages batch lifecycle: Draft -> Validating -> Ready -> Sent -> Received -> Processed
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createSafeAuditLog } from "@/lib/audit";

export interface BatchActionResult {
  success: boolean;
  batchId?: string;
  error?: string;
}

/**
 * Creates a new transfer batch from selected or filtered students.
 */
export async function createBatchAction(
  title: string,
  description?: string,
  studentIds: string[] = []
): Promise<BatchActionResult> {
  const session = await requireAuth("student:create");

  if (!title || !title.trim()) {
    return { success: false, error: "Batch title is required." };
  }

  const batchCount = await prisma.transferBatch.count();
  const year = new Date().getFullYear();
  const batchNumber = `BATCH-${year}-${String(batchCount + 1).padStart(4, "0")}`;

  // Count photos among selected students
  let totalPhotos = 0;
  if (studentIds.length > 0) {
    totalPhotos = await prisma.student.count({
      where: {
        id: { in: studentIds },
        photoPath: { not: null },
      },
    });
  }

  const batch = await prisma.transferBatch.create({
    data: {
      batchNumber,
      senderId: session.userId,
      senderName: session.username,
      title: title.trim(),
      description: description?.trim() || null,
      totalStudents: studentIds.length,
      totalPhotos,
      status: "DRAFT",
    },
  });

  if (studentIds.length > 0) {
    // Associate students with this batch
    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { batchId: batch.id },
    });

    // Create transfer records
    const records = studentIds.map((id) => ({
      batchId: batch.id,
      studentId: id,
      status: "PENDING",
    }));

    await prisma.transferRecord.createMany({
      data: records,
    });
  }

  await createSafeAuditLog({
    userId: session.userId,
    action: "BATCH_CREATE",
    entityType: "TRANSFER_BATCH",
    entityId: batch.id,
    metadata: { batchNumber, students: studentIds.length },
  });

  revalidatePath("/sender/batches");
  revalidatePath("/receiver/batches");
  return { success: true, batchId: batch.id };
}

/**
 * Validates all students in a batch before dispatch.
 */
export async function validateBatchAction(batchId: string): Promise<BatchActionResult> {
  const session = await requireAuth("student:create");

  const batch = await prisma.transferBatch.findUnique({
    where: { id: batchId },
    include: {
      students: true,
      transferRecords: true,
    },
  });

  if (!batch) {
    return { success: false, error: "Batch not found." };
  }

  const errors: { studentId: string; issues: string[] }[] = [];
  let validStudentsCount = 0;
  let photosCount = 0;

  for (const student of batch.students) {
    const issues: string[] = [];
    if (!student.fullName) issues.push("Missing legal name");
    if (!student.studentId) issues.push("Missing student ID");
    if (!student.grade) issues.push("Missing grade");
    if (!student.phone) issues.push("Missing phone");
    if (!student.sex) issues.push("Missing gender");
    if (!student.photoPath) issues.push("Missing student photo");
    else photosCount++;

    if (issues.length > 0) {
      errors.push({ studentId: student.studentId, issues });
      await prisma.transferRecord.updateMany({
        where: { batchId: batch.id, studentId: student.id },
        data: { status: "ERROR", errorDetails: issues.join(", ") },
      });
    } else {
      validStudentsCount++;
      await prisma.transferRecord.updateMany({
        where: { batchId: batch.id, studentId: student.id },
        data: { status: "VALIDATED" },
      });
    }
  }

  const nextStatus = errors.length === 0 ? "READY" : "VALIDATING";

  await prisma.transferBatch.update({
    where: { id: batchId },
    data: {
      status: nextStatus,
      totalStudents: batch.students.length,
      totalPhotos: photosCount,
      errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
    },
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "BATCH_VALIDATE",
    entityType: "TRANSFER_BATCH",
    entityId: batch.id,
    metadata: { total: batch.students.length, valid: validStudentsCount, errorCount: errors.length },
  });

  revalidatePath("/sender/batches");
  return { success: true, batchId };
}

/**
 * Dispatches/sends batch to Receiver.
 */
export async function sendBatchAction(batchId: string): Promise<BatchActionResult> {
  const session = await requireAuth("student:create");

  const batch = await prisma.transferBatch.findUnique({ where: { id: batchId } });
  if (!batch) return { success: false, error: "Batch not found." };

  await prisma.transferBatch.update({
    where: { id: batchId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "BATCH_SEND",
    entityType: "TRANSFER_BATCH",
    entityId: batchId,
    metadata: { batchNumber: batch.batchNumber },
  });

  revalidatePath("/sender/batches");
  revalidatePath("/receiver/batches");
  return { success: true, batchId };
}

/**
 * Receiver accepts inbound batch.
 */
export async function acceptBatchAction(batchId: string): Promise<BatchActionResult> {
  const session = await requireAuth("student:read");

  await prisma.transferBatch.update({
    where: { id: batchId },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "BATCH_ACCEPT",
    entityType: "TRANSFER_BATCH",
    entityId: batchId,
  });

  revalidatePath("/receiver/batches");
  return { success: true, batchId };
}

/**
 * Receiver rejects inbound batch with feedback notes.
 */
export async function rejectBatchAction(batchId: string, reason: string): Promise<BatchActionResult> {
  const session = await requireAuth("student:read");

  await prisma.transferBatch.update({
    where: { id: batchId },
    data: {
      status: "FAILED",
      errorsJson: JSON.stringify([{ issue: reason }]),
    },
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "BATCH_REJECT",
    entityType: "TRANSFER_BATCH",
    entityId: batchId,
    metadata: { reason },
  });

  revalidatePath("/receiver/batches");
  return { success: true, batchId };
}

/**
 * Receiver processes and ingests batch into production directory.
 */
export async function processBatchAction(batchId: string): Promise<BatchActionResult> {
  const session = await requireAuth("student:update");

  await prisma.transferBatch.update({
    where: { id: batchId },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });

  await prisma.transferRecord.updateMany({
    where: { batchId },
    data: { status: "PROCESSED" },
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "BATCH_PROCESS",
    entityType: "TRANSFER_BATCH",
    entityId: batchId,
  });

  revalidatePath("/receiver/batches");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { success: true, batchId };
}

/**
 * Retrieves transfer batches with optional status filter.
 */
export async function getBatchesAction(statusFilter?: string) {
  await requireAuth("student:read");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }

  return prisma.transferBatch.findMany({
    where,
    include: {
      _count: {
        select: { students: true, transferRecords: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Permanently deletes a transfer batch and disassociates its students.
 */
export async function deleteBatchAction(batchId: string): Promise<BatchActionResult> {
  try {
    const session = await requireAuth();

    await prisma.transferRecord.deleteMany({ where: { batchId } }).catch(() => {});
    await prisma.student.updateMany({ where: { batchId }, data: { batchId: null } }).catch(() => {});
    await prisma.transferBatch.delete({ where: { id: batchId } }).catch(() => {});

    await createSafeAuditLog({
      userId: session.userId,
      action: "BATCH_DELETE",
      entityType: "TRANSFER_BATCH",
      entityId: batchId,
    });

    revalidatePath("/sender/batches");
    revalidatePath("/receiver/batches");
    return { success: true, batchId };
  } catch (err: any) {
    console.error("deleteBatchAction error:", err);
    return { success: false, error: err?.message || "Failed to delete batch." };
  }
}
