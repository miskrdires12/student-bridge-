import React, { useState, useEffect } from 'react';
import {
  Settings, Save, CheckCircle2, Shield, HardDrive, Key,
  Globe, Database, Sliders, RotateCcw, Download, Upload,
  Building2, Phone, Camera, Check, AlertTriangle, RefreshCw,
  FolderOpen, QrCode, Target, Laptop, Server
} from 'lucide-react';
import { getAppSettings, updateAppSettings, resetAppSettings, exportSettingsJson, importSettingsJson, AppSettings } from '@/lib/settingsStore';
import { DEFAULT_BRANCHES, getAuthHeaders, refreshPlatformSettings, getOrCreateDeviceId } from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, PrimaryButton, Chip } from '@/components/ui/PageKit';

const DEFAULT_PHOTO_PATH_TEMPLATE = '{grade}/{name}.jpg';
const DEFAULT_EXPORT_PHOTO_TEMPLATE = '{name}.jpg';
const DEFAULT_EXPORT_QR_TEMPLATE = '{id}_qr.png';
const DEFAULT_EXPORT_BASE_FOLDER = 'C:\\Users\\Administrator\\Desktop\\ymshighschool';
// The exact shape a Windows base folder must have for the spreadsheet references to resolve on
// the receiving laptop: drive letter, backslash-separated folders, no trailing slash.
const YMS_EXPORT_FOLDER = 'C:\\Users\\Administrator\\Desktop\\ymshighschool';
const FIELD_CLASS =
  'w-full rounded-xl border border-[#E3EFD7] bg-white px-3 py-2 text-xs font-bold text-[#0B1118] placeholder:font-medium placeholder:text-[#A6B29C] focus:border-[#9EE617] focus:outline-none';
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
    <PageShell className="mx-auto max-w-5xl">
      <PageHero
        icon={Settings}
        title="Enterprise Parameters"
        count="Super admin"
        live="Edge settings"
        subtitle="Cloudflare R2 key layout, zero-egress bindings, the one-device security lock and regional branch policies. Values persisted here apply to every station that reads the platform settings."
      >
        <FactGrid cols={4}>
          <FactCard label="Role" value="SUPER_ADMIN" hint="full console access" icon={Shield} />
          <FactCard label="Device" value={getOrCreateDeviceId().slice(0, 14)} hint="this terminal id" icon={Laptop} />
          <FactCard label="Photo Path" value={platformUpdatedAt ? 'Saved' : 'Defaults'} hint={platformUpdatedAt || 'never saved from here'} icon={Camera} />
          <FactCard label="Edge" value={edgeOffline ? 'Offline' : 'Online'} hint="platform settings source" icon={Server} />
        </FactGrid>
      </PageHero>

      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-[#EAF7DA] border border-[#CDEBB4] text-[#256002] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#85E510]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SectionCard
        icon={FolderOpen}
        title="Storage & export paths"
        subtitle="R2 object keys plus the receiving-PC folders written into @photo and @qr of every download"
        actions={
          <>
            <Chip tone={edgeOffline ? 'amber' : 'lime'}>{edgeOffline ? 'Edge offline' : 'Edge online'}</Chip>
            <PrimaryButton icon={Save} onClick={handleSavePlatformSettings} disabled={isSavingPlatform || platformSaveBlocked}>
              {isSavingPlatform ? 'Saving to edge…' : 'Save paths'}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
        {edgeOffline && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Edge offline — showing local defaults. Saving requires connectivity.</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
            <label htmlFor="photo-path-template" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
              <Camera className="h-3.5 w-3.5" /> R2 photo key template
            </label>
            <input
              id="photo-path-template"
              type="text"
              value={photoPathTemplate}
              onChange={(e) => { setPhotoPathTemplate(e.target.value); setPlatformError(null); }}
              className={`${FIELD_CLASS} ${pathTemplateError ? 'border-rose-400' : ''}`}
              placeholder={DEFAULT_PHOTO_PATH_TEMPLATE}
            />
            <p className="text-[10px] font-medium text-[#7C8B70]">
              Tokens <span className="font-bold text-[#2F5E04]">{'{grade}'}</span> <span className="font-bold text-[#2F5E04]">{'{name}'}</span> <span className="font-bold text-[#2F5E04]">{'{id}'}</span> — at least one is required.
            </p>
            <div className="rounded-lg bg-white px-2 py-1.5 text-[10px] text-[#7C8B70]">
              Live key: <span className="font-bold text-[#0B1118] break-all">{photoPathPreview(pathTemplateError ? DEFAULT_PHOTO_PATH_TEMPLATE : photoPathTemplate)}</span>
            </div>
            {pathTemplateError && <p className="text-[10px] font-bold text-rose-600">{pathTemplateError}</p>}
          </div>

          <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
            <label htmlFor="sync-school-scope" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
              <Building2 className="h-3.5 w-3.5" /> Sync school scope
            </label>
            <input
              id="sync-school-scope"
              type="text"
              value={syncSchool}
              onChange={(e) => { setSyncSchool(e.target.value); setPlatformError(null); }}
              className={FIELD_CLASS}
              placeholder="Warka"
            />
            <p className="text-[10px] font-medium text-[#7C8B70]">
              The native APK feed serves this school by default (<span className="font-bold text-[#2F5E04]">Warka</span> preset).
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#EDF4E5] bg-white p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF7DA] text-[#2F5E04]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0B1118]">Local export folders</h4>
                <p className="text-[10px] font-medium text-[#7C8B70]">
                  Windows folders on the receiving PC — written into <span className="font-bold">@photo</span> and <span className="font-bold">@qr</span>, not server paths.
                </p>
              </div>
            </div>
            <ToolbarButton
              icon={FolderOpen}
              onClick={() => {
                setExportBaseFolderPhoto(YMS_EXPORT_FOLDER);
                setExportBaseFolderQr(YMS_EXPORT_FOLDER);
                setPlatformError(null);
              }}
            >
              Use Desktop\ymshighschool
            </ToolbarButton>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <label htmlFor="export-photo-template" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <Camera className="h-3.5 w-3.5" /> Photo file pattern (@photo)
              </label>
              <input
                id="export-photo-template"
                type="text"
                value={exportPhotoTemplate}
                onChange={(e) => { setExportPhotoTemplate(e.target.value); setPlatformError(null); }}
                className={`${FIELD_CLASS} ${!PATH_TOKEN_RE.test(exportPhotoTemplate) || !PATH_ALLOWED_RE.test(exportPhotoTemplate) ? 'border-rose-400' : ''}`}
                placeholder={DEFAULT_EXPORT_PHOTO_TEMPLATE}
              />
              <label htmlFor="export-photo-folder" className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                Photo base folder (receiving PC)
              </label>
              <input
                id="export-photo-folder"
                type="text"
                value={exportBaseFolderPhoto}
                onChange={(e) => { setExportBaseFolderPhoto(e.target.value); setPlatformError(null); }}
                className={`${FIELD_CLASS} font-mono`}
                placeholder={YMS_EXPORT_FOLDER}
              />
              <div className="rounded-lg bg-white px-2 py-1.5 text-[10px] text-[#7C8B70]">
                Writes:{' '}
                <span className="break-all font-mono font-bold text-[#0B1118]">{exportPathPreview(exportBaseFolderPhoto, PATH_TOKEN_RE.test(exportPhotoTemplate) && PATH_ALLOWED_RE.test(exportPhotoTemplate) ? exportPhotoTemplate : DEFAULT_EXPORT_PHOTO_TEMPLATE, 'jpg')}</span>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <label htmlFor="export-qr-template" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <QrCode className="h-3.5 w-3.5" /> QR file pattern (@qr)
              </label>
              <input
                id="export-qr-template"
                type="text"
                value={exportQrTemplate}
                onChange={(e) => { setExportQrTemplate(e.target.value); setPlatformError(null); }}
                className={`${FIELD_CLASS} ${!PATH_TOKEN_RE.test(exportQrTemplate) || !PATH_ALLOWED_RE.test(exportQrTemplate) ? 'border-rose-400' : ''}`}
                placeholder={DEFAULT_EXPORT_QR_TEMPLATE}
              />
              <label htmlFor="export-qr-folder" className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                QR base folder (receiving PC)
              </label>
              <input
                id="export-qr-folder"
                type="text"
                value={exportBaseFolderQr}
                onChange={(e) => { setExportBaseFolderQr(e.target.value); setPlatformError(null); }}
                className={`${FIELD_CLASS} font-mono`}
                placeholder={YMS_EXPORT_FOLDER}
              />
              <div className="rounded-lg bg-white px-2 py-1.5 text-[10px] text-[#7C8B70]">
                Writes:{' '}
                <span className="break-all font-mono font-bold text-[#0B1118]">{exportPathPreview(exportBaseFolderQr, PATH_TOKEN_RE.test(exportQrTemplate) && PATH_ALLOWED_RE.test(exportQrTemplate) ? exportQrTemplate : DEFAULT_EXPORT_QR_TEMPLATE, 'png')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <label htmlFor="sender-daily-target" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <Target className="h-3.5 w-3.5" /> Daily registration target / sender
              </label>
              <input
                id="sender-daily-target"
                type="number"
                min={1}
                max={5000}
                value={senderDailyTarget}
                onChange={(e) => { setSenderDailyTarget(parseInt(e.target.value, 10)); setPlatformError(null); }}
                className={`${FIELD_CLASS} ${targetError ? 'border-rose-400' : ''}`}
              />
              <p className="text-[10px] font-medium text-[#7C8B70]">Drives the target-progress bars in Telemetric Velocity &amp; Fleet and the dashboard.</p>
              {targetError && <p className="text-[10px] font-bold text-rose-600">{targetError}</p>}
            </div>

            <div className="space-y-1.5 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5 text-[10px] text-[#4B5B42]">
              <p className="font-bold uppercase tracking-wider text-[#2B3A22]">Folder layout</p>
              <p>Templates support <span className="font-bold text-[#2F5E04]">{'{grade}'} {'{name}'} {'{id}'}</span> — e.g. <span className="font-mono">Photos/{'{grade}'}/{'{id}'}.jpg</span> or <span className="font-mono">QR/{'{grade}'}/{'{id}'}.png</span>, or a flat layout like <span className="font-mono">{'{id}'}.jpg</span>.</p>
              <p>The receiving PC must contain the base folder with this exact structure. An empty base folder writes relative paths only.</p>
            </div>
          </div>
        </div>

        {platformError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{platformError}</span>
          </div>
        )}

        </div>
      </SectionCard>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F3F7EE] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
 activeTab === 'cloud'
 ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
 }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Cloudflare R2 &amp; Edge</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
 activeTab === 'security'
 ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
 }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>1-Device Security &amp; RBAC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
 activeTab === 'branches'
 ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
 }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Regional Branches &amp; Telecom</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('biometrics')}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
 activeTab === 'biometrics'
 ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
 }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Biometric &amp; ID Standards</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
 activeTab === 'backup'
 ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
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
        <SectionCard
          icon={HardDrive}
          title="Cloudflare R2 object storage"
          subtitle="Zero-egress S3-compatible bucket and CDN edge gateway"
          actions={
            <PrimaryButton icon={Save} type="submit" form="cloud-params-form" disabled={isSaving}>
              {isSaving ? 'Propagating…' : 'Save cloud parameters'}
            </PrimaryButton>
          }
        >
          <form id="cloud-params-form" onSubmit={handleSaveAll} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                  <Server className="h-3.5 w-3.5" /> R2 bucket name
                </label>
                <input
                  type="text"
                  value={settings.r2BucketName}
                  onChange={(e) => handleFieldChange('r2BucketName', e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                  <Globe className="h-3.5 w-3.5" /> Public CDN base URL
                </label>
                <input
                  type="text"
                  value={settings.r2PublicCdnUrl}
                  onChange={(e) => handleFieldChange('r2PublicCdnUrl', e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#CDEBB4] bg-[#EAF7DA] px-3.5 py-2.5 text-[11px] font-bold text-[#2F5E04]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4D8A07]" />
              <span>Guaranteed $0.00 egress bandwidth via Cloudflare R2 Global Anycast</span>
            </div>
          </form>
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: SECURITY, 1-DEVICE LOCK & RBAC                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <SectionCard
          icon={Shield}
          title="Station security & terminal lock"
          subtitle="Hardware isolation, one-device binding and session pacing"
          actions={
            <Chip tone={settings.hardwareLockEnforced ? 'lime' : 'amber'}>
              {settings.hardwareLockEnforced ? 'Lock enforced' : 'Lock relaxed'}
            </Chip>
          }
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E3EFD7] bg-[#FBFDF7] p-3.5">
              <input
                type="checkbox"
                checked={settings.hardwareLockEnforced}
                onChange={(e) => handleFieldChange('hardwareLockEnforced', e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#CDEBB4] text-[#85E510] focus:ring-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-black text-[#0B1118]">Strict 1 email = 1 device enforcement</div>
                <div className="mt-0.5 text-[10px] font-medium text-[#7C8B70]">
                  Blocks secondary device logins and binds every operator account to its approved field laptop.
                </div>
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
                <label htmlFor="session-timeout" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                  <Key className="h-3.5 w-3.5" /> Session timeout
                </label>
                <select
                  id="session-timeout"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => handleFieldChange('sessionTimeoutMinutes', Number(e.target.value))}
                  className={FIELD_CLASS}
                >
                  <option value={60}>60 minutes — high security</option>
                  <option value={120}>120 minutes — standard production</option>
                  <option value={240}>240 minutes — extended shift</option>
                </select>
                <p className="text-[10px] font-medium text-[#7C8B70]">Operators are signed out of the station once this window goes idle.</p>
              </div>

              <div className="space-y-1.5 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5 text-[10px] text-[#4B5B42]">
                <p className="font-bold uppercase tracking-wider text-[#2B3A22]">What the lock covers</p>
                <p>Every role (sender, receiver, admin) is bound to the terminal id shown in the hero above.</p>
                <p>Clearing the browser storage does not release the binding — a super admin has to rebind the account.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: REGIONAL BRANCHES & TELECOM STANDARDS                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'branches' && (
        <SectionCard
          icon={Building2}
          title="Regional branches & telecom"
          subtitle="Authorized production branches and the phone prefix used to validate every registration"
          actions={<Chip tone="lime">{DEFAULT_BRANCHES.length} branches</Chip>}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <label htmlFor="phone-prefix" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <Phone className="h-3.5 w-3.5" /> Default telecom prefix
              </label>
              <input
                id="phone-prefix"
                type="text"
                value={settings.phonePrefix}
                onChange={(e) => handleFieldChange('phonePrefix', e.target.value)}
                className={`${FIELD_CLASS} font-mono`}
                placeholder="+251"
              />
              <p className="text-[10px] font-medium text-[#7C8B70]">Ethiopian default is <span className="font-bold text-[#2F5E04]">+251</span>; local 09… numbers are expanded with it on save.</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <Building2 className="h-3.5 w-3.5" /> Active branch network
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_BRANCHES.map(b => (
                  <span key={b} className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2.5 py-0.5 text-[10px] font-black text-[#2F5E04]">
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-[10px] font-medium text-[#7C8B70]">Branches available in the registration and roster filters.</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: BIOMETRIC & CAMERA DEFAULTS                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'biometrics' && (
        <SectionCard
          icon={Camera}
          title="Biometric & ID standards"
          subtitle="Portrait encoding and print resolution applied to every captured student photo"
          actions={<Chip tone="lime">{settings.printDpi}</Chip>}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <label htmlFor="photo-format" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <Camera className="h-3.5 w-3.5" /> Compression format
              </label>
              <select
                id="photo-format"
                value={settings.photoCompressionFormat}
                onChange={(e) => handleFieldChange('photoCompressionFormat', e.target.value as any)}
                className={FIELD_CLASS}
              >
                <option value="image/webp">WebP — 98.4% bandwidth reduction</option>
                <option value="image/jpeg">JPEG — universal compatibility</option>
              </select>
              <p className="text-[10px] font-medium text-[#7C8B70]">Applied when the station compresses the portrait before it leaves the browser.</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
              <label htmlFor="print-dpi" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
                <Target className="h-3.5 w-3.5" /> Print resolution standard
              </label>
              <select
                id="print-dpi"
                value={settings.printDpi}
                onChange={(e) => handleFieldChange('printDpi', e.target.value as any)}
                className={FIELD_CLASS}
              >
                <option value="300dpi">300 DPI — offset standard</option>
                <option value="600dpi">600 DPI — thermal print</option>
              </select>
              <p className="text-[10px] font-medium text-[#7C8B70]">Target density for the printed ID cards generated from these portraits.</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: BACKUP, IMPORT/EXPORT & FACTORY RESET                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <SectionCard
          icon={Download}
          title="Backup & reset"
          subtitle="Export the station configuration, restore it elsewhere, or clear every override"
          actions={<Chip tone="amber">Local station</Chip>}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">Export configuration</span>
                <p className="text-[10px] font-medium text-[#7C8B70]">Downloads a snapshot of every parameter on this station as JSON.</p>
                <PrimaryButton icon={Download} onClick={handleExportBackup} className="mt-1 self-start">
                  Export JSON
                </PrimaryButton>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-[#EDF4E5] bg-[#FBFDF7] p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">Import configuration</span>
                <p className="text-[10px] font-medium text-[#7C8B70]">Load parameters from a previously exported JSON backup.</p>
                <label className="mt-1 inline-flex h-9 cursor-pointer items-center gap-1.5 self-start rounded-xl border border-[#E3E9DD] bg-white px-3 text-[11px] font-bold text-[#4B5B42] transition-colors hover:border-[#85E510]">
                  <Upload className="h-3.5 w-3.5 text-[#6FBF0A]" />
                  Choose JSON file
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="min-w-0">
                <span className="block text-xs font-black text-rose-800">Factory reset all parameters</span>
                <span className="text-[10px] font-medium text-[#7C8B70]">Erases custom overrides and restores the official enterprise presets on this station.</span>
              </div>
              <button
                type="button"
                onClick={handleFactoryReset}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-[11px] font-black text-white transition-colors hover:bg-rose-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Factory reset
              </button>
            </div>
          </div>
        </SectionCard>
      )}
    </PageShell>
  );
};

export default SuperAdminSettingsPage;
