import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Search, Filter, Camera, RefreshCw, ArrowRight, ShieldAlert } from 'lucide-react';
import { getMistakes, updateStudent, getStudents } from '@/lib/store';
import { MistakeItem } from '@/types';

export const MistakeAnalyzerPage: React.FC = () => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMistakes(getMistakes());
  }, []);

  const handleResolve = (m: MistakeItem) => {
    // Mark as resolved
    setResolvedIds(prev => new Set([...prev, m.id]));
  };

  const filtered = mistakes.filter(m => {
    if (resolvedIds.has(m.id)) return false;
    const matchType = filterType === 'ALL' || m.type === filterType;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.studentId.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const missingPhotoCount = mistakes.filter(m => m.type === 'Missing Photo').length;
  const duplicateIdCount = mistakes.filter(m => m.type === 'Duplicate ID').length;
  const phoneIssueCount = mistakes.filter(m => m.type === 'Invalid Phone Number').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Mistake Analyzer & Quality Control</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
              {filtered.length} Flagged Records
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Automated heuristic scan detecting missing biometric photos, duplicate IDs, and invalid telephone formats
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMistakes(getMistakes())}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#8fe617]" />
            <span>Re-Scan Central DB</span>
          </button>
        </div>
      </div>

      {/* Heuristic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType('Missing Photo')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'Missing Photo'
              ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'bg-[#101612] border-[#1e2c22] hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#9eb2a6]">Missing Portrait Photos</span>
            <Camera className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-amber-400">{missingPhotoCount}</div>
          <div className="text-[11px] text-[#9eb2a6] mt-1">Requires field retake by Sender</div>
        </div>

        <div
          onClick={() => setFilterType('Duplicate ID')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'Duplicate ID'
              ? 'bg-red-500/15 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'bg-[#101612] border-[#1e2c22] hover:border-red-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#9eb2a6]">Duplicate Student IDs</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-red-400">{duplicateIdCount}</div>
          <div className="text-[11px] text-[#9eb2a6] mt-1">ID collision across registrations</div>
        </div>

        <div
          onClick={() => setFilterType('Invalid Phone Number')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'Invalid Phone Number'
              ? 'bg-purple-500/15 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              : 'bg-[#101612] border-[#1e2c22] hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#9eb2a6]">Malformed Phone Numbers</span>
            <AlertTriangle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-purple-400">{phoneIssueCount}</div>
          <div className="text-[11px] text-[#9eb2a6] mt-1">Does not adhere to +251 standard</div>
        </div>
      </div>

      {/* Mistake Items Table */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1e2c22] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter mistake records..."
              className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                filterType === 'ALL' ? 'bg-[#8fe617] text-[#062404]' : 'bg-white/5 text-[#9eb2a6]'
              }`}
            >
              All Types
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 pl-4">Student ID & Name</th>
                <th className="py-3">Campus</th>
                <th className="py-3">Issue Type</th>
                <th className="py-3">Severity</th>
                <th className="py-3">Date Flagged</th>
                <th className="py-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {filtered.slice(0, 50).map((m) => (
                <tr key={`${m.id}-${m.type}`} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-4">
                    <div className="font-mono text-[#8fe617] font-semibold">{m.studentId}</div>
                    <div className="text-white font-bold">{m.name}</div>
                  </td>
                  <td className="py-3 text-white">{m.school || 'YMS'}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
                      {m.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {m.severity}
                    </span>
                  </td>
                  <td className="py-3 text-[#9eb2a6] font-mono">{m.date}</td>
                  <td className="py-3 text-right pr-4">
                    <button
                      type="button"
                      onClick={() => handleResolve(m)}
                      className="px-3 py-1 rounded-lg bg-[#8fe617]/15 hover:bg-[#8fe617] text-[#8fe617] hover:text-[#062404] font-bold text-xs transition-all"
                    >
                      Resolve / Verify
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
