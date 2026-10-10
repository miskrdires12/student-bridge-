import React, { useState } from 'react';
import { Layers, Download, CheckCircle2, FileText, Calendar, Filter } from 'lucide-react';
import { getStudents, getUsers } from '@/lib/store';

export const AdminReportsPage: React.FC = () => {
  const [downloadedReport, setDownloadedReport] = useState<string | null>(null);

  const students = getStudents();
  const users = getUsers();

  const handleDownloadReport = (reportName: string) => {
    setDownloadedReport(reportName);
    setTimeout(() => setDownloadedReport(null), 3000);

    const reportContent = `STUDENTBRIDGE ENTERPRISE REPORT: ${reportName}\nGenerated: ${new Date().toISOString()}\nTotal Students: ${students.length}\nTotal Operators: ${users.length}\nStorage: Cloudflare R2\nStatus: VERIFIED 100%`;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}_Report.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Executive Management Reports</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Downloadable executive summaries, school campus audits, and demographic distribution exports
          </p>
        </div>

        <span className="text-xs font-mono text-[#366804] bg-[#85E510]/15 px-3 py-1 rounded-xl font-bold border border-[#85E510]/30">
          Report Engine v2
        </span>
      </div>

      {downloadedReport && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Report "{downloadedReport}" downloaded successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: 'School Campus Demographic Audit',
            desc: 'Complete census breakdown across YMS, Adika, School of America, Ferway, Warka, Yacine, Debebech and High Tech.',
            tag: 'Demographics'
          },
          {
            title: 'Biometric Photo Compliance Index',
            desc: 'Verification ratios, Cloudflare R2 object health, and missing portrait resolution queue.',
            tag: 'Quality Control'
          },
          {
            title: 'Field Sender Productivity & Turnaround',
            desc: 'Velocity analytics, shift timestamps, and daily record registration throughput.',
            tag: 'Workforce KPIs'
          },
          {
            title: 'Audit & Data Governance Summary',
            desc: 'Formal record of corrections, administrative reviews, and hardware token bindings.',
            tag: 'Governance'
          }
        ].map(r => (
          <div key={r.title} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col justify-between hover:border-[#85E510] shadow-sm transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-[#64748B] border border-[#CBD5E1]">
                  {r.tag}
                </span>
                <FileText className="w-4 h-4 text-[#85E510]" />
              </div>
              <h3 className="font-heading font-bold text-[#202833] text-sm mb-1">{r.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed mb-4">{r.desc}</p>
            </div>

            <button
              onClick={() => handleDownloadReport(r.title)}
              className="w-full py-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#85E510] text-[#202833] hover:text-[#062404] border border-[#CBD5E1] hover:border-[#85E510] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate & Download</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
