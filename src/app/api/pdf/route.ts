// ============================================================================
// STUDENT BRIDGE — PDF GENERATION & STREAMING API ROUTE
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateA48UpIdCards } from "@/lib/pdf-generator";
import type { StudentPrintData, PrintEngineOptions } from "@/types/print";

export async function POST(request: NextRequest) {
  // 1. Enforce authenticated session
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { studentIds, options } = body as {
      studentIds?: string[];
      options?: PrintEngineOptions;
    };

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'studentIds' array parameter." },
        { status: 400 }
      );
    }

    const rawStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
      orderBy: { rollNumber: "asc" },
    });

    if (rawStudents.length === 0) {
      return NextResponse.json(
        { error: "No matching student records found for the supplied IDs." },
        { status: 404 }
      );
    }

    const printData: StudentPrintData[] = rawStudents.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      contactName: s.contactName,
      grade: s.grade,
      sex: s.sex,
      phone: s.phone,
      cityRegion: s.cityRegion,
      emergencyContactName: s.emergencyContactName,
      emergencyContactPhone: s.emergencyContactPhone,
      bloodType: s.bloodType,
      emailAddress: s.emailAddress,
      guardianFullName: s.guardianFullName,
      rollNumber: s.rollNumber,
      nationality: s.nationality,
      nationalId: s.nationalId,
      dateOfBirth: s.dateOfBirth,
      photoPath: s.photoPath,
      qrCodeData: s.qrCodeData,
      status: s.status,
    }));

    const pdfBuffer = await generateA48UpIdCards(printData, options);

    // Record audit event
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "PRINT_GENERATE",
          entityType: "PRINT_BATCH",
          metadata: JSON.stringify({ count: printData.length }),
        },
      });
    } catch {
      // Non-fatal audit log failure
    }

    // Stream raw PDF bytes to client
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="student-bridge-cards-${Date.now()}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF rendering error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
