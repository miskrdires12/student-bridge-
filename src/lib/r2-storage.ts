// ============================================================================
// STUDENT BRIDGE — CLOUDFLARE R2 STORAGE MANAGER
// Bucket: 'siliconlabs'
// High-performance S3-compatible cloud object storage with zero egress fees
// CDN: pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev
// Organized cleanly into folders: [Grade]/[StudentID]_[FullName].jpg
// ============================================================================

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";


export interface R2StorageUploadResult {
  success: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
}

export interface R2FolderStat {
  name: string;
  fileCount: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface R2StorageStats {
  bucketName: string;
  accountId: string;
  publicBaseUrl: string;
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  folders: R2FolderStat[];
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "siliconlabs";
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "a5b6150294de0fedb8e0cd789114b939";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "027a4326e81560169769fa980c0e8f1f";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "7c70dd1d4a42bcb96da463e2ae5756713b4d1fceefe00241393182d8bf926ed6";
const ENDPOINT = process.env.R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || "https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev").replace(/\/+$/, "");

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Builds the public CDN URL for an object key stored in Cloudflare R2
 */
export function getR2PublicUrl(key: string): string {
  const sanitizedKey = key.replace(/^\/+/, "");
  // Encode URI components safely (avoiding double-encoding already encoded parts)
  const encodedParts = sanitizedKey.split("/").map((part) => encodeURIComponent(decodeURIComponent(part)));
  return `${PUBLIC_BASE_URL}/${encodedParts.join("/")}`;
}

/**
 * Uploads an image buffer or file to Cloudflare R2 bucket 'siliconlabs'
 */
export async function uploadToR2Bucket(
  buffer: Buffer | Uint8Array,
  folderPath: string,
  fileName: string,
  contentType = "image/jpeg"
): Promise<R2StorageUploadResult> {
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    return {
      success: false,
      error: "Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing",
    };
  }

