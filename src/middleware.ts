// ============================================================================
// STUDENT BRIDGE — EDGE MIDDLEWARE & SECURITY BOUNDARY
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { UserRole } from "@/types/auth";

const COOKIE_NAME = "student_bridge_session";

// Public route prefixes that do not require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/uploads",
  "/images",
  "/api/uploads",
  "/api/photos",
  "/api/storage",
];

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // Fallback key only for build/edge initialization guard
    return new TextEncoder().encode("student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and auth endpoints
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isRoot = pathname === "/";

  // 2. Extract and verify session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let sessionUser: { userId: string; username: string; email: string; role: UserRole } | null = null;

  if (token) {
    try {
      const secret = getAuthSecret();
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      if (
        typeof payload.userId === "string" &&
        typeof payload.username === "string" &&
        typeof payload.email === "string" &&
        typeof payload.role === "string"
      ) {
        sessionUser = {
          userId: payload.userId,
          username: payload.username,
          email: payload.email,
          role: payload.role as UserRole,
        };
      }
    } catch {
      // Invalid, expired, or tampered token: treat as unauthenticated
      sessionUser = null;
    }
  }

  // 3. Handle login and root paths
  if (pathname === "/login") {
    if (sessionUser) {
      const dest = sessionUser.role === "SENDER" ? "/register" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (isRoot) {
    if (sessionUser) {
      const dest = sessionUser.role === "SENDER" ? "/register" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Allow public static assets and auth endpoints
  if (isPublic) {
    return NextResponse.next();
  }

  // 5. Enforce authentication on all protected routes
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = sessionUser;

  // Inject secure headers into downstream request
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.userId);
  requestHeaders.set("x-user-role", user.role);
  requestHeaders.set("x-user-email", user.email);
  requestHeaders.set("x-user-name", user.username);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Enterprise Security Headers
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=*, microphone=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
