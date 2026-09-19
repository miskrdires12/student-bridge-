"use server";

// ============================================================================
// STUDENT BRIDGE — PRINT ENGINE SERVER ACTIONS
// ============================================================================

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateA48UpIdCards } from "@/lib/pdf-generator";
import type { StudentPrintData, PrintEngineOptions } from "@/types/print";

/**
 * Generates an 8-up A4 ID card PDF for the given student IDs.
 * Enforces `print:generate` permission.
 * Returns Base64-encoded PDF string for client download / preview.
 */
export async function generateStudentPdfAction(
  studentIds: string[],
  options?: PrintEngineOptions
): Promise<{ success: boolean; pdfBase64?: string; error?: string }> {
  await requireAuth("print:generate");

  if (!studentIds || studentIds.length === 0) {
    return { success: false, error: "Please select at least one student to print." };
  }

  const rawStudents = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
    },
    orderBy: { rollNumber: "asc" },
  });

  if (rawStudents.length === 0) {
    return { success: false, error: "No matching student records found for printing." };
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

  try {
    const pdfBytes = await generateA48UpIdCards(printData, options);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    return { success: true, pdfBase64 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF rendering error";
    return { success: false, error: `Failed to generate PDF: ${message}` };
  }
}
