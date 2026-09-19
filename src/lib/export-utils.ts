// ============================================================================
// STUDENT BRIDGE — RECEIVER EXPORT & DESKTOP PATH UTILITIES
// ============================================================================

export const RECEIVER_STUDENT_PHOTO_FOLDER = "C:\\Users\\athede\\Desktop\\students project for 17000";

/**
 * Receiver student photo excel headers:
 * ["StudentID", "Name", "Sex", "Grade", "Phone", "EmergencyPhone", "@photo"]
 */
export const RECEIVER_EXCEL_HEADERS = [
  "StudentID",
  "Name",
  "Sex",
  "Grade",
  "Phone",
  "EmergencyPhone",
  "@photo",
] as const;

export interface StudentPhotoIdentity {
  fullName?: string | null;
  studentId?: string | null;
  photoPath?: string | null;
}

/**
 * Normalizes phone numbers to start with 2519 (not 09).
 * E.g.:
 * - "0912345678" -> "251912345678"
 * - "09 11 22 33 44" -> "251911223344"
 * - "+251912345678" -> "251912345678"
 * - "912345678" -> "251912345678"
 * - "251912345678" -> "251912345678"
 */
export function formatPhoneForReceiver(phone?: string | null): string {
  if (!phone) return "";
  let cleaned = String(phone).trim().replace(/[^\d+]/g, "");

  // Remove leading plus if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 09 (e.g. 0912345678), replace leading 09 with 2519
  if (cleaned.startsWith("09")) {
    return "2519" + cleaned.substring(2);
  }

  // If starts with 25109 (common typo), convert to 2519
  if (cleaned.startsWith("25109")) {
    return "2519" + cleaned.substring(5);
  }

  // If starts with 2519 already, return as is
  if (cleaned.startsWith("2519")) {
    return cleaned;
  }

  // If 9 digits starting with 9 (e.g. 912345678), prepend 251
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return "251" + cleaned;
  }

  return cleaned;
}

/**
 * Generates the local photo filename for a student preserving full name and spacing.
 * Requirement:
 * If student's name is "Yeah tarekegn", produces "Yeah tarekegn.jpg".
 * Sanitizes only illegal filesystem characters (/ \ : * ? " < > |).
 */
export function getStudentPhotoFileName(student: StudentPhotoIdentity): string {
  if (!student.photoPath) return "";

  // 1. Format based on student's full legal name: e.g. "Yeah tarekegn" -> "Yeah tarekegn.jpg"
  if (student.fullName && student.fullName.trim()) {
    // Sanitize illegal Windows filename characters: / \ : * ? " < > |
    let safeName = student.fullName
      .replace(/[/\\]/g, " - ")
      .replace(/[:*?"<>|]/g, "")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Remove leading/trailing dots or dashes
    safeName = safeName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "");

    if (safeName.length > 0) {
      return `${safeName}.jpg`;
    }
  }

  // 2. Check if photoPath is a relative or absolute path ending in a clean custom filename
  if (typeof student.photoPath === "string" && !student.photoPath.startsWith("data:")) {
    const rawName = student.photoPath.split("/").pop()?.split("\\").pop();
    if (
      rawName &&
      !rawName.startsWith("edited_") &&
      !rawName.startsWith("original_") &&
      /\.(jpg|jpeg|png|webp)$/i.test(rawName)
    ) {
      return rawName;
    }
  }

  return "photo.jpg";
}

/**
 * Retrieves the currently configured receiver photo folder from localStorage,
 * falling back to the default desktop project path.
 */
export function getReceiverPhotoFolder(): string {
  if (typeof window !== "undefined") {
    try {
      const custom = localStorage.getItem("sb_receiver_photo_folder");
      if (custom && custom.trim().length > 0) return custom.trim();
      const rawSettings = localStorage.getItem("sb_receiver_settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.photoFolder && parsed.photoFolder.trim().length > 0) {
          return parsed.photoFolder.trim();
        }
      }
    } catch {}
  }
  return RECEIVER_STUDENT_PHOTO_FOLDER;
}

/**
 * Retrieves the currently configured receiver CSV prefix from localStorage.
 */
export function getReceiverCsvPrefix(): string {
  if (typeof window !== "undefined") {
    try {
      const rawSettings = localStorage.getItem("sb_receiver_settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.csvPrefix && parsed.csvPrefix.trim().length > 0) {
          return parsed.csvPrefix.trim();
        }
      }
    } catch {}
  }
  return "student_bridge_receiver_manifest";
}

/**
 * Generates the exact local file path required for the @photo column:
 * e.g. "C:\Users\athede\Desktop\students project for 17000\Yeah tarekegn.jpg"
 * Dynamically respects custom folder set in Receiver Settings.
 */
export function getStudentPhotoLocalPath(student: StudentPhotoIdentity, folderOverride?: string): string {
  if (!student.photoPath) return "";
  const fileName = getStudentPhotoFileName(student);
  if (!fileName) return "";
  const folder = folderOverride || getReceiverPhotoFolder();
  const sep = folder.includes("/") ? "/" : "\\";
  const cleanFolder = folder.endsWith("/") || folder.endsWith("\\") ? folder.slice(0, -1) : folder;
  return `${cleanFolder}${sep}${fileName}`;
}

