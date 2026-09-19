// ============================================================================
// STUDENT BRIDGE — RBAC PERMISSIONS MATRIX & ACCESS EVALUATION
// ============================================================================

import type { UserRole, PermissionAction } from "@/types/auth";

/**
 * Role-to-Permission Matrix defining allowable actions per role.
 * Security principle: Least Privilege. All operations are denied by default.
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionAction[]> = {
  SENDER: [
    "dashboard:view",
    "student:create",
    "student:read",         // Needed for duplicate ID check & custom fields
    "student:update",       // Needed for photo path updates post-capture
    "student:bulk_import",
    "student:photo_capture",
    "student:photo_upload",
    "student:qr_generate",
    "student:qr_scan",
    "student:delete",
    "student:export",
    "print:generate",
    "settings:update",
  ],
  RECEIVER: [
    "dashboard:view",
    "student:read",
    "student:update",
    "student:archive",
    "student:delete",
    "student:export",
    "student:bulk_import",   // Excel / CSV student ingestion
    "student:photo_upload",  // Local photo download / ZIP export
    "student:qr_scan",       // External QR image import & matching
    "print:generate",
    "print:template_edit",   // ID card designer & template versioning
    "settings:update",
  ],
  ADMIN: [
    "dashboard:view",
    "student:create",
    "student:read",
    "student:update",
    "student:delete",
    "student:archive",
    "student:bulk_import",
    "student:export",
    "student:photo_capture",
    "student:photo_upload",
    "student:qr_generate",
    "student:qr_scan",
    "print:generate",
    "print:template_edit",
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    "user:role_assign",
    "system:metrics_read",
    "system:audit_read",
    "database:manage",
    "settings:update",
  ],
} as const;

/**
 * Checks whether a given role holds the requested permission.
 * Never trust role information supplied by client requests.
 */
export function hasPermission(role: UserRole | undefined | null, action: PermissionAction): boolean {
  if (!role) {
    return false;
  }
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions.includes(action);
}

/**
 * Throws an explicit authorization error if the role lacks the permission.
 * Used at server boundaries (Server Actions, Route Handlers).
 */
export function assertPermission(role: UserRole | undefined | null, action: PermissionAction): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: Role '${role ?? "ANONYMOUS"}' lacks required permission '${action}'`);
  }
}

/**
 * Evaluates whether a role is authorized to access a given URL pathname.
 * This is enforced at the middleware level for all protected routes.
 */
export function canAccessRoute(role: UserRole | undefined | null, pathname: string): boolean {
  if (!role) {
    return false;
  }

  // Admin has unrestricted access to all routes
  if (role === "ADMIN") {
    return true;
  }

  // ── STRICT ADMIN-ONLY routes (Operator Provisioning, RBAC, Database & logs) ───────
  if (pathname.startsWith("/admin")) {
    return false; // Strictly ADMIN only
  }

  // ── SENDER-ONLY routes ─────────────────────────────────────────────────
  // Student registration, photo folder matching, dispatch batches, receipts
  if (pathname.startsWith("/register") || pathname.startsWith("/sender")) {
    return role === "SENDER";
  }

  // ── RECEIVER-ONLY routes ───────────────────────────────────────────────
  // Excel importer, QR importer, photo download ZIP, ID designer, Bulker, Print Engine
  if (
    pathname.startsWith("/receiver") ||
    pathname.startsWith("/designer") ||
    pathname.startsWith("/bulker") ||
    pathname.startsWith("/print-engine")
  ) {
    return role === "RECEIVER";
  }

  // ── SHARED AUTHENTICATED routes ────────────────────────────────────────
  // Dashboard, Student Directory, & Settings — all operational roles have access to their scoped view
  if (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/settings")
  ) {
    return true;
  }

  // Default: deny unknown routes
  return false;
}
