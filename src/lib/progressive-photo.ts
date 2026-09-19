// ============================================================================
// STUDENT BRIDGE — 3-PHASE PROGRESSIVE PHOTO PIPELINE & LOCAL DESKTOP BACKUP
//
// 1st Phase: 150px Thumbnail  (~5-15 KB)  -> Instant real-time stream display
// 2nd Phase: 800px Preview    (~40-80 KB) -> Modal & drawer inspection
// 3rd Phase: Original Master  (Full Res)   -> Printing, master DB & local desktop backup
//
// Local PC Backup Target:
// C:\Users\miskr\OneDrive\Desktop\student bridge data backup\[Grade]\[StudentID]_[FullName].jpg
// ============================================================================

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { uploadToR2Bucket } from "./r2-storage";



export interface ProgressivePhotoResult {
  thumbnailPath: string;
  previewPath: string;
  originalPath: string;
  backupLocalPath?: string | null;
  width: number;
  height: number;
}

export interface StudentPhotoMetadata {
  studentId: string;
  fullName: string;
  grade: string;
  isEdited?: boolean;
}

/**
 * Sanitizes strings for safe cross-platform filesystem directory/filenames
 */
export function sanitizeFsName(name: string, fallback = "unnamed"): string {
  if (!name || !name.trim()) return fallback;
  return name
    .replace(/[/\\]/g, " - ")
    .replace(/[:*?"<>|]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || fallback;
}

/**
 * Returns candidate local backup directories on the host PC.
 * Priority 1: C:\Users\miskr\OneDrive\Desktop\student bridge data backup
 * Priority 2: C:\Users\miskr\Desktop\student bridge data backup
 * Priority 3: <UserHome>\Desktop\student bridge data backup
 */
export function getLocalDesktopBackupBaseDirs(): string[] {
  const home = os.homedir();
  const dirs = [
    path.join("C:", "Users", "miskr", "OneDrive", "Desktop", "student bridge data backup"),
    path.join("C:", "Users", "miskr", "Desktop", "student bridge data backup"),
    path.join(home, "OneDrive", "Desktop", "student bridge data backup"),
    path.join(home, "Desktop", "student bridge data backup"),
  ];

  // Return deduplicated array
  return Array.from(new Set(dirs));
}

/**
 * Writes the original photo to the local PC desktop backup folder.
 * Formats directory by Grade and filename as: [StudentID]_[FullName].jpg
 */
export async function writeLocalDesktopBackup(
  originalBuffer: Buffer,
  meta: StudentPhotoMetadata
): Promise<string | null> {
  const safeGrade = sanitizeFsName(meta.grade || "General", "General");
  const safeStudentId = sanitizeFsName(meta.studentId, "STU");
  const safeFullName = sanitizeFsName(meta.fullName, "Student");
  const versionTag = meta.isEdited ? `_v${Date.now()}` : "";
  const filename = `${safeStudentId}_${safeFullName}${versionTag}.jpg`;

  const candidateDirs = getLocalDesktopBackupBaseDirs();
  const successfulPaths: string[] = [];

  for (const baseDir of candidateDirs) {
    try {
      const gradeDir = path.join(baseDir, safeGrade);
      await fs.mkdir(gradeDir, { recursive: true });
      const fullPath = path.join(gradeDir, filename);
      await fs.writeFile(fullPath, originalBuffer);
      successfulPaths.push(fullPath);
      console.log(`[Local Folder Backup] ✓ Saved photo to: ${fullPath}`);
    } catch (err: any) {
      // Continue to next candidate directory
    }
  }

  return successfulPaths.length > 0 ? successfulPaths[0] : null;
}

/**
 * Generates the 3-phase photos and performs local desktop backup.
 */
export async function generate3PhasePhotos(
  fileBuffer: Buffer,
  meta: StudentPhotoMetadata
): Promise<ProgressivePhotoResult> {
  const safeName = sanitizeFsName(meta.fullName, "student");
  const safeStudentId = sanitizeFsName(meta.studentId, "STU");
  const versionTag = meta.isEdited ? `_v${Date.now()}` : "";
  const baseSafeName = `${safeStudentId}_${safeName}${versionTag}.jpg`;

  // 1. Probe source image metadata
  let probe: sharp.Metadata;
  try {
    probe = await sharp(fileBuffer).metadata();
  } catch {
    throw new Error("Invalid image format or corrupted photo binary.");
  }

  // 2. Generate Phase 1: 150px Thumbnail (Ultra-lightweight, ~5-15 KB)
  const thumbnailBuffer = await sharp(fileBuffer)
    .rotate()
    .resize(150, 200, {
      fit: "cover",
      position: "center",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  // 3. Generate Phase 2: 800px Preview (Sharp inspector preview, ~40-80 KB)
  const previewBuffer = await sharp(fileBuffer)
    .rotate()
    .resize(800, 1067, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  // 4. Generate Phase 3: Original Master (Full resolution, preserved quality)
  const originalBuffer = await sharp(fileBuffer)
    .rotate()
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();

  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  // Phase 1 Thumbnail: Always store Base64 in database for 0ms instant display anywhere
  let thumbnailPath = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;
  let previewPath = `data:image/jpeg;base64,${previewBuffer.toString("base64")}`;
  let originalPath = `data:image/jpeg;base64,${originalBuffer.toString("base64")}`;
  let backupLocalPath: string | null = null;

  // 5. Attempt High-Speed Cloud Upload directly to Cloudflare R2 bucket 'siliconlabs'
  const safeGrade = sanitizeFsName(meta.grade || "General", "General");
  try {
    const [origRes, prevRes] = await Promise.allSettled([
      uploadToR2Bucket(originalBuffer, safeGrade, baseSafeName, "image/jpeg"),
      uploadToR2Bucket(previewBuffer, `${safeGrade}/previews`, baseSafeName, "image/jpeg"),
    ]);

    if (origRes.status === "fulfilled" && origRes.value.success && origRes.value.publicUrl) {
      originalPath = origRes.value.publicUrl;
    }
    if (prevRes.status === "fulfilled" && prevRes.value.success && prevRes.value.publicUrl) {
      previewPath = prevRes.value.publicUrl;
    }
  } catch (storageErr) {
    console.warn("Cloudflare R2 high-speed upload fallback:", storageErr);
  }

  // 6. Save Phase 3 to Local Desktop Backup Directory (When running on workstation PC)
  if (!isServerless) {
    try {
      backupLocalPath = await writeLocalDesktopBackup(originalBuffer, meta);
    } catch (backupErr) {
      console.warn("Local desktop backup notice:", backupErr);
    }
  }


  // 7. Also write to local public server disk for local fallback if available
  if (!isServerless) {
    try {
      const publicDir = path.join(process.cwd(), "public", "uploads", "photos");
      const thumbsDir = path.join(publicDir, "thumbnails");
      const previewsDir = path.join(publicDir, "previews");

      await fs.mkdir(publicDir, { recursive: true });
      await fs.mkdir(thumbsDir, { recursive: true });
      await fs.mkdir(previewsDir, { recursive: true });

      await fs.writeFile(path.join(thumbsDir, baseSafeName), thumbnailBuffer);
      await fs.writeFile(path.join(previewsDir, baseSafeName), previewBuffer);
      await fs.writeFile(path.join(publicDir, safeName), originalBuffer);
    } catch {
      // Non-critical local cache
    }
  }

  return {
    thumbnailPath,
    previewPath,
    originalPath,
    backupLocalPath,
    width: probe.width || 800,
    height: probe.height || 1067,
  };
}
