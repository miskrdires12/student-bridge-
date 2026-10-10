import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Smartphone, Shield, LogOut, CheckCircle2, Award, Clock } from 'lucide-react';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId } from '@/lib/store';

export const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  const [escalationDays, setEscalationDays] = useState('3');
  const [minAccuracyTarget, setMinAccuracyTarget] = useState('90%');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage('Admin supervision thresholds saved successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Admin Station Settings</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Workforce quotas, task escalation rules, operator credentials, and terminal locks
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all shadow-sm"
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
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-[#202833]">Supervisor Account</h3>
              <p className="text-xs text-[#64748B]">Regional station management identity</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Operator Username:</span>
              <span className="font-bold text-[#202833]">{user?.username || 'miskrdires1'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Authenticated Email:</span>
              <span className="font-mono text-[#202833]">{user?.email || 'miskrdires1@gmail.com'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Assigned Role:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {user?.role || 'ADMIN'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#64748B]">Bound Terminal:</span>
              <span className="font-mono text-[#2E7D32] font-bold">{deviceId}</span>
            </div>
          </div>
        </div>

        {/* Supervision Parameters Form */}
        <form onSubmit={handleSave} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-xl bg-[#85E510]/15 border border-[#85E510]/30 flex items-center justify-center text-[#2E7D32]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-[#202833]">Supervision Parameters</h3>
              <p className="text-xs text-[#64748B]">Quality benchmarks and task escalation timeouts</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#64748B] uppercase font-bold mb-1">
                Task Escalation Overdue Timeout (Days)
              </label>
              <input
                type="text"
                value={escalationDays}
                onChange={(e) => setEscalationDays(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] focus:outline-none focus:border-[#85E510]"
              />
            </div>

            <div>
              <label className="block text-[#64748B] uppercase font-bold mb-1">
                Minimum Photo Quality Target
              </label>
              <input
                type="text"
                value={minAccuracyTarget}
                onChange={(e) => setMinAccuracyTarget(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] focus:outline-none focus:border-[#85E510]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
              >
                Save Supervision Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
