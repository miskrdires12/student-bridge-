// ============================================================================
// STUDENT BRIDGE — ZOD INPUT & CLIENT/SERVER VALIDATION SCHEMAS
// ============================================================================

import { z } from "zod";

export const BloodTypeEnum = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
export const SexEnum = z.enum(["Male", "Female", "Other"]);
export const StudentStatusEnum = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED", "SUSPENDED"]);
export const UserRoleEnum = z.enum(["SENDER", "RECEIVER", "ADMIN"]);
export const BatchStatusEnum = z.enum([
  "DRAFT",
  "VALIDATING",
  "READY",
  "SENDING",
  "SENT",
  "FAILED",
  "RECEIVED",
  "PROCESSED",
  "ARCHIVED",
]);

/**
 * Authentication Login Schema
 */
export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .trim()
    .min(3, "Username or email must be at least 3 characters")
    .max(100, "Username or email cannot exceed 100 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password cannot exceed 128 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Student Registration & Update Schema
 * Strictly requires ONLY the 5 core fields:
 * 1. Student ID (Unique) *
 * 2. Full Legal Name *
 * 3. Grade / Class Batch *
 * 4. Gender / Sex *
 * 5. Phone *
 * All other fields are optional and gracefully handled.
 */
export const studentSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(1, "Student ID is required")
    .max(32, "Student ID cannot exceed 32 characters")
    .regex(/^[A-Za-z0-9\-_]+$/, "Student ID can only contain letters, numbers, hyphens, and underscores"),
  fullName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  grade: z
    .string()
    .trim()
    .min(1, "Grade / Class Batch is required")
    .max(30, "Grade cannot exceed 30 characters"),
  sex: z.string().min(1, "Gender / Sex selection is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(25, "Phone number cannot exceed 25 characters"),

  // Optional Standard Fields
  dateOfBirth: z.preprocess(
    (arg) => {
      if (!arg) return undefined;
      if (typeof arg === "string" || arg instanceof Date) {
        const d = new Date(arg);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    },
    z.date().optional().nullable()
  ),
  emailAddress: z
    .string()
    .trim()
    .email("Invalid email format")
    .optional()
    .or(z.literal(""))
    .nullable(),
  address: z.string().trim().optional().nullable(),
  school: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  academicYear: z.string().trim().optional().nullable(),
  guardianFullName: z.string().trim().optional().nullable(),
  emergencyContactName: z.string().trim().optional().nullable(),
  emergencyContactPhone: z.string().trim().optional().nullable(),
  contactName: z.string().trim().optional().nullable(),
  cityRegion: z.string().trim().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  rollNumber: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  nationalId: z.string().trim().optional().nullable(),

  // Media references & status
  photoPath: z.string().optional().nullable(),
  qrCodeData: z.string().optional().nullable(),
  status: StudentStatusEnum.default("ACTIVE"),
  batchId: z.string().optional().nullable(),

  // Dynamic Custom Fields mapping { fieldKey: value }
  customFields: z.record(z.string()).optional(),
});

export type StudentFormInput = z.infer<typeof studentSchema>;

/**
 * Custom Field Definition Schema
 */
export const customFieldSchema = z.object({
  fieldKey: z
    .string()
    .trim()
    .min(2, "Field key must be at least 2 characters")
    .max(40, "Field key cannot exceed 40 characters")
    .regex(/^[a-z0-9_]+$/, "Field key must be lowercase letters, numbers, and underscores"),
  label: z.string().trim().min(1, "Label is required").max(60),
  dataType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT"]).default("TEXT"),
  optionsJson: z.string().optional().nullable(),
  isRequired: z.boolean().default(false),
  defaultValue: z.string().optional().nullable(),
});

export type CustomFieldInput = z.infer<typeof customFieldSchema>;

/**
 * Transfer Batch Creation Schema
 */
export const transferBatchSchema = z.object({
  title: z.string().trim().min(1, "Batch title is required").max(100),
  description: z.string().trim().optional(),
  studentIds: z.array(z.string()).min(1, "At least one student must be selected"),
});

export type TransferBatchInput = z.infer<typeof transferBatchSchema>;

/**
 * Bulker Layout Geometry Schema
 */
export const bulkerLayoutSchema = z.object({
  pageSize: z.enum(["A4", "A3", "LETTER", "LEGAL", "CUSTOM"]).default("A4"),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]).default("PORTRAIT"),
  unit: z.enum(["mm", "cm", "in"]).default("mm"),
  pageWidth: z.number().positive(),
  pageHeight: z.number().positive(),
  cardWidth: z.number().positive(),
  cardHeight: z.number().positive(),
  rows: z.number().int().min(1).max(20).default(4),
  columns: z.number().int().min(1).max(10).default(2),
  marginTop: z.number().min(0),
  marginBottom: z.number().min(0),
  marginLeft: z.number().min(0),
  marginRight: z.number().min(0),
  spacingHorizontal: z.number().min(0),
  spacingVertical: z.number().min(0),
  bleed: z.number().min(0).default(0),
  cropMarks: z.boolean().default(true),
});

export type BulkerLayoutConfig = z.infer<typeof bulkerLayoutSchema>;

/**
 * User Creation & Management Schema (Admin only)
 */
export const createUserSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password cannot exceed 128 characters"),
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(35, "Username cannot exceed 35 characters")
    .regex(/^[A-Za-z0-9_]+$/, "Username can only contain alphanumeric characters and underscores")
    .optional()
    .or(z.literal("")),
  role: UserRoleEnum.default("RECEIVER"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
