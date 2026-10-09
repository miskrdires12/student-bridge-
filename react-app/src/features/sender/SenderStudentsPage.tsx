import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Camera, CheckCircle2, UserPlus, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';

export const SenderStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [sexFilter, setSexFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.toLowerCase().includes(search.toLowerCase()) ||
        (s.school && s.school.toLowerCase().includes(search.toLowerCase()));

      const matchGrade = gradeFilter === 'ALL' || s.grade === gradeFilter;
      const matchSex = sexFilter === 'ALL' || s.sex === sexFilter;

      return matchSearch && matchGrade && matchSex;
    });
  }, [students, search, gradeFilter, sexFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">My Field Submissions</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Real-time feed of all student biometric profiles recorded from this sender station
          </p>
        </div>

        <Link
          to="/sender/register"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, ID or school..."
            className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
            className="bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617] transition-all"
          >
            <option value="ALL">All Grades</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
            <option value="Grade 4">Grade 4</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Grade 6">Grade 6</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>

          {/* Sex Filter */}
          <select
            value={sexFilter}
            onChange={(e) => { setSexFilter(e.target.value); setPage(1); }}
            className="bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617] transition-all"
          >
            <option value="ALL">All Sex</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>

          <span className="text-xs font-mono text-[#9eb2a6] whitespace-nowrap">
            {filtered.length.toLocaleString()} Records
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Photo & Full Name</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">Sex</th>
                <th className="py-3.5">Phone</th>
                <th className="py-3.5">Blood Type</th>
                <th className="py-3.5 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/70">
              {pagedStudents.map((s) => {
                const photoSrc = s.previewPath || (s.photoPath ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${s.photoPath.replace(/^\//, '')}` : null);

                return (
                  <tr key={s.id || s.studentId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={s.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400">NO</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{s.fullName}</div>
                        <div className="text-[10px] text-[#9eb2a6]">Country: {s.country || 'Ethiopia'}</div>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[#8fe617] font-semibold">{s.studentId}</td>
                    <td className="py-3 text-white font-medium">{s.school || 'YMS'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-white text-[11px]">
                        {s.grade || 'Grade 9'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.sex === 'Female' ? 'badge-female' : 'badge-male'
                      }`}>
                        {s.sex || 'Male'}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[#9eb2a6]">{s.phone || '+251 91 123 4567'}</td>
                    <td className="py-3 font-mono text-purple-300 font-semibold">{s.bloodType || 'Unknown'}</td>
                    <td className="py-3 text-right pr-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8fe617]/15 text-[#8fe617] text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#070908] border-t border-[#1e2c22] flex items-center justify-between text-xs text-[#9eb2a6]">
          <div>
            Showing <span className="text-white font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="text-white font-semibold">
              {Math.min(page * pageSize, filtered.length)}
            </span>{' '}
            of <span className="text-white font-semibold">{filtered.length.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
