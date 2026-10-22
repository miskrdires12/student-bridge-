import React, { useState, useEffect } from 'react';
import {
  Settings, Save, CheckCircle2, Shield, HardDrive, Key,
  Globe, Database, Sliders, RotateCcw, Download, Upload,
  Building2, Phone, Camera, Check, AlertTriangle, RefreshCw,
  FolderOpen, QrCode, Target
} from 'lucide-react';
import { getAppSettings, updateAppSettings, resetAppSettings, exportSettingsJson, importSettingsJson, AppSettings } from '@/lib/settingsStore';
import { DEFAULT_BRANCHES, getAuthHeaders, refreshPlatformSettings } from '@/lib/store';

const DEFAULT_PHOTO_PATH_TEMPLATE = '{grade}/{name}.jpg';
const DEFAULT_EXPORT_PHOTO_TEMPLATE = '{name}.jpg';
const DEFAULT_EXPORT_QR_TEMPLATE = '{id}_qr.png';
const DEFAULT_EXPORT_BASE_FOLDER = 'C:\\Users\\Administrator\\Desktop\\yekaelementry';
const PATH_TOKEN_RE = /\{(?:grade|name|id)\}/i;
const PATH_ALLOWED_RE = /^[A-Za-z0-9_.\-/{}]+$/;
const SAMPLE_PATH_VALUES: Record<string, string> = { grade: '9A', name: 'Sila-Bekeri', id: 'SB-1024' };

function photoPathPreview(template: string): string {
  return template.replace(/\{(grade|name|id)\}/gi, (_match, token: string) => SAMPLE_PATH_VALUES[token.toLowerCase()] ?? '');
}

function exportPathPreview(baseFolder: string, template: string, ext: 'jpg' | 'png'): string {
  const rel = photoPathPreview(template || `{name}.${ext}`);
  const folder = (baseFolder || '').trim();
  if (!folder) return rel;
  return `${folder}${/[\\/]+$/.test(folder) ? '' : '\\'}${rel}`;
}

interface PlatformSettings {
  photoPathTemplate?: string;
  syncSchool?: string;
  exportPhotoTemplate?: string;
  exportQrTemplate?: string;
  exportBaseFolderPhoto?: string;
  exportBaseFolderQr?: string;
  senderDailyTarget?: number;
  updatedAt?: string | null;
  error?: string;
}

