// ============================================================================
// STUDENT BRIDGE — ENTERPRISE STORAGE SERVICE (CLOUDFLARE R2 + LOCAL CACHE)
// High-performance Cloudflare R2 storage with zero egress fees, CDN acceleration,
// multi-tier asset processing (Thumbnail, Preview, Original), and local fallback.
// ============================================================================

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  uploadToR2Bucket,
  getR2PublicUrl,
  deleteFromR2Bucket,
  listAllR2StorageFileKeys,
  extractR2StorageKey,
} from "./r2-storage";

// Secret used for HMAC signatures when generating time-limited local signed URLs
const STORAGE_SIGNING_SECRET =
  process.env.AUTH_SECRET ||
  process.env.STORAGE_SIGNING_SECRET ||
  "student-bridge-storage-internal-hmac-secret-32-chars-minimum";

export const LOCAL_STORAGE_DIR = path.join(process.cwd(), "storage", "photos");

export interface StorageObjectMeta {
  key: string;
  sizeBytes: number;
  lastModified: Date;
  mimeType?: string;
  tier?: "original" | "preview" | "thumbnail" | "qr" | "other";
}

export interface MultiTierPhotoResult {
  storageKey: string; // Primary reference key
  thumbnailKey: string;
  previewKey: string;
  originalKey: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Generates an HMAC signature for a storage key and expiration timestamp.
 */
export function generateSignedToken(storageKey: string, expiresAtUnix: number): string {
  const payload = `${storageKey}:${expiresAtUnix}`;
  return crypto.createHmac("sha256", STORAGE_SIGNING_SECRET).update(payload).digest("hex");
}

/**
 * Validates a signed URL token and expiration.
 */
export function verifySignedToken(
  storageKey: string,
  expiresAtUnix: number,
  token: string
): boolean {
  if (Date.now() > expiresAtUnix * 1000) {
    return false; // Expired
  }
  const expectedToken = generateSignedToken(storageKey, expiresAtUnix);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

/**
 * Creates a URL for a storage key.
 * For Cloudflare R2, returns the CDN URL directly.
 */
export async function createSignedUrl(
  storageKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!storageKey) return "";

  // 1. If storageKey is already an external URL or data URI, return as-is
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://") || storageKey.startsWith("data:")) {
    return storageKey;
  }

  // 2. Return public Cloudflare R2 CDN URL
  const cleanKey = storageKey.replace(/^\/+/, "");
  try {
    return getR2PublicUrl(cleanKey);
  } catch {
    // 3. Fallback: Local Cryptographic Signed URL
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = generateSignedToken(cleanKey, expiresAtUnix);
    return `/api/storage/file/${cleanKey}?expires=${expiresAtUnix}&token=${token}`;
  }
}

/**
 * Saves a binary buffer to Cloudflare R2 Storage with local disk backup.
 */
