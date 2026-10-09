import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Users, Cpu, Calendar, TrendingUp,
  Award, ArrowUpRight, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getStudents, getUsers } from '@/lib/store';

export const SuperAdminDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  // Records by station data matching screenshot 14
  const recordsByStation = [
    { station: 'Sender 1', count: 4850 },
    { station: 'Sender 2', count: 3920 },
    { station: 'Sender 3', count: 3410 },
    { station: 'Sender 4', count: 2680 },
    { station: 'Other', count: 1882 },
  ];

  // Top Senders matching screenshot 14
  const topSenders = [
    { name: 'Loza Bereket', school: 'YMS', records: 1245, rate: '94%' },
    { name: 'Alemu Tadesse', school: 'Adika Youth', records: 982, rate: '91%' },
    { name: 'Hana Tadesse', school: 'School of America', records: 756, rate: '88%' },
    { name: 'Getnet Kassa', school: 'Ferway', records: 542, rate: '62%' },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Date Range - Matching Screenshot 14 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Global Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Holistic cross-station telemetry, student identity distribution, and workforce efficiency
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131e2b] border border-[#1e2e42] text-xs font-medium text-white">
          <Calendar className="w-3.5 h-3.5 text-[#85e510]" />
          <span>Oct 1, 2025 &ndash; Oct 13, 2025</span>
        </div>
      </div>

      {/* Top 4 KPI Cards - Exact values from screenshot 14 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#85e510]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Total Records</div>
          <div className="mt-2 text-3xl font-heading font-black text-white">16,742</div>
          <div className="mt-1 text-[11px] text-[#85e510] font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+12.4% vs prev period</span>
          </div>
        </div>

        {/* Accepted */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#85e510]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Accepted</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#85e510]">14,892</div>
          <div className="mt-1 text-[11px] text-[#94a3b8]">Verified student profiles</div>
        </div>

        {/* Rejected */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-red-500/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Rejected</div>
          <div className="mt-2 text-3xl font-heading font-black text-red-400">1,120</div>
          <div className="mt-1 text-[11px] text-red-300">Flagged photo / data errors</div>
        </div>

        {/* Corrected */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#38bdf8]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Corrected</div>
          <div className="mt-2 text-3xl font-heading font-black text-[#38bdf8]">730</div>
          <div className="mt-1 text-[11px] text-[#38bdf8]">Resolved field submissions</div>
        </div>
      </div>

      {/* Analytics Visuals Grid: Records by Station + Efficiency Rate + Top Senders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Records by Station Bar Chart (6 cols) */}
        <div className="lg:col-span-6 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2e42]">
              <div>
                <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                  Records by Station
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">Capture distribution across field workforce stations</p>
              </div>
              <span className="text-[10px] font-mono text-[#85e510] bg-[#85e510]/10 px-2 py-0.5 rounded">
                Telemetry
              </span>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recordsByStation}>
                  <XAxis dataKey="station" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131e2b', borderColor: '#1e2e42', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#85e510' }}
                  />
                  <Bar dataKey="count" fill="#85e510" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2e42] text-xs text-[#94a3b8] flex items-center justify-between">
            <span>Primary storage: Cloudflare R2 bucket siliconlabs</span>
            <span className="text-[#85e510] font-bold">100% Edge Bound</span>
          </div>
        </div>

        {/* Efficiency Rate Circular Gauge (3 cols) */}
        <div className="lg:col-span-3 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#1e2e42]">
              <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                Efficiency Rate
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Platform aggregate completion</p>
            </div>

            <div className="h-44 w-full flex items-center justify-center relative mt-4">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#1e2e42]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#85e510]"
                  strokeDasharray="87, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-2xl font-heading font-black text-white">87%</div>
                <div className="text-[10px] text-[#85e510] font-bold uppercase">Optimal</div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-[#94a3b8] text-center mt-2">
              <div>First-pass verification: <strong className="text-white">88.9%</strong></div>
              <div>Retake turnaround: <strong className="text-white">&lt; 24h</strong></div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2e42] text-[11px] text-[#85e510] text-center font-semibold">
            Health Check: All Stations Nominal
          </div>
        </div>

        {/* Top Senders List (3 cols) */}
        <div className="lg:col-span-3 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#1e2e42]">
              <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                Top Senders
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Highest throughput operators</p>
            </div>

            <div className="divide-y divide-[#1e2e42]/60 mt-3">
              {topSenders.map(s => (
                <div key={s.name} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{s.name}</div>
                    <div className="text-[10px] text-[#94a3b8]">{s.school} &bull; {s.records} entries</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510]">
                    {s.rate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2e42] text-xs">
            <Link to="/super-admin/users" className="text-[#85e510] hover:underline flex items-center gap-1 font-semibold">
              <span>View All Operators</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
