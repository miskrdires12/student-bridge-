import React, { useState } from 'react';
import { Layers, Download, CheckCircle2, FileText, BarChart3, Users, Database, ShieldCheck } from 'lucide-react';
import { getStudents, getUsers } from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, PrimaryButton } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const AdminReportsPage: React.FC = () => {
  const [downloadedReport, setDownloadedReport] = useState<string | null>(null);
  const registryVersion = useRegistryVersion();

  const students = React.useMemo(() => getStudents(), [registryVersion]);
  const users = getUsers();

  const handleDownloadReport = (reportName: string) => {
    setDownloadedReport(reportName);
    setTimeout(() => setDownloadedReport(null), 3000);

    const verified = students.filter(s => s.photoIntegrityStatus === 'PHOTO_VERIFIED').length;
    const coverage = students.length ? `${((verified / students.length) * 100).toFixed(1)}%` : 'n/a';
    const reportContent = `STUDENTBRIDGE ENTERPRISE REPORT: ${reportName}\nGenerated: ${new Date().toISOString()}\nTotal Students: ${students.length}\nPhoto Verified: ${verified} (${coverage})\nTotal Operators: ${users.length}\nStorage: Cloudflare R2\n`;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}_Report.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reports = [
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
  ];

  return (
    <PageShell>
      <PageHero
        icon={Layers}
        title="Management Reports"
        count={`${reports.length} packs`}
        live="Report engine"
        subtitle="Downloadable executive summaries, school campus audits and demographic distribution exports built from the records this station holds."
      >
        <FactGrid cols={4}>
          <FactCard label="Reports Available" value={reports.length} hint="executive packs" icon={FileText} />
          <FactCard label="Registry Records" value={students.length.toLocaleString()} hint="records held here" icon={Database} />
          <FactCard label="Operators" value={users.length.toLocaleString()} hint="accounts on station" icon={Users} />
          <FactCard label="Storage" value="Cloudflare R2" hint="object store for photos" icon={BarChart3} />
        </FactGrid>
      </PageHero>

      {downloadedReport && (
        <div className="flex items-center gap-2 rounded-xl border border-[#CDEBB4] bg-[#EAF7DA] px-3.5 py-2.5 text-xs font-semibold text-[#2F5E04]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Report "{downloadedReport}" downloaded successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reports.map(r => (
          <SectionCard key={r.title} className="flex flex-col justify-between transition-colors hover:border-[#85E510]">
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#2F5E04]">
                  {r.tag}
                </span>
                <FileText className="h-4 w-4 text-[#6FBF0A]" />
              </div>
              <h3 className="mb-1 text-sm font-black tracking-tight text-[#0B1118]">{r.title}</h3>
              <p className="mb-4 text-xs leading-relaxed text-[#5C6B51]">{r.desc}</p>
              <PrimaryButton icon={Download} onClick={() => handleDownloadReport(r.title)} className="mt-auto w-full justify-center">
                Generate &amp; Download
              </PrimaryButton>
            </div>
          </SectionCard>
        ))}
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-[#8A9680]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#6FBF0A]" />
        Reports are generated on this station from the current registry; nothing is uploaded anywhere.
      </p>
    </PageShell>
  );
};
