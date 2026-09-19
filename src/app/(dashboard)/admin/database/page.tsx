import React from "react";
import Link from "next/link";
import { Database, ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { DatabaseClient } from "./client";

export const metadata = {
  title: "Database Telemetry & Log Management | SILICON LABS",
  description: "Monitor database metrics, visual demographics pie charts, and operational audit logs",
};

export default async function AdminDatabasePage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-5 text-red-500 shadow-2xl shadow-red-500/10 animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
          Security Access Restricted
        </div>
        <h1 className="text-3xl font-black text-[#080808] dark:text-[#f2f7f4] tracking-tight mb-2">
          You Are Not Supposed to Be Here
        </h1>
        <p className="text-sm text-[#6b7771] dark:text-[#8a9e93] max-w-lg font-mono leading-relaxed mb-6">
          Access Restricted: Database telemetry, institutional demographic analysis, and raw operational audit logs are strictly reserved for System Administrators. Your current role ({session?.role || "GUEST"}) lacks clearance to inspect this system data.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#8fe617] text-[#062404] font-black text-xs hover:brightness-110 transition-all shadow-lg shadow-[#8fe617]/20 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Safe Workstation</span>
        </Link>
      </div>
    );
  }

  // Aggregate database statistics in parallel
  let studentCount = 0;
  let verifiedPhotoCount = 0;
  let userCount = 0;
  let templateCount = 0;
  let gradeGroups: any[] = [];
  let roleGroups: any[] = [];
  let auditLogs: any[] = [];

  try {
    const results = await Promise.all([
      prisma.student.count(),
      prisma.student.count({
        where: {
          photoPath: { not: null },
        },
      }),
      prisma.user.count(),
      prisma.cardTemplate.count(),
      prisma.student.groupBy({
        by: ["grade"],
        _count: { id: true },
        orderBy: { grade: "asc" },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
        orderBy: { role: "asc" },
      }),
      prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { username: true, role: true } } },
      }),
    ]);

    studentCount = results[0];
    verifiedPhotoCount = results[1];
    userCount = results[2];
    templateCount = results[3];
    gradeGroups = results[4];
    roleGroups = results[5];
    auditLogs = results[6];
  } catch (err) {
    console.warn("[AdminDatabasePage] Resilient fallback on DB query:", err);
  }


  const missingPhotoCount = Math.max(0, studentCount - verifiedPhotoCount);

  const gradeCohorts = gradeGroups.map((g) => ({
    grade: g.grade || "Unassigned",
    count: g._count.id,
  }));

  const userRoles = roleGroups.map((r) => ({
    role: r.role,
    count: r._count.id,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#080808] dark:text-[#f2f7f4]">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce7e1] dark:border-[#223126] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">
            <Link href="/dashboard" className="hover:text-[#8fe617] transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-[#080808] dark:text-[#f2f7f4] font-semibold">Administration</span>
            <span>/</span>
            <span className="text-[#8fe617]">Database &amp; Logs</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
            <Database className="h-6 w-6 text-[#8fe617]" />
            <span>Database Telemetry &amp; Log Management</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-1 font-mono">
            Monitor persistence storage, inspect visual demographic distributions, and manage operational audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-xs cursor-pointer"
              title="End admin session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out Admin</span>
            </button>
          </form>
        </div>
      </div>

      <DatabaseClient
        metrics={{
          studentCount,
          userCount,
          templateCount,
          verifiedPhotoCount,
          missingPhotoCount,
        }}
        gradeCohorts={gradeCohorts}
        userRoles={userRoles}
        initialAuditLogs={auditLogs}
      />
    </div>
  );
}
