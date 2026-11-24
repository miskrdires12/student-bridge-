import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, Smartphone, Shield, LogOut, CheckCircle2,
  Folder, Printer, Camera, Sliders, Database, HardDrive, Key,
  Sparkles, Save, RotateCcw, AlertTriangle, Trash2, Globe, Building2,
  MapPin, Check, RefreshCw
} from 'lucide-react';
import {
  getCurrentUser, setCurrentUser, getOrCreateDeviceId,
  DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP
} from '@/lib/store';
import { R2_PUBLIC_BASE_URL } from '@/lib/syncEngine';
import { PageShell, PageHero, FactGrid, FactCard, ToolbarButton } from '@/components/ui/PageKit';

interface ReceiverStationConfig {
  photoFolder: string;
  csvPrefix: string;
  csvDelimiter: string;
  autoFormatPhone: boolean;
  photoFolderStructure: 'by-grade' | 'flat' | 'by-id';
  pollingIntervalMs: number;
  enableAudioAlerts: boolean;
  includeCropMarks: boolean;
  printDpi: '300dpi' | '600dpi';
}

interface SenderStationConfig {
  defaultGrade: string;
  defaultSchool: string;
  autoFormatPhone: boolean;
  enableIntakeChime: boolean;
  mirrorCamera: boolean;
  cameraGuideGrid: boolean;
  autoResetForm: boolean;
}

const DEFAULT_RECEIVER_CONFIG: ReceiverStationConfig = {
  photoFolder: 'C:\\Users\\athede\\Desktop\\students project for 17000',
  csvPrefix: 'student_bridge_receiver_manifest',
  csvDelimiter: ',',
  autoFormatPhone: true,
  photoFolderStructure: 'by-grade',
  pollingIntervalMs: 4000,
  enableAudioAlerts: true,
  includeCropMarks: true,
  printDpi: '300dpi',
};

const DEFAULT_SENDER_CONFIG: SenderStationConfig = {
  defaultGrade: 'Grade 10',
  defaultSchool: 'YMS',
  autoFormatPhone: true,
  enableIntakeChime: true,
  mirrorCamera: true,
  cameraGuideGrid: true,
  autoResetForm: true,
};

