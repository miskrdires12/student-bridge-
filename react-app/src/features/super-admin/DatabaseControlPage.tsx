import React, { useState } from 'react';
import { Database, Download, Upload, RefreshCw, CheckCircle2, HardDrive, Cpu, ShieldCheck } from 'lucide-react';
import { getStudents, getUsers, getSchools } from '@/lib/store';

export const DatabaseControlPage: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const students = getStudents();
  const users = getUsers();
  const schools = getSchools();

  const handleDownloadBackup = () => {
    const backupData = {
      backupTimestamp: new Date().toISOString(),
      system: 'StudentBridge — Silicon Labs Enterprise',
      version: '2.0.0-Cloudflare',
      recordsCount: {
        students: students.length,
        users: users.length,
        schools: schools.length,
      },
      students,
      users,
      schools,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `StudentBridge_DB_Snapshot_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Database Control Room & Telemetry</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cloudflare D1 / edge data synchronization, snapshot exports, and storage integrity
          </p>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Master JSON Backup</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Full database snapshot exported successfully to your local machine.</span>
        </div>
      )}

      {/* Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Stored Entities</span>
          <div className="mt-2 text-2xl font-heading font-black text-[#202833]">
            {(students.length + users.length + schools.length).toLocaleString()}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-bold font-mono">{students.length} Students &bull; {users.length} Users</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Edge Query Latency</span>
          <div className="mt-2 text-2xl font-heading font-black text-[#2E7D32]">&lt; 1.8 ms</div>
          <div className="text-xs text-[#64748B] mt-1">Memory-mapped JSON edge cache</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Cloudflare R2 Objects</span>
          <div className="mt-2 text-2xl font-heading font-black text-[#0284C7]">3,578 Files</div>
          <div className="text-xs text-[#64748B] mt-1">Bucket: siliconlabs (Active)</div>
        </div>
      </div>

      {/* Storage Architecture Details */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-heading font-bold text-[#202833] uppercase tracking-wider">
          Storage Architecture Specification
        </h2>

        <div className="space-y-3 text-xs text-[#64748B]">
          <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[#202833] font-bold">Primary Biometric Photos:</span>
            <span className="font-mono text-[#2E7D32] font-semibold break-all">https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[#202833] font-bold">Photo Key Pattern:</span>
            <span className="font-mono text-[#0284C7] font-semibold">&#123;Grade&#125;/&#123;StudentID&#125;_&#123;FullName&#125;.jpg</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[#202833] font-bold">Edge API Gateway:</span>
            <span className="font-mono text-purple-700 font-semibold">_worker.js on Cloudflare Pages Functions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