export function getReceiverExcelHeaders(includeBloodType: boolean = false): string[] {
  if (includeBloodType) {
    return ["StudentID", "Name", "Sex", "Grade", "Phone", "EmergencyPhone", "BloodType", "@photo"];
  }
  return [...RECEIVER_EXCEL_HEADERS];
}

/**
 * Maps a student record into receiver columns:
 * [StudentID, Name, Sex, Grade, Phone, EmergencyPhone, (BloodType?), @photo]
 */
export function formatStudentForReceiverExcel(
  student: {
    studentId: string;
    fullName: string;
    sex?: string | null;
    grade: string;
    phone: string;
    emergencyContactPhone?: string | null;
    emergencyPhone?: string | null;
    parentPhone?: string | null;
    photoPath?: string | null;
    bloodType?: string | null;
    [key: string]: any;
  },
  includeBloodType: boolean = false
) {
  const emergency =
    student.emergencyContactPhone ||
    student.emergencyPhone ||
    student.parentPhone ||
    "";

  const row = [
    student.studentId || "",
    student.fullName || "",
    student.sex || "Male",
    student.grade || "",
    formatPhoneForReceiver(student.phone),
    formatPhoneForReceiver(emergency),
  ];

  if (includeBloodType) {
    const bt = (student.bloodType || "").trim();
    row.push(bt && bt !== "Unknown" ? bt : "");
  }

  row.push(getStudentPhotoLocalPath(student));
  return row;
}

/**
 * Resolves Grade and Section classification for folder structuring in ZIP exports.
 * 
 * Supports:
 * - Explicit grade + department as section (e.g., Grade 9, Section A -> Grade_9 / Section_A)
 * - Combined grade & section strings (e.g., "Grade 9A", "10B", "11 - C", "Grade 12 Section B")
 * - Custom field value for section
 * - Fallback to Section_General if no section is specified
 */
export function resolveGradeAndSection(student: {
  grade?: string | null;
  department?: string | null;
  section?: string | null;
  customValues?: any[];
  [key: string]: any;
}): { gradeFolder: string; sectionFolder: string; rawGrade: string; rawSection: string } {
  let gradeInput = (student.grade || "").trim();
  let sectionInput = (student.section || "").trim();
  const deptInput = (student.department || "").trim();

  // 1. If explicit section field was not present, check department
  if (!sectionInput && deptInput) {
    sectionInput = deptInput;
  }

  // 2. Check customValues for a section attribute
  if (!sectionInput && Array.isArray(student.customValues)) {
    const foundCustom = student.customValues.find((cv: any) => {
      const name = (cv?.field?.name || cv?.fieldName || cv?.name || cv?.key || "").toLowerCase();
      return name.includes("section") || name === "sec";
    });
    if (foundCustom?.value) {
      sectionInput = String(foundCustom.value).trim();
    }
  }

  // 3. Extract combined Grade and Section from gradeInput if sectionInput is still empty
  if (!sectionInput && gradeInput) {
    // Matches "Grade 9A", "Grade 9-A", "Grade 9 - A", "Grade 9_A", "Grade 9 Section A", "9A", "10B", "11C", "12 - D"
    const combinedMatch = gradeInput.match(
      /^(?:grade\s*)?(\d+)\s*[-/_ ]*\s*(?:section\s*|sec\s*)?([a-zA-Z]|[0-9]+)$/i
    );
    if (combinedMatch) {
      gradeInput = `Grade ${combinedMatch[1]}`;
      sectionInput = combinedMatch[2].toUpperCase();
    } else {
      // Matches "Grade 9 (Section A)" or "Grade 9 [A]"
      const bracketMatch = gradeInput.match(
        /^(?:grade\s*)?(\d+)\s*[\(\[]\s*(?:section\s*|sec\s*)?([a-zA-Z0-9]+)\s*[\)\]]$/i
      );
      if (bracketMatch) {
        gradeInput = `Grade ${bracketMatch[1]}`;
        sectionInput = bracketMatch[2].toUpperCase();
      }
    }
  }

  // Normalize Grade string
  let cleanGrade = gradeInput.replace(/^grade\s*/i, "").trim();
  if (!cleanGrade) cleanGrade = "General";
  cleanGrade = cleanGrade.replace(/[:*?"<>|/\\]/g, "_");
  const gradeFolder = `Grade_${cleanGrade}`;

  // Normalize Section string
  let cleanSection = sectionInput.replace(/^(?:section|sec)\s*/i, "").trim();
  if (!cleanSection) cleanSection = "General";
  cleanSection = cleanSection.replace(/[:*?"<>|/\\]/g, "_");
  const sectionFolder = `Section_${cleanSection.toUpperCase()}`;

  return {
    gradeFolder,
    sectionFolder,
    rawGrade: gradeInput || "General",
    rawSection: sectionInput || "General",
  };
}

