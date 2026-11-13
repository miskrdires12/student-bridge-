import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert, Search, Check, ShieldCheck, Camera, Database, AlertTriangle
} from 'lucide-react';
import { getStudents, updateStudent } from '@/lib/store';
import { Student } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, PrimaryButton, Chip } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const AdminQualityControlPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const registryVersion = useRegistryVersion();
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStudents(getStudents());
  }, [registryVersion]);

  const qualityIssues = useMemo(() => {
    const issues: {
      id: string;
      student: Student;
      severity: 'CRITICAL' | 'WARNING';
      issueTitle: string;
      issueDetails: string;
    }[] = [];

    const idMap = new Map<string, number>();
    students.forEach(s => {
      idMap.set(s.studentId, (idMap.get(s.studentId) || 0) + 1);
    });

    students.forEach(s => {
      const hasPhoto = Boolean(s.photoPath || s.thumbnailPath || s.originalPhotoPath);
      if (!hasPhoto) {
        issues.push({
          id: `missing-photo-${s.id || s.studentId}`,
          student: s,
          severity: 'CRITICAL',
          issueTitle: 'Missing Biometric Portrait',
          issueDetails: 'Student record lacks a compliant studio portrait in Cloudflare R2.'
        });
      }

      if ((idMap.get(s.studentId) || 0) > 1) {
        issues.push({
          id: `dup-id-${s.id || s.studentId}`,
          student: s,
          severity: 'CRITICAL',
          issueTitle: 'Duplicate Student ID Collision',
          issueDetails: `ID "${s.studentId}" is assigned to multiple records across stations.`
        });
      }

      if (!s.phone || s.phone.trim().length < 8) {
        issues.push({
          id: `phone-${s.id || s.studentId}`,
          student: s,
          severity: 'WARNING',
          issueTitle: 'Incomplete Contact Information',
          issueDetails: 'Emergency phone number is missing or formatted incorrectly.'
        });
      }
    });

    return issues;
  }, [students]);

  const filteredIssues = qualityIssues.filter(item => {
    if (resolvedIds.has(item.id)) return false;
    if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.student.fullName.toLowerCase().includes(q) ||
        item.student.studentId.toLowerCase().includes(q) ||
        item.issueTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openIssues = qualityIssues.filter(i => !resolvedIds.has(i.id));
  const criticalCount = openIssues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = openIssues.filter(i => i.severity === 'WARNING').length;
  const cleanCount = Math.max(0, students.length - openIssues.length);

  const handleResolveIssue = (issueId: string, studentId: string) => {
    setResolvedIds(prev => new Set([...prev, issueId]));
    updateStudent(studentId, { status: 'VERIFIED' });
  };

  return (
    <PageShell>
      <PageHero
        icon={ShieldAlert}
        title="Quality Control"
        count={`${filteredIssues.length} flags in queue`}
        live="Scanning"
        subtitle="Automated scanning for duplicate student IDs, missing portrait photos and incomplete contact details across the registry."
      >
        <FactGrid cols={4}>
          <FactCard label="Critical Flags" value={criticalCount.toLocaleString()} hint="portrait / duplicate ID" icon={AlertTriangle} />
          <FactCard label="Warnings" value={warningCount.toLocaleString()} hint="contact details" icon={ShieldAlert} />
          <FactCard label="Records Clean" value={cleanCount.toLocaleString()} hint={`of ${students.length.toLocaleString()} held`} icon={ShieldCheck} />
          <FactCard label="Portraits on File" value={students.filter(s => Boolean(s.photoPath || s.thumbnailPath || s.originalPhotoPath)).length.toLocaleString()} hint="Cloudflare R2 objects" icon={Camera} />
        </FactGrid>
      </PageHero>

      <SectionCard padded>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A6B29B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search flagged students by name or ID..."
              className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] py-2 pl-9 pr-4 text-xs text-[#0B1118] placeholder-[#A6B29B] focus:border-[#85E510] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'CRITICAL', 'WARNING'] as const).map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                  filterSeverity === sev
                    ? 'bg-[#85E510] text-[#062404] shadow-sm'
                    : 'border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Issue Queue"
        subtitle="Every flag is derived from the record itself, not an estimate"
        icon={Database}
        padded={false}
        actions={<Chip tone="neutral">{filteredIssues.length} shown</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3.5 pl-6">Severity</th>
                <th className="py-3.5">Student Name &amp; ID</th>
                <th className="py-3.5">Campus</th>
                <th className="py-3.5">Detected Issue</th>
                <th className="py-3.5">Details</th>
                <th className="py-3.5 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs font-medium text-[#8A9680]">
                    No active quality flags in this view. Every record meets the institutional checks.
                  </td>
                </tr>
              ) : (
                filteredIssues.map(item => (
                  <tr key={item.id} className="transition-colors hover:bg-[#F8FBF4]">
                    <td className="whitespace-nowrap py-3.5 pl-6">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        item.severity === 'CRITICAL'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-[#0B1118]">
                      <div>{item.student.fullName}</div>
                      <div className="font-mono text-[11px] font-semibold text-[#3F7A06]">{item.student.studentId}</div>
                    </td>
                    <td className="whitespace-nowrap py-3.5 font-medium text-[#5C6B51]">
                      {item.student.school || 'Unassigned'}
                    </td>
                    <td className="whitespace-nowrap py-3.5 font-bold text-[#0B1118]">{item.issueTitle}</td>
                    <td className="max-w-xs py-3.5 text-[11px] text-[#7C8B70]">{item.issueDetails}</td>
                    <td className="whitespace-nowrap py-3.5 pr-6 text-right">
                      <PrimaryButton
                        icon={Check}
                        onClick={() => handleResolveIssue(item.id, item.student.id || item.student.studentId)}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        Verify &amp; Clear
                      </PrimaryButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageShell>
  );
};