export const SuperAdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [activeTab, setActiveTab] = useState<'cloud' | 'security' | 'branches' | 'biometrics' | 'backup'>('cloud');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cloud Photo Storage Path — platform settings persisted in R2 via the edge
  const [photoPathTemplate, setPhotoPathTemplate] = useState(DEFAULT_PHOTO_PATH_TEMPLATE);
  const [syncSchool, setSyncSchool] = useState('Warka');
  const [platformUpdatedAt, setPlatformUpdatedAt] = useState<string | null>(null);
  const [edgeOffline, setEdgeOffline] = useState(false);
  const [isSavingPlatform, setIsSavingPlatform] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);

  // Export Paths — folder references written into @photo / @qr of CSV & Excel downloads
  const [exportPhotoTemplate, setExportPhotoTemplate] = useState(DEFAULT_EXPORT_PHOTO_TEMPLATE);
  const [exportQrTemplate, setExportQrTemplate] = useState(DEFAULT_EXPORT_QR_TEMPLATE);
  const [exportBaseFolderPhoto, setExportBaseFolderPhoto] = useState(DEFAULT_EXPORT_BASE_FOLDER);
  const [exportBaseFolderQr, setExportBaseFolderQr] = useState(DEFAULT_EXPORT_BASE_FOLDER);
  const [senderDailyTarget, setSenderDailyTarget] = useState(50);

  const pathTemplateError = !PATH_ALLOWED_RE.test(photoPathTemplate)
    ? 'Invalid characters — only letters, digits and _ - . / { } are allowed.'
    : !PATH_TOKEN_RE.test(photoPathTemplate)
      ? 'Template must contain at least one token: {grade}, {name} or {id}.'
      : null;

  const exportTemplateError =
    [exportPhotoTemplate, exportQrTemplate].some(t => !PATH_TOKEN_RE.test(t))
      ? 'Export templates must contain at least one token: {grade}, {name} or {id}.'
      : [exportPhotoTemplate, exportQrTemplate].some(t => !PATH_ALLOWED_RE.test(t))
        ? 'Export templates allow only letters, digits and _ - . / { }.'
        : [exportBaseFolderPhoto, exportBaseFolderQr].some(f => f.length > 200 || /[<>"|\n\r]/.test(f))
          ? 'Base folders must stay under 200 characters without quotes or angle brackets.'
          : null;

  const targetError = (!Number.isInteger(senderDailyTarget) || senderDailyTarget < 1 || senderDailyTarget > 5000)
    ? 'Daily target must be an integer between 1 and 5000.'
    : null;

  const platformSaveBlocked = !!pathTemplateError || !!exportTemplateError || !!targetError;

  useEffect(() => {
    const handleUpdate = () => setSettings(getAppSettings());
    window.addEventListener('studentbridge_settings_change', handleUpdate);
    return () => window.removeEventListener('studentbridge_settings_change', handleUpdate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error(`edge status ${res.status}`);
        const data: PlatformSettings = await res.json();
        if (cancelled) return;
        if (typeof data.photoPathTemplate === 'string' && data.photoPathTemplate) setPhotoPathTemplate(data.photoPathTemplate);
        if (typeof data.syncSchool === 'string' && data.syncSchool) setSyncSchool(data.syncSchool);
        if (typeof data.exportPhotoTemplate === 'string' && data.exportPhotoTemplate) setExportPhotoTemplate(data.exportPhotoTemplate);
        if (typeof data.exportQrTemplate === 'string' && data.exportQrTemplate) setExportQrTemplate(data.exportQrTemplate);
        if (typeof data.exportBaseFolderPhoto === 'string') setExportBaseFolderPhoto(data.exportBaseFolderPhoto);
        if (typeof data.exportBaseFolderQr === 'string') setExportBaseFolderQr(data.exportBaseFolderQr);
        if (typeof data.senderDailyTarget === 'number' && data.senderDailyTarget > 0) setSenderDailyTarget(data.senderDailyTarget);
        setPlatformUpdatedAt(data.updatedAt ?? null);
        setEdgeOffline(false);
      } catch {
        if (!cancelled) setEdgeOffline(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFieldChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = updateAppSettings({ [key]: value });
    setSettings(updated);
    showToast(`Updated ${String(key)}.`);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateAppSettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Enterprise parameters saved and propagated to Cloudflare Edge.');
    }, 400);
  };

  const handleSavePlatformSettings = async () => {
    if (pathTemplateError) {
      setPlatformError(pathTemplateError);
      return;
    }
    if (exportTemplateError || targetError) {
      setPlatformError(exportTemplateError || targetError);
      return;
    }
    setIsSavingPlatform(true);
    setPlatformError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          photoPathTemplate: photoPathTemplate.trim(),
          syncSchool: syncSchool.trim(),
          exportPhotoTemplate: exportPhotoTemplate.trim(),
          exportQrTemplate: exportQrTemplate.trim(),
          exportBaseFolderPhoto: exportBaseFolderPhoto.trim(),
          exportBaseFolderQr: exportBaseFolderQr.trim(),
          senderDailyTarget: senderDailyTarget
        })
      });
      const data: PlatformSettings = await res.json().catch(() => ({ error: 'Malformed edge response.' } as PlatformSettings));
      if (!res.ok) {
        throw new Error(data.error || `Edge rejected settings (${res.status}).`);
      }
      if (typeof data.photoPathTemplate === 'string') setPhotoPathTemplate(data.photoPathTemplate);
      if (typeof data.syncSchool === 'string') setSyncSchool(data.syncSchool);
      if (typeof data.exportPhotoTemplate === 'string') setExportPhotoTemplate(data.exportPhotoTemplate);
      if (typeof data.exportQrTemplate === 'string') setExportQrTemplate(data.exportQrTemplate);
      if (typeof data.exportBaseFolderPhoto === 'string') setExportBaseFolderPhoto(data.exportBaseFolderPhoto);
      if (typeof data.exportBaseFolderQr === 'string') setExportBaseFolderQr(data.exportBaseFolderQr);
      if (typeof data.senderDailyTarget === 'number') setSenderDailyTarget(data.senderDailyTarget);
      setPlatformUpdatedAt(data.updatedAt ?? null);
      setEdgeOffline(false);
      await refreshPlatformSettings().catch(() => {});
      showToast('Photo path & export paths saved to R2 platform settings.');
    } catch (err) {
      setPlatformError(err instanceof Error ? err.message : 'Failed to save platform settings.');
    } finally {
      setIsSavingPlatform(false);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportSettingsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudentBridge_Enterprise_Config_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Configuration backup exported.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importSettingsJson(content)) {
        setSettings(getAppSettings());
        showToast('Configuration restored successfully from file.');
      } else {
        showToast('Invalid configuration file.');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    if (confirm('🚨 FACTORY RESET: Reset ALL enterprise configuration parameters to official presets?')) {
      const reset = resetAppSettings();
      setSettings(reset);
      showToast('All parameters restored to factory defaults.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-14 font-mono select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0] dark:border-[#223126]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="text-[#366804] dark:text-[#8fe617] font-bold">SUPER ADMIN CONSOLE</span>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">ENTERPRISE SYSTEM PARAMETERS</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1118] dark:text-white flex items-center gap-2">
            Super Admin Enterprise Parameters
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cloudflare R2 endpoints, zero-egress bindings, 1-device security locks, and regional branch policies
          </p>
        </div>

        <span className="text-xs font-mono text-[#256002] dark:text-[#8fe617] bg-[#85E510]/15 px-3 py-1.5 rounded-xl font-bold border border-[#85E510]/30 shrink-0 self-start sm:self-auto">
          Config Rev 2.5 (Active)
        </span>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#256002] dark:text-[#8fe617] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#85E510]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CLOUD PHOTO STORAGE PATH — R2-persisted platform settings          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111613] border border-[#8fe617]/30 dark:border-[#8fe617]/25 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cloud Photo Storage Path</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">R2 object key layout &amp; sync scope — persisted at the edge, served Live</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
            Last updated: {platformUpdatedAt ? platformUpdatedAt : 'Never (defaults)'}
          </span>
        </div>

        {edgeOffline && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Edge offline — showing local defaults. Saving requires connectivity.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
            <label htmlFor="photo-path-template" className="block text-slate-400 uppercase font-bold text-[10px]">Photo Path Template</label>
            <input
              id="photo-path-template"
              type="text"
              value={photoPathTemplate}
              onChange={(e) => { setPhotoPathTemplate(e.target.value); setPlatformError(null); }}
              className={`w-full bg-white dark:bg-[#111613] border rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white ${
                pathTemplateError ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-800'
              }`}
              placeholder={DEFAULT_PHOTO_PATH_TEMPLATE}
            />
            <p className="text-[10px] text-slate-500">
              Tokens: <span className="font-bold text-[#256002] dark:text-[#8fe617]">{'{grade}'}</span>,{' '}
              <span className="font-bold text-[#256002] dark:text-[#8fe617]">{'{name}'}</span>,{' '}
              <span className="font-bold text-[#256002] dark:text-[#8fe617]">{'{id}'}</span> — at least one is required.
            </p>
            <div className="text-[10px] text-slate-500">
              Live example:{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">{photoPathPreview(pathTemplateError ? DEFAULT_PHOTO_PATH_TEMPLATE : photoPathTemplate)}</span>
            </div>
            {pathTemplateError && (
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{pathTemplateError}</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
            <label htmlFor="sync-school-scope" className="block text-slate-400 uppercase font-bold text-[10px]">Sync School Scope</label>
            <input
              id="sync-school-scope"
              type="text"
              value={syncSchool}
              onChange={(e) => { setSyncSchool(e.target.value); setPlatformError(null); }}
              className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white"
              placeholder="Warka"
            />
            <p className="text-[10px] text-slate-500">
              The native APK feed serves this school by default (<span className="font-bold">Warka</span> preset).
            </p>
          </div>
        </div>

        {/* ── EXPORT PATHS: @photo / @qr folder references in CSV & Excel ── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Export Paths</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Folder references written into the <span className="font-bold">@photo</span> and <span className="font-bold">@qr</span> columns of downloaded CSV &amp; Excel files.
                These are reference paths for the receiving computer's local folders — not server filesystem paths or URLs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <label htmlFor="export-photo-template" className="block text-slate-400 uppercase font-bold text-[10px]">Student Photo Path (@photo)</label>
              <input
                id="export-photo-template"
                type="text"
                value={exportPhotoTemplate}
                onChange={(e) => { setExportPhotoTemplate(e.target.value); setPlatformError(null); }}
                className={`w-full bg-white dark:bg-[#111613] border rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white ${
                  !PATH_TOKEN_RE.test(exportPhotoTemplate) || !PATH_ALLOWED_RE.test(exportPhotoTemplate) ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-800'
                }`}
                placeholder={DEFAULT_EXPORT_PHOTO_TEMPLATE}
              />
              <input
                type="text"
                aria-label="Photo base folder"
                value={exportBaseFolderPhoto}
                onChange={(e) => { setExportBaseFolderPhoto(e.target.value); setPlatformError(null); }}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                placeholder={DEFAULT_EXPORT_BASE_FOLDER}
              />
              <div className="text-[10px] text-slate-500">
                Result preview:{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">{exportPathPreview(exportBaseFolderPhoto, PATH_TOKEN_RE.test(exportPhotoTemplate) && PATH_ALLOWED_RE.test(exportPhotoTemplate) ? exportPhotoTemplate : DEFAULT_EXPORT_PHOTO_TEMPLATE, 'jpg')}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <label htmlFor="export-qr-template" className="block text-slate-400 uppercase font-bold text-[10px] flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> Student QR-Code Path (@qr)
              </label>
              <input
                id="export-qr-template"
                type="text"
                value={exportQrTemplate}
                onChange={(e) => { setExportQrTemplate(e.target.value); setPlatformError(null); }}
                className={`w-full bg-white dark:bg-[#111613] border rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white ${
                  !PATH_TOKEN_RE.test(exportQrTemplate) || !PATH_ALLOWED_RE.test(exportQrTemplate) ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-800'
                }`}
                placeholder={DEFAULT_EXPORT_QR_TEMPLATE}
              />
              <input
                type="text"
                aria-label="QR base folder"
                value={exportBaseFolderQr}
                onChange={(e) => { setExportBaseFolderQr(e.target.value); setPlatformError(null); }}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                placeholder={DEFAULT_EXPORT_BASE_FOLDER}
              />
              <div className="text-[10px] text-slate-500">
                Result preview:{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">{exportPathPreview(exportBaseFolderQr, PATH_TOKEN_RE.test(exportQrTemplate) && PATH_ALLOWED_RE.test(exportQrTemplate) ? exportQrTemplate : DEFAULT_EXPORT_QR_TEMPLATE, 'png')}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <label htmlFor="sender-daily-target" className="block text-slate-400 uppercase font-bold text-[10px] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Daily Registration Target / Sender
              </label>
              <input
                id="sender-daily-target"
                type="number"
                min={1}
                max={5000}
                value={senderDailyTarget}
                onChange={(e) => { setSenderDailyTarget(parseInt(e.target.value, 10)); setPlatformError(null); }}
                className={`w-full bg-white dark:bg-[#111613] border rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-white ${targetError ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-800'}`}
              />
              <p className="text-[10px] text-slate-500">Drives the target-progress bars in Telemetric Velocity &amp; Fleet and the dashboard.</p>
              {targetError && <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{targetError}</p>}
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-[10px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Folder layout</p>
              <p>Templates support <span className="font-bold text-[#256002] dark:text-[#8fe617]">{'{grade}'} {'{name}'} {'{id}'}</span> — e.g. <span className="font-mono">Photos/{'{grade}'}/{'{id}'}.jpg</span> or <span className="font-mono">QR/{'{grade}'}/{'{id}'}.png</span> for grade-based folders, or a flat layout like <span className="font-mono">{'{id}'}.jpg</span>.</p>
              <p>The receiving computer must contain the base folder with this exact structure for the spreadsheet references to resolve. An empty base folder writes relative paths only.</p>
            </div>
          </div>
        </div>

        {platformError && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{platformError}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSavePlatformSettings}
            disabled={isSavingPlatform || platformSaveBlocked}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#85E510] text-[#062404] text-xs font-black hover:brightness-105 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingPlatform ? 'Saving to Edge...' : 'Save Photo Path & Export Settings'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'cloud'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Cloudflare R2 &amp; Edge</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>1-Device Security &amp; RBAC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Regional Branches &amp; Telecom</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('biometrics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'biometrics'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Biometric &amp; ID Standards</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-[#85E510] text-[#062404] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Backup &amp; Reset</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CLOUDFLARE R2 & ZERO-EGRESS EDGE INFRASTRUCTURE             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cloud' && (
        <form onSubmit={handleSaveAll} className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cloudflare R2 Object Storage Binding</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Zero-Egress S3-compatible bucket &amp; CDN edge gateway</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">R2 Bucket Name</label>
              <input
                type="text"
                value={settings.r2BucketName}
                onChange={(e) => handleFieldChange('r2BucketName', e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 uppercase font-bold text-[10px] mb-1">Public CDN Domain Base URL</label>
              <input
                type="text"
                value={settings.r2PublicCdnUrl}
                onChange={(e) => handleFieldChange('r2PublicCdnUrl', e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Guaranteed $0.00 Egress Bandwidth via Cloudflare R2 Global Anycast</span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#85E510] text-[#062404] text-xs font-black hover:brightness-105 transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Propagating...' : 'Save Cloud Parameters'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SECURITY, 1-DEVICE LOCK & RBAC                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Station Security &amp; Terminal Lock Policies</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Hardware isolation and cryptographic workstation authorization</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={settings.hardwareLockEnforced}
                onChange={(e) => handleFieldChange('hardwareLockEnforced', e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#85E510] focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="text-slate-900 dark:text-white font-bold text-sm">Strict 1-Email = 1-Device Lock Enforcement</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  Block secondary device logins; bind each operator account strictly to their approved field laptop
                </div>
              </div>
            </label>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Session Timeout Pacing</span>
              <select
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => handleFieldChange('sessionTimeoutMinutes', Number(e.target.value))}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value={60}>60 Minutes (High Security)</option>
                <option value={120}>120 Minutes (Standard Production)</option>
                <option value={240}>240 Minutes (Extended Shift)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: REGIONAL BRANCHES & TELECOM STANDARDS                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Authorized Regional Branches &amp; Telecom Prefixes</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Production branches and telecom validation rules</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Default Telecom Prefix</span>
              <input
                type="text"
                value={settings.phonePrefix}
                onChange={(e) => handleFieldChange('phonePrefix', e.target.value)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              />
              <span className="text-[10px] text-slate-400 block">Default Ethiopian prefix: +251</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Active Branch Network</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {DEFAULT_BRANCHES.map(b => (
                  <span key={b} className="px-3 py-1 rounded-xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
                    {b} Branch
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: BIOMETRIC & CAMERA DEFAULTS                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'biometrics' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise Biometric Standards</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Universal portrait aspect ratios, formats, and compression quality</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Compression Format</span>
              <select
                value={settings.photoCompressionFormat}
                onChange={(e) => handleFieldChange('photoCompressionFormat', e.target.value as any)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value="image/webp">WebP (98.4% bandwidth reduction - High Efficiency)</option>
                <option value="image/jpeg">JPEG (Universal Compatibility)</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Print Resolution Standard</span>
              <select
                value={settings.printDpi}
                onChange={(e) => handleFieldChange('printDpi', e.target.value as any)}
                className="w-full bg-white dark:bg-[#111613] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
              >
                <option value="300dpi">300 DPI (High-Resolution Offset Standard)</option>
                <option value="600dpi">600 DPI (Ultra-Sharp Thermal Print)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: BACKUP, IMPORT/EXPORT & FACTORY RESET                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configuration Backup &amp; Factory Reset</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Export enterprise state or restore presets across fleet</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-900 dark:text-white block">Export JSON Configuration</span>
              <p className="text-[11px] text-slate-500">Download a full snapshot of all enterprise parameters</p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-black font-bold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Configuration JSON</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070908] border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-900 dark:text-white block">Import Configuration File</span>
              <p className="text-[11px] text-slate-500">Load parameters from a previously exported JSON backup</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold transition-all cursor-pointer hover:border-[#85E510]">
                <Upload className="w-3.5 h-3.5 text-[#85E510]" />
                <span>Choose JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs">
            <div>
              <span className="font-bold text-rose-800 dark:text-rose-400 block">Factory Reset All Parameters</span>
              <span className="text-[11px] text-slate-500">Erase custom overrides and restore official enterprise settings</span>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all cursor-pointer"
            >
              Factory Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSettingsPage;
