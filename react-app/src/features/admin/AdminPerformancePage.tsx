import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Users, CheckCircle2, Zap, Clock, ShieldCheck, MapPin } from 'lucide-react';
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

  const senderMetrics = useMemo(() => {
    return senders.map((sender) => {
      const sName = sender.username.toLowerCase();
      // Count students registered by this sender
      const registeredStudents = students.filter(
        st => (st.senderName && st.senderName.toLowerCase() === sName) ||
              (st.senderId && st.senderId.toLowerCase() === sender.id.toLowerCase())
      );
      const registeredCount = registeredStudents.length;

      return {
        ...sender,
        registeredCount,
        campus: sender.school || 'YMS'
      };
    }).sort((a, b) => b.registeredCount - a.registeredCount);
  }, [senders, students]);

  const topOperator = senderMetrics[0];
  // Every record this station holds is either attributed to a sender or it is not, and the two
  // numbers have to add up to the registry count. A per-hour speed or a quality score nobody
  // measured used to be printed beside them as if it had been.
  const attributedCount = senderMetrics.reduce((acc, s) => acc + s.registeredCount, 0);
  const unattributedCount = Math.max(0, students.length - attributedCount);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
            Workforce Telemetricity & Performance Hub
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Registration counts per operator, read from the records this station holds. For the figures
            a salary is paid from, use the Sender Payroll Report, which reads the row store directly.
          </p>
        </div>

        <span className="text-xs font-mono text-[#366804] bg-[#85E510]/15 px-3 py-1.5 rounded-xl font-black border border-[#85E510]/30 shadow-2xs">
          {senderMetrics.length} Field Senders &bull; {students.length.toLocaleString()} Records Held
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Top Field Operator</span>
          </span>
          <div className="mt-2 text-xl font-heading font-black text-[#202833]">
            {topOperator ? topOperator.username : 'Field Operator'}
          </div>
          <div className="text-xs text-[#2E7D32] font-mono mt-1 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#85E510]" />
            <span>{(topOperator?.registeredCount || 0).toLocaleString()} Registered &bull; {topOperator?.campus}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>Total Ingested Volume</span>
          </span>
          <div className="mt-2 text-xl font-heading font-black text-[#202833]">
            {students.length.toLocaleString()} Students
          </div>
          <div className="text-xs text-[#0284C7] font-mono mt-1 font-bold">
            Authoritative Institutional Registry
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>Attribution of Records Held</span>
          </span>
          <div className="mt-2 text-xl font-heading font-black text-[#2E7D32]">
            {attributedCount.toLocaleString()} by sender
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-medium font-mono">
            {unattributedCount.toLocaleString()} carry no sender name &bull; adds to {students.length.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
              Operator Telemetricity & Output Metrics
            </h2>
            <p className="text-xs text-slate-500">
              Per-operator transmission velocity, student registrations, and active session throughput
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {senderMetrics.length} Field Senders Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-black">
              <tr>
                <th className="py-3 pl-4">Operator Name & School</th>
                <th className="py-3">Email Address</th>
                <th className="py-3 text-center">Registered Students</th>
                <th className="py-3 text-right pr-4">Campus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {senderMetrics.map((s, idx) => (
                <tr key={s.id} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3 pl-4 font-bold text-[#202833]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#85E510]/15 text-[#366804] text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#202833]">{s.username}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-normal">
                          <MapPin className="w-2.5 h-2.5 text-[#85E510]" />
                          <span>{s.campus}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-[#64748B] text-[11px]">{s.email}</td>
                  <td className="py-3 text-center font-mono font-black text-[#202833] text-sm">
                    {s.registeredCount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right pr-4 text-[11px] font-bold text-slate-600">
                    {s.campus}
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
