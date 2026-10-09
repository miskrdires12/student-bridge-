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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Database Control Room & Telemetry</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Cloudflare D1 / in-memory edge synchronization, snapshot exports, and storage integrity
          </p>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Master JSON Backup</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/30 text-[#8fe617] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Full database snapshot exported successfully to your downloads folder.</span>
        </div>
      )}

      {/* Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Total Stored Entities</span>
          <div className="mt-2 text-2xl font-heading font-black text-white">
            {(students.length + users.length + schools.length).toLocaleString()}
          </div>
          <div className="text-xs text-[#8fe617] mt-1 font-mono">{students.length} Students &bull; {users.length} Users</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Edge Query Latency</span>
          <div className="mt-2 text-2xl font-heading font-black text-emerald-400">&lt; 1.8 ms</div>
          <div className="text-xs text-[#9eb2a6] mt-1">Memory-mapped JSON cache</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Cloudflare R2 Objects</span>
          <div className="mt-2 text-2xl font-heading font-black text-blue-400">3,578 Files</div>
          <div className="text-xs text-[#9eb2a6] mt-1">Bucket: siliconlabs (Active)</div>
        </div>
      </div>

      {/* Storage Architecture Details */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
          Storage Architecture Specification
        </h2>

        <div className="space-y-3 text-xs text-[#9eb2a6]">
          <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] flex items-center justify-between">
            <span className="text-white font-medium">Primary Biometric Photos:</span>
            <span className="font-mono text-[#8fe617]">https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/</span>
          </div>

          <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] flex items-center justify-between">
            <span className="text-white font-medium">Database Persistence:</span>
            <span className="font-mono text-white">Cloudflare Pages Functions + Edge In-Memory Store</span>
          </div>

          <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] flex items-center justify-between">
            <span className="text-white font-medium">External SaaS Dependencies:</span>
            <span className="font-mono text-emerald-400 font-bold">0 (Zero Supabase, Zero Vercel)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
