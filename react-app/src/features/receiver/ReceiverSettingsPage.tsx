import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, Smartphone, Shield, LogOut, CheckCircle2,
  Download, Table, Save, Printer, Sliders, HardDrive, RotateCcw,
  RefreshCw, Volume2, Layers, Check, Database, Camera, AlertTriangle, Laptop, Server
} from 'lucide-react';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId, getAuthHeaders } from '@/lib/store';
import { getAppSettings, updateAppSettings, resetAppSettings, AppSettings } from '@/lib/settingsStore';
import { PageShell, PageHero, FactGrid, FactCard, ToolbarButton } from '@/components/ui/PageKit';

const DEFAULT_PHOTO_PATH_TEMPLATE = '{grade}/{name}.jpg';
const PATH_TOKEN_RE = /\{(?:grade|name|id)\}/i;
const PATH_ALLOWED_RE = /^[A-Za-z0-9_.\-/{}]+$/;
const SAMPLE_PATH_VALUES: Record<string, string> = { grade: '9A', name: 'Sila-Bekeri', id: 'SB-1024' };

function photoPathPreview(template: string): string {
  return template.replace(/\{(grade|name|id)\}/gi, (_match, token: string) => SAMPLE_PATH_VALUES[token.toLowerCase()] ?? '');
}

interface PlatformSettings {
  photoPathTemplate?: string;
  syncSchool?: string;
  updatedAt?: string | null;
  error?: string;
}

