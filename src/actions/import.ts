"use server";

// ============================================================================
// STUDENT BRIDGE — BULK IMPORT & TEMPLATE MANAGEMENT ACTIONS
// Features: Dynamic column mapping, pre-flight inspection, error reporting,
// duplicate detection, and batch insertion.
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createSafeAuditLog } from "@/lib/audit";
import {
  inspectExcelWorkbook,
  parseExcelWithCustomMapping,
  type ExcelImportAnalysis,
  type ExcelColumnInfo,
} from "@/lib/excel-importer";
import { createStudentQRPayload } from "@/lib/qr-generator";
import type { CardFieldConfig } from "@/types/print";

export interface BulkImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  importedCount: number;
  failedCount: number;
  databaseDuplicates: string[];
  errorReport?: { rowNumber: number; studentId: string; errors: string[] }[];
  error?: string;
}

/**
 * Inspects uploaded spreadsheet to extract sheets and available column headers.
 */
export async function inspectExcelWorkbookAction(fileBase64: string): Promise<ExcelColumnInfo> {
  await requireAuth("student:bulk_import");
  const buffer = Buffer.from(fileBase64, "base64");
  return inspectExcelWorkbook(buffer);
}

/**
 * Executes a bulk Excel student import transaction using mapped columns.
 */
export async function importExcelStudentsAction(
  fileBase64: string,
  mapping?: Record<string, string>
): Promise<BulkImportResult> {
  const session = await requireAuth("student:bulk_import");

  const buffer = Buffer.from(fileBase64, "base64");
  let analysis: ExcelImportAnalysis;

  try {
    // Default mapping fallback if none explicitly provided
    const effectiveMapping = mapping || {
      studentId: "Student ID",
      fullName: "Name",
      grade: "Grade / Class Batch",
      sex: "Gender / Sex",
      phone: "Phone",
    };

    analysis = parseExcelWithCustomMapping(buffer, effectiveMapping);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse workbook.";
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      importedCount: 0,
      failedCount: 0,
      databaseDuplicates: [],
      error: msg,
    };
  }

  if (analysis.validRows === 0) {
    return {
      success: false,
      totalRows: analysis.totalRows,
      validRows: 0,
      importedCount: 0,
      failedCount: analysis.totalRows,
      databaseDuplicates: [],
      errorReport: analysis.errorReport,
      error: "No valid student records found matching the required fields.",
    };
  }

  // Check for duplicate studentIds against existing database records
  const incomingIds = analysis.parsedStudents.map((s) => s.studentId);
  const existingInDb = await prisma.student.findMany({
    where: { studentId: { in: incomingIds } },
    select: { studentId: true },
  });

  const existingDbIdSet = new Set(existingInDb.map((s) => s.studentId));
  const databaseDuplicates = Array.from(existingDbIdSet);

  const studentsToInsert = analysis.parsedStudents.filter(
    (s) => !existingDbIdSet.has(s.studentId)
  );

  let importedCount = 0;
  const failedCount = analysis.invalidRows + databaseDuplicates.length;

  if (studentsToInsert.length > 0) {
    // Transactional bulk creation in chunks of 250 for high throughput
    const chunkSize = 250;
    for (let i = 0; i < studentsToInsert.length; i += chunkSize) {
      const chunk = studentsToInsert.slice(i, i + chunkSize);

      await prisma.$transaction(
        chunk.map((student) => {
          const rollNumber = student.rollNumber || "";
          const nationalId = student.nationalId || null;
          const contactName = student.contactName || "";
          const cityRegion = student.cityRegion || "";
          const emergencyContactName = student.emergencyContactName || "";
          const emergencyContactPhone = student.emergencyContactPhone || "";
          const guardianFullName = student.guardianFullName || "";
          const nationality = student.nationality || "";
          const dateOfBirth = student.dateOfBirth || null;

          const qrCodeData = createStudentQRPayload({
            studentId: student.studentId,
            fullName: student.fullName,
            rollNumber,
            grade: student.grade,
          });

          return prisma.student.create({
            data: {
              studentId: student.studentId,
              fullName: student.fullName,
              contactName,
              grade: student.grade,
              sex: student.sex,
              phone: student.phone,
              cityRegion,
              emergencyContactName,
              emergencyContactPhone,
              bloodType: student.bloodType || null,
              emailAddress: student.emailAddress || null,
              address: student.address || null,
              school: student.school || null,
              department: student.department || null,
              academicYear: student.academicYear || null,
              guardianFullName,
              rollNumber,
              nationality,
              nationalId,
              dateOfBirth,
              photoPath: null,
              qrCodeData,
              status: "ACTIVE",
            },
          });
        })
      );
    }

    importedCount = studentsToInsert.length;

    // Record audit event safely
    await createSafeAuditLog({
      userId: session.userId,
      action: "STUDENT_BULK_IMPORT",
      entityType: "STUDENT_BATCH",
      metadata: {
        totalRows: analysis.totalRows,
        importedCount,
        skippedDuplicates: databaseDuplicates.length,
      },
    });
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");

  return {
    success: true,
    totalRows: analysis.totalRows,
    validRows: analysis.validRows,
    importedCount,
    failedCount,
    databaseDuplicates,
    errorReport: analysis.errorReport,
  };
}

/**
 * Saves or updates a Card Template with custom vector SVG and dynamic field coordinates.
 */
export async function saveCardTemplateAction(data: {
  name: string;
  description?: string;
  svgContent: string;
  fieldConfig: CardFieldConfig;
  isDefault?: boolean;
}) {
  const session = await requireAuth();

  const template = await prisma.cardTemplate.upsert({
    where: { name: data.name },
    update: {
      svgContent: data.svgContent,
      fieldConfig: JSON.stringify(data.fieldConfig),
      description: data.description,
      isDefault: data.isDefault ?? false,
    },
    create: {
      name: data.name,
      description: data.description,
      svgContent: data.svgContent,
      fieldConfig: JSON.stringify(data.fieldConfig),
      isDefault: data.isDefault ?? false,
    },
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "TEMPLATE_SAVE",
    entityType: "CARD_TEMPLATE",
    entityId: template.id,
    metadata: { name: template.name },
  });

  revalidatePath("/print-engine");
  return { success: true, templateId: template.id };
}

/**
 * Batch matches imported QR code payloads to registered students.
 */
export async function matchAndLinkQRCodesAction(
  matches: Array<{ studentId: string; qrData: string }>
) {
  const session = await requireAuth("student:qr_scan");

  let updatedCount = 0;
  for (const match of matches) {
    const existing = await prisma.student.findUnique({
      where: { studentId: match.studentId },
    });
    if (existing) {
      await prisma.student.update({
        where: { studentId: match.studentId },
        data: { qrCodeData: match.qrData },
      });
      updatedCount++;
    }
  }

  await createSafeAuditLog({
    userId: session.userId,
    action: "QR_BATCH_LINK",
    entityType: "STUDENT_QR",
    metadata: { matchedCount: updatedCount },
  });

  revalidatePath("/students");
  return { success: true, updatedCount };
}
