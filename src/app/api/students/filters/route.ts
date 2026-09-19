// ============================================================================
// STUDENT BRIDGE — STUDENT FILTER OPTIONS API
// Returns distinct grades and departments for use in filter dropdowns.
// Optimized with DISTINCT queries — never loads all 20k students.
// ============================================================================

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [gradeRows, deptRows] = await Promise.all([
    prisma.student.findMany({
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" },
    }),
    prisma.student.findMany({
      select: { department: true },
      distinct: ["department"],
      where: { department: { not: null } },
      orderBy: { department: "asc" },
    }),
  ]);

  const grades = gradeRows.map((r) => r.grade).filter(Boolean);
  const departments = deptRows.map((r) => r.department).filter(Boolean);

  return NextResponse.json({ grades, departments });
}
