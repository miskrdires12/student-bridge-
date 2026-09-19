"use client";

// ============================================================================
// STUDENT BRIDGE — AUTHENTICATION PORTAL
// Silicon Labs Hexagonal Emblem • Workstation Role Selection • Privacy-First
// True Obsidian Dark Mode Support • Instant Sun Turning Theme Toggle
// ============================================================================

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sun,
} from "lucide-react";
import { loginAction } from "@/actions/auth";
import { getClientDeviceFingerprint } from "@/lib/device-id";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Theme & Storage initialization on mount
  useEffect(() => {
    try {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("sb_theme") === "dark";
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
    // Prefetch destination routes for instant zero-wait transitions
    router.prefetch("/dashboard");
    router.prefetch("/register");
    router.prefetch("/print-engine");
    router.prefetch("/students");
  }, [router]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sb_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sb_theme", "light");
    }
  };

  // Submit signin and navigate to the selected workstation page
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("emailOrUsername", usernameOrEmail);
    formData.set("password", password);
    try {
      const fp = getClientDeviceFingerprint();
      formData.set("deviceId", fp.deviceId);
      formData.set("deviceInfo", fp.deviceInfo);
    } catch {}

    startTransition(async () => {
      try {
        const result = await loginAction(null, formData);
        if (!result.success || !result.data) {
          setErrorMessage(result.error ?? "Authentication failed");
        } else {
          setSuccessRole(result.data.role);
          if (result.data.role === "SENDER") {
            router.push("/register");
          } else {
            router.push("/dashboard");
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to communicate with authentication service.");
      }
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 selection:bg-[#8fe617] selection:text-[#080808] bg-[#d7dbde] dark:bg-[#070908] transition-colors duration-200 overflow-hidden">
      {/* Soft Studio Background Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#eef2f4_0%,#cfd4d8_100%)] dark:bg-[radial-gradient(circle_at_50%_38%,#131c16_0%,#070908_100%)] transition-colors duration-200" />

      {/* Top Right Animated Turning Sun Mode Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white/85 dark:bg-[#111713]/85 backdrop-blur-md shadow-sm hover:border-[#8fe617] transition-all cool-btn-hover cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <Sun
            className={`h-5 w-5 sun-turn-icon ${
              isDarkMode
                ? "text-neutral-400 rotate-180 hover:text-[#8fe617]"
                : "text-amber-500 rotate-0 hover:rotate-90 fill-amber-500/20"
            }`}
          />
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-[440px] rounded-[32px] bg-white dark:bg-[#111713] border border-white/80 dark:border-[#223126] dark:border-t-2 dark:border-t-[#8fe617] p-7 sm:p-9 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.14),0_15px_30px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_25px_rgba(143,230,23,0.08)] backdrop-blur-sm transition-colors duration-200">
        
        {/* Top Silicon Labs Hexagonal Logo */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="relative w-28 h-28 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src="/logo-transparent.png"
              alt="Silicon Labs Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_6px_18px_rgba(143,230,23,0.3)]"
            />
          </div>
        </div>

        {/* Header Title: Strictly 'SignIn' */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black text-[#111814] dark:text-[#f2f7f4] tracking-tight">
            SignIn
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#9eb2a6] mt-0.5">
            Enter your credentials to access the workstation
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successRole && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#8fe617] bg-[#f2fcee] dark:bg-[#8fe617]/15 p-3 text-xs text-[#080808] dark:text-[#f2f7f4] font-bold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-[#5cb811] dark:text-[#8fe617] shrink-0" />
            <span>
              Identified as <strong>{successRole}</strong>. Launching workstation...
            </span>
          </div>
        )}

        {/* Credential Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Operator Gmail Field */}
          <div>
            <label className="block text-[10px] font-bold text-[#38433d] dark:text-[#9eb2a6] uppercase tracking-wider mb-1.5 font-mono">
              Operator Gmail
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#7d8b83] dark:text-[#6c8074]">
                <User className="h-4 w-4 stroke-[1.8]" />
              </div>
              <input
                type="email"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full rounded-2xl border border-[#d2dad5] dark:border-[#223126] bg-[#edf2ef] dark:bg-[#18221b] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] dark:text-[#f2f7f4] placeholder:text-[#88968e] dark:placeholder:text-[#6c8074] focus:bg-white dark:focus:bg-[#1c2820] focus:border-[#8fe617] focus:outline-none focus:ring-2 focus:ring-[#8fe617]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[10px] font-bold text-[#38433d] dark:text-[#9eb2a6] uppercase tracking-wider mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#7d8b83] dark:text-[#6c8074]">
                <Key className="h-4 w-4 stroke-[1.8]" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-[#d2dad5] dark:border-[#223126] bg-[#edf2ef] dark:bg-[#18221b] py-3 pl-10 pr-3.5 text-xs font-semibold text-[#111814] dark:text-[#f2f7f4] placeholder:text-[#88968e] dark:placeholder:text-[#6c8074] focus:bg-white dark:focus:bg-[#1c2820] focus:border-[#8fe617] focus:outline-none focus:ring-2 focus:ring-[#8fe617]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 3D Embossed Lemon Green Button with Fluid Sliding Hover Effect */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="fluid-slide-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-[#062404] bg-gradient-to-b from-[#8fe617] via-[#7ecc10] to-[#6bb30b] border border-[#8fe617]/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,0,0,0.18),0_10px_25px_-3px_rgba(143,230,23,0.45),0_4px_10px_rgba(0,0,0,0.06)] hover:brightness-105 active:scale-[0.98] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#062404]" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
