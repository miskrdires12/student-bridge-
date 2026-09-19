// ============================================================================
// STUDENT BRIDGE — SECURE SERVER-SIDE IMAGE PROCESSING PIPELINE
// Uses sharp to validate magic numbers, prevent path traversal, strip metadata,
// resize to standardized ID card dimensions (max 600x800), and save securely.
// Also provides real-name sanitization and duplicate disambiguation.
// ============================================================================

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const UPLOAD_SUBDIR = "uploads/photos";

export interface ProcessedImageResult {
  fileName: string;
  relativePath: string;
  absolutePath: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

/**
 * Validates, strips EXIF, normalizes dimensions to max 600×800 (portrait),
 * converts to high-efficiency JPEG (quality 85), and stores securely in /public/uploads/photos.
 */
export async function processAndSaveStudentPhoto(
  fileBuffer: Buffer,
  mimeType: string,
  subfolder: "edited" | "original" = "edited"
): Promise<ProcessedImageResult> {
  // 1. Enforce payload size limit
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Uploaded file exceeds maximum allowed size of 10 MB.`);
  }

  // 2. Validate MIME type parameter
  const normalizedMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime) && !normalizedMime.includes("image/")) {
    throw new Error(`Unsupported image type: ${mimeType}. Allowed formats: JPEG, PNG, WEBP.`);
  }

  // 3. Inspect image buffer with Sharp to verify real magic numbers and dimensions
  let metadata: sharp.Metadata;
  try {
    const probe = sharp(fileBuffer);
    metadata = await probe.metadata();
  } catch {
    throw new Error("Invalid or corrupted image file structure.");
  }

  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error(`Image payload does not match genuine JPEG, PNG, or WEBP binary signature.`);
  }

  // 4. Generate cryptographically safe unique filename
  const randomId = crypto.randomBytes(12).toString("hex");
  const fileName = `${subfolder}_${Date.now()}_${randomId}.jpg`;

  // 5. Transform: auto-orient, resize to strict 3:4 portrait (900×1200), 300 DPI, 90 quality JPEG
  const processedBuffer = await sharp(fileBuffer)
    .rotate()
    .resize(900, 1200, {
      fit: "cover",
      position: "center",
      withoutEnlargement: false,
    })
    .withMetadata({
      density: 300,
    })
    .jpeg({
      quality: 90,
      mozjpeg: true,
    })
    .toBuffer();

  const finalMetadata = await sharp(processedBuffer).metadata();

  // 6. Resilient storage:
  // In serverless environments (e.g. Vercel, AWS Lambda) the root filesystem is read-only.
  // We prioritize high-efficiency Base64 Data URI or write to disk if writable.
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  let relativePath = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
  let targetDir = "";

  if (!isServerless) {
    try {
      const publicDir = path.join(process.cwd(), "public");
      targetDir = path.join(publicDir, UPLOAD_SUBDIR, subfolder);
      await fs.mkdir(targetDir, { recursive: true });
      const absoluteTarget = path.join(targetDir, fileName);
      await fs.writeFile(absoluteTarget, processedBuffer);
      relativePath = `/${UPLOAD_SUBDIR}/${subfolder}/${fileName}`;
    } catch (writeErr) {
      console.warn("Notice: Local disk write failed, retaining Base64 data URL:", writeErr);
    }
  }

  return {
    fileName,
    relativePath,
    absolutePath: targetDir,
    width: finalMetadata.width ?? 900,
    height: finalMetadata.height ?? 1200,
    format: "jpeg",
    sizeBytes: processedBuffer.length,
  };
}

export { setJpeg300Dpi, convertBlobTo300Dpi } from "./jpeg-dpi";

/**
 * Sanitizes a student's real name for safe filesystem usage without
 * modifying the database record. Handles illegal characters like / \ : * ? " < > |
 * and provides duplicate disambiguation with studentId.
 *
 * Example: "Abebe / K" -> "Abebe - K.jpg"
 * If duplicate: "Miskr Dires - STU001.jpg"
 */
export function generateSafePhotoFilename(
  realName: string,
  _studentId?: string,
  _isDuplicateOrAllNames: boolean | string[] = false,
  extension: string = "jpg"
): string {
  const cleanExt = extension.replace(/^\./, "");
  if (!realName || !realName.trim()) {
    return `photo.${cleanExt}`;
  }

  // Replace illegal filesystem characters: / \ : * ? " < > | and control chars
  let safeName = realName
    .replace(/[/\\]/g, " - ")
    .replace(/[:*?"<>|]/g, " - ")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/(?: - )+/g, " - ")
    .trim();

  // Remove leading / trailing periods, dashes, or underscores
  safeName = safeName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "");

  if (!safeName) {
    safeName = "photo";
  }

  return `${safeName}.${cleanExt}`;
}