export async function uploadToStorage(
  storageKey: string,
  buffer: Buffer,
  contentType: string = "image/jpeg"
): Promise<{ success: boolean; key: string; sizeBytes: number; publicUrl?: string }> {
  const cleanKey = storageKey.replace(/^\/+/, "");
  const parts = cleanKey.split("/");
  const fileName = parts.pop() || cleanKey;
  const folderPath = parts.join("/");

  // 1. Upload to Cloudflare R2
  try {
    const r2Result = await uploadToR2Bucket(buffer, folderPath, fileName, contentType);
    if (r2Result.success) {
      return { success: true, key: cleanKey, sizeBytes: buffer.length, publicUrl: r2Result.publicUrl };
    }
  } catch (err) {
    console.warn("Notice: Cloudflare R2 upload warning, saving to local private storage:", err);
  }

  // 2. Local Private Storage fallback
  try {
    const absolutePath = path.join(LOCAL_STORAGE_DIR, cleanKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
    return { success: true, key: cleanKey, sizeBytes: buffer.length };
  } catch (localErr) {
    console.error("Critical: Storage write failed on both Cloudflare R2 and local disk:", localErr);
    throw new Error(`Failed to store object: ${cleanKey}`);
  }
}

/**
 * Retrieves an object's binary buffer from Cloudflare R2 or local disk.
 */
export async function downloadFromStorage(storageKey: string): Promise<Buffer | null> {
  const cleanKey = storageKey.replace(/^\/+/, "");

  // 1. Check Cloudflare R2 via public URL
  try {
    const publicUrl = getR2PublicUrl(cleanKey);
    const res = await fetch(publicUrl);
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  } catch {
    // fallback to local
  }

  // 2. Check Local Private Storage
  try {
    const absolutePath = path.join(LOCAL_STORAGE_DIR, cleanKey);
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
}

/**
 * Checks if an object exists in Cloudflare R2 or local disk.
 */
export async function storageObjectExists(storageKey: string): Promise<boolean> {
  const cleanKey = storageKey.replace(/^\/+/, "");

  try {
    const publicUrl = getR2PublicUrl(cleanKey);
    const res = await fetch(publicUrl, { method: "HEAD" });
    if (res.ok) return true;
  } catch {
    // fallback
  }

  try {
    const absolutePath = path.join(LOCAL_STORAGE_DIR, cleanKey);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes an object from Cloudflare R2 and local disk.
 */
export async function deleteFromStorage(storageKey: string): Promise<boolean> {
  const cleanKey = extractR2StorageKey(storageKey) || storageKey.replace(/^\/+/, "");
  let deletedAny = false;

  // 1. Delete from Cloudflare R2
  try {
    const res = await deleteFromR2Bucket(cleanKey);
    if (res.success) deletedAny = true;
  } catch {
    // ignore
  }

  // 2. Delete from local disk
  try {
    const absolutePath = path.join(LOCAL_STORAGE_DIR, cleanKey);
    await fs.unlink(absolutePath);
    deletedAny = true;
  } catch {
    // ignore if doesn't exist
  }

  return deletedAny;
}

/**
 * Scans and lists all objects in the Cloudflare R2 bucket + local cache.
 */
export async function listAllStorageObjects(): Promise<StorageObjectMeta[]> {
  const objects: StorageObjectMeta[] = [];

  // 1. Cloudflare R2 listing
  try {
    const r2Files = await listAllR2StorageFileKeys("");
    for (const item of r2Files) {
      objects.push({
        key: item.key,
        sizeBytes: item.size,
        lastModified: item.lastModified || new Date(),
        mimeType: "image/jpeg",
        tier: detectTier(item.key),
      });
    }
  } catch (err) {
    console.warn("Notice: Cloudflare R2 list objects failed, using local storage list:", err);
  }

  // 2. Local Private Storage listing
  try {
    async function scanDir(dir: string, baseDir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath, baseDir);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const relativeKey = path.relative(baseDir, fullPath).replace(/\\/g, "/");
          // Avoid duplicates if already listed from R2
          if (!objects.some((o) => o.key === relativeKey)) {
            objects.push({
              key: relativeKey,
              sizeBytes: stats.size,
              lastModified: stats.mtime,
              mimeType: "image/jpeg",
              tier: detectTier(relativeKey),
            });
          }
        }
      }
    }

    try {
      await fs.access(LOCAL_STORAGE_DIR);
      await scanDir(LOCAL_STORAGE_DIR, LOCAL_STORAGE_DIR);
    } catch {
      // directory does not exist yet
    }
  } catch (err) {
    console.warn("Notice: Local directory scanning warning:", err);
  }

  return objects;
}

function detectTier(key: string): "original" | "preview" | "thumbnail" | "qr" | "other" {
  const lower = key.toLowerCase();
  if (lower.includes("thumb")) return "thumbnail";
  if (lower.includes("prev")) return "preview";
  if (lower.includes("orig")) return "original";
  if (lower.includes("qr")) return "qr";
  return "other";
}

/**
 * Enterprise Multi-Tier Photo Pipeline:
 * Generates:
 * 1. Thumbnail: 120×160 (Fast list loading, low bandwidth, ~8-15 KB)
 * 2. Preview: 360×480 (Card inspection, normal viewing, ~40-60 KB)
 * 3. Original: 600×800 (High-definition print & ID card generation, ~100-140 KB)
 */
export async function processAndStoreMultiTierPhoto(
  inputBuffer: Buffer,
  studentId: string
): Promise<MultiTierPhotoResult> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch {
    throw new Error("Invalid or corrupted image file structure.");
  }

  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error("Image payload must be a genuine JPEG, PNG, or WEBP binary.");
  }

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const baseKey = `students/${studentId}/${timestamp}_${randomSuffix}`;

  // 1. Generate Original Tier (max 600×800 portrait, 90 quality)
  const originalBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(600, 800, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  // 2. Generate Preview Tier (360×480 portrait, 85 quality)
  const previewBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(360, 480, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  // 3. Generate Thumbnail Tier (120×160 portrait, 75 quality)
  const thumbBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(120, 160, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  const originalKey = `${baseKey}_orig.jpg`;
  const previewKey = `${baseKey}_prev.jpg`;
  const thumbnailKey = `${baseKey}_thumb.jpg`;

  // Upload all 3 tiers in parallel to Cloudflare R2
  await Promise.all([
    uploadToStorage(originalKey, originalBuffer, "image/jpeg"),
    uploadToStorage(previewKey, previewBuffer, "image/jpeg"),
    uploadToStorage(thumbnailKey, thumbBuffer, "image/jpeg"),
  ]);

  const [originalUrl, previewUrl, thumbnailUrl] = await Promise.all([
    createSignedUrl(originalKey, 3600),
    createSignedUrl(previewKey, 3600),
    createSignedUrl(thumbnailKey, 3600),
  ]);

  const origMeta = await sharp(originalBuffer).metadata();

  return {
    storageKey: previewKey,
    originalKey,
    previewKey,
    thumbnailKey,
    originalUrl,
    previewUrl,
    thumbnailUrl,
    fileSizeBytes: originalBuffer.length + previewBuffer.length + thumbBuffer.length,
    width: origMeta.width || 600,
    height: origMeta.height || 800,
    format: "jpeg",
  };
}
