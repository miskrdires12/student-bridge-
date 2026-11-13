import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Layers, Download, Calendar, School, Camera } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getStudents } from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, Chip } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const SuperAdminReportsPage: React.FC = () => {
  const dataVersion = useRegistryVersion();

  const schoolPerformance = useMemo(() => {
    const map = new Map<string, { captured: number; accepted: number }>();
    getStudents().forEach(s => {
      const key = (s.school || '').trim() || 'Unassigned';
      const cur = map.get(key) || { captured: 0, accepted: 0 };
      cur.captured += 1;
      if (s.photoIntegrityStatus === 'PHOTO_VERIFIED') cur.accepted += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([school, v]) => ({
        school,
        captured: v.captured,
        accepted: v.accepted,
        efficiency: v.captured ? `${((v.accepted / v.captured) * 100).toFixed(1)}%` : '0%'
      }))
      .sort((a, b) => b.captured - a.captured)
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  const submissionTrends = useMemo(() => {
    const list = getStudents();
    const days: { key: string; label: string; submissions: number; verified: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), submissions: 0, verified: 0 });
    }
    const byKey = new Map(days.map(d => [d.key, d]));
    list.forEach(s => {
      const k = (s.createdAt || '').slice(0, 10);
      const day = byKey.get(k);
      if (day) {
        day.submissions += 1;
        if (s.photoIntegrityStatus === 'PHOTO_VERIFIED') day.verified += 1;
      }
    });
    return days.map(({ key, ...rest }) => rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  const weekSubmissions = submissionTrends.reduce((acc, d) => acc + d.submissions, 0);
  const weekVerified = submissionTrends.reduce((acc, d) => acc + d.verified, 0);
  const campuses = new Set(getStudents().map(s => (s.school || '').trim()).filter(Boolean)).size;

  return (
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={BarChart3}
        title="Global Reports"
        count={`${campuses} campuses`}
        live="Live data"
        subtitle="Campus throughput and biometric validation ratios, computed from the records this station holds."
        actions={<Chip tone="neutral">{`Academic year 2026/27`}</Chip>}
      >
        <FactGrid cols={4}>
          <FactCard label="Submissions (7d)" value={weekSubmissions.toLocaleString()} hint="records registered" icon={TrendingUp} />
          <FactCard label="Verified (7d)" value={weekVerified.toLocaleString()} hint="photo integrity verified" icon={Award} />
          <FactCard label="Campuses" value={campuses.toLocaleString()} hint="with at least one record" icon={School} />
          <FactCard label="Top Campus" value={schoolPerformance[0]?.school || '—'} hint={schoolPerformance[0] ? `${schoolPerformance[0].captured.toLocaleString()} captured` : 'no records yet'} icon={Layers} />
        </FactGrid>
      </PageHero>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-8"
          title="Submissions vs Verified"
          subtitle="Daily ingestion across all stations, last 7 days"
          icon={TrendingUp}
        >
          <div className="mt-1 flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#2F5E04]"><span className="h-2.5 w-2.5 rounded bg-[#85E510]" /> Submissions</span>
            <span className="flex items-center gap-1.5 text-[#366804]"><span className="h-2.5 w-2.5 rounded bg-[#3F7A06]" /> Verified</span>
          </div>

          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={submissionTrends}>
                <XAxis dataKey="label" stroke="#7C8B70" fontSize={11} tickLine={false} />
                <YAxis stroke="#7C8B70" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E3EFD7', borderRadius: '12px', fontSize: '12px', color: '#0B1118', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="submissions" fill="#85E510" radius={[4, 4, 0, 0]} />
                <Bar dataKey="verified" fill="#3F7A06" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-4"
          title="Campus Performance"
          subtitle="Top eight by records captured"
          icon={School}
        >
          <div className="space-y-2.5">
            {schoolPerformance.map(s => (
              <div key={s.school} className="flex items-center justify-between rounded-xl border border-[#E9F2DE] bg-[#FBFDF7] px-3 py-2 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-bold text-[#0B1118]">{s.school}</div>
                  <div className="text-[10px] text-[#7C8B70]">{s.captured.toLocaleString()} captured</div>
                </div>
                <span className="shrink-0 rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                  {s.efficiency}
                </span>
              </div>
            ))}
            {schoolPerformance.length === 0 && (
              <p className="py-6 text-center text-xs font-medium text-[#8A9680]">No campus record yet.</p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-[#EDF4E5] pt-3 text-[11px] text-[#8A9680]">
            <Camera className="h-3.5 w-3.5 text-[#6FBF0A]" />
            Verified = photo integrity cleared the automated checks.
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
};
