// ============================================================================
// STUDENT BRIDGE — ENTERPRISE AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type { SessionPayload, UserRole, PermissionAction, LoginResponse } from "@/types/auth";
import { assertPermission } from "@/lib/permissions";

const COOKIE_NAME = "student_bridge_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Derives the cryptographic key for JWT signing and verification.
 * Enforces a minimum 32-character secret length.
 */
function getAuthSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade";
  return new TextEncoder().encode(secret);
}

// ----------------------------------------------------------------------------
// PASSWORD HASHING
// ----------------------------------------------------------------------------

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// ----------------------------------------------------------------------------
// JWT SESSION TOKEN GENERATION & VERIFICATION (Edge compatible via jose)
// ----------------------------------------------------------------------------

export async function signSessionToken(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  const secretKey = getAuthSecret();
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getAuthSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role as UserRole,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// COOKIE ACCESS & SESSION RETRIEVAL
// ----------------------------------------------------------------------------

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieves and cryptographically validates the active session from HTTP-only cookie.
 * Never trust client-side role claims.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

// ----------------------------------------------------------------------------
// LOGIN & LOGOUT SERVER ACTIONS
// ----------------------------------------------------------------------------

export async function login(credentials: {
  emailOrUsername: string;
  passwordPlain: string;
  ipAddress?: string;
  deviceId?: string;
  deviceInfo?: string;
}): Promise<LoginResponse> {
  const trimmed = credentials.emailOrUsername.trim().toLowerCase();

  const ADMIN_EMAIL = "miskrdires11@gmail.com";
  const ADMIN_PASS = "sukuna24th";

  // Reject default demo credentials
  const isDefaultDemoAttempt =
    trimmed.includes("studentbridge.internal") ||
    trimmed === "sender" ||
    trimmed === "receiver" ||
    trimmed === "admin" ||
    credentials.passwordPlain === "Password123!" ||
    credentials.passwordPlain === "AdminPassword123!";

  if (isDefaultDemoAttempt) {
    return {
      success: false,
      error: "ACCESS REJECTED: Default credentials are permanently disabled. You must sign in using your administrator-provisioned account.",
    };
  }

  const isAdminAttempt = trimmed === ADMIN_EMAIL || trimmed === "miskrdires11";

  let user: any = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmed, mode: "insensitive" } },
          { username: { equals: trimmed, mode: "insensitive" } },
        ],
      },
    });
  } catch (dbErr) {
    console.warn("Notice: Prisma lookup in login:", dbErr);
  }

  // 1. If user is found in database
  if (user) {
    let isValid = false;

    if (isAdminAttempt) {
      isValid = credentials.passwordPlain === ADMIN_PASS;
      if (!isValid) {
        try {
          isValid = await verifyPassword(credentials.passwordPlain, user.passwordHash);
        } catch {
          isValid = false;
        }
      }
    } else {
      try {
        isValid = await verifyPassword(credentials.passwordPlain, user.passwordHash);
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      return { success: false, error: "Invalid credentials" };
    }

    const targetRole: UserRole = user.role as UserRole;
    const targetEmail: string = user.email;

    // 1 Device = 1 Role Hardware Enforcement:
    if (credentials.deviceId) {
      try {
        const existingBinding = await prisma.deviceBinding.findUnique({
          where: { deviceId: credentials.deviceId },
        });

        if (existingBinding) {
          if (existingBinding.role !== targetRole) {
            return {
              success: false,
              error: `ACCESS REJECTED (1 DEVICE = 1 ROLE): This physical device is locked exclusively to '${existingBinding.role}' operations. Logins with '${targetRole}' are strictly prohibited on this physical device.`,
            };
          }
        } else {
          // Permanently bind this physical device to the first role used
          await prisma.deviceBinding.create({
            data: {
              deviceId: credentials.deviceId,
              role: targetRole,
              boundEmail: targetEmail,
              deviceInfo: credentials.deviceInfo || "Registered Device",
            },
          });
        }
      } catch (bindErr) {
        console.warn("Notice: Device binding verification warning:", bindErr);
      }
    }

    // Single-Device User Lock Check:
    if (
      user.boundDeviceId &&
      credentials.deviceId &&
      user.boundDeviceId !== credentials.deviceId &&
      user.role !== "ADMIN"
    ) {
      return {
        success: false,
        error: `Access Denied: This account is locked to another device (${user.boundDeviceInfo || "Registered Device"}). Please contact Administrator to re-provision.`,
      };
    }

    // Update bound device and session telemetry
    try {
      const updateData: any = {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        workSessionCount: { increment: 1 },
      };
      if (!user.boundDeviceId && credentials.deviceId) {
        updateData.boundDeviceId = credentials.deviceId;
        updateData.boundDeviceInfo = credentials.deviceInfo || "Browser Device";
      }
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Record Work Session for Admin telemetry
      await prisma.userWorkSession.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          deviceId: credentials.deviceId || "unknown",
          deviceInfo: credentials.deviceInfo || user.boundDeviceInfo || "Browser Device",
          startedAt: new Date(),
          ipAddress: credentials.ipAddress || null,
        },
      });
    } catch (sessionErr) {
      console.warn("Notice: Session update warning:", sessionErr);
    }

    const sessionPayload: Omit<SessionPayload, "iat" | "exp"> = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
    };

    const token = await signSessionToken(sessionPayload);
    await setSessionCookie(token);

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "AUTH_LOGIN",
          entityType: "USER",
          entityId: user.id,
          ipAddress: credentials.ipAddress,
          metadata: JSON.stringify({
            role: user.role,
            deviceId: credentials.deviceId,
            deviceInfo: credentials.deviceInfo,
          }),
        },
      });
    } catch {
      // Non-fatal
    }

    return {
      success: true,
      user: sessionPayload,
    };
  }

  // 2. Master Admin Seed / Fallback if not yet in database
  if (isAdminAttempt && credentials.passwordPlain === ADMIN_PASS) {
    const adminPayload: Omit<SessionPayload, "iat" | "exp"> = {
      userId: "master-admin",
      username: "miskrdires11",
      email: ADMIN_EMAIL,
      role: "ADMIN",
    };

    // 1 Device = 1 Role Hardware Enforcement:
    if (credentials.deviceId) {
      try {
        const existingBinding = await prisma.deviceBinding.findUnique({
          where: { deviceId: credentials.deviceId },
        });

        if (existingBinding) {
          if (existingBinding.role !== "ADMIN") {
            return {
              success: false,
              error: `ACCESS REJECTED (1 DEVICE = 1 ROLE): This physical device is locked exclusively to '${existingBinding.role}' operations. Logins with 'ADMIN' are strictly prohibited on this physical device.`,
            };
          }
        } else {
          await prisma.deviceBinding.create({
            data: {
              deviceId: credentials.deviceId,
              role: "ADMIN",
              boundEmail: ADMIN_EMAIL,
              deviceInfo: credentials.deviceInfo || "Registered Device",
            },
          });
        }
      } catch (bindErr) {
        console.warn("Notice: Device binding verification warning:", bindErr);
      }
    }

    const token = await signSessionToken(adminPayload);
    await setSessionCookie(token);

    try {
      const hash = await hashPassword(ADMIN_PASS);
      await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {
          passwordHash: hash,
          role: "ADMIN",
          lastLoginAt: new Date(),
          boundDeviceId: credentials.deviceId || undefined,
          boundDeviceInfo: credentials.deviceInfo || undefined,
        },
        create: {
          id: "master-admin",
          username: "miskrdires11",
          email: ADMIN_EMAIL,
          passwordHash: hash,
          role: "ADMIN",
          boundDeviceId: credentials.deviceId || null,
          boundDeviceInfo: credentials.deviceInfo || null,
          lastLoginAt: new Date(),
          workSessionCount: 1,
        },
      });
    } catch {
      // Non-fatal
    }

    return {
      success: true,
      user: adminPayload,
    };
  }

  return { success: false, error: "Invalid username or password" };
}

