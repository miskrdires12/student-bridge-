import React from 'react';
import { BarChart3, TrendingUp, Zap, Clock, ShieldCheck, CheckCircle2, Award } from 'lucide-react';

export const SenderPerformancePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Operator Velocity & KPIs</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Real-time biometric capture cadence, error rates, and quality scores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[#8fe617]/10 text-[#8fe617] border border-[#8fe617]/20 text-xs font-bold font-mono">
            Rating: 99.4% Tier A+
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Average Capture Time</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">42s</span>
            <span className="text-xs text-[#8fe617] font-bold">&darr; 8s vs benchmark</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">From form open to R2 upload</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Daily Quota Pace</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">128</span>
            <span className="text-xs text-blue-400 font-bold">Students / Shift</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Target: 100 students/day</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Mistake Rejection Rate</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#8fe617]">0.6%</span>
            <span className="text-xs text-[#8fe617] font-bold">Ultra Low</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Audited by Central Receiver</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Field Reliability</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-purple-400">100%</span>
            <span className="text-xs text-purple-300 font-bold">Zero Dropped</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Cloudflare Edge Sync Verified</div>
        </div>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6">
        <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4">
          Hourly Capture Cadence (Today's Shift)
        </h2>
        <div className="grid grid-cols-8 gap-2 h-40 items-end pt-6 border-b border-[#1e2c22]">
          {[
            { hour: '08:00', count: 8 },
            { hour: '09:00', count: 18 },
            { hour: '10:00', count: 24 },
            { hour: '11:00', count: 28 },
            { hour: '12:00', count: 12 },
            { hour: '13:00', count: 22 },
            { hour: '14:00', count: 26 },
            { hour: '15:00', count: 16 }
          ].map(slot => (
            <div key={slot.hour} className="flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[10px] font-mono text-[#8fe617] font-bold">{slot.count}</span>
              <div
                style={{ height: `${(slot.count / 30) * 100}%` }}
                className="w-full bg-[#8fe617]/30 hover:bg-[#8fe617] rounded-t-lg transition-all"
              />
              <span className="text-[10px] font-mono text-[#9eb2a6]">{slot.hour}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
