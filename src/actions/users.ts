"use server";

// ============================================================================
// STUDENT BRIDGE — USER & ROLE ADMINISTRATION SERVER ACTIONS
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { createSafeAuditLog } from "@/lib/audit";
import { createUserSchema, type CreateUserInput } from "@/lib/validations";
import type { UserRole } from "@/types/auth";

export async function createUserAction(input: CreateUserInput) {
  try {
    const session = await requireAuth("user:create");

    const validated = createUserSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message ?? "Invalid user data",
      };
    }

    const { username, email, password, role } = validated.data;
    const cleanEmail = email.trim().toLowerCase();

    // Check unique email case-insensitively
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
      },
    });

    if (existingEmail) {
      return {
        success: false,
        error: `An operator account with email "${cleanEmail}" already exists.`,
      };
    }

    // Auto-derive clean, unique username if omitted
    let finalUsername = "";
    if (username && username.trim()) {
      finalUsername = username.trim();
      const existingUser = await prisma.user.findFirst({
        where: { username: { equals: finalUsername, mode: "insensitive" } },
      });
      if (existingUser) {
        return {
          success: false,
          error: `Username "${finalUsername}" is already taken. Please choose another or leave blank to auto-generate.`,
        };
      }
    } else {
      const emailPrefix = cleanEmail.split("@")[0] || "operator";
      let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) || "operator";
      finalUsername = baseUsername;
      let counter = 1;
      while (
        await prisma.user.findFirst({
          where: { username: { equals: finalUsername, mode: "insensitive" } },
        })
      ) {
        finalUsername = `${baseUsername}_${counter++}`;
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: finalUsername,
        email: cleanEmail,
        passwordHash,
        role: role as UserRole,
      },
    });

    await createSafeAuditLog({
      userId: session.userId,
      action: "USER_CREATE",
      entityType: "USER",
      entityId: user.id,
      metadata: { username: user.username, role: user.role },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  } catch (err: unknown) {
    console.error("[createUserAction] Failed to provision operator:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to provision operator account",
    };
  }
}

export async function deleteUserAction(id: string) {
  try {
    const session = await requireAuth("user:delete");

    if (session.userId === id) {
      return { success: false, error: "Cannot delete your own active operator account." };
    }

    await prisma.user.delete({ where: { id } });

    await createSafeAuditLog({
      userId: session.userId,
      action: "USER_DELETE",
      entityType: "USER",
      entityId: id,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteUserAction] Failed to decommission operator:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to decommission operator account",
    };
  }
}

export async function resetUserDeviceAction(userId: string) {
  try {
    const session = await requireAuth("user:update");

    await prisma.user.update({
      where: { id: userId },
      data: {
        boundDeviceId: null,
        boundDeviceInfo: null,
      },
    });

    await createSafeAuditLog({
      userId: session.userId,
      action: "USER_DEVICE_RESET",
      entityType: "USER",
      entityId: userId,
      metadata: { targetUserId: userId },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    console.error("[resetUserDeviceAction] Failed to reset device lock:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset operator device lock",
    };
  }
}

