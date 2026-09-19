// ============================================================================
// STUDENT BRIDGE — STUDENT STATUS & IDENTITY TYPES
// ============================================================================

export type StudentStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "SUSPENDED";

export interface StudentRecord {
  id: string;
  studentId: string;
  fullName: string;
  contactName: string;
  grade: string;
  sex: string;
  phone: string;
  cityRegion: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodType: string | null;
  emailAddress: string | null;
  guardianFullName: string;
  rollNumber: string;
  nationality: string;
  nationalId: string;
  dateOfBirth: Date;
  photoPath: string | null;
  qrCodeData: string | null;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}
