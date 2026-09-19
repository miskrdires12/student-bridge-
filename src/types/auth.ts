// ============================================================================
// STUDENT BRIDGE — AUTHENTICATION & RBAC TYPE DEFINITIONS
// ============================================================================

export type UserRole = "SENDER" | "RECEIVER" | "ADMIN";

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export type PermissionAction =
  // Student operations
  | "student:create"
  | "student:read"
  | "student:update"
  | "student:delete"
  | "student:archive"
  | "student:bulk_import"
  | "student:export"
  | "student:photo_capture"
  | "student:photo_upload"
  | "student:qr_generate"
  | "student:qr_scan"
  // Print operations
  | "print:generate"
  | "print:template_edit"
  // Administration operations
  | "user:create"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "user:role_assign"
  | "system:metrics_read"
  | "system:audit_read"
  | "database:manage"
  | "settings:update"
  // General access
  | "dashboard:view";

export interface AuthState {
  isAuthenticated: boolean;
  user: SessionPayload | null;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
  user?: SessionPayload;
}
