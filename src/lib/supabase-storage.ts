// ============================================================================
// STUDENT BRIDGE — STORAGE REDIRECT TO CLOUDFLARE R2
// Supabase storage has been completely decoupled. All calls route to Cloudflare R2.
// ============================================================================

import {
  uploadToR2Bucket,
  extractR2StorageKey,
  deleteFromR2Bucket,
  deleteMultipleFromR2Bucket,
  listAllR2StorageFileKeys,
  purgeAllR2StorageObjects,
  getR2StorageStats,
  invalidateR2StorageCache,
  R2StorageStats,
  R2FolderStat,
} from "./r2-storage";

export interface SupabaseStorageUploadResult {
  success: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
}

export interface SupabaseFolderStat extends R2FolderStat {}
export interface SupabaseStorageStats extends R2StorageStats {}

export async function uploadToSupabaseBucket(
  buffer: Buffer | Uint8Array,
  folderPath: string,
  fileName: string,
  contentType = "image/jpeg"
): Promise<SupabaseStorageUploadResult> {
  const res = await uploadToR2Bucket(buffer, folderPath, fileName, contentType);
  return {
    success: res.success,
    publicUrl: res.publicUrl,
    key: res.key,
    error: res.error,
  };
}

export function extractSupabaseStorageKey(urlOrPath: string | null | undefined): string | null {
  return extractR2StorageKey(urlOrPath);
}

export async function deleteMultipleFromSupabaseBucket(paths: string[]) {
  return deleteMultipleFromR2Bucket(paths);
}

export async function deleteFromSupabaseBucket(cleanPath: string) {
  return deleteFromR2Bucket(cleanPath);
}

export async function listSupabaseStorageFiles(prefix = "") {
  return listAllR2StorageFileKeys(prefix);
}

export async function listAllSupabaseStorageFilePaths(prefix = "") {
  const files = await listAllR2StorageFileKeys(prefix);
  return files.map((f) => f.key);
}

export async function purgeAllSupabaseStorageObjects() {
  return purgeAllR2StorageObjects();
}

export function invalidateSupabaseStorageCache(): void {
  invalidateR2StorageCache();
}

export async function getSupabaseStorageStats(forceRefresh = false): Promise<SupabaseStorageStats> {
  return getR2StorageStats(forceRefresh);
}
