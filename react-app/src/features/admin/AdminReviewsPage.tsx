import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Filter, Search } from 'lucide-react';
import { getStudents, updateStudent } from '@/lib/store';
import { Student } from '@/types';

export const AdminReviewsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<'FLAGGED' | 'VERIFIED' | 'ALL'>('FLAGGED');

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const handleStatusUpdate = (s: Student, status: string) => {
    updateStudent(s.id || s.studentId, { status });
    setStudents([...getStudents()]);
  };

  const filtered = students.filter(s => {
    if (filter === 'FLAGGED') return s.status === 'FLAGGED' || !s.photoPath;
    if (filter === 'VERIFIED') return s.status === 'VERIFIED' || s.status === 'Accepted';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Supervisory Quality Reviews</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit sample submissions, approve escalations, and review compliance with photo standards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['FLAGGED', 'VERIFIED', 'ALL'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                filter === f
                  ? 'bg-[#85E510] text-[#062404] font-black'
                  : 'bg-white text-[#64748B] hover:text-[#202833] border border-[#CBD5E1]'
              }`}
            >
              {f} ({f === 'FLAGGED' ? students.filter(s => !s.photoPath || s.status === 'FLAGGED').length : f === 'VERIFIED' ? students.filter(s => s.status === 'VERIFIED' || s.status === 'Accepted').length : students.length})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Student ID & Name</th>
                <th className="py-3.5">Campus</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">Photo Status</th>
                <th className="py-3.5 text-right pr-6">Supervisory Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.slice(0, 50).map(s => (
                <tr key={s.id || s.studentId} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3.5 pl-6">
                    <div className="font-bold text-[#202833]">{s.fullName}</div>
                    <div className="text-[10px] font-mono text-[#0284C7] font-semibold">{s.studentId}</div>
                  </td>
                  <td className="py-3.5 text-[#202833] font-medium">{s.school}</td>
                  <td className="py-3.5 text-[#64748B]">{s.grade}</td>
                  <td className="py-3.5">
                    {s.photoPath ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                        Portrait Attached
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Missing Photo
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-6 space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(s, 'Accepted')}
                      className="px-2.5 py-1 rounded-lg bg-[#85E510]/15 hover:bg-[#85E510]/30 text-[#366804] border border-[#85E510]/30 text-[11px] font-bold transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(s, 'FLAGGED')}
                      className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition-all"
                    >
                      Flag Retake
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
