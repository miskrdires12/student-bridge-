"use server";

// ============================================================================
// STUDENT BRIDGE — AUTHENTICATION SERVER ACTIONS
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, getSession, loginAsPresetRole, loginWithGoogle, lookupUserRoleByEmail } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import type { SessionPayload, UserRole } from "@/types/auth";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult<SessionPayload>> {
  try {
    const rawData = {
      emailOrUsername: formData.get("emailOrUsername"),
      password: formData.get("password"),
    };

    const parsed = loginSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input parameters",
      };
    }

    const deviceId = (formData.get("deviceId") as string) || undefined;
    const deviceInfo = (formData.get("deviceInfo") as string) || undefined;

    const result = await login({
      emailOrUsername: parsed.data.emailOrUsername,
      passwordPlain: parsed.data.password,
      deviceId,
      deviceInfo,
    });

    if (!result.success || !result.user) {
      return {
        success: false,
        error: result.error ?? "Invalid username or password",
      };
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      data: result.user,
    };
  } catch (error: any) {
    console.error("Login action critical error:", error);
    return {
      success: false,
      error: error?.message || "Authentication service temporarily unavailable. Please try again.",
    };
  }
}

/**
 * Fast & Secure role authentication server action.
 * Zero plaintext passwords exposed to client DOM or DevTools inspector.
 */
export async function quickRoleLoginAction(role: "SENDER" | "RECEIVER" | "ADMIN"): Promise<ActionResult<SessionPayload>> {
  try {
    const result = await loginAsPresetRole(role);
    if (!result.success || !result.user) {
      return {
        success: false,
        error: result.error ?? "Failed to initialize role environment",
      };
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      data: result.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Role session initialization failed",
    };
  }
}

/**
 * Looks up if an institutional email has an assigned role.
 */
export async function lookupUserRoleAction(email: string): Promise<{ exists: boolean; role?: UserRole }> {
  try {
    const role = await lookupUserRoleByEmail(email);
    if (role) {
      return { exists: true, role };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Google OAuth server action for real Google login.
 * Remembers assigned role: if an email was previously assigned Sender, it always logs in as Sender.
 */
export async function googleLoginAction(googleIdentity: {
  email: string;
  name?: string;
  sub?: string;
  preferredRole?: UserRole;
}): Promise<ActionResult<SessionPayload>> {
  try {
    if (!googleIdentity.email || !googleIdentity.email.includes("@")) {
      return {
        success: false,
        error: "Invalid Google email address provided",
      };
    }

    const result = await loginWithGoogle(googleIdentity);
    if (!result.success || !result.user) {
      return {
        success: false,
        error: result.error ?? "Google authentication failed",
      };
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      data: result.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Google authentication service encountered an error",
    };
  }
}

export async function logoutAction(): Promise<void> {
  await logout();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getSessionAction(): Promise<SessionPayload | null> {
  return getSession();
}
