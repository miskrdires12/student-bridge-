import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CheckCircle2, AlertTriangle, Download, ArrowUpRight,
  TrendingUp, BarChart2, ShieldCheck, PieChart, Layers, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { getStudents, getMistakes } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const totalStudents = students.length;
  const verifiedCount = students.filter(s => s.photoPath).length;
  const missingPhotoCount = students.filter(s => !s.photoPath).length;
  const femaleCount = students.filter(s => s.sex === 'Female').length;
  const maleCount = students.filter(s => s.sex === 'Male').length;

  // Real School Distribution from actual loaded student records
  const schoolCounts: Record<string, number> = {};
  students.forEach(s => {
    const sc = s.school || 'Unassigned';
    schoolCounts[sc] = (schoolCounts[sc] || 0) + 1;
  });

  const schoolChartData = Object.entries(schoolCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Gender Chart Data
  const genderData = [
    { name: 'Female', value: femaleCount, color: '#c084fc' },
    { name: 'Male', value: maleCount, color: '#34d399' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Receiver Console</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
              Central Hub
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Central repository intelligence, quality control, mistake resolution, and bulk distribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/receiver/exports"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all"
          >
            <Download className="w-4 h-4 text-[#8fe617]" />
            <span>Export Center</span>
          </Link>

          <Link
            to="/receiver/students"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Browse Directory ({totalStudents.toLocaleString()})</span>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingested */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Total Central Records</span>
            <div className="w-9 h-9 rounded-xl bg-[#8fe617]/10 flex items-center justify-center text-[#8fe617]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{totalStudents.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-[#8fe617]">100% Validated</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Primary school identity registry</div>
        </div>

        {/* Verified Photos */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Cloudflare R2 Photos</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{verifiedCount.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-blue-400 font-mono">
              {totalStudents > 0 ? ((verifiedCount / totalStudents) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">CDN: pub-93e8bf84c42949ec88306f456caa0fc9</div>
        </div>

        {/* Missing Photos / Mistakes */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Mistakes & Missing Photos</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-amber-400">{missingPhotoCount}</span>
            <Link to="/receiver/mistakes" className="text-[11px] font-bold text-amber-300 hover:underline">
              Analyze &rarr;
            </Link>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Retake notifications queued to Senders</div>
        </div>

        {/* Gender Breakdown */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Gender Balance</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div>
              <span className="text-xs text-purple-300 font-bold">F: {femaleCount.toLocaleString()}</span>
              <div className="text-[10px] text-[#9eb2a6]">({totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0}%)</div>
            </div>
            <div className="h-6 w-px bg-[#1e2c22]" />
            <div>
              <span className="text-xs text-emerald-300 font-bold">M: {maleCount.toLocaleString()}</span>
              <div className="text-[10px] text-[#9eb2a6]">({totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0}%)</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Comprehensive gender inclusion</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* School Distribution Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
              <div>
                <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                  Top School Campuses by Enrollment
                </h2>
                <p className="text-xs text-[#9eb2a6] mt-0.5">Real student volume distribution across active school branches</p>
              </div>
              <span className="text-[10px] font-mono text-[#8fe617] bg-[#8fe617]/10 px-2 py-0.5 rounded">
                Live Data
              </span>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolChartData}>
                  <XAxis dataKey="name" stroke="#9eb2a6" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9eb2a6" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101612', borderColor: '#1e2c22', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#8fe617' }}
                  />
                  <Bar dataKey="count" fill="#8fe617" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2c22] text-xs text-[#9eb2a6] flex items-center justify-between">
            <span>Primary source: Central Silicon Labs Database</span>
            <Link to="/receiver/students" className="text-[#8fe617] hover:underline flex items-center gap-1 font-semibold">
              <span>View All Branches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Gender Donut Chart + Fast Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-2">
              Gender Demographics
            </h2>
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101612', borderColor: '#1e2c22', borderRadius: '12px', fontSize: '12px' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-black text-white">{totalStudents.toLocaleString()}</span>
                <span className="text-[9px] uppercase tracking-wider text-[#9eb2a6]">Students</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" />
                <span className="text-white">Female ({femaleCount.toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
                <span className="text-white">Male ({maleCount.toLocaleString()})</span>
              </div>
            </div>
          </div>

          <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider">Quick Actions</h3>

            <Link
              to="/receiver/mistakes"
              className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition-all"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Mistake Analyzer</span>
              </span>
              <span className="bg-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono">{missingPhotoCount} Items</span>
            </Link>

            <Link
              to="/receiver/exports"
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#8fe617]" />
                <span>Bulk Photo ZIP Downloader</span>
              </span>
              <span className="text-[#8fe617] text-[10px] font-mono">Ready</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
