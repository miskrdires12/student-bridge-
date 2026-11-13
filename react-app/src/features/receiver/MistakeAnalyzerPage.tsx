import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, Camera, RefreshCw, ShieldAlert, Check, Stethoscope } from 'lucide-react';
import { getMistakes, addCorrectionLog, getCurrentUser } from '@/lib/store';
import { MistakeItem } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, Chip, EmptyState } from '@/components/ui/PageKit';

export const MistakeAnalyzerPage: React.FC = () => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => getMistakes());
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleResolve = (m: MistakeItem) => {
    setResolvedIds(prev => new Set([...prev, m.id]));
    const currentUser = getCurrentUser();
    addCorrectionLog({
      studentId: m.studentId,
      studentName: m.name,
      senderId: m.senderId || 'sender-field',
      senderName: m.sender || 'Field Sender',
      actionType: 'MISTAKE_RESOLVED',
      description: `Receiver verified & resolved anomaly: [${m.type}] on ${m.school || 'Campus'} record.`,
      resolvedBy: currentUser?.username || (currentUser as any)?.name || 'Receiver Desk Officer'
    });
  };

  const filtered = mistakes.filter(m => {
    if (resolvedIds.has(m.id)) return false;
    const matchType = filterType === 'ALL' || m.type === filterType;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.studentId.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const openMistakes = mistakes.filter(m => !resolvedIds.has(m.id));
  const missingPhotoCount = openMistakes.filter(m => m.type === 'Missing Photo').length;
  const duplicateIdCount = openMistakes.filter(m => m.type === 'Duplicate ID').length;
  const phoneIssueCount = openMistakes.filter(m => m.type === 'Invalid Phone Number').length;

  return (
    <PageShell>
      <PageHero
        icon={Stethoscope}
        title="Mistake Analyzer"
        count={`${openMistakes.length} open flags`}
        live="Scanning registry"
        subtitle="Automated scan for missing biometric photos, duplicate student IDs and invalid telephone formats across the records this station holds."
        actions={<ToolbarButton icon={RefreshCw} onClick={() => setMistakes(getMistakes())}>Re-scan registry</ToolbarButton>}
      >
        <FactGrid cols={4}>
          <FactCard label="Missing Portrait" value={missingPhotoCount.toLocaleString()} hint="needs a field retake" icon={Camera} />
          <FactCard label="Duplicate IDs" value={duplicateIdCount.toLocaleString()} hint="ID collision" icon={ShieldAlert} />
          <FactCard label="Invalid Phone" value={phoneIssueCount.toLocaleString()} hint="bad number format" icon={AlertTriangle} />
          <FactCard label="Shown in View" value={filtered.length.toLocaleString()} hint={filterType === 'ALL' ? 'all types' : filterType} icon={CheckCircle2} />
        </FactGrid>
      </PageHero>

      <SectionCard padded>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A6B29B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anomaly by student ID or name..."
              className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] py-2 pl-9 pr-3 text-xs text-[#0B1118] placeholder-[#A6B29B] focus:border-[#85E510] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'Missing Photo', 'Duplicate ID', 'Invalid Phone Number'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                  filterType === type
                    ? 'bg-[#85E510] text-[#062404] shadow-sm'
                    : 'border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
                }`}
              >
                {type === 'ALL' ? 'All types' : type}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Flagged Records"
        subtitle="Resolving a flag writes a correction entry to the audit log"
        icon={AlertTriangle}
        padded={false}
        actions={<Chip tone="neutral">{filtered.length} shown</Chip>}
      >
        {filtered.length === 0 ? (
          <div className="p-3.5">
            <EmptyState
              icon={CheckCircle2}
              title="Quality integrity clear"
              hint="No anomaly matches the active scope. Every record satisfies the biometric, uniqueness and telephone rules."
            />
          </div>
        ) : (
          <div className="divide-y divide-[#EDF4E5]">
            {filtered.map(m => (
              <div key={m.id} className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-[#F8FBF4] sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    m.severity === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#0B1118]">{m.name}</span>
                      <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 font-mono text-xs font-semibold text-[#2F5E04]">
                        {m.studentId}
                      </span>
                      <span className="text-xs text-[#7C8B70]">&bull; {m.school || '—'}</span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        m.severity === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.type}
                      </span>
                      <span className="text-[#7C8B70]">Detected: {m.date}</span>
                      {m.sender && (
                        <span className="rounded-full border border-[#E9F2DE] bg-[#FBFDF7] px-2 py-0.5 font-medium text-[#5C6B51]">
                          Originator: <strong className="text-[#0B1118]">{m.sender}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleResolve(m)}
                  className="inline-flex cursor-pointer items-center gap-1.5 self-end rounded-xl border border-[#E3E9DD] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0B1118] shadow-sm transition-colors hover:border-[#85E510] hover:bg-[#F3FBE8] sm:self-auto"
                >
                  <Check className="h-3.5 w-3.5 text-[#3F7A06]" />
                  <span>Mark Resolved</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
};
