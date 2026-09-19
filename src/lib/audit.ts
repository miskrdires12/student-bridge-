// ============================================================================
// STUDENT BRIDGE — RESILIENT AUDIT LOGGING HELPER
// Prevents foreign-key violations and non-fatal logging crashes in serverless
// ============================================================================

import prisma from "@/lib/prisma";

export interface SafeAuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

/**
 * Safely creates an audit log entry.
 * If the provided userId is not present in the database (e.g. system demo sessions),
 * userId is safely omitted from the FK constraint and documented in the metadata payload.
 * Any errors are logged as warnings and do NOT interrupt the primary business transaction.
 */
export async function createSafeAuditLog(params: SafeAuditLogParams): Promise<void> {
  try {
    let validUserId: string | null = null;

    if (params.userId) {
      try {
        const userExists = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { id: true },
        });
        if (userExists) {
          validUserId = userExists.id;
        }
      } catch {
        validUserId = null;
      }
    }

    const metadataStr =
      typeof params.metadata === "string"
        ? params.metadata
        : JSON.stringify({
            ...(typeof params.metadata === "object" ? params.metadata : {}),
            originalOperatorId: params.userId ?? "SYSTEM",
          });

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: metadataStr,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.warn("Notice: Non-fatal audit log insertion warning:", err);
  }
}
