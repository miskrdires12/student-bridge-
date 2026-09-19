// ============================================================================
// STUDENT BRIDGE — EXCEL STUDENT IMPORTER WITH CUSTOM COLUMN MAPPING
// Strict Requirement 13:
// - Never assume Excel column names are fixed.
// - Supports interactive column mapping (Full Name -> Name, ID -> StudentID, etc.)
// - Full row validation and error reporting with row numbers
// ============================================================================

import * as XLSX from "xlsx";
import type { StudentFormInput } from "@/lib/validations";

export interface ParsedExcelRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  data?: StudentFormInput;
  raw: Record<string, unknown>;
}

export interface ExcelImportAnalysis {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateIdsInFile: string[];
  parsedStudents: StudentFormInput[];
  rows: ParsedExcelRow[];
  errorReport: { rowNumber: number; studentId: string; errors: string[] }[];
}

export interface ExcelColumnInfo {
  sheetNames: string[];
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
}

/**
 * Inspects uploaded workbook to extract sheets, detected headers, and preview rows.
 */
export function inspectExcelWorkbook(buffer: Buffer): ExcelColumnInfo {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const columns = rawJson.length > 0 ? Object.keys(rawJson[0]) : [];
  const sampleRows = rawJson.slice(0, 5);

  return {
    sheetNames: wb.SheetNames,
    columns,
    sampleRows,
    totalRows: rawJson.length,
  };
}

/**
 * Parses an Excel or CSV buffer according to explicit user column mapping.
 *
 * mapping: {
 *   fullName: "Full Legal Name",
 *   studentId: "ID Number",
 *   phone: "Telephone",
 *   sex: "Gender",
 *   grade: "Class",
 *   ...
 * }
 */
export function parseExcelWithCustomMapping(
  buffer: Buffer,
  mapping: Record<string, string>
): ExcelImportAnalysis {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  const rows: ParsedExcelRow[] = [];
  const parsedStudents: StudentFormInput[] = [];
  const seenStudentIds = new Set<string>();
  const duplicateIdsInFile: string[] = [];
  const errorReport: { rowNumber: number; studentId: string; errors: string[] }[] = [];

  let rowCounter = 1; // 1-indexed (row 1 is header, row 2 is first data row)

  for (const raw of rawRows) {
    rowCounter++;
    const errors: string[] = [];

    const getMappedVal = (fieldKey: string): string => {
      const colName = mapping[fieldKey];
      if (!colName || !raw[colName]) return "";
      return String(raw[colName]).trim();
    };

    const studentId = getMappedVal("studentId");
    const fullName = getMappedVal("fullName");
    const grade = getMappedVal("grade");
    const sex = getMappedVal("sex") || "Male";
    const phone = getMappedVal("phone");

    // 1. Validate required fields
    if (!studentId) errors.push("Missing required Student ID");
    if (!fullName) errors.push("Missing required Name");
    if (!grade) errors.push("Missing required Grade");
    if (!phone) errors.push("Missing required Phone number");

    // 2. Duplicate detection within the file itself
    if (studentId) {
      const normalizedId = studentId.toLowerCase();
      if (seenStudentIds.has(normalizedId)) {
        duplicateIdsInFile.push(studentId);
        errors.push(`Duplicate Student ID "${studentId}" in spreadsheet`);
      } else {
        seenStudentIds.add(normalizedId);
      }
    }

    // Optional fields mapping
    const emailAddress = getMappedVal("emailAddress") || undefined;
    const address = getMappedVal("address") || undefined;
    const school = getMappedVal("school") || undefined;
    const department = getMappedVal("department") || undefined;
    const academicYear = getMappedVal("academicYear") || undefined;
    const guardianFullName = getMappedVal("guardianFullName") || undefined;
    const emergencyContactPhone = getMappedVal("emergencyContactPhone") || undefined;
    const emergencyContactName = getMappedVal("emergencyContactName") || undefined;
    const bloodType = getMappedVal("bloodType") || undefined;
    const nationality = getMappedVal("nationality") || undefined;

    const isValid = errors.length === 0;

    let studentData: StudentFormInput | undefined;
    if (isValid) {
      studentData = {
        studentId,
        fullName,
        grade,
        sex,
        phone,
        emailAddress,
        address,
        school,
        department,
        academicYear,
        guardianFullName,
        emergencyContactPhone,
        emergencyContactName,
        bloodType,
        nationality,
        status: "ACTIVE",
      };
      parsedStudents.push(studentData);
    } else {
      errorReport.push({
        rowNumber: rowCounter,
        studentId: studentId || "N/A",
        errors,
      });
    }

    rows.push({
      rowNumber: rowCounter,
      isValid,
      errors,
      data: studentData,
      raw,
    });
  }

  return {
    totalRows: rawRows.length,
    validRows: parsedStudents.length,
    invalidRows: rawRows.length - parsedStudents.length,
    duplicateIdsInFile,
    parsedStudents,
    rows,
    errorReport,
  };
}

/**
 * Automatically detects column mappings from available headers.
 */
export function autoDetectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const patterns: Record<string, RegExp> = {
    studentId: /student\s*id|registration|roll|admission|id\s*number|\bid\b/i,
    fullName: /full\s*(?:legal\s*)?name|student\s*name|\bname\b/i,
    grade: /grade|class|batch|level|standard/i,
    sex: /sex|gender/i,
    phone: /phone|tel|mobile|contact\s*no/i,
    emailAddress: /e-?mail/i,
    address: /address|residence|location/i,
    school: /school|institution|campus/i,
    department: /department|faculty|dept/i,
    academicYear: /academic\s*year|session|year/i,
    guardianFullName: /guardian|parent|father|mother/i,
    emergencyContactName: /emergency\s*contact\s*(?:name)?/i,
    emergencyContactPhone: /emergency\s*(?:contact\s*)?phone/i,
    bloodType: /blood\s*(?:group|type)/i,
    nationality: /nationality|citizenship/i,
  };

  for (const [fieldKey, regex] of Object.entries(patterns)) {
    for (const header of headers) {
      if (regex.test(header)) {
        mapping[fieldKey] = header;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Convenience parser that auto-detects column headers or accepts custom mapping.
 */
export function parseExcelStudentWorkbook(
  buffer: Buffer,
  customMapping?: Record<string, string>
): ExcelImportAnalysis {
  const info = inspectExcelWorkbook(buffer);
  const mapping = customMapping || autoDetectColumnMapping(info.columns);
  return parseExcelWithCustomMapping(buffer, mapping);
}

