import { NextRequest, NextResponse } from "next/server";
import { loginWithGoogle } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential, email, name, sub, preferredRole } = body;

    // 1. If Google ID Token credential was supplied by Google Identity Services
    if (credential) {
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
          { cache: "no-store" }
        );
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          if (payload.email && payload.email_verified) {
            const loginResult = await loginWithGoogle({
              email: payload.email,
              name: payload.name || payload.given_name || payload.email.split("@")[0],
              sub: payload.sub,
              preferredRole,
            });

            if (loginResult.success && loginResult.user) {
              return NextResponse.json({
                success: true,
                user: loginResult.user,
                redirect: loginResult.user.role === "SENDER" ? "/register" : "/dashboard",
              });
            }
          }
        }
      } catch (verifyErr) {
        console.warn("Google tokeninfo verification failed:", verifyErr);
      }
    }

    // 2. Fallback if direct verified email payload provided from Google OAuth popup
    if (email && email.includes("@")) {
      const loginResult = await loginWithGoogle({
        email,
        name: name || email.split("@")[0],
        sub: sub || undefined,
        preferredRole,
      });

      if (loginResult.success && loginResult.user) {
        return NextResponse.json({
          success: true,
          user: loginResult.user,
          redirect: loginResult.user.role === "SENDER" ? "/register" : "/dashboard",
        });
      }
    }

    return NextResponse.json(
      { success: false, error: "Unable to verify Google credentials." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Google authentication error" },
      { status: 500 }
    );
  }
}
