"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserPlus,
  Printer,
  Shield,
  LayoutDashboard,
  Settings,
  Database,
  Sparkles,
  X,
  Sun,
  LogOut,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getRecentAuditNotificationsAction } from "@/actions/audit";

interface DashboardShellProps {
  session: {
    username: string;
    role: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ session, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

  // Dark / Night mode initialization
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sb_theme");
      if (savedTheme === "dark") {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

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

  const [isSigningOut, setIsSigningOut] = useState(false);

  // Global Header Real-Time Notifications (Grounded in real database audit events)
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [headerNotifications, setHeaderNotifications] = useState<
    Array<{ id: string; title: string; desc: string; time: string; type: string }>
  >([]);

  // Fetch verified system notifications from real audit history
  useEffect(() => {
    let isMounted = true;
    getRecentAuditNotificationsAction()
      .then((realLogs) => {
        if (isMounted && realLogs && realLogs.length > 0) {
          setHeaderNotifications(realLogs);
          // Show unread indicator if events occurred recently
          const recentCount = realLogs.filter((l) => l.time === "Just now" || l.time.includes("m ago")).length;
          setUnreadCount(recentCount);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleNotification = (e: any) => {
      if (e?.detail) {
        setHeaderNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            title: e.detail.title || "Live Event",
            desc: e.detail.desc || e.detail.message || "Action processed successfully",
            time: "Just now",
            type: e.detail.type || "info",
          },
          ...prev.slice(0, 19),
        ]);
        setUnreadCount((c) => c + 1);
      }
    };
    window.addEventListener("siliconlabs_notification", handleNotification);
    return () => window.removeEventListener("siliconlabs_notification", handleNotification);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logoutAction();
  };

  const role = session.role;
  const isSender = role === "SENDER";
  const isReceiver = role === "RECEIVER";
  const isAdmin = role === "ADMIN";

  const closeMenu = () => setMenuOpen(false);

  const navContent = (
    <div className="flex flex-col h-full justify-between bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] font-sans transition-colors duration-200">
      <div>
        {/* Brand Header with Silicon Labs Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[#dce7e1] dark:border-[#223126] px-5 bg-white dark:bg-[#111613]">
          <Link href={isSender ? "/register" : "/dashboard"} onClick={closeMenu} className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f7faf9] dark:bg-[#070908] border-2 border-[#dce7e1] dark:border-[#223126] p-1.5 shadow-xs group-hover:border-[#8fe617] group-hover:shadow-[0_0_15px_rgba(143,230,23,0.35)] transition-all overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="Silicon Labs Logo"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="font-mono text-sm font-extrabold tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1">
                <span>SILICON</span>
                <span className="text-[#080808] bg-[#8fe617] px-1 rounded text-xs font-black">LABS</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-mono font-semibold text-[#6b7771] dark:text-[#8a9e93]">
                {isSender ? "Sender Workstation" : isReceiver ? "Receiver Facility" : "Admin Console"}
              </div>
            </div>
          </Link>

          {/* Animated borderless X close button */}
          <button
            type="button"
            onClick={closeMenu}
            className="p-2 rounded-xl border-0 outline-none ring-0 focus:outline-none text-[#3f4743] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/15 transition-all duration-300 group cursor-pointer active:scale-90"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:scale-110" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-4 text-xs font-medium">
          {/* SENDER ENVIRONMENT — Registration & System Settings */}
          {isSender && (
            <div className="space-y-1.5">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] dark:border-[#223126] pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                <span>Sender Workstation</span>
              </div>

              <Link
                href="/register"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/register"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Student Registration</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/settings"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Sender Settings</span>
              </Link>
            </div>
          )}

          {/* RECEIVER ENVIRONMENT */}
          {isReceiver && (
            <div className="space-y-1.5">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] dark:border-[#223126] pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                <span>Receiver Station</span>
              </div>

              <Link
                href="/dashboard"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/dashboard"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Live Metrics</span>
              </Link>

              <Link
                href="/students"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/students"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Student Directory</span>
              </Link>

              <Link
                href="/print-engine"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/print-engine"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print Engine (8-Up)</span>
              </Link>

              <Link
                href="/designer"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/designer"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Badge Designer</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/settings"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Receiver Settings</span>
              </Link>
            </div>
          )}

          {/* ADMIN ENVIRONMENT - Unified Master Operations & System Administration */}
          {isAdmin && (
            <div className="space-y-1.5 pt-2 border-t border-[#dce7e1] dark:border-[#223126]">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5 pb-1">
                <Shield className="h-3 w-3 text-[#8fe617]" />
                <span>Institutional Administrator</span>
              </div>

              {/* Core Operations Console */}
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/dashboard"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Live Dashboard &amp; Metrics</span>
              </Link>

              <Link
                href="/students"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/students"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Student Directory &amp; Records</span>
              </Link>

              <Link
                href="/print-engine"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/print-engine"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>8-Up Print Engine</span>
              </Link>

              <Link
                href="/designer"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/designer"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Badge Designer Studio</span>
              </Link>

              <Link
                href="/register"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/register"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Student Registration</span>
              </Link>

              {/* Administrative Privileges */}
              <div className="pt-2 mt-2 border-t border-[#dce7e1] dark:border-[#223126] space-y-1.5">
                <Link
                  href="/admin/users"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                    pathname === "/admin/users"
                      ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                      : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                  }`}
                >
                  <Shield className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Provision Operators &amp; RBAC</span>
                </Link>

                <Link
                  href="/admin/database"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                    pathname === "/admin/database"
                      ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                      : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                  }`}
                >
                  <Database className="h-4 w-4 shrink-0 text-blue-500" />
                  <span>Database &amp; Audit Logs</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                    pathname === "/settings"
                      ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                      : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#161d19] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                  }`}
                >
                  <Settings className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Admin System Settings</span>
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* User Profile & Sign Out Footer in Drawer */}
      <div className="border-t border-[#dce7e1] dark:border-[#223126] p-4 bg-[#f7faf9] dark:bg-[#161d19]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono text-[#080808] dark:text-[#f2f7f4] leading-tight truncate max-w-[130px]">
              {session.username}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#8fe617]" />
              <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                {isSender ? "Station Active" : isReceiver ? "Production" : "Administrator"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/25 px-2.5 py-1.5 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 cool-btn-hover transition-all cursor-pointer disabled:opacity-50"
            title="Sign Out of Station"
          >
            <LogOut className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7faf9] dark:bg-[#070908] text-[#080808] dark:text-[#f2f7f4] transition-colors duration-200">
      
      {/* Clickable Smooth-Slicing Menu Drawer (Not Sticky/Fixed) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop with smooth fade */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeMenu}
          />
          {/* Smooth Slicing Drawer Panel */}
          <aside className="relative z-50 w-72 max-w-[85vw] h-full border-r border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] shadow-2xl animate-in slide-in-from-left duration-250 ease-out">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Full-Screen Layout */}
      <div className="flex flex-col min-w-0 min-h-screen">
        
        {/* Unpinned Header (Natural scrolling, not rigidly sticky/fixed) */}
        <header className="flex h-14 items-center justify-between border-b border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-4 sm:px-6 shadow-xs transition-colors duration-200">
          
          <div className="flex items-center gap-3">
            {/* Advanced Animated Menu Icon Button (Icon Only, Standard Touch Size) */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#111613] hover:border-[#8fe617] hover:bg-[#8fe617]/10 hover:shadow-[0_0_16px_rgba(143,230,23,0.35)] transition-all duration-300 group cursor-pointer animated-icon-btn shrink-0"
              aria-label="Open navigation menu"
              title="Navigation Menu"
            >
              <span className="h-0.5 w-5 rounded-full bg-[#080808] dark:bg-[#f2f7f4] group-hover:bg-[#8fe617] group-hover:w-3.5 group-hover:-translate-x-0.5 transition-all duration-300" />
              <span className="h-0.5 w-5 rounded-full bg-[#8fe617] group-hover:scale-x-110 transition-all duration-300" />
              <span className="h-0.5 w-5 rounded-full bg-[#080808] dark:bg-[#f2f7f4] group-hover:bg-[#8fe617] group-hover:w-3.5 group-hover:translate-x-0.5 transition-all duration-300" />
            </button>

            {/* Brand Title (Logo image removed as requested) */}
            <Link
              href={isSender ? "/register" : "/dashboard"}
              className="flex items-center gap-2 group py-1"
              title="Silicon Labs Platform"
            >
              <div className="flex items-center gap-1.5 font-mono text-sm font-black tracking-tight text-[#080808] dark:text-[#f2f7f4]">
                <span>SILICON</span>
                <span className="text-[#062404] bg-[#8fe617] px-1.5 py-0.5 rounded-md text-xs font-black shadow-xs">
                  LABS
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Turning Sun-Only Theme Toggle (Deep Dark in Night Mode, Zero White) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all duration-300 animated-icon-btn cursor-pointer ${
                isDarkMode
                  ? "border-[#223126] bg-[#070908] text-[#8fe617] hover:border-[#8fe617] hover:shadow-[0_0_15px_rgba(143,230,23,0.3)]"
                  : "border-[#dce7e1] bg-[#f7faf9] text-amber-500 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              }`}
              title={isDarkMode ? "Night Mode Active (Click to rotate to Light Studio)" : "Light Studio Active (Click to rotate to Night Mode)"}
              aria-label="Toggle theme"
            >
              <Sun
                className={`h-5 w-5 sun-turn-icon transform ${
                  isDarkMode
                    ? "rotate-180 text-[#8fe617] fill-[#8fe617]/20"
                    : "rotate-0 text-amber-500 hover:rotate-90 fill-amber-400/20"
                }`}
              />
            </button>

            {/* Real-Time Notification Bell (Positioned near the theme toggle, 8-Up Print Engine removed as it is in menu) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  if (!notificationsOpen) setUnreadCount(0);
                }}
                className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all duration-300 animated-icon-btn cursor-pointer relative ${
                  notificationsOpen
                    ? "border-[#8fe617] bg-[#8fe617]/15 text-[#8fe617] shadow-[0_0_15px_rgba(143,230,23,0.3)]"
                    : "border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:border-[#8fe617]"
                }`}
                title="Real-Time System Notifications"
                aria-label="System Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#8fe617] text-[10px] font-mono font-black text-[#062404] animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Outside backdrop when notifications are open */}
              {notificationsOpen && (
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setNotificationsOpen(false)}
                />
              )}

              {/* Real-time Notifications Flyout Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#0c110e]/95 backdrop-blur-xl border border-[#dce7e1] dark:border-[#223126] shadow-2xl p-4 z-50 space-y-3 text-xs font-mono animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#eef5f1] dark:border-[#1c261e]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-ping" />
                      <span className="font-extrabold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                        Real-Time Notifications
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderNotifications([]);
                          setUnreadCount(0);
                        }}
                        className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] hover:text-red-500 font-bold transition-colors cursor-pointer"
                      >
                        Clear Feed
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[#6b7771] hover:text-[#080808] dark:hover:text-[#f2f7f4] font-bold text-xs p-1"
                        aria-label="Close notifications"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-[#f0f5f2] dark:divide-[#162019] pr-1">
                    {headerNotifications.length === 0 ? (
                      <div className="text-center py-6 text-[#6b7771] dark:text-[#8a9e93] text-[11px] space-y-1.5">
                        <CheckCircle2 className="h-6 w-6 text-[#8fe617] mx-auto opacity-80" />
                        <div className="font-bold text-[#080808] dark:text-[#f2f7f4]">Zero Active Alerts</div>
                        <p className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                          All student records & workstations operating normally.
                        </p>
                      </div>
                    ) : (
                      headerNotifications.map((notif) => (
                        <div key={notif.id} className="pt-2 first:pt-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                              {notif.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] pl-3 leading-relaxed">
                            {notif.desc}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content with Full Width */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#f7faf9] dark:bg-[#070908] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
