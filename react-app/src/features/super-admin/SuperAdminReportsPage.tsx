import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Award, Layers, Download, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getStudents } from '@/lib/store';

export const SuperAdminReportsPage: React.FC = () => {
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const bump = () => setDataVersion(v => v + 1);
    window.addEventListener('studentbridge_datachange', bump);
    window.addEventListener('studentbridge_userchange', bump);
    return () => {
      window.removeEventListener('studentbridge_datachange', bump);
      window.removeEventListener('studentbridge_userchange', bump);
    };
  }, []);

  const schoolPerformance = useMemo(() => {
    const map = new Map<string, { captured: number; accepted: number }>();
    getStudents().forEach(s => {
      const key = (s.school || '').trim() || 'Unassigned';
      const cur = map.get(key) || { captured: 0, accepted: 0 };
      cur.captured += 1;
      if (s.photoPath || (s.status || '').toLowerCase() === 'accepted') cur.accepted += 1;
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
        if (s.photoPath || (s.status || '').toLowerCase() === 'accepted') day.verified += 1;
      }
    });
    return days.map(({ key, ...rest }) => rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Global Reports & Analytics</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Campus throughput, operator quality ratios, and multi-school biometric validation reports
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#202833] shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-[#85E510]" />
          <span>Academic Year 2026/27</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-sm font-heading font-bold text-[#202833] uppercase tracking-wider">Submissions vs Verified</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Daily ingestion performance across all stations (last 7 days)</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-[#366804] flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#85E510]" /> Submissions</span>
              <span className="text-[#0369A1] flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#0284C7]" /> Verified</span>
            </div>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={submissionTrends}>
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '12px', fontSize: '12px', color: '#202833', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="submissions" fill="#85E510" radius={[4, 4, 0, 0]} />
                <Bar dataKey="verified" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="text-sm font-heading font-bold text-[#202833] uppercase tracking-wider pb-3 border-b border-[#E2E8F0]">
              Campus Performance Summary
            </h2>
            <div className="space-y-3 mt-4">
              {schoolPerformance.map(s => (
                <div key={s.school} className="p-3 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#202833]">{s.school}</div>
                    <div className="text-[10px] text-[#64748B]">{s.captured} Captured</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                    {s.efficiency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
            Authoritative Dataset &bull; Verified against Cloudflare R2
          </div>
        </div>
      </div>
    </div>
  );
};
