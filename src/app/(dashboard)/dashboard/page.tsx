import React from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RealtimeReceiverDashboard from "@/components/dashboard/RealtimeReceiverDashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { notice?: string; error?: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const role = session.role;
  const isSender = role === "SENDER";

  // ──────────────────────────────────────────────────────────────────────────
  // SENDER PLATFORM REDIRECT (Only Registration & Settings)
  // ──────────────────────────────────────────────────────────────────────────
  if (isSender) {
    redirect("/register");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RECEIVER & ADMIN DASHBOARD VIEW (20,000+ CAPACITY PRODUCTION FACILITY)
  // Pure Student Management • 8-Up Print Readiness • Detailed Data Analytics
  // ──────────────────────────────────────────────────────────────────────────
  let totalStudents = 0;
  let photosCount = 0;
  let recentStudents: any[] = [];
  let missingPhotos: any[] = [];
  let activeJobsCount = 0;
  let gradeGroups: any[] = [];
  let sexGroups: any[] = [];
  let recentTimeRecords: any[] = [];

  try {
    const results = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { photoPath: { not: null } } }),
      prisma.student.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          studentId: true,
          fullName: true,
          grade: true,
          sex: true,
          phone: true,
          photoPath: true,
          createdAt: true,
        },
      }),
      prisma.student.findMany({
        where: { photoPath: null },
        take: 6,
        select: { id: true, studentId: true, fullName: true, grade: true, phone: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bulkGenerationJob.count({
        where: { status: { in: ["QUEUED", "PROCESSING"] } },
      }),
      prisma.student.groupBy({
        by: ["grade"],
        _count: { id: true },
        orderBy: { grade: "asc" },
      }),
      prisma.student.groupBy({
        by: ["sex"],
        _count: { id: true },
      }),
    ]);

    totalStudents = results[0];
    photosCount = results[1];
    recentStudents = results[2];
    missingPhotos = results[3];
    activeJobsCount = results[4];
    gradeGroups = results[5];
    sexGroups = results[6];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    recentTimeRecords = await prisma.student.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, photoPath: true },
    });
  } catch (dbErr) {
    console.warn("[DashboardPage] Database fetch resilient fallback:", dbErr);
  }


  // A student is 100% Print Ready when they have an attached 3:4 studio portrait
  const readyForPrintCount = photosCount;
  const pendingVerification = Math.max(0, totalStudents - readyForPrintCount);

  // Compute Grade Cohort Distribution Analysis with 8-Up A4 Sheets Calculation
  const gradeBreakdown = (gradeGroups || []).map((g) => {
    const count = typeof g?._count === "object" && g?._count !== null ? (g._count.id ?? 0) : (Number(g?._count) || 0);
    return {
      grade: g?.grade || "Unassigned",
      count,
      percent: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
      a4Sheets: Math.ceil(count / 8),
    };
  });
  // Sort grades naturally (KG, 1, 2, ..., 12)
  gradeBreakdown.sort((a, b) =>
    (a.grade || "").localeCompare(b.grade || "", undefined, { numeric: true, sensitivity: "base" })
  );

  // Demographics Analysis (Male vs Female)
  let maleCount = 0;
  let femaleCount = 0;
  (sexGroups || []).forEach((s) => {
    const sLower = (s?.sex || "").toLowerCase();
    const count = typeof s?._count === "object" && s?._count !== null ? (s._count.id ?? 0) : (Number(s?._count) || 0);
    if (sLower === "female") femaleCount += count;
    else maleCount += count;
  });
  const malePercent = totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0;
  const femalePercent = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;


  // Print Batch Planning
  const totalA4SheetsNeeded = Math.ceil(readyForPrintCount / 8);



  const now = new Date();
  const currentHour = now.getHours();
  const todayDateStr = now.toDateString();

  // Business hours: 08:00 to 18:00 (extended up to currentHour if > 18:00)
  const maxHour = Math.max(18, currentHour);
  const hourlyToday = [];
  for (let h = 8; h <= maxHour; h++) {
    const timeStr = `${h.toString().padStart(2, "0")}:00`;
    const inHour = recentTimeRecords.filter((r) => {
      const d = new Date(r.createdAt);
      return d.toDateString() === todayDateStr && d.getHours() === h;
    });

    const count = inHour.length;
    const photos = inHour.filter((r) => Boolean(r.photoPath)).length;
    const hourLabel = `${h > 12 ? h - 12 : h === 0 ? 12 : h} ${h >= 12 ? "PM" : "AM"}`;
    const isCurrentHour = h === currentHour;

    hourlyToday.push({
      time: timeStr,
      label: isCurrentHour ? `${hourLabel} • Now` : hourLabel,
      count,
      photos,
      readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
      throughput: count * 8,
      isCurrentHour,
    });
  }

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daily7Days = Array.from({ length: 7 }).map((_, idx) => {
    const offset = 6 - idx;
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const dateString = d.toISOString().split("T")[0];
    const targetDateStr = d.toDateString();
    const dayLabel = daysOfWeek[d.getDay()];

    const dayRecords = recentTimeRecords.filter(
      (r) => new Date(r.createdAt).toDateString() === targetDateStr
    );

    const count = dayRecords.length;
    const photos = dayRecords.filter((r) => Boolean(r.photoPath)).length;

    return {
      date: dateString,
      label: offset === 0 ? `Today (${dayLabel})` : `${dayLabel} ${d.getDate()}`,
      count,
      photos,
      readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
      throughput: count * 8,
      isCurrentHour: offset === 0,
    };
  });

  const trend30Days = Array.from({ length: 4 }).map((_, idx) => {
    const weekNum = idx + 1;
    const endDaysAgo = (4 - weekNum) * 7;
    const startDaysAgo = endDaysAgo + 7;
    const nowTime = Date.now();
    const startTime = nowTime - startDaysAgo * 86400000;
    const endTime = nowTime - endDaysAgo * 86400000;

    const weekRecords = recentTimeRecords.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= startTime && t < endTime;
    });

    const count = weekRecords.length;
    const photos = weekRecords.filter((r) => Boolean(r.photoPath)).length;

    return {
      label: weekNum === 4 ? "This Week" : `Wk ${weekNum}`,
      count,
      photos,
      readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
      throughput: count * 8,
    };
  });

  return (
    <RealtimeReceiverDashboard
      initialData={{
        totalStudents,
        photosCount,
        readyForPrintCount,
        pendingVerification,
        activeJobsCount,
        recentStudents,
        recentBatches: [],
        missingPhotos,
        gradeBreakdown,
        demographics: {
          maleCount,
          femaleCount,
          malePercent,
          femalePercent,
        },
        batchPlanning: {
          totalReadyForPrint: readyForPrintCount,
          totalA4Sheets: totalA4SheetsNeeded,
        },
        timeline: {
          hourlyToday,
          daily7Days,
          trend30Days,
        },
      }}
      notice={searchParams.notice}
    />
  );
}
