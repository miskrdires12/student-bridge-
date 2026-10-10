import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Search, Filter, Camera, RefreshCw, ArrowRight, ShieldAlert, Check } from 'lucide-react';
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Mistake Analyzer & Quality Control
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase">
              {filtered.length} Flagged Anomalies
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Automated heuristic scan detecting missing biometric photos, duplicate IDs, and invalid telephone formats
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMistakes(getMistakes())}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAF9] border border-[#CBD5E1] text-xs font-bold text-[#202833] flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4D8A07]" />
            <span>Re-Scan Registry</span>
          </button>
        </div>
      </div>

      {/* Heuristic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType(filterType === 'Missing Photo' ? 'ALL' : 'Missing Photo')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'Missing Photo'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-[#E2E8F0] hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">Missing Portrait Photos</span>
            <Camera className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-amber-600">{missingPhotoCount}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Flagged for field retake by Sender</div>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'Duplicate ID' ? 'ALL' : 'Duplicate ID')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'Duplicate ID'
              ? 'bg-red-50 border-red-400 shadow-sm'
              : 'bg-white border-[#E2E8F0] hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">Duplicate Student IDs</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-red-600">{duplicateIdCount}</div>
          <div className="text-[11px] text-[#64748B] mt-1">ID collision across registrations</div>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'Invalid Phone Number' ? 'ALL' : 'Invalid Phone Number')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'Invalid Phone Number'
              ? 'bg-purple-50 border-purple-400 shadow-sm'
              : 'bg-white border-[#E2E8F0] hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">Invalid Telephone Formats</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-purple-600">{phoneIssueCount}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Non-normalized mobile numbers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anomaly by student ID or name..."
            className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {filterType !== 'ALL' && (
            <button
              onClick={() => setFilterType('ALL')}
              className="text-xs text-[#4D8A07] hover:underline font-bold"
            >
              Clear Filter
            </button>
          )}
          <span className="text-xs text-[#64748B] font-bold">
            Showing {filtered.length} issues
          </span>
        </div>
      </div>

      {/* Mistake Items List */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#E2E8F0]">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#4D8A07] mx-auto" />
            <div className="text-sm font-bold text-[#202833]">Quality Integrity Clear</div>
            <p className="text-xs max-w-sm mx-auto">
              No anomalies found in the active scope. All records satisfy biometric, uniqueness, and telephone rules.
            </p>
          </div>
        ) : (
          filtered.map(m => (
            <div key={m.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAF9] transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  m.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#202833] text-sm">{m.name}</span>
                    <span className="font-mono text-xs font-semibold text-[#366804] bg-[#85E510]/15 px-2 py-0.5 rounded">
                      {m.studentId}
                    </span>
                    <span className="text-xs text-[#64748B]">&bull; {m.school || 'YMS'}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      m.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.type}
                    </span>
                    <span className="text-[#64748B]">Detected: {m.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleResolve(m)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#85E510]/20 border border-[#CBD5E1] hover:border-[#85E510] text-xs font-bold text-[#202833] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 text-[#4D8A07]" />
                  <span>Mark Resolved</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
