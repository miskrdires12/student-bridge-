// ============================================================================
// STUDENT BRIDGE — ENTERPRISE PRIVATE STORAGE SERVICE & MULTI-TIER RESOLUTION
// Private Supabase Storage with cryptographic HMAC signed URLs, multi-tier
// asset processing (Thumbnail, Preview, Original), and resilient local fallback.
// ============================================================================

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "student data";
const ENCODED_BUCKET = encodeURIComponent(BUCKET_NAME);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
 * Creates a time-limited signed URL for a private storage key.
 * Default expiration: 3600 seconds (1 hour).
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

  // 2. Supabase Storage Signed URL API
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const cleanKey = storageKey.replace(/^\/+/, "");
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/${ENCODED_BUCKET}/${encodeURI(cleanKey)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            apiKey: SUPABASE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiresIn: expiresInSeconds }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.signedURL) {
          return `${SUPABASE_URL}/storage/v1${json.signedURL}`;
        }
      }
    } catch (supabaseErr) {
      console.warn("Notice: Supabase signed URL generation failed, using local signed token:", supabaseErr);
    }
  }

  // 3. Fallback: Local Cryptographic Signed URL
  const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const cleanKey = storageKey.replace(/^\/+/, "");
  const token = generateSignedToken(cleanKey, expiresAtUnix);

  return `/api/storage/file/${cleanKey}?expires=${expiresAtUnix}&token=${token}`;
}

/**
 * Saves a binary buffer to private storage (Supabase Storage with local filesystem fallback).
 */
export async function uploadToStorage(
  storageKey: string,
  buffer: Buffer,
  contentType: string = "image/jpeg"
): Promise<{ success: boolean; key: string; sizeBytes: number }> {
  const cleanKey = storageKey.replace(/^\/+/, "");

  // 1. Attempt upload to Supabase Storage if configured
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${ENCODED_BUCKET}/${encodeURI(cleanKey)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apiKey: SUPABASE_KEY,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
      });

      if (res.ok) {
        return { success: true, key: cleanKey, sizeBytes: buffer.length };
      }
    } catch (err) {
      console.warn("Notice: Supabase storage upload failed, saving to local private storage:", err);
    }
  }

  // 2. Local Private Storage fallback
  try {
    const absolutePath = path.join(LOCAL_STORAGE_DIR, cleanKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
    return { success: true, key: cleanKey, sizeBytes: buffer.length };
  } catch (localErr) {
    console.error("Critical: Storage write failed on both Supabase and local disk:", localErr);
    throw new Error(`Failed to store object: ${cleanKey}`);
  }
}

/**
 * Retrieves an object's binary buffer from private storage.
 */
export async function downloadFromStorage(storageKey: string): Promise<Buffer | null> {
  const cleanKey = storageKey.replace(/^\/+/, "");

  // 1. Check Supabase Storage
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${ENCODED_BUCKET}/${encodeURI(cleanKey)}`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apiKey: SUPABASE_KEY,
        },
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // fallback
    }
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
 * Checks if an object exists in private storage.
 */
export async function storageObjectExists(storageKey: string): Promise<boolean> {
  const cleanKey = storageKey.replace(/^\/+/, "");

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/info/${ENCODED_BUCKET}/${encodeURI(cleanKey)}`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apiKey: SUPABASE_KEY,
        },
      });
      if (res.ok) return true;
    } catch {
      // fallback
    }
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
 * Deletes an object from private storage.
 */
export async function deleteFromStorage(storageKey: string): Promise<boolean> {
  let cleanKey = storageKey.replace(/^\/+/, "");
  try {
    const decoded = decodeURIComponent(cleanKey);
    const bucketMarker = "/student data/";
    const idx = decoded.indexOf(bucketMarker);
    if (idx !== -1) {
      cleanKey = decoded.slice(idx + bucketMarker.length).replace(/^\/+/, "");
    } else if (cleanKey.includes("student%20data/")) {
      cleanKey = decodeURIComponent(cleanKey.split("student%20data/")[1]);
    } else if (cleanKey.startsWith("storage/v1/object/public/")) {
      cleanKey = cleanKey.replace(/^storage\/v1\/object\/public\/[^/]+\//, "");
      cleanKey = decodeURIComponent(cleanKey);
    }
  } catch {}

  let deletedAny = false;

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${ENCODED_BUCKET}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apiKey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: [cleanKey] }),
      });
      if (res.ok) deletedAny = true;
    } catch {
      // fallback
    }
  }

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
 * Scans and lists all objects in the private storage bucket.
 * Essential for Orphaned Storage Detection and Storage Quota calculation.
 */
export async function listAllStorageObjects(): Promise<StorageObjectMeta[]> {
  const objects: StorageObjectMeta[] = [];

  // 1. Supabase Storage listing
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${ENCODED_BUCKET}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apiKey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 10000, offset: 0, sortBy: { column: "created_at", order: "desc" } }),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list) {
            objects.push({
              key: item.name,
              sizeBytes: item.metadata?.size || 0,
              lastModified: item.updated_at ? new Date(item.updated_at) : new Date(item.created_at || Date.now()),
              mimeType: item.metadata?.mimetype || "image/jpeg",
              tier: detectTier(item.name),
            });
          }
        }
      }
    } catch (err) {
      console.warn("Notice: Supabase list objects failed, using local storage list:", err);
    }
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
          // Avoid duplicates if already listed from Supabase
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
 *
 * Saves each tier into private storage with namespaced keys and returns signed URLs.
 */
export async function processAndStoreMultiTierPhoto(
  inputBuffer: Buffer,
  studentId: string
): Promise<MultiTierPhotoResult> {
  // Validate image magic numbers
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

  // Upload all 3 tiers in parallel to private storage
  await Promise.all([
    uploadToStorage(originalKey, originalBuffer, "image/jpeg"),
    uploadToStorage(previewKey, previewBuffer, "image/jpeg"),
    uploadToStorage(thumbnailKey, thumbBuffer, "image/jpeg"),
  ]);

  // Generate initial signed URLs (1 hour TTL)
  const [originalUrl, previewUrl, thumbnailUrl] = await Promise.all([
    createSignedUrl(originalKey, 3600),
    createSignedUrl(previewKey, 3600),
    createSignedUrl(thumbnailKey, 3600),
  ]);

  const origMeta = await sharp(originalBuffer).metadata();

  return {
    storageKey: previewKey, // Primary displayed key is preview for bandwidth optimization
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