  const client = getR2Client();
  const sanitizedFolder = folderPath.replace(/^[/\\]+|[/\\]+$/g, "");
  const cleanKey = sanitizedFolder ? `${sanitizedFolder}/${fileName}` : fileName;

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      });

      await client.send(command);
      const publicUrl = getR2PublicUrl(cleanKey);

      console.log(`[Cloudflare R2] ✓ Uploaded: ${cleanKey} -> ${publicUrl}`);
      invalidateR2StorageCache();

      return {
        success: true,
        publicUrl,
        key: cleanKey,
      };
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[Cloudflare R2] Upload attempt ${attempt}/3 failed for ${cleanKey}: ${lastError}`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError || "Failed to upload to Cloudflare R2",
  };
}

/**
 * Extracts the storage key (e.g. "Grade 10/STU001_Name.jpg") from any Cloudflare R2,
 * public CDN URL, Supabase legacy URL, or relative path.
 */
export function extractR2StorageKey(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("data:") || urlOrPath.startsWith("blob:")) return null;

  try {
    let clean = decodeURIComponent(urlOrPath.split("?")[0]);

    // 1. Check if public R2 CDN url
    const publicUrlNoProto = PUBLIC_BASE_URL.replace(/^https?:\/\//, "");
    if (clean.includes(publicUrlNoProto)) {
      const idx = clean.indexOf(publicUrlNoProto);
      return clean.slice(idx + publicUrlNoProto.length).replace(/^\/+/, "");
    }

    // 2. Check if .r2.dev or r2.cloudflarestorage.com
    const r2DevMatch = clean.match(/pub-[a-zA-Z0-9]+\.r2\.dev\/(.*)/);
    if (r2DevMatch && r2DevMatch[1]) {
      return r2DevMatch[1].replace(/^\/+/, "");
    }

    const r2EndpointMatch = clean.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.*)/);
    if (r2EndpointMatch && r2EndpointMatch[1]) {
      return r2EndpointMatch[1].replace(/^\/+/, "");
    }

    // 3. Fallback: Supabase Storage marker (for backwards-compatibility during migration)
    const bucketMarker = "/student data/";
    const markerIdx = clean.indexOf(bucketMarker);
    if (markerIdx !== -1) {
      return clean.slice(markerIdx + bucketMarker.length).replace(/^\/+/, "");
    }
    const publicMarker = "/object/public/";
    const pubIdx = clean.indexOf(publicMarker);
    if (pubIdx !== -1) {
      const remainder = clean.slice(pubIdx + publicMarker.length).replace(/^\/+/, "");
      if (remainder.startsWith("student data/")) {
        return remainder.slice("student data/".length);
      }
      return remainder;
    }

    // 4. If already a relative path inside bucket (e.g. "Grade 10/STU001.jpg")
    if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/api/")) {
      return clean.replace(/^\/+/, "");
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Deletes a single object from Cloudflare R2 bucket
 */
export async function deleteFromR2Bucket(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client();
    const cleanKey = key.replace(/^\/+/, "");

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });

    await client.send(command);
    console.log(`[Cloudflare R2] ✓ Deleted: ${cleanKey}`);
    invalidateR2StorageCache();

    return { success: true };
  } catch (err: any) {
    console.error(`[Cloudflare R2] Failed to delete ${key}:`, err);
    return { success: false, error: err?.message || "Failed to delete from Cloudflare R2" };
  }
}

/**
 * Deletes multiple objects in bulk from Cloudflare R2 bucket
 */
export async function deleteMultipleFromR2Bucket(
  keys: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const cleanKeys = Array.from(new Set(keys.map((k) => k.replace(/^\/+/, "")).filter(Boolean)));
  if (cleanKeys.length === 0) return { success: true, deletedCount: 0 };

  try {
    const client = getR2Client();
    let deletedCount = 0;

    // S3 DeleteObjects supports up to 1000 keys per request
    const chunkSize = 1000;
    for (let i = 0; i < cleanKeys.length; i += chunkSize) {
      const chunk = cleanKeys.slice(i, i + chunkSize);
      const command = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: chunk.map((k) => ({ Key: k })),
          Quiet: true,
        },
      });

      const response = await client.send(command);
      if (response.Errors && response.Errors.length > 0) {
        console.warn(`[Cloudflare R2] Delete errors in batch:`, response.Errors);
      }
      deletedCount += chunk.length - (response.Errors?.length || 0);
    }

    invalidateR2StorageCache();
    console.log(`[Cloudflare R2] ✓ Batch deleted ${deletedCount} objects`);
    return { success: true, deletedCount };
  } catch (err: any) {
    console.error("[Cloudflare R2] Batch delete error:", err);
    return { success: false, deletedCount: 0, error: err?.message || "Failed to batch delete from R2" };
  }
}

/**
 * Lists objects inside Cloudflare R2 bucket with optional prefix
 */
export async function listR2StorageFiles(prefix = "", maxKeys = 1000): Promise<Array<{ key: string; size: number; lastModified?: Date }>> {
  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix ? prefix.replace(/^\/+/, "") : undefined,
      MaxKeys: maxKeys,
    });

    const response = await client.send(command);
    if (!response.Contents) return [];

    return response.Contents.map((item) => ({
      key: item.Key || "",
      size: item.Size || 0,
      lastModified: item.LastModified,
    }));
  } catch (err) {
    console.error("[Cloudflare R2] listR2StorageFiles error:", err);
    return [];
  }
}

/**
 * Recursively lists all object keys across the entire R2 bucket (handles pagination)
 */
export async function listAllR2StorageFileKeys(prefix = ""): Promise<Array<{ key: string; size: number; lastModified?: Date }>> {
  try {
    const client = getR2Client();
    let continuationToken: string | undefined = undefined;
    const allFiles: Array<{ key: string; size: number; lastModified?: Date }> = [];

    do {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix ? prefix.replace(/^\/+/, "") : undefined,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response: ListObjectsV2CommandOutput = await client.send(command);
      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            allFiles.push({
              key: item.Key,
              size: item.Size || 0,
              lastModified: item.LastModified,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return allFiles;
  } catch (err) {
    console.error("[Cloudflare R2] listAllR2StorageFileKeys error:", err);
    return [];
  }
}

/**
 * Permanently purges all objects inside the Cloudflare R2 'siliconlabs' bucket
 */
export async function purgeAllR2StorageObjects(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const allFiles = await listAllR2StorageFileKeys("");
    if (allFiles.length === 0) {
      return { success: true, count: 0 };
    }

    const keys = allFiles.map((f) => f.key);
    const result = await deleteMultipleFromR2Bucket(keys);
    return {
      success: result.success,
      count: result.deletedCount,
      error: result.error,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err?.message,
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

let cachedR2Stats: { data: R2StorageStats; timestamp: number } | null = null;

export function invalidateR2StorageCache(): void {
  cachedR2Stats = null;
}

/**
 * Scans Cloudflare R2 bucket 'siliconlabs' and aggregates total files, total size in bytes/MB,
 * and folder-by-folder breakdown. Cached for 15 seconds.
 */
export async function getR2StorageStats(forceRefresh = false): Promise<R2StorageStats> {
  const now = Date.now();
  if (!forceRefresh && cachedR2Stats && now - cachedR2Stats.timestamp < 15000) {
    return cachedR2Stats.data;
  }

  const allItems = await listAllR2StorageFileKeys("");

  let grandTotalFiles = 0;
  let grandTotalBytes = 0;
  const folderMap = new Map<string, { count: number; bytes: number }>();

  for (const item of allItems) {
    grandTotalFiles++;
    grandTotalBytes += item.size;

    // Detect top-level folder name (e.g. "Grade 10/file.jpg" -> "Grade 10")
    const slashIdx = item.key.indexOf("/");
    const folderName = slashIdx !== -1 ? item.key.substring(0, slashIdx) : "root";

    const current = folderMap.get(folderName) || { count: 0, bytes: 0 };
    current.count++;
    current.bytes += item.size;
    folderMap.set(folderName, current);
  }

  const folders: R2FolderStat[] = Array.from(folderMap.entries())
    .map(([name, stat]) => ({
      name,
      fileCount: stat.count,
      sizeBytes: stat.bytes,
      sizeFormatted: formatBytes(stat.bytes),
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  const stats: R2StorageStats = {
    bucketName: BUCKET_NAME,
    accountId: ACCOUNT_ID,
    publicBaseUrl: PUBLIC_BASE_URL,
    totalFiles: grandTotalFiles,
    totalSizeBytes: grandTotalBytes,
    totalSizeFormatted: formatBytes(grandTotalBytes),
    folders,
  };

  cachedR2Stats = { data: stats, timestamp: now };
  return stats;
}
