"use server";

// ============================================================================
// STUDENT BRIDGE — AUDIT LOG MANAGEMENT SERVER ACTIONS
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createSafeAuditLog } from "@/lib/audit";

export async function clearAuditLogsAction() {
  const session = await requireAuth("database:manage");

  try {
    const count = await prisma.auditLog.count();
    await prisma.auditLog.deleteMany({});

    await createSafeAuditLog({
      userId: session.userId,
      action: "AUDIT_LOGS_CLEARED",
      entityType: "AUDIT_LOG",
      metadata: { clearedRecordsCount: count, clearedBy: session.username },
    });

    revalidatePath("/admin/database");
    return { success: true, count };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to clear audit logs" };
  }
}

export interface RealSystemNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "info" | "success" | "warning";
}

/**
 * Fetches REAL system notifications dynamically from the database audit log.
 * Guarantees zero fake or simulated messages in the UI.
 */
export async function getRecentAuditNotificationsAction(): Promise<RealSystemNotification[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!logs || logs.length === 0) {
      return [];
    }

    return logs.map((log) => {
      let title = "System Event";
      let desc = log.action;
      let type: "info" | "success" | "warning" = "info";

      const actor = log.user?.username || "System";
      let meta: any = {};
      try {
        if (log.metadata) {
          meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
        }
      } catch {}

      switch (log.action) {
        case "STUDENT_CREATE":
          title = "Student Enrolled";
          desc = `${meta?.fullName || meta?.studentId || "Student"} enrolled by ${actor}`;
          type = "success";
          break;
        case "STUDENT_UPDATE":
          title = "Student Updated";
          desc = `${meta?.fullName || meta?.studentId || "Student"} modified by ${actor}`;
          type = "info";
          break;
        case "STUDENT_DELETE":
          title = "Student Deleted";
          desc = `Student record removed by ${actor}`;
          type = "warning";
          break;
        case "STUDENT_IMPORT_EXCEL":
          title = "Roster Imported";
          desc = `Imported ${meta?.count || meta?.importedCount || ""} students by ${actor}`;
          type = "success";
          break;
        case "BATCH_CREATE":
        case "BATCH_EXPORT":
          title = "Batch Exported";
          desc = `Production batch ${meta?.batchNumber || ""} exported by ${actor}`;
          type = "success";
          break;
        case "PHOTO_IMPORT":
          title = "Photos Imported";
          desc = `Portraits mapped by ${actor}`;
          type = "success";
          break;
        case "USER_LOGIN":
          title = "Operator Sign In";
          desc = `${actor} signed in to workstation`;
          type = "info";
          break;
        case "PHOTO_RETAKE_REQUIRED":
          title = "Low Internet: Retake Photo";
          desc = `Photo dropped for ${meta?.fullName || meta?.studentId || "Student"}. Auto-deleted from receiver. Sender must retake.`;
          type = "warning";
          break;
        case "AUDIT_LOGS_CLEARED":
          title = "Audit Logs Cleared";
          desc = `Audit trail purged by ${actor}`;
          type = "warning";
          break;
        default:
          title = log.action.replace(/_/g, " ");
          desc = `Action logged by ${actor}`;
          break;
      }

      const diffMs = Date.now() - new Date(log.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let time = "Just now";
      if (diffDays > 0) time = `${diffDays}d ago`;
      else if (diffHours > 0) time = `${diffHours}h ago`;
      else if (diffMins > 0) time = `${diffMins}m ago`;

      return {
        id: log.id,
        title,
        desc,
        time,
        type,
      };
    });
  } catch {
    return [];
  }
}

