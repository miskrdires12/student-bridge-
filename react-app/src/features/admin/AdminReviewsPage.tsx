import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Filter, Search } from 'lucide-react';
import { getStudents, updateStudent } from '@/lib/store';
import { Student } from '@/types';

export const AdminReviewsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'FLAGGED' | 'VERIFIED'>('FLAGGED');

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const handleStatusUpdate = (s: Student, status: string) => {
    updateStudent(s.id || s.studentId, { status });
    setStudents([...getStudents()]);
  };

  const filtered = students.filter(s => {
    if (filter === 'FLAGGED') return s.status === 'FLAGGED' || !s.photoPath;
    if (filter === 'VERIFIED') return s.status === 'VERIFIED' && s.photoPath;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Supervisory Quality Reviews</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Audit sample submissions, approve escalations, and review compliance with photo standards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['FLAGGED', 'VERIFIED', 'ALL'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-[#8fe617] text-[#062404]'
                  : 'bg-white/5 text-[#9eb2a6] hover:bg-white/10'
              }`}
            >
              {f} ({f === 'FLAGGED' ? students.filter(s => !s.photoPath || s.status === 'FLAGGED').length : f === 'VERIFIED' ? students.filter(s => s.status === 'VERIFIED' && s.photoPath).length : students.length})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 pl-4">Student ID & Name</th>
                <th className="py-3">Campus</th>
                <th className="py-3">Grade</th>
                <th className="py-3">Photo Status</th>
                <th className="py-3">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {filtered.slice(0, 30).map(s => (
                <tr key={s.id || s.studentId} className="hover:bg-white/[0.02]">
                  <td className="py-3 pl-4">
                    <div className="font-bold text-white text-xs">{s.fullName}</div>
                    <div className="font-mono text-[10px] text-[#8fe617]">{s.studentId}</div>
                  </td>
                  <td className="py-3 text-white">{s.school || 'YMS'}</td>
                  <td className="py-3 text-white font-medium">{s.grade}</td>
                  <td className="py-3">
                    {s.photoPath ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present in R2
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missing Photo
                      </span>
                    )}
                  </td>
                  <td className="py-3 space-x-2">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(s, 'VERIFIED')}
                      className="px-2.5 py-1 rounded bg-[#8fe617]/15 hover:bg-[#8fe617] text-[#8fe617] hover:text-[#062404] font-bold text-[11px] transition-all"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(s, 'FLAGGED')}
                      className="px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white font-bold text-[11px] transition-all"
                    >
                      Reject
                    </button>
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
