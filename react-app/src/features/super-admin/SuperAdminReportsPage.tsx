import React from 'react';
import { BarChart3, TrendingUp, Award, Layers, Download, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const SuperAdminReportsPage: React.FC = () => {
  const schoolPerformance = [
    { school: 'YMS', captured: 1245, accepted: 1190, efficiency: '95.6%' },
    { school: 'Adika Youth', captured: 982, accepted: 920, efficiency: '93.7%' },
    { school: 'School of America', captured: 756, accepted: 698, efficiency: '92.3%' },
    { school: 'Ferway', captured: 542, accepted: 480, efficiency: '88.5%' },
    { school: 'Warka', captured: 398, accepted: 360, efficiency: '90.4%' },
  ];

  const submissionTrends = [
    { week: 'W1 Sep', submissions: 2100, verified: 1980 },
    { week: 'W2 Sep', submissions: 3400, verified: 3200 },
    { week: 'W3 Sep', submissions: 4200, verified: 3950 },
    { week: 'W4 Sep', submissions: 3900, verified: 3720 },
    { week: 'W1 Oct', submissions: 4800, verified: 4500 },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Global Reports & Analytics</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Campus throughput, operator quality ratios, and multi-school biometric validation reports
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131e2b] border border-[#1e2e42] text-xs font-medium text-white">
          <Calendar className="w-3.5 h-3.5 text-[#85e510]" />
          <span>Academic Year 2026/27</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2e42]">
            <div>
              <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Submissions vs Verified</h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Weekly ingestion performance across all stations</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-[#85e510] flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#85e510]" /> Submissions</span>
              <span className="text-[#38bdf8] flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#38bdf8]" /> Verified</span>
            </div>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={submissionTrends}>
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#131e2b', borderColor: '#1e2e42', borderRadius: '12px' }} />
                <Bar dataKey="submissions" fill="#85e510" radius={[4, 4, 0, 0]} />
                <Bar dataKey="verified" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider pb-3 border-b border-[#1e2e42]">
              Campus Performance Summary
            </h2>
            <div className="space-y-3 mt-4">
              {schoolPerformance.map(s => (
                <div key={s.school} className="p-2.5 rounded-xl bg-[#0d1520] border border-[#1e2e42] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{s.school}</div>
                    <div className="text-[10px] text-[#94a3b8]">{s.captured} Captured</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#85e510]/15 text-[#85e510]">
                    {s.efficiency}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2e42] text-[11px] text-[#94a3b8]">
            Authoritative Dataset &bull; Verified against R2 records
          </div>
        </div>
      </div>
    </div>
  );
};
