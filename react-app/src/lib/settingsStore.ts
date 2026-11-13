// ============================================================================
// STUDENT BRIDGE — UNIFIED SETTINGS STORE & PERSISTENCE ENGINE
// Centralized enterprise configuration management for all stations & roles
// ============================================================================

import { R2_PUBLIC_BASE_URL } from './syncEngine';

export interface AppSettings {
  // General & Campus Defaults
  defaultBranch: 'Addis Ababa' | 'Adama' | 'Mojo' | 'Harar';
  defaultSchool: string;
  defaultGrade: string;
  defaultSection: string;
  autoFormatPhone: boolean;
  phonePrefix: string;

  // Biometric Studio & Camera
  cameraGuideMode: 'oval' | 'grid' | 'crosshair' | 'minimal';
  defaultCameraFacing: 'user' | 'environment';
  photoResolution: '1280x720' | '1920x1080' | '640x480';
  photoQuality: number; // 0.85 default
  photoCompressionFormat: 'image/webp' | 'image/jpeg';
  biometricChimeEnabled: boolean;
  autoCropEnabled: boolean;
  autoResetFormAfterSubmit: boolean;

  // ID Card Production & Directory
  printDpi: '300dpi' | '600dpi';
  includeCropMarks: boolean;
  zipExportConvention: string;
  csvDelimiter: ',' | ';';
  tablePageSize: number;

  // Cloudflare R2 & Edge Infrastructure
  r2BucketName: string;
  r2PublicCdnUrl: string;
  storageSyncIntervalMs: number;

  // Security & Terminal Locks
  hardwareLockEnforced: boolean;
  sessionTimeoutMinutes: number;
  requireAuditLogs: boolean;

  // Preferences & Appearance
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultBranch: 'Addis Ababa',
  defaultSchool: 'YMS',
  defaultGrade: 'Grade 10',
  defaultSection: 'A',
  autoFormatPhone: true,
  phonePrefix: '+251',

  cameraGuideMode: 'oval',
  defaultCameraFacing: 'user',
  photoResolution: '1280x720',
  photoQuality: 0.88,
  photoCompressionFormat: 'image/webp',
  biometricChimeEnabled: true,
  autoCropEnabled: true,
  autoResetFormAfterSubmit: true,

  printDpi: '300dpi',
  includeCropMarks: true,
  zipExportConvention: 'School/Grade/ID_Name.jpg',
  csvDelimiter: ',',
  tablePageSize: 100,

  r2BucketName: 'siliconlabs',
  r2PublicCdnUrl: R2_PUBLIC_BASE_URL,
  storageSyncIntervalMs: 4000,

  hardwareLockEnforced: true,
  sessionTimeoutMinutes: 120,
  requireAuditLogs: true,

  theme: 'system',
  compactMode: false,
};

const SETTINGS_STORAGE_KEY = 'sb_enterprise_settings';

export function getAppSettings(): AppSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_APP_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[SettingsStore] Failed reading settings, using defaults', err);
    return DEFAULT_APP_SETTINGS;
  }
}

export function updateAppSettings(partial: Partial<AppSettings>): AppSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_APP_SETTINGS, ...partial };
  }
  try {
    const current = getAppSettings();
    const updated = { ...current, ...partial };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Also sync legacy keys for backwards-compatibility with specific sub-components
    if (partial.r2BucketName) localStorage.setItem('sb_r2_bucket', partial.r2BucketName);
    if (partial.r2PublicCdnUrl) localStorage.setItem('sb_r2_cdn_url', partial.r2PublicCdnUrl);

    window.dispatchEvent(new CustomEvent('studentbridge_settings_change', { detail: updated }));
    window.dispatchEvent(new Event('storage'));
    return updated;
  } catch (err) {
    console.error('[SettingsStore] Failed updating settings', err);
    return getAppSettings();
  }
}

export function resetAppSettings(): AppSettings {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('studentbridge_settings_change', { detail: DEFAULT_APP_SETTINGS }));
    window.dispatchEvent(new Event('storage'));
  }
  return DEFAULT_APP_SETTINGS;
}

export function exportSettingsJson(): string {
  const settings = getAppSettings();
  return JSON.stringify(settings, null, 2);
}

export function importSettingsJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) return false;
    updateAppSettings(parsed);
    return true;
  } catch {
    return false;
  }
}
