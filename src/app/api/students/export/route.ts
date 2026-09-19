// ============================================================================
// STUDENT BRIDGE — STUDENT DIRECTORY CSV & EXCEL EXPORT API
// Allows authorized Senders, Receivers, and Admins to download student lists.
// Strictly restricts Sender Station attribution column to ADMIN role only.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateCsvBuffer, generateExcelBuffer } from "@/lib/student-exporter";
import { recordBandwidthUsage } from "@/lib/storage-quota-monitor";
import { createSafeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "excel";
  const idsParam = searchParams.get("ids");
  const studentIds = idsParam ? idsParam.split(",").filter(Boolean) : [];

  // Sender attribution is visible ONLY if operator is ADMIN
  const includeSender = session.role === "ADMIN";

  try {
    const where: any = {};
    if (studentIds.length > 0) {
      where.id = { in: studentIds };
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20000,
    });

    const timestamp = new Date().toISOString().split("T")[0];

    if (format === "csv") {
      const buffer = generateCsvBuffer(students as any, includeSender);
      recordBandwidthUsage(buffer.length);

      await createSafeAuditLog({
        userId: session.userId,
        action: "STUDENT_EXPORT_CSV",
        entityType: "STUDENT",
        metadata: { exportedCount: students.length, includeSender },
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Students_Export_${timestamp}.csv"`,
        },
      });
    } else {
      const buffer = generateExcelBuffer(students as any, includeSender);
      recordBandwidthUsage(buffer.length);

      await createSafeAuditLog({
        userId: session.userId,
        action: "STUDENT_EXPORT_EXCEL",
        entityType: "STUDENT",
        metadata: { exportedCount: students.length, includeSender },
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Students_Export_${timestamp}.xlsx"`,
        },
      });
    }
  } catch (err: any) {
    console.error("Export generation error:", err);
    return NextResponse.json({ error: "Failed to generate student export." }, { status: 500 });
  }
}
