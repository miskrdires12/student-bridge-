import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { UsersClient } from "./client";

export const metadata = {
  title: "Operator Provisioning & RBAC | SILICON LABS",
  description: "Provision operator accounts and assign role privileges",
};

export default async function AdminUsersPage() {
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
          Access Restricted: Operator provisioning, user credentials, and security role assignments are strictly reserved for System Administrators. Your current role ({session?.role || "GUEST"}) lacks clearance to inspect or manage user accounts.
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

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        boundDeviceId: true,
        boundDeviceInfo: true,
        lastLoginAt: true,
        workSessionCount: true,
        totalWorkMinutes: true,
        lastActiveAt: true,
        recordsSentSingle: true,
        recordsEncoded: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.warn("[AdminUsersPage] Resilient fallback on users query:", err);
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // Accurately compute students registered by each sender operator to admin (per day, per month, and total)
  const usersWithMetrics = await Promise.all(
    (users || []).map(async (u) => {
      let dbSentCount = 0;
      let dbTodayCount = 0;
      let dbMonthCount = 0;
      let photoCount = 0;
      let latestReg: Date | null = null;
      try {
        const senderFilter = {
          OR: [
            { senderId: u.id },
            { senderName: u.username },
            { senderName: u.email },
          ],
        };

        const [cnt, todayCnt, monthCnt, pCnt, latest] = await Promise.all([
          prisma.student.count({
            where: senderFilter,
          }),
          prisma.student.count({
            where: {
              ...senderFilter,
              createdAt: { gte: startOfDay },
            },
          }),
          prisma.student.count({
            where: {
              ...senderFilter,
              createdAt: { gte: startOfMonth },
            },
          }),
          prisma.student.count({
            where: {
              ...senderFilter,
              photoPath: { not: null },
            },
          }),
          prisma.student.findFirst({
            where: senderFilter,
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ]);
        dbSentCount = cnt;
        dbTodayCount = todayCnt;
        dbMonthCount = monthCnt;
        photoCount = pCnt;
        latestReg = latest?.createdAt || null;
      } catch (err) {
        console.warn(`[AdminUsersPage] Error querying stats for user ${u.username}:`, err);
      }

      const totalSent = Math.max(dbSentCount, u.recordsSentSingle || 0);
      const totalThisMonth = Math.max(
        dbMonthCount,
        totalSent > dbSentCount ? totalSent - (dbSentCount - dbMonthCount) : dbMonthCount
      );

      return {
        ...u,
        recordsSentSingle: totalSent,
        studentsRegistered: totalSent,
        studentsRegisteredToday: dbTodayCount,
        studentsRegisteredThisMonth: totalThisMonth,
        studentsWithPhotos: photoCount,
        lastRegisteredAt: latestReg,
        recordsEncoded: u.recordsEncoded || 0,
      };
    })
  );

  // System-wide daily & monthly registration intake history
  let dailyHistory: Array<{ day: string; count: number }> = [];
  let monthlyHistory: Array<{ month: string; count: number }> = [];
  let systemTotalToday = 0;
  let systemTotalMonth = 0;

  try {
    const [todayCount, monthCount, dailyRaw, monthlyRaw] = await Promise.all([
      prisma.student.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.student.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.$queryRawUnsafe<Array<{ day: string; count: number }>>(`
        SELECT 
          TO_CHAR(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day,
          COUNT(*)::int as count
        FROM "cloudflare"."students"
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 14;
      `).catch(() => []),
      prisma.$queryRawUnsafe<Array<{ month: string; count: number }>>(`
        SELECT 
          TO_CHAR(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM "cloudflare"."students"
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 6;
      `).catch(() => []),
    ]);
    systemTotalToday = todayCount;
    systemTotalMonth = monthCount;
    dailyHistory = dailyRaw || [];
    monthlyHistory = monthlyRaw || [];
  } catch (histErr) {
    console.warn("[AdminUsersPage] Registration cadence history error:", histErr);
  }

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
            <span className="text-[#8fe617]">Security &amp; Roles</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-[#8fe617]" />
            <span>Operator Provisioning &amp; RBAC Control</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-1 font-mono">
            Control institutional access privileges, provision operator credentials, and manage workstation accounts
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

      <UsersClient
        initialUsers={usersWithMetrics}
        currentUserId={session.userId}
        systemCadence={{
          totalToday: systemTotalToday,
          totalMonth: systemTotalMonth,
          dailyHistory,
          monthlyHistory,
        }}
      />
    </div>
  );
}
