import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Camera, Check, Flag, ClipboardCheck } from 'lucide-react';
import { getStudents, updateStudent } from '@/lib/store';
import { Student } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, Chip } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const AdminReviewsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const registryVersion = useRegistryVersion();
  const [filter, setFilter] = useState<'FLAGGED' | 'VERIFIED' | 'ALL'>('FLAGGED');

  useEffect(() => {
    setStudents(getStudents());
  }, [registryVersion]);

  const handleStatusUpdate = (s: Student, status: string) => {
    updateStudent(s.id || s.studentId, { status });
    setStudents([...getStudents()]);
  };

  const flaggedCount = students.filter(s => !s.photoPath || s.status === 'FLAGGED').length;
  const verifiedCount = students.filter(s => s.status === 'VERIFIED' || s.status === 'Accepted').length;

  const filtered = students.filter(s => {
    if (filter === 'FLAGGED') return s.status === 'FLAGGED' || !s.photoPath;
    if (filter === 'VERIFIED') return s.status === 'VERIFIED' || s.status === 'Accepted';
    return true;
  });

  return (
    <PageShell>
      <PageHero
        icon={ClipboardCheck}
        title="Supervisory Reviews"
        count={`${filtered.length} in view`}
        live="Review queue"
        subtitle="Audit sample submissions, approve escalations and review compliance with the portrait standard. Decisions write straight to the record."
      >
        <FactGrid cols={4}>
          <FactCard label="Awaiting Review" value={flaggedCount.toLocaleString()} hint="flagged or missing photo" icon={AlertTriangle} />
          <FactCard label="Approved" value={verifiedCount.toLocaleString()} hint="verified / accepted" icon={ShieldCheck} />
          <FactCard label="Records Held" value={students.length.toLocaleString()} hint="on this station" icon={Camera} />
          <FactCard label="Queue Shown" value={filtered.length.toLocaleString()} hint={`${filter.toLowerCase()} filter`} icon={ClipboardCheck} />
        </FactGrid>
      </PageHero>

      <div className="flex flex-wrap items-center gap-1.5">
        {(['FLAGGED', 'VERIFIED', 'ALL'] as const).map(f => {
          const count = f === 'FLAGGED' ? flaggedCount : f === 'VERIFIED' ? verifiedCount : students.length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                filter === f
                  ? 'bg-[#85E510] text-[#062404] shadow-sm'
                  : 'border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
              }`}
            >
              {f} ({count.toLocaleString()})
            </button>
          );
        })}
      </div>

      <SectionCard
        title="Review Queue"
        subtitle="First 50 records in the selected filter"
        icon={ClipboardCheck}
        padded={false}
        actions={<Chip tone="neutral">{filtered.length.toLocaleString()} matches</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3.5 pl-6">Student ID &amp; Name</th>
                <th className="py-3.5">Campus</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">Photo Status</th>
                <th className="py-3.5 pr-6 text-right">Supervisory Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {filtered.slice(0, 50).map(s => (
                <tr key={s.id || s.studentId} className="transition-colors hover:bg-[#F8FBF4]">
                  <td className="py-3.5 pl-6">
                    <div className="font-bold text-[#0B1118]">{s.fullName}</div>
                    <div className="font-mono text-[10px] font-semibold text-[#3F7A06]">{s.studentId}</div>
                  </td>
                  <td className="py-3.5 font-medium text-[#0B1118]">{s.school}</td>
                  <td className="py-3.5 text-[#5C6B51]">{s.grade}</td>
                  <td className="py-3.5">
                    {s.photoPath ? (
                      <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                        Portrait Attached
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Missing Photo
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 py-3.5 pr-6 text-right">
                    <button
                      onClick={() => handleStatusUpdate(s, 'Accepted')}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#CDEBB4] bg-[#EAF7DA] px-2.5 py-1 text-[11px] font-bold text-[#2F5E04] transition-colors hover:bg-[#DDF3C4]"
                    >
                      <Check className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(s, 'FLAGGED')}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Flag className="h-3 w-3" />
                      Flag Retake
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs font-medium text-[#8A9680]">
                    Nothing in this filter right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageShell>
  );
};
