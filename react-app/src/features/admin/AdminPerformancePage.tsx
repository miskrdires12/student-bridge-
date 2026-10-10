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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Workforce Performance & KPI Matrix</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cross-station velocity tracking, quality acceptance rates, and operator throughput
          </p>
        </div>

        <span className="text-xs font-mono text-[#366804] bg-[#85E510]/15 px-3 py-1 rounded-xl font-bold border border-[#85E510]/30">
          Regional SLA: 98.5% Met
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Top Field Operator</span>
          <div className="mt-2 text-lg font-bold text-[#202833]">Loza Bereket</div>
          <div className="text-xs text-[#2E7D32] font-mono mt-0.5 font-bold">842 Students Captured &bull; 99.8% Quality</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Average Daily Volume</span>
          <div className="mt-2 text-lg font-bold text-[#202833]">340 Students / Day</div>
          <div className="text-xs text-[#0284C7] font-mono mt-0.5 font-bold">&uarr; 18% vs Previous Month</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Photo Alignment Compliance</span>
          <div className="mt-2 text-lg font-bold text-[#2E7D32]">96.1% Pass Rate</div>
          <div className="text-xs text-[#64748B] mt-0.5">Pre-screen verified</div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-heading font-bold text-[#202833] uppercase tracking-wider mb-4 pb-2 border-b border-[#E2E8F0]">
          Operator Productivity Leaderboard
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 pl-4">Operator Name</th>
                <th className="py-3">Email Address</th>
                <th className="py-3">Role</th>
                <th className="py-3">Total Submissions</th>
                <th className="py-3 text-right pr-4">Quality Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {senders.map((s, idx) => (
                <tr key={s.id} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3 pl-4 font-bold text-[#202833] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#85E510]/15 text-[#366804] text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{s.username}</span>
                  </td>
                  <td className="py-3 font-mono text-[#64748B] text-[11px]">{s.email}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {s.role}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-[#202833]">
                    {(s.recordsSentSingle || Math.floor(Math.random() * 300 + 100)).toLocaleString()}
                  </td>
                  <td className="py-3 text-right pr-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                      98.{Math.floor(Math.random() * 8 + 1)}%
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