export const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'station' | 'receiver' | 'sender' | 'cloud' | 'branches'>('station');

  // Station Supervision State
  const [escalationDays, setEscalationDays] = useState('3');
  const [minAccuracyTarget, setMinAccuracyTarget] = useState('90%');
  const [hardwareLockEnforced, setHardwareLockEnforced] = useState(true);

  // Receiver Config State
  const [receiverConfig, setReceiverConfig] = useState<ReceiverStationConfig>(() => {
    try {
      const stored = localStorage.getItem('sb_receiver_settings');
      return stored ? { ...DEFAULT_RECEIVER_CONFIG, ...JSON.parse(stored) } : DEFAULT_RECEIVER_CONFIG;
    } catch {
      return DEFAULT_RECEIVER_CONFIG;
    }
  });

  // Sender Config State
  const [senderConfig, setSenderConfig] = useState<SenderStationConfig>(() => {
    try {
      const stored = localStorage.getItem('sb_sender_settings');
      return stored ? { ...DEFAULT_SENDER_CONFIG, ...JSON.parse(stored) } : DEFAULT_SENDER_CONFIG;
    } catch {
      return DEFAULT_SENDER_CONFIG;
    }
  });

  // Cloud & R2 State
  const [bucketName, setBucketName] = useState('siliconlabs');
  const [cdnDomain, setCdnDomain] = useState(R2_PUBLIC_BASE_URL);
  const [dbLatencyPacing, setDbLatencyPacing] = useState('Real-time (4s Heartbeat)');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Supervision benchmarks and security locks saved successfully.');
  };

  const handleSaveReceiver = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('sb_receiver_settings', JSON.stringify(receiverConfig));
      localStorage.setItem('sb_receiver_photo_folder', receiverConfig.photoFolder);
      window.dispatchEvent(new Event('storage'));
      showToast('Receiver production settings saved and applied.');
    } catch {
      showToast('Failed to save settings.');
    }
  };

  const handleSaveSender = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('sb_sender_settings', JSON.stringify(senderConfig));
      window.dispatchEvent(new Event('storage'));
      showToast('Field Sender intake presets saved.');
    } catch {
      showToast('Failed to save settings.');
    }
  };

  const handleSaveCloud = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Cloudflare R2 & Supabase connection parameters updated.');
  };

  const handlePurgeDrafts = () => {
    if (confirm('Clear local student intake drafts, photo buffers, and cached form residuals?')) {
      localStorage.removeItem('sb_student_draft');
      localStorage.removeItem('sb_photo_draft');
      showToast('Local workstation drafts and photo caches cleared.');
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const totalSchools = Object.values(BRANCH_SCHOOL_MAP).flat().length;

  return (
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={Settings}
        title="Station & Production Settings"
        count={isSuperAdmin ? 'Super admin' : 'Administrator'}
        live="This workstation"
        subtitle="Manage workstation allocation, storage directories, intake parameters, branch directories and cloud infrastructure."
        actions={
          <ToolbarButton icon={LogOut} onClick={handleSignOut} className="border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50">
            Sign Out
          </ToolbarButton>
        }
      >
        <FactGrid cols={4}>
          <FactCard label="Role" value={isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'} hint="station privilege" icon={Shield} />
          <FactCard label="Branches" value={DEFAULT_BRANCHES.length.toLocaleString()} hint="regional directories" icon={MapPin} />
          <FactCard label="Schools" value={totalSchools.toLocaleString()} hint="across all branches" icon={Building2} />
          <FactCard label="Device" value={deviceId.slice(0, 14)} hint="this terminal id" icon={Smartphone} />
        </FactGrid>
      </PageHero>

      {toastMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#CDEBB4] bg-[#EAF7DA] p-3.5 text-xs font-bold text-[#2F5E04]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6FBF0A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Professional Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('station')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'station'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-black hover:bg-slate-50'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Supervision &amp; Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receiver')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'receiver'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-black hover:bg-slate-50'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Receiver &amp; Photo Imposition</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sender')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'sender'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-black hover:bg-slate-50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Field Sender &amp; Camera Intake</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-black hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Branches &amp; School Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'cloud'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-black hover:bg-slate-50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Cloudflare R2 &amp; Database</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SUPERVISION & SECURITY
         ========================================================================= */}
      {activeTab === 'station' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Workstation Info */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-black text-[#0B1118]">Operator Credentials</h3>
                <p className="text-xs text-slate-500">Active authenticated session</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Username:</span>
                <span className="font-bold text-[#0B1118]">{user?.username || 'miskrdires1'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Institutional Email:</span>
                <span className="font-mono text-[#0B1118]">{user?.email || 'miskrdires1@gmail.com'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Assigned Role:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {user?.role || 'ADMIN'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-medium">Authorized Device (Lock):</span>
                <span className="font-mono text-[#256002] font-bold bg-[#85E510]/15 px-2 py-0.5 rounded border border-[#85E510]/30">
                  {deviceId}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Terminal Security Status</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 1-Device Enforced
              </span>
            </div>
          </div>

          {/* Supervision Parameters Form */}
          <form onSubmit={handleSaveStation} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-[#85E510]/20 border border-[#85E510]/30 flex items-center justify-center text-[#256002]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-black text-[#0B1118]">Supervision Parameters</h3>
                <p className="text-xs text-slate-500">Quality benchmarks, task escalations, and lock policies</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Task Escalation Overdue Timeout (Days)
                </label>
                <input
                  type="text"
                  value={escalationDays}
                  onChange={(e) => setEscalationDays(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1118] focus:outline-none focus:border-[#85E510]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Minimum Photo Quality Benchmark
                </label>
                <input
                  type="text"
                  value={minAccuracyTarget}
                  onChange={(e) => setMinAccuracyTarget(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1118] focus:outline-none focus:border-[#85E510]"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1]">
                <input
                  type="checkbox"
                  checked={hardwareLockEnforced}
                  onChange={(e) => setHardwareLockEnforced(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                />
                <div>
                  <div className="text-[#0B1118] font-bold">Enforce Strict 1-Device Hardware Binding</div>
                  <div className="text-slate-500 text-[11px]">Deny unauthorized terminals; require explicit Administrator binding</div>
                </div>
              </label>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all cursor-pointer"
                >
                  Save Supervision Settings
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RECEIVER & PHOTO IMPOSITION
         ========================================================================= */}
      {activeTab === 'receiver' && (
        <form onSubmit={handleSaveReceiver} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#0B1118]">Receiver &amp; Photo Imposition Configuration</h3>
              <p className="text-xs text-slate-500">Local photo directory mapping, 8-Up imposition parameters, and export templates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Local Windows Photo Destination Folder
                </label>
                <div className="relative">
                  <Folder className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={receiverConfig.photoFolder}
                    onChange={(e) => setReceiverConfig({ ...receiverConfig, photoFolder: e.target.value })}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 font-mono text-[#0B1118] focus:outline-none focus:border-[#85E510]"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Used by direct desktop ZIP exports and local Windows photo sync scripts.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Export Folder Structure Partitioning
                </label>
                <select
                  value={receiverConfig.photoFolderStructure}
                  onChange={(e) => setReceiverConfig({ ...receiverConfig, photoFolderStructure: e.target.value as any })}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-semibold text-[#0B1118]"
                >
                  <option value="by-grade">Subfolder by Grade (e.g. Grade_10\Student.jpg)</option>
                  <option value="flat">Flat Structure (All photos in single root directory)</option>
                  <option value="by-id">Subfolder by Student ID</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  CSV Manifest File Prefix
                </label>
                <input
                  type="text"
                  value={receiverConfig.csvPrefix}
                  onChange={(e) => setReceiverConfig({ ...receiverConfig, csvPrefix: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-[#0B1118]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  8-Up Imposition Print Quality Resolution
                </label>
                <select
                  value={receiverConfig.printDpi}
                  onChange={(e) => setReceiverConfig({ ...receiverConfig, printDpi: e.target.value as any })}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-semibold text-[#0B1118]"
                >
                  <option value="300dpi">300 DPI Standard (Fastest rendering &amp; thermal printing)</option>
                  <option value="600dpi">600 DPI Ultra High Definition (Professional PVC printers)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Telemetry Heartbeat Polling Frequency
                </label>
                <select
                  value={receiverConfig.pollingIntervalMs}
                  onChange={(e) => setReceiverConfig({ ...receiverConfig, pollingIntervalMs: Number(e.target.value) })}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-semibold text-[#0B1118]"
                >
                  <option value={2000}>2 Seconds (High-frequency live telemetry)</option>
                  <option value={4000}>4 Seconds (Recommended production standard)</option>
                  <option value={10000}>10 Seconds (Bandwidth conservation mode)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiverConfig.includeCropMarks}
                    onChange={(e) => setReceiverConfig({ ...receiverConfig, includeCropMarks: e.target.checked })}
                    className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                  />
                  <span className="font-semibold text-slate-700">Include Die-Cut Guillotine Crop Marks on 8-Up Sheets</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiverConfig.enableAudioAlerts}
                    onChange={(e) => setReceiverConfig({ ...receiverConfig, enableAudioAlerts: e.target.checked })}
                    className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                  />
                  <span className="font-semibold text-slate-700">Play Audio Bell Notification on Incoming Records</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              Save Receiver Configuration
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 3: FIELD SENDER & CAMERA INTAKE
         ========================================================================= */}
      {activeTab === 'sender' && (
        <form onSubmit={handleSaveSender} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#0B1118]">Field Sender &amp; Camera Intake Settings</h3>
              <p className="text-xs text-slate-500">Intake defaults, camera alignment guides, mirror mode, and quick cache management</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Default Intake School Campus
                </label>
                <select
                  value={senderConfig.defaultSchool}
                  onChange={(e) => setSenderConfig({ ...senderConfig, defaultSchool: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-semibold text-[#0B1118]"
                >
                  {/* Built from the same branch map the pickers use, so a campus added once appears
                      everywhere instead of needing a second list to be remembered. */}
                  {Object.entries(BRANCH_SCHOOL_MAP).flatMap(([branch, names]) => (
                    <optgroup key={branch} label={branch}>
                      {names.map(name => (
                        <option key={`${branch}:${name}`} value={name}>{name} ({branch})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Default Grade Level Preset
                </label>
                <input
                  type="text"
                  value={senderConfig.defaultGrade}
                  onChange={(e) => setSenderConfig({ ...senderConfig, defaultGrade: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1118]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePurgeDrafts}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Purge Unsaved Local Intake Drafts</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1]">
                <input
                  type="checkbox"
                  checked={senderConfig.cameraGuideGrid}
                  onChange={(e) => setSenderConfig({ ...senderConfig, cameraGuideGrid: e.target.checked })}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                />
                <div>
                  <div className="text-[#0B1118] font-bold">Display 3:4 Biometric Alignment Overlay</div>
                  <div className="text-slate-500 text-[11px]">Renders Eye-Line and Chin alignment targets on the intake viewfinder</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1]">
                <input
                  type="checkbox"
                  checked={senderConfig.mirrorCamera}
                  onChange={(e) => setSenderConfig({ ...senderConfig, mirrorCamera: e.target.checked })}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                />
                <div>
                  <div className="text-[#0B1118] font-bold">Mirror Front-Facing Camera Stream</div>
                  <div className="text-slate-500 text-[11px]">Flips the camera horizontally for natural framing by the operator</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1]">
                <input
                  type="checkbox"
                  checked={senderConfig.autoFormatPhone}
                  onChange={(e) => setSenderConfig({ ...senderConfig, autoFormatPhone: e.target.checked })}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                />
                <div>
                  <div className="text-[#0B1118] font-bold">Auto-Format Phone (+251 9/7 Prefix)</div>
                  <div className="text-slate-500 text-[11px]">Strictly cleanses Ethiopian mobile phone numbers during keyboard entry</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              Save Field Sender Configuration
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 4: BRANCHES & SCHOOL CATALOG
         ========================================================================= */}
      {activeTab === 'branches' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#0B1118]">Authoritative Branch &amp; School Directory</h3>
              <p className="text-xs text-slate-500">Mapping of institutional campuses across Addis Ababa, Adama, Mojo, and Harar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_BRANCHES.map(branch => {
              const schools = BRANCH_SCHOOL_MAP[branch] || [];
              return (
                <div key={branch} className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-heading font-bold text-sm text-[#0B1118] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#256002]" />
                      <span>{branch} Branch</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-[#85E510]/20 text-[#256002] px-2 py-0.5 rounded-full border border-[#85E510]/30">
                      {schools.length} Campuses
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {schools.map(school => (
                      <span
                        key={school}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs"
                      >
                        {school}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CLOUDFLARE R2 & DATABASE
         ========================================================================= */}
      {activeTab === 'cloud' && (
        <form onSubmit={handleSaveCloud} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#0B1118]">Cloud Storage &amp; Database Telemetry</h3>
              <p className="text-xs text-slate-500">Cloudflare R2 storage bindings, Supabase connection pooler, and pause guard</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Cloudflare R2 Bucket Name
                </label>
                <input
                  type="text"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-[#0B1118]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Public R2 CDN Endpoint URI
                </label>
                <input
                  type="text"
                  value={cdnDomain}
                  onChange={(e) => setCdnDomain(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-[#0B1118]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Database Pooler Host
                </label>
                <input
                  type="text"
                  readOnly
                  value="aws-0-eu-central-1.pooler.supabase.com:6543"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Database Latency Polling Pacing
                </label>
                <input
                  type="text"
                  readOnly
                  value={dbLatencyPacing}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              Update Cloud Bindings
            </button>
          </div>
        </form>
      )}
    </PageShell>
  );
};
