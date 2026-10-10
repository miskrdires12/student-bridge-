import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Smartphone, Shield, LogOut, CheckCircle2, Download, Table } from 'lucide-react';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId } from '@/lib/store';

export const ReceiverSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  const [defaultPageSize, setDefaultPageSize] = useState('100');
  const [zipConvention, setZipConvention] = useState('School/Grade/ID_Name.jpg');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage('Receiver workstation preferences saved.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Receiver Station Settings</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Directory density settings, export conventions, operator credentials, and terminal locks
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
        {/* User Account */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#1e2e42]">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Receiver Account</h3>
              <p className="text-[11px] text-[#94a3b8]">Central repository review privileges</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#94a3b8] block">Username</span>
              <span className="font-semibold text-white">{user?.username || 'yonatantesfa'}</span>
            </div>
            <div>
              <span className="text-[#94a3b8] block">Email</span>
              <span className="font-mono text-white">{user?.email || 'yonatantesfa@gmail.com'}</span>
            </div>
            <div>
              <span className="text-[#94a3b8] block">Station Role</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">
                {user?.role || 'RECEIVER'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Device Lock */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#1e2e42]">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white">Terminal Security</h3>
              <p className="text-[11px] text-[#94a3b8]">1-Device hardware binding status</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#94a3b8] block">Bound Terminal ID</span>
              <span className="font-mono font-bold text-[#85e510]">{deviceId}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1520] border border-[#1e2e42] text-[11px] text-[#94a3b8]">
              This terminal is approved for student verification, review queues, and photo export generation.
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider pb-2 border-b border-[#1e2e42]">
          Operational Preferences
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Default Directory Page Size</label>
              <select
                value={defaultPageSize}
                onChange={(e) => setDefaultPageSize(e.target.value)}
                className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
              >
                <option value="50">50 records per page</option>
                <option value="100">100 records per page (Recommended)</option>
                <option value="250">250 records per page (High Density)</option>
                <option value="500">500 records per page (Ultra Density)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#94a3b8] block mb-1">ZIP Archive Folder Structure</label>
              <select
                value={zipConvention}
                onChange={(e) => setZipConvention(e.target.value)}
                className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
              >
                <option value="School/Grade/ID_Name.jpg">School / Grade / ID_Name.jpg</option>
                <option value="Flat/ID.jpg">Flat Directory / ID.jpg</option>
                <option value="Grade/School/ID.jpg">Grade / School / ID.jpg</option>
              </select>
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
