import React, { useState } from 'react';
import { UserCheck, Smartphone, Shield, Key, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/store';

export const SenderProfilePage: React.FC = () => {
  const user = getCurrentUser();
  const [deviceFingerprint] = useState(() => localStorage.getItem('sb_device_fingerprint') || 'DEV-EDGE-ADDIS-PRIMARY');

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Operator Profile & Station Binding</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Hardware lock security, biometric station certificates, and account details
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-[#8fe617]/15 text-[#8fe617] text-xs font-bold font-mono">
          Hardware Locked: Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#1e2c22]">
            <div className="w-12 h-12 rounded-full bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center font-bold text-white text-lg">
              {user?.username?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <div className="font-heading font-bold text-base text-white">{user?.username || 'Field Operator'}</div>
              <div className="text-xs text-[#8fe617] font-mono">{user?.email || 'sender@siliconlabs.et'}</div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#1e2c22]/50">
              <span className="text-[#9eb2a6]">Assigned Station:</span>
              <span className="text-white font-medium">Sender Workstation (Live Cam)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1e2c22]/50">
              <span className="text-[#9eb2a6]">Access Role:</span>
              <span className="px-2 py-0.5 rounded bg-[#8fe617]/10 text-[#8fe617] font-bold">FIELD SENDER</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1e2c22]/50">
              <span className="text-[#9eb2a6]">Cloudflare Edge Token:</span>
              <span className="font-mono text-white">cf-tok-edge-7492</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#9eb2a6]">Last Active Session:</span>
              <span className="text-white">Just now (Live)</span>
            </div>
          </div>
        </div>

        {/* 1-Device Hardware Lock Card */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#1e2c22]">
            <Smartphone className="w-5 h-5 text-[#8fe617]" />
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
              1-Device Security Lock
            </h2>
          </div>

          <p className="text-xs text-[#9eb2a6] leading-relaxed">
            In compliance with Silicon Labs security policy, this sender account is bound to a single authorized workstation. Attempts to sign in from unauthorized browsers will be blocked automatically.
          </p>

          <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#9eb2a6]">Bound Device ID:</span>
              <span className="font-mono text-[#8fe617] font-bold">{deviceFingerprint}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9eb2a6]">Platform:</span>
              <span className="text-white font-mono">{navigator.platform || 'Win32/x64'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9eb2a6]">Security Status:</span>
              <span className="text-[#8fe617] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Bound & Protected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