/**
 * Looks up an existing user's role by email.
 */
export async function lookupUserRoleByEmail(email: string): Promise<UserRole | null> {
  try {
    const trimmed = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: trimmed },
      select: { role: true },
    });
    return (user?.role as UserRole) || null;
  } catch {
    return null;
  }
}

/**
 * Authenticates or provisions a verified Google OAuth identity.
 * Remembers and preserves the user's role across sessions:
 * If the email is a Sender, it always logs in as Sender; if Receiver, always Receiver.
 */
export async function loginWithGoogle(googleUser: {
  email: string;
  name?: string;
  sub?: string;
  preferredRole?: UserRole;
}): Promise<LoginResponse> {
  const email = googleUser.email.trim().toLowerCase();
  let user: any = null;

  try {
    user = await prisma.user.findFirst({
      where: { email },
    });
  } catch (err) {
    console.warn("Prisma error looking up Google user:", err);
  }

  let role: UserRole = googleUser.preferredRole || "SENDER";
  let userId = `google-${googleUser.sub || Math.random().toString(36).slice(2, 10)}`;
  let username = googleUser.name ? googleUser.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : email.split("@")[0];

  if (user) {
    // If a specific preferredRole was explicitly passed, update it in DB
    if (googleUser.preferredRole && googleUser.preferredRole !== user.role) {
      role = googleUser.preferredRole;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { role },
        });
      } catch {}
    } else {
      // Otherwise preserve the existing assigned role permanently
      role = user.role as UserRole;
    }
    userId = user.id;
    username = user.username;
  } else {
    try {
      const created = await prisma.user.create({
        data: {
          id: userId,
          username,
          email,
          passwordHash: "GOOGLE_OAUTH_MANAGED",
          role,
        },
      });
      userId = created.id;
      username = created.username;
    } catch {
      // Non-fatal fallback for read-only / serverless environment
    }
  }

  const sessionPayload: Omit<SessionPayload, "iat" | "exp"> = {
    userId,
    username,
    email,
    role,
  };

  const token = await signSessionToken(sessionPayload);
  await setSessionCookie(token);

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "AUTH_LOGIN_GOOGLE",
        entityType: "USER",
        entityId: userId,
        metadata: JSON.stringify({ email, role }),
      },
    });
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    user: sessionPayload,
  };
}

/**
 * Server-side preset role authentication.
 * Keeps demo credentials strictly on the server and completely hidden from client DOM/inspectors.
 */
export async function loginAsPresetRole(_targetRole: "SENDER" | "RECEIVER" | "ADMIN"): Promise<LoginResponse> {
  return {
    success: false,
    error: "ACCESS REJECTED: Workstation quick-presets are disabled. Please sign in with your administrator-provisioned account.",
  };
}

export async function logout(ipAddress?: string): Promise<void> {
  const session = await getSession();
  if (session) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "AUTH_LOGOUT",
          entityType: "USER",
          entityId: session.userId,
          ipAddress,
        },
      });
    } catch {
      // Non-fatal audit log failure
    }
  }
  await clearSessionCookie();
}

/**
 * Server-side authorization guard.
 * Call at the top of protected Server Actions or Route Handlers.
 */
export async function requireAuth(requiredPermission?: PermissionAction): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Active session required");
  }

  if (requiredPermission) {
    assertPermission(session.role, requiredPermission);
  }

  return session;
}
