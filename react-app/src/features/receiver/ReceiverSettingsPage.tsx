import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Smartphone, Shield, LogOut, CheckCircle2, Download, Table, Save } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
            Receiver Station Settings
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Directory density settings, export conventions, operator credentials, and terminal locks
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
        {/* User Account */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833]">Receiver Account</h3>
              <p className="text-[11px] text-[#64748B]">Central repository review privileges</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#64748B] block font-medium">Username</span>
              <span className="font-bold text-[#202833]">{user?.username || 'yonatantesfa'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-medium">Email</span>
              <span className="font-mono text-[#202833]">{user?.email || 'yonatantesfa@gmail.com'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-medium">Station Role</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                {user?.role || 'RECEIVER'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Device Lock */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833]">Terminal Security</h3>
              <p className="text-[11px] text-[#64748B]">1-Device hardware binding status</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#64748B] block font-medium">Bound Terminal ID</span>
              <span className="font-mono font-bold text-[#366804] bg-[#F8FAF9] px-2.5 py-1 rounded-lg border border-[#E2E8F0] inline-block mt-1">
                {deviceId}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] text-[11px] text-[#64748B] leading-relaxed">
              This terminal is registered with 1-Device lock enforcement. Changes require Super Admin authorization.
            </div>
          </div>
        </div>

        {/* Directory & Export Preferences */}
        <div className="md:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#85E510]/20 flex items-center justify-center text-[#4D8A07]">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-[#202833]">Directory & Export Preferences</h3>
              <p className="text-[11px] text-[#64748B]">Default directory page size and archive naming conventions</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#202833] font-bold mb-1.5">Default Table Density</label>
                <select
                  value={defaultPageSize}
                  onChange={(e) => setDefaultPageSize(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                >
                  <option value="25">25 records per page</option>
                  <option value="50">50 records per page</option>
                  <option value="100">100 records per page</option>
                  <option value="250">250 records per page</option>
                  <option value="500">500 records per page (High Density)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1.5">Classified Photo ZIP Partitioning</label>
                <select
                  value={zipConvention}
                  onChange={(e) => setZipConvention(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                >
                  <option value="School/Grade/ID_Name.jpg">{'{School}/{Grade}/{ID}_{Name}.jpg'}</option>
                  <option value="Grade/ID_Name.jpg">{'{Grade}/{ID}_{Name}.jpg'}</option>
                  <option value="Flat/ID_Name.jpg">{'{ID}_{Name}.jpg'} (Single Folder)</option>
                </select>
              </div>
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
