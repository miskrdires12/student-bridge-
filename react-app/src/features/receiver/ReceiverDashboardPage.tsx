import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CheckCircle2, AlertTriangle, Download, ArrowUpRight,
  TrendingUp, BarChart2, ShieldCheck, PieChart, Layers, Calendar, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const refreshData = () => {
      setStudents(getStudents());
    };
    refreshData();

    window.addEventListener('studentbridge_datachange', refreshData);
    return () => window.removeEventListener('studentbridge_datachange', refreshData);
  }, []);

  const totalStudents = students.length || 3723;

  // Daily volume data matching screenshot 4
  const dailyCaptureData = [
    { day: 'Mon', submitted: 220, accepted: 195 },
    { day: 'Tue', submitted: 260, accepted: 240 },
    { day: 'Wed', submitted: 310, accepted: 285 },
    { day: 'Thu', submitted: 290, accepted: 265 },
    { day: 'Fri', submitted: 340, accepted: 315 },
    { day: 'Sat', submitted: 180, accepted: 165 },
    { day: 'Sun', submitted: 140, accepted: 130 },
  ];

  // Top Schools data matching screenshot 4
  const topSchools = [
    { name: 'YMS', count: 1245, percentage: 33 },
    { name: 'Adika Youth', count: 982, percentage: 26 },
    { name: 'School of America', count: 756, percentage: 20 },
    { name: 'Ferway', count: 542, percentage: 14 },
    { name: 'Warka', count: 398, percentage: 10 },
  ];

  // Record status donut data matching screenshot 4
  const recordStatusData = [
    { name: 'Accepted', value: 89.2, color: '#85e510' },
    { name: 'Rejected', value: 4.1, color: '#ef4444' },
    { name: 'Corrected', value: 3.5, color: '#38bdf8' },
    { name: 'Pending', value: 3.2, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Header - Matching Screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
              Live Station
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#94a3b8] mt-1">
            <Calendar className="w-3.5 h-3.5 text-[#85e510]" />
            <span>Oct 13, 2025</span>
            <span>&bull;</span>
            <span>Central Ingestion Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/receiver/exports"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#131e2b] hover:bg-[#1a2839] border border-[#1e2e42] text-xs font-bold text-white transition-all"
          >
            <Download className="w-4 h-4 text-[#85e510]" />
            <span>Export Registry</span>
          </Link>

          <Link
            to="/receiver/students"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-[0_0_20px_rgba(133,229,16,0.3)] transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Student Directory ({totalStudents.toLocaleString()})</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards (Row 1): Total, Today, This Month, Rejected - Screenshot 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Total Records</div>
          <div className="mt-2 text-3xl font-heading font-black text-white">{totalStudents.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#85e510] font-semibold">100% Unique IDs</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Today's Submissions</div>
          <div className="mt-2 text-3xl font-heading font-black text-white">248</div>
          <div className="mt-1 text-[11px] text-[#85e510] font-semibold">+18 in last hour</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">This Month</div>
          <div className="mt-2 text-3xl font-heading font-black text-white">6,543</div>
          <div className="mt-1 text-[11px] text-[#38bdf8] font-semibold">All Campuses</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">This Month Rejected</div>
          <div className="mt-2 text-3xl font-heading font-black text-red-400">698</div>
          <div className="mt-1 text-[11px] text-red-300 font-semibold">Flagged for retake</div>
        </div>
      </div>

      {/* Secondary Metric Cards (Row 2): Pending Review, Rejected Today, Corrected, Missing Photos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-[#94a3b8] uppercase">Pending Review</div>
          <div className="mt-1 text-2xl font-heading font-black text-amber-400">142</div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Awaiting verification</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-[#94a3b8] uppercase">Rejected Today</div>
          <div className="mt-1 text-2xl font-heading font-black text-red-400">37</div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Quality threshold fail</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-[#94a3b8] uppercase">Corrected</div>
          <div className="mt-1 text-2xl font-heading font-black text-[#38bdf8]">21</div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Resolved by field</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-4">
          <div className="text-[11px] font-semibold text-[#94a3b8] uppercase">Missing Photos</div>
          <div className="mt-1 text-2xl font-heading font-black text-amber-400">37</div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Camera capture skipped</div>
        </div>
      </div>

      {/* Analytics Charts Grid: Daily Volume + Top Schools + Record Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Capture Volume (6 cols) */}
        <div className="lg:col-span-6 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2e42]">
              <div>
                <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                  Daily Capture Volume
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">Submitted vs Accepted by day</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-[#85e510]">
                  <span className="w-2.5 h-2.5 rounded bg-[#85e510]" />
                  Submitted
                </span>
                <span className="flex items-center gap-1.5 text-[#38bdf8]">
                  <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]" />
                  Accepted
                </span>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCaptureData}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131e2b', borderColor: '#1e2e42', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="submitted" fill="#85e510" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accepted" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-3 border-t border-[#1e2e42] text-xs text-[#94a3b8] flex items-center justify-between">
            <span>Aggregated across all field stations</span>
            <span className="text-[#85e510] font-mono text-[11px]">Real-time edge telemetry</span>
          </div>
        </div>

        {/* Top Schools by Records (3 cols) */}
        <div className="lg:col-span-3 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#1e2e42]">
              <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                Top Schools by Records
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Highest volume campuses</p>
            </div>

            <div className="space-y-4 mt-4">
              {topSchools.map(school => (
                <div key={school.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{school.name}</span>
                    <span className="font-mono text-[#85e510] font-bold">{school.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#0d1520] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#85e510] h-full rounded-full transition-all duration-500"
                      style={{ width: `${school.percentage * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2e42] text-xs">
            <Link to="/receiver/students" className="text-[#85e510] hover:underline flex items-center gap-1 font-semibold">
              <span>View School Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Record Status Donut Chart (3 cols) */}
        <div className="lg:col-span-3 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#1e2e42]">
              <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                Record Status
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Ingestion compliance breakdown</p>
            </div>

            <div className="h-44 w-full flex items-center justify-center relative mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={recordStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {recordStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131e2b', borderColor: '#1e2e42', borderRadius: '12px', fontSize: '11px' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <div className="text-base font-heading font-black text-white">3,723</div>
                <div className="text-[9px] text-[#94a3b8] font-bold uppercase">Total</div>
              </div>
            </div>

            <div className="space-y-1.5 mt-2 text-xs">
              {recordStatusData.map(stat => (
                <div key={stat.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#94a3b8]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                    {stat.name}
                  </span>
                  <span className="font-mono text-white font-bold">{stat.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2e42] text-[11px] text-[#94a3b8]">
            Quality assurance: High
          </div>
        </div>
      </div>
    </div>
  );
};
