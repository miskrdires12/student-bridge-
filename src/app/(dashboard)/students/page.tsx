import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentDirectoryClient } from "./client";


export default async function StudentsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    grade?: string;
    status?: string;
    batchId?: string;
    department?: string;
    photoStatus?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const query = searchParams.q ?? "";
  const grade = searchParams.grade ?? "ALL";
  const status = searchParams.status ?? "ALL";
  const batchId = searchParams.batchId ?? "ALL";
  const department = searchParams.department ?? "ALL";
  const photoStatus = searchParams.photoStatus ?? "ALL";

  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.pageSize || "25", 10)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (query.trim() !== "") {
    const q = query.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentId: { contains: q, mode: "insensitive" } },
      { rollNumber: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { department: { contains: q, mode: "insensitive" } },
      { school: { contains: q, mode: "insensitive" } },
    ];
  }

  if (grade !== "ALL") where.grade = grade;
  if (status !== "ALL") where.status = status;
  if (batchId !== "ALL") where.batchId = batchId;
  if (department !== "ALL") where.department = department;

  if (photoStatus === "HAS_PHOTO") {
    where.photoPath = { not: null };
  } else if (photoStatus === "MISSING_PHOTO") {
    where.photoPath = null;
  }

  let totalCount = 0;
  let students: any[] = [];
  let grades: any[] = [];
  let departments: any[] = [];
  let batches: any[] = [];
  let gradeGroups: any[] = [];

  try {
    const results = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          batch: { select: { batchNumber: true, title: true } },
          photos: { take: 1, orderBy: { createdAt: "desc" } },
          customValues: { include: { customField: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.findMany({
        select: { grade: true },
        distinct: ["grade"],
      }),
      prisma.student.findMany({
        select: { department: true },
        distinct: ["department"],
        where: { department: { not: null } },
      }),
      prisma.transferBatch.findMany({
        select: { id: true, batchNumber: true, title: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.groupBy({
        by: ["grade"],
        _count: { id: true },
      }),
    ]);

    totalCount = results[0];
    students = results[1];
    grades = results[2];
    departments = results[3];
    batches = results[4];
    gradeGroups = results[5];
  } catch (err) {
    console.warn("[StudentsPage] Resilient database fallback:", err);
  }

  const uniqueGrades = (grades || []).map((g) => g?.grade).filter(Boolean);
  const uniqueDepartments = (departments || []).map((d) => d?.department).filter(Boolean);
  const gradeCountMap: Record<string, number> = {};
  (gradeGroups || []).forEach((g) => {
    if (g?.grade) {
      const count = typeof g?._count === "object" && g?._count !== null ? (g._count.id ?? 0) : (Number(g?._count) || 0);
      gradeCountMap[g.grade] = count;
    }
  });


  // Sender Attribution visible in student directory for all authenticated users
  const sanitizedStudents = students || [];

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 pb-12">
      {/* Sleek Top Navigation Bar: Back to Dashboard */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border dark:border-[#223126] bg-surface dark:bg-[#111613] text-foreground dark:text-[#f2f7f4] font-semibold text-sm shadow-xs hover:border-[#8fe617] hover:bg-[#8fe617]/10 hover:text-[#8fe617] transition-all group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 text-[#8fe617]" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Interactive Directory Table with True Server-Side Pagination */}
      <StudentDirectoryClient
        students={sanitizedStudents as any}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        grades={uniqueGrades}
        departments={uniqueDepartments}
        batches={batches}
        userRole={session.role as any}
        gradeCounts={gradeCountMap}
      />
    </div>
  );
}
