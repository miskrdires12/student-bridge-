import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Smartphone, Shield, LogOut, CheckCircle2, Sliders, Camera, School, MapPin, Save } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
            Sender Station Settings
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Workstation preferences, field operator credentials, and 1-device hardware binding
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#85E510]/20 flex items-center justify-center text-[#4D8A07]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833]">Operator Account</h3>
              <p className="text-[11px] text-[#64748B]">Active credentials on this field station</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#64748B] block font-medium">Username</span>
              <span className="font-bold text-[#202833]">{user?.username || 'miskrdires12'}</span>
            </div>

            <div>
              <span className="text-[#64748B] block font-medium">Email Address</span>
              <span className="font-mono font-semibold text-[#202833]">{user?.email || 'miskrdires12@gmail.com'}</span>
            </div>

            <div>
              <span className="text-[#64748B] block font-medium">Station Assignment</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/20 text-[#366804] border border-[#85E510]/30">
                {user?.role || 'SENDER'}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block font-medium">Assigned Campus</span>
              <div className="flex items-center gap-1.5 text-[#202833] font-bold mt-0.5">
                <School className="w-3.5 h-3.5 text-[#4D8A07]" />
                <span>YMS Main Campus</span>
                <span className="text-[#94A3B8]">&bull;</span>
                <span className="text-[#64748B] font-normal">Addis Ababa</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Device Lock Hardware Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833]">1-Device Hardware Lock</h3>
              <p className="text-[11px] text-[#64748B]">Active physical terminal binding</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#64748B] block font-medium">Terminal Hardware ID</span>
              <span className="font-mono font-bold text-[#202833] bg-[#F8FAF9] px-2.5 py-1 rounded-lg border border-[#E2E8F0] inline-block mt-1">
                {deviceId}
              </span>
            </div>

            <div>
              <span className="text-[#64748B] block font-medium">Binding Status</span>
              <div className="flex items-center gap-1.5 mt-1 text-[#366804] font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>Locked to this Terminal</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed pt-1">
              To transfer your operator account to another physical computer or mobile tablet, please contact your Super Admin to reset the hardware lock binding.
            </p>
          </div>
        </div>

        {/* Biometric Camera Preferences Card */}
        <div className="md:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#85E510]/20 flex items-center justify-center text-[#4D8A07]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833]">Camera & Biometric Capture Preferences</h3>
              <p className="text-[11px] text-[#64748B]">Hardware stream settings and automatic portrait adjustments</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#202833] font-bold mb-1.5">Capture Resolution</label>
                <select
                  value={photoResolution}
                  onChange={(e) => setPhotoResolution(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                >
                  <option value="1280x720 (HD - ISO 19794)">1280x720 (HD - ISO 19794)</option>
                  <option value="1920x1080 (Full HD)">1920x1080 (Full HD)</option>
                  <option value="640x480 (Standard)">640x480 (Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1.5">Compression & Storage Format</label>
                <select
                  value={compressFormat}
                  onChange={(e) => setCompressFormat(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                >
                  <option value="WebP / JPEG Optimized">WebP / JPEG Optimized</option>
                  <option value="Lossless JPEG">Lossless JPEG</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autocrop"
                checked={autoCrop}
                onChange={(e) => setAutoCrop(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
              />
              <label htmlFor="autocrop" className="text-xs text-[#202833] font-medium cursor-pointer">
                Automatically enable face guide overlay during WebRTC camera streaming
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
