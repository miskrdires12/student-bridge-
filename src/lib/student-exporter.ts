// ============================================================================
// STUDENT BRIDGE — COMPREHENSIVE CSV & EXCEL (.XLSX) EXPORTER
// Exports all student demographic & contact fields, including Emergency Phone,
// Guardian, School, Department, and conditionally includes Sender Station for Admins.
// ============================================================================

import * as XLSX from "xlsx";

export interface StudentExportItem {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  sex: string;
  phone: string;
  emergencyContactPhone?: string | null;
  emergencyContactName?: string | null;
  guardianFullName?: string | null;
  school?: string | null;
  department?: string | null;
  academicYear?: string | null;
  emailAddress?: string | null;
  address?: string | null;
  bloodType?: string | null;
  status: string;
  photoPath?: string | null;
  photoIntegrityStatus?: string | null;
  senderName?: string | null;
  createdAt: Date | string;
}

/**
 * Formats student records into clean exportable tabular row objects.
 */
export function formatStudentsForExport(
  students: StudentExportItem[],
  includeSender: boolean = false
): Record<string, string | number>[] {
  return students.map((s) => {
    const row: Record<string, string | number> = {
      "Student ID": s.studentId,
      "Full Name": s.fullName,
      "Grade / Class": s.grade,
      "Gender": s.sex,
      "Primary Phone": s.phone || "N/A",
      "Emergency Phone": s.emergencyContactPhone || s.phone || "N/A",
      "Emergency Contact Name": s.emergencyContactName || s.guardianFullName || "N/A",
      "Guardian Full Name": s.guardianFullName || "N/A",
      "School": s.school || "N/A",
      "Department": s.department || "N/A",
      "Academic Year": s.academicYear || "N/A",
      "Email Address": s.emailAddress || "N/A",
      "Blood Type": s.bloodType || "N/A",
      "Residential Address": s.address || "N/A",
      "Photo Available": s.photoPath ? "YES" : "NO",
      "Photo Integrity": s.photoIntegrityStatus || (s.photoPath ? "PHOTO_VERIFIED" : "PHOTO_MISSING"),
      "Enrollment Status": s.status,
      "Registration Date": typeof s.createdAt === "string" ? s.createdAt : s.createdAt.toISOString().split("T")[0],
    };

    // Sender Station Attribution is strictly restricted to Admin exports
    if (includeSender) {
      row["Sender Station"] = s.senderName || "Central Station / Direct";
    }

    return row;
  });
}

/**
 * Generates an Excel (.xlsx) file buffer.
 */
export function generateExcelBuffer(
  students: StudentExportItem[],
  includeSender: boolean = false
): Buffer {
  const rows = formatStudentsForExport(students, includeSender);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for polished presentation
  worksheet["!cols"] = [
    { wch: 18 }, // Student ID
    { wch: 25 }, // Full Name
    { wch: 15 }, // Grade
    { wch: 10 }, // Gender
    { wch: 18 }, // Primary Phone
    { wch: 18 }, // Emergency Phone
    { wch: 22 }, // Emergency Contact Name
    { wch: 22 }, // Guardian Full Name
    { wch: 22 }, // School
    { wch: 20 }, // Department
    { wch: 14 }, // Academic Year
    { wch: 24 }, // Email
    { wch: 12 }, // Blood Type
    { wch: 28 }, // Address
    { wch: 16 }, // Photo Available
    { wch: 18 }, // Photo Integrity
    { wch: 16 }, // Status
    { wch: 16 }, // Date
    ...(includeSender ? [{ wch: 24 }] : []), // Sender Station
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Generates a CSV file buffer.
 */
export function generateCsvBuffer(
  students: StudentExportItem[],
  includeSender: boolean = false
): Buffer {
  const rows = formatStudentsForExport(students, includeSender);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvString = XLSX.utils.sheet_to_csv(worksheet);

  // Prepend UTF-8 BOM so Excel opens CSV files with correct unicode character encoding
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csvString, "utf-8")]);
}
