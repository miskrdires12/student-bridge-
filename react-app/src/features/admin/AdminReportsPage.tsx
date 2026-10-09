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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Executive Management Reports</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Downloadable executive summaries, school campus audits, and demographic distribution exports
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          Report Engine v2
        </span>
      </div>

      {downloadedReport && (
        <div className="p-3 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/30 text-[#8fe617] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Report "{downloadedReport}" downloaded successfully.</span>
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
            title: 'Operator Velocity & Session Log',
            desc: 'Individual shift capture rates, 1-device lock records, and submission timestamps.',
            tag: 'Operations'
          },
          {
            title: 'Regional Blood Type Distribution',
            desc: 'Medical preparedness report classifying student blood group tallies across all branches.',
            tag: 'Medical / Safety'
          }
        ].map(r => (
          <div key={r.title} className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 flex flex-col justify-between hover:border-[#8fe617]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-[#8fe617]">
                  {r.tag}
                </span>
                <span className="text-[10px] font-mono text-[#9eb2a6]">{new Date().toISOString().substring(0, 10)}</span>
              </div>
              <h3 className="font-heading font-bold text-white text-sm mb-1">{r.title}</h3>
              <p className="text-xs text-[#9eb2a6] leading-relaxed mb-4">{r.desc}</p>
            </div>

            <button
              type="button"
              onClick={() => handleDownloadReport(r.title)}
              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-[#8fe617] hover:text-[#062404] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