export const ReceiverSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [activeTab, setActiveTab] = useState<'profile' | 'directory' | 'print' | 'export' | 'security' | 'diagnostics'>('directory');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Photo Storage Path — platform settings persisted in R2 via the edge
  const [photoPathTemplate, setPhotoPathTemplate] = useState(DEFAULT_PHOTO_PATH_TEMPLATE);
  const [platformUpdatedAt, setPlatformUpdatedAt] = useState<string | null>(null);
  const [edgeOffline, setEdgeOffline] = useState(false);
  const [isSavingPlatform, setIsSavingPlatform] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);

  const pathTemplateError = !PATH_ALLOWED_RE.test(photoPathTemplate)
    ? 'Invalid characters — only letters, digits and _ - . / { } are allowed.'
    : !PATH_TOKEN_RE.test(photoPathTemplate)
      ? 'Template must contain at least one token: {grade}, {name} or {id}.'
      : null;

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

  const handleReset = () => {
    if (confirm('Reset receiver preferences to default configuration?')) {
      const reset = resetAppSettings();
      setSettings(reset);
      showToast('Receiver settings reset to defaults.');
    }
  };

  const handleSavePlatformSettings = async () => {
    if (pathTemplateError) {
      setPlatformError(pathTemplateError);
      return;
    }
    setIsSavingPlatform(true);
    setPlatformError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ photoPathTemplate: photoPathTemplate.trim() })
      });
      const data: PlatformSettings = await res.json().catch(() => ({ error: 'Malformed edge response.' } as PlatformSettings));
      if (!res.ok) {
        throw new Error(data.error || `Edge rejected settings (${res.status}).`);
      }
      if (typeof data.photoPathTemplate === 'string') setPhotoPathTemplate(data.photoPathTemplate);
      setPlatformUpdatedAt(data.updatedAt ?? null);
      setEdgeOffline(false);
      showToast('Cloud photo storage path saved to R2 platform settings.');
    } catch (err) {
      setPlatformError(err instanceof Error ? err.message : 'Failed to save platform settings.');
    } finally {
      setIsSavingPlatform(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <PageShell className="mx-auto max-w-5xl">
      <PageHero
        icon={Printer}
        title="Receiver Settings"
        count={user?.username || 'Receiver'}
        live="This workstation"
        subtitle="Directory page density, print DPI, export naming conventions, photo path layout and the one-device terminal binding."
        actions={
          <ToolbarButton icon={LogOut} onClick={handleSignOut} className="border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50">
            Sign Out
          </ToolbarButton>
        }
      >
        <FactGrid cols={4}>
          <FactCard label="Role" value={user?.role || 'RECEIVER'} hint="station privilege" icon={Shield} />
          <FactCard label="Device" value={deviceId.slice(0, 14)} hint="this terminal id" icon={Laptop} />
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CLOUD PHOTO STORAGE PATH — R2-persisted platform settings          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-[#E3EFD7] bg-white p-4 space-y-4 shadow-sm shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDF4E5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF7DA] text-[#2F5E04] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">Cloud Photo Storage Path</h3>
              <p className="text-[11px] text-[#7C8B70]">R2 photo key layout used by the directory review feed — served Live</p>
            </div>
          </div>
          <span className="text-[10px] text-[#8A9680] shrink-0">
            Last updated: {platformUpdatedAt ? platformUpdatedAt : 'Never (defaults)'}
          </span>
        </div>

        {edgeOffline && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Edge offline — showing local defaults. Saving requires connectivity.</span>
          </div>
        )}

        <div className="text-xs">
          <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-2">
            <label htmlFor="photo-path-template" className="block text-[#8A9680] uppercase font-bold text-[10px]">Photo Path Template</label>
            <input
              id="photo-path-template"
              type="text"
              value={photoPathTemplate}
              onChange={(e) => { setPhotoPathTemplate(e.target.value); setPlatformError(null); }}
              className={`w-full bg-white border rounded-xl px-3 py-2 font-bold text-[#0B1118] ${
 pathTemplateError ? 'border-rose-400' : 'border-[#E3EFD7]'
 }`}
              placeholder={DEFAULT_PHOTO_PATH_TEMPLATE}
            />
            <p className="text-[10px] text-[#7C8B70]">
              Tokens: <span className="font-bold text-[#256002]">{'{grade}'}</span>,{' '}
              <span className="font-bold text-[#256002]">{'{name}'}</span>,{' '}
              <span className="font-bold text-[#256002]">{'{id}'}</span> — at least one is required.
            </p>
            <div className="text-[10px] text-[#7C8B70]">
              Live example:{' '}
              <span className="font-bold text-[#0B1118] break-all">{photoPathPreview(pathTemplateError ? DEFAULT_PHOTO_PATH_TEMPLATE : photoPathTemplate)}</span>
            </div>
            {pathTemplateError && (
              <p className="text-[10px] font-bold text-rose-600">{pathTemplateError}</p>
            )}
          </div>
        </div>

        {platformError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{platformError}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSavePlatformSettings}
            disabled={isSavingPlatform || !!pathTemplateError}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#85E510] text-[#062404] text-xs font-black hover:brightness-105 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingPlatform ? 'Saving to Edge...' : 'Save Photo Path Settings'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-white border border-[#E3EFD7] shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
 activeTab === 'directory'
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#4B5B42] hover:text-[#0B1118]'
 }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Directory &amp; Review</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('print')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
 activeTab === 'print'
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#4B5B42] hover:text-[#0B1118]'
 }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>8-Up Print &amp; ID Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
 activeTab === 'export'
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#4B5B42] hover:text-[#0B1118]'
 }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Conventions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
 activeTab === 'security'
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#4B5B42] hover:text-[#0B1118]'
 }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>1-Device Lock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
 activeTab === 'profile'
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#4B5B42] hover:text-[#0B1118]'
 }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Operator Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
 activeTab === 'diagnostics'
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#4B5B42] hover:text-[#0B1118]'
 }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: DIRECTORY & REVIEW PREFERENCES                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="bg-white border border-[#E3EFD7] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#EDF4E5]">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF7DA] text-[#2F5E04] flex items-center justify-center">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">Directory Density &amp; Review Pacing</h3>
              <p className="text-[11px] text-[#7C8B70]">Control table row pagination and real-time review settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-2">
              <span className="font-bold text-[#0B1118] block">Default Table Page Size</span>
              <select
                value={settings.tablePageSize}
                onChange={(e) => handleFieldChange('tablePageSize', Number(e.target.value))}
                className="w-full bg-white border border-[#E3EFD7] rounded-xl px-3 py-2 text-[#0B1118] font-bold"
              >
                <option value={50}>50 Students per page</option>
                <option value={100}>100 Students per page (Recommended)</option>
                <option value={250}>250 Students per page (High Density)</option>
                <option value={500}>500 Students per page (Maximum)</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-2">
              <span className="font-bold text-[#0B1118] block">Auto-Sync Heartbeat Pacing</span>
              <select
                value={settings.storageSyncIntervalMs}
                onChange={(e) => handleFieldChange('storageSyncIntervalMs', Number(e.target.value))}
                className="w-full bg-white border border-[#E3EFD7] rounded-xl px-3 py-2 text-[#0B1118] font-bold"
              >
                <option value={2000}>2 Seconds (High Frequency)</option>
                <option value={4000}>4 Seconds (Standard Production)</option>
                <option value={8000}>8 Seconds (Battery &amp; Low Bandwidth)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: 8-UP PRINT & ID BADGE STUDIO                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'print' && (
        <div className="bg-white border border-[#E3EFD7] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#EDF4E5]">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">8-Up Sheet Print Engine &amp; DPI Standards</h3>
              <p className="text-[11px] text-[#7C8B70]">Configure high-resolution A4 card production and cutting crosshairs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-2">
              <span className="font-bold text-[#0B1118] block">Print Resolution (DPI)</span>
              <select
                value={settings.printDpi}
                onChange={(e) => handleFieldChange('printDpi', e.target.value as any)}
                className="w-full bg-white border border-[#E3EFD7] rounded-xl px-3 py-2 text-[#0B1118] font-bold"
              >
                <option value="300dpi">300 DPI (Commercial Print Standard - Fast)</option>
                <option value="600dpi">600 DPI (Ultra Sharp - High Density Text)</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0B1118] block">Print Crop &amp; Cutting Marks</span>
                <span className="text-[11px] text-[#7C8B70]">Render corner crosshairs for Guillotine cutters</span>
              </div>
              <input
                type="checkbox"
                checked={settings.includeCropMarks}
                onChange={(e) => handleFieldChange('includeCropMarks', e.target.checked)}
                className="w-5 h-5 rounded border-[#CDEBB4] text-[#85E510] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: EXPORT CONVENTIONS                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="bg-white border border-[#E3EFD7] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#EDF4E5]">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">ZIP &amp; CSV Export Conventions</h3>
              <p className="text-[11px] text-[#7C8B70]">File naming standards for bulk download manifests</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-2">
              <span className="font-bold text-[#0B1118] block">ZIP File Structure</span>
              <select
                value={settings.zipExportConvention}
                onChange={(e) => handleFieldChange('zipExportConvention', e.target.value)}
                className="w-full bg-white border border-[#E3EFD7] rounded-xl px-3 py-2 text-[#0B1118] font-bold"
              >
                <option value="School/Grade/ID_Name.jpg">School / Grade / ID_Name.jpg (Recommended)</option>
                <option value="Flat/ID.jpg">Flat Directory (ID.jpg)</option>
                <option value="Grade/Section/ID.jpg">Grade / Section / ID.jpg</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-2">
              <span className="font-bold text-[#0B1118] block">CSV Export Delimiter</span>
              <select
                value={settings.csvDelimiter}
                onChange={(e) => handleFieldChange('csvDelimiter', e.target.value as any)}
                className="w-full bg-white border border-[#E3EFD7] rounded-xl px-3 py-2 text-[#0B1118] font-bold"
              >
                <option value=",">Comma (,) - Standard</option>
                <option value=";">Semicolon (;) - European Excel</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: 1-DEVICE LOCK                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="overflow-hidden rounded-2xl border border-[#E3EFD7] bg-white p-4 space-y-4 shadow-sm shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#EDF4E5]">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">Receiver Terminal Hardware Binding</h3>
              <p className="text-[11px] text-[#7C8B70]">1-Email = 1-Device hardware authorization</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] space-y-1">
              <span className="text-[#8A9680] uppercase font-bold text-[10px] block">Bound Terminal ID</span>
              <span className="font-bold text-[#256002] break-all block">
                {deviceId}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-600" />
              <span>Receiver Privilege Bound to {user?.email || 'Current Account'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: OPERATOR PROFILE                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="overflow-hidden rounded-2xl border border-[#E3EFD7] bg-white p-4 space-y-4 shadow-sm shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#EDF4E5]">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
              {user?.username?.substring(0, 2).toUpperCase() || 'RC'}
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">Receiver Account Identity</h3>
              <p className="text-[11px] text-[#7C8B70]">Central registry operator profile</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#8A9680] uppercase font-bold text-[10px] block">Username</span>
              <span className="font-bold text-[#0B1118] text-sm">{user?.username || 'yonatantesfa'}</span>
            </div>
            <div>
              <span className="text-[#8A9680] uppercase font-bold text-[10px] block">Email</span>
              <span className="font-semibold text-[#2B3A22]">{user?.email || 'yonatantesfa@gmail.com'}</span>
            </div>
            <div>
              <span className="text-[#8A9680] uppercase font-bold text-[10px] block">Station Role</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                {user?.role || 'RECEIVER'} (CENTRAL REVIEW)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: DIAGNOSTICS & RESET                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'diagnostics' && (
        <div className="overflow-hidden rounded-2xl border border-[#E3EFD7] bg-white p-4 space-y-4 shadow-sm shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#EDF4E5]">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#0B1118]">Maintenance &amp; Preferences Reset</h3>
              <p className="text-[11px] text-[#7C8B70]">Restore default receiver parameters</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] text-xs">
            <div>
              <span className="font-bold text-[#0B1118] block">Reset Receiver Preferences</span>
              <span className="text-[11px] text-[#7C8B70]">Restore default print resolution, directory pagination, and export formats</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold transition-all cursor-pointer"
            >
              Reset Defaults
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default ReceiverSettingsPage;
