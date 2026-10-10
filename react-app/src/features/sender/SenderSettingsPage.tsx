import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Smartphone, Shield, LogOut, CheckCircle2, Sliders, Camera, School, MapPin } from 'lucide-react';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId } from '@/lib/store';

export const SenderSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  const [photoResolution, setPhotoResolution] = useState('1280x720 (HD - ISO 19794)');
  const [autoCrop, setAutoCrop] = useState(true);
  const [compressFormat, setCompressFormat] = useState('WebP / JPEG Optimized');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage('Sender camera & capture preferences saved successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Sender Station Settings</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Workstation preferences, field operator credentials, and 1-device hardware binding
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85e510]/15 border border-[#85e510]/30 text-[#85e510] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#1e2e42]">
            <div className="w-10 h-10 rounded-xl bg-[#85e510]/10 flex items-center justify-center text-[#85e510]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Operator Account</h3>
              <p className="text-[11px] text-[#94a3b8]">Active credentials on this field station</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#94a3b8] block">Username</span>
              <span className="font-semibold text-white">{user?.username || 'miskrdires12'}</span>
            </div>

            <div>
              <span className="text-[#94a3b8] block">Email</span>
              <span className="font-mono text-white">{user?.email || 'miskrdires12@gmail.com'}</span>
            </div>

            <div>
              <span className="text-[#94a3b8] block">Operating Role</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#85e510]/15 text-[#85e510]">
                {user?.role || 'SENDER'}
              </span>
            </div>

            <div>
              <span className="text-[#94a3b8] block">Assigned Station / School Campus</span>
              <div className="flex items-center gap-1.5 text-white font-medium mt-0.5">
                <School className="w-3.5 h-3.5 text-[#85e510]" />
                <span>YMS Main Campus</span>
                <span className="text-[#94a3b8]">&bull;</span>
                <span className="text-[#94a3b8]">Addis Ababa</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Device Lock Hardware Card */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#1e2e42]">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white">1-Device Hardware Lock</h3>
              <p className="text-[11px] text-[#94a3b8]">Enforced workstation security policy</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#94a3b8] block">Authorized Terminal ID</span>
              <span className="font-mono font-bold text-[#85e510]">{deviceId}</span>
            </div>

            <div>
              <span className="text-[#94a3b8] block">Lock Enforcement</span>
              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                <Shield className="w-3 h-3" />
                <span>Device Binding ACTIVE</span>
              </span>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed pt-2 border-t border-[#1e2e42]/60">
              This Sender account is exclusively locked to this terminal. To migrate to a different camera or computer, contact your Super Admin to reset the hardware authorization.
            </p>
          </div>
        </div>
      </div>

      {/* Photo Capture & Quality Preferences */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#1e2e42]">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-heading font-bold text-white">Photo Capture & ISO Guidelines</h3>
            <p className="text-[11px] text-[#94a3b8]">Configured constraints for live student biometric photography</p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Capture Resolution</label>
              <select
                value={photoResolution}
                onChange={(e) => setPhotoResolution(e.target.value)}
                className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
              >
                <option value="1280x720 (HD - ISO 19794)">1280x720 (HD - ISO 19794)</option>
                <option value="1920x1080 (FHD)">1920x1080 (Full HD)</option>
                <option value="800x600 (Standard)">800x600 (Standard)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Compression Target</label>
              <select
                value={compressFormat}
                onChange={(e) => setCompressFormat(e.target.value)}
                className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
              >
                <option value="WebP / JPEG Optimized">WebP / JPEG Optimized (~250 KB)</option>
                <option value="Raw High Quality">Raw High Quality (~800 KB)</option>
                <option value="Ultra Compressed">Ultra Compressed (~100 KB)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Auto Face Alignment Oval</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="autocrop"
                  checked={autoCrop}
                  onChange={(e) => setAutoCrop(e.target.checked)}
                  className="w-4 h-4 rounded text-[#85e510] bg-[#0d1520] border-[#1e2e42] focus:ring-[#85e510]"
                />
                <label htmlFor="autocrop" className="text-xs font-semibold text-white cursor-pointer">
                  Display Biometric Framing Guide
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-lg shadow-[#85e510]/20 transition-all"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
