import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Award, Users, CheckCircle2 } from 'lucide-react';
import { getUsers, getStudents } from '@/lib/store';
import { User, Student } from '@/types';

export const AdminPerformancePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    setUsers(getUsers());
    setStudents(getStudents());
  }, []);

  const senders = users.filter(u => u.role === 'SENDER');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Workforce Performance & KPI Matrix</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Cross-station velocity tracking, quality acceptance rates, and operator throughput
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          Regional SLA: 98.5% Met
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Top Field Operator</span>
          <div className="mt-2 text-lg font-bold text-white">Loza Bereket</div>
          <div className="text-xs text-[#8fe617] font-mono mt-0.5">842 Students Captured &bull; 99.8% Quality</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Average Daily Volume</span>
          <div className="mt-2 text-lg font-bold text-white">340 Students / Day</div>
          <div className="text-xs text-blue-400 font-mono mt-0.5">&uarr; 18% vs Previous Month</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Photo Alignment Compliance</span>
          <div className="mt-2 text-lg font-bold text-[#8fe617]">96.1% Pass Rate</div>
          <div className="text-xs text-[#9eb2a6] mt-0.5">Cloudflare Edge AI pre-screen</div>
        </div>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
        <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4">
          Operator Productivity Leaderboard
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="pb-3 pl-2">Rank & Operator</th>
                <th className="pb-3">Station Role</th>
                <th className="pb-3">Submissions</th>
                <th className="pb-3">Accuracy</th>
                <th className="pb-3 text-right pr-2">SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {senders.map((s, idx) => (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pl-2 flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#8fe617] w-5">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-white text-xs">{s.username}</div>
                      <div className="text-[10px] text-[#9eb2a6]">{s.email}</div>
                    </div>
                  </td>
                  <td className="py-3 text-[#9eb2a6] font-mono text-[11px]">{s.role}</td>
                  <td className="py-3 font-mono text-white">{Math.floor(800 - idx * 45)} records</td>
                  <td className="py-3 font-mono text-[#8fe617]">{(99.8 - idx * 0.2).toFixed(1)}%</td>
                  <td className="py-3 text-right pr-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                      Compliant
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
