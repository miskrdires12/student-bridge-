import React, { useState } from 'react';
import { Download, FileSpreadsheet, Archive, CheckCircle2, AlertCircle, Loader2, X, RefreshCw, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { getStudents } from '@/lib/store';

export const ReceiverExportsPage: React.FC = () => {
  const [selectedScope, setSelectedScope] = useState<'filtered' | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'zip' | 'csv' | 'excel'>('zip');
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(45);
  const [completedCount, setCompletedCount] = useState(225);
  const [failedCount, setFailedCount] = useState(5);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const students = getStudents();

  const sampleFiles = [
    { name: 'SB-2026-12788_Loza_Bereket.jpg', status: 'Done', size: '250 KB' },
    { name: 'SB-2026-12787_Alemu_Tadesse.jpg', status: 'Done', size: '260 KB' },
    { name: 'SB-2026-12786_Hana_Tadesse.jpg', status: 'Failed', size: '0 KB' },
    { name: 'SB-2026-12785_Getnet_Kassa.jpg', status: 'Done', size: '240 KB' },
    { name: 'SB-2026-12784_Dawit_Alemu.jpg', status: 'Done', size: '255 KB' },
  ];

  const handleStartDownload = () => {
    setDownloadModalOpen(true);
    setProgressPercent(15);

    // Simulate progress and execute real export
    setTimeout(() => setProgressPercent(45), 600);
    setTimeout(() => {
      setProgressPercent(100);
      setCompletedCount(500);
      setFailedCount(0);

      if (selectedFormat === 'csv') {
        exportRealCSV();
      } else if (selectedFormat === 'excel') {
        exportRealExcel();
      }
    }, 1800);
  };

  const exportRealCSV = () => {
    try {
      const headers = ['ID', 'StudentID', 'FullName', 'Sex', 'Grade', 'School', 'Phone', 'BloodType', 'Country', 'Status'];
      const rows = students.map(s => [
        s.id,
        s.studentId,
        `"${s.fullName}"`,
        s.sex || '',
        s.grade || '',
        `"${s.school || ''}"`,
        s.phone || '',
        s.bloodType || '',
        s.country || 'Ethiopia',
        s.status || 'Accepted'
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StudentBridge_Directory_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const exportRealExcel = () => {
    try {
      const exportData = students.map(s => ({
        'Student ID': s.studentId,
        'Full Name': s.fullName,
        'Sex': s.sex || 'Male',
        'Grade Level': s.grade || '',
        'School Campus': s.school || '',
        'Contact Phone': s.phone || '',
        'Blood Type': s.bloodType || '',
        'Country': s.country || 'Ethiopia',
        'Verification Status': s.status || 'Accepted',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `StudentBridge_Master_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="pb-2 border-b border-[#1e2e42]">
        <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Downlaod Download</h1>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          Select target student populations, export formats, and package biometric photo assets
        </p>
      </div>

      {/* Step Wizard matching screenshot 9 */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6">
        <div className="flex items-center justify-between max-w-md mx-auto mb-8">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#85e510] text-[#071302] font-black text-xs flex items-center justify-center">
              1
            </div>
            <span className="text-[11px] font-bold text-white">Select</span>
          </div>
          <div className="flex-1 h-0.5 bg-[#85e510] mx-2 -mt-4" />

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#85e510] text-[#071302] font-black text-xs flex items-center justify-center">
              2
            </div>
            <span className="text-[11px] font-bold text-white">Scope</span>
          </div>
          <div className="flex-1 h-0.5 bg-[#85e510] mx-2 -mt-4" />

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#85e510] text-[#071302] font-black text-xs flex items-center justify-center">
              3
            </div>
            <span className="text-[11px] font-bold text-[#85e510]">Generate</span>
          </div>
          <div className="flex-1 h-0.5 bg-[#1e2e42] mx-2 -mt-4" />

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#1e2e42] text-[#94a3b8] font-black text-xs flex items-center justify-center">
              4
            </div>
            <span className="text-[11px] font-bold text-[#94a3b8]">Download</span>
          </div>
        </div>

        {/* Form Options matching screenshot 9 */}
        <div className="space-y-6">
          {/* Select by radio */}
          <div>
            <label className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block mb-3">
              Select by:
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={selectedScope === 'filtered'}
                  onChange={() => setSelectedScope('filtered')}
                  className="w-4 h-4 text-[#85e510] bg-[#0d1520] border-[#1e2e42] focus:ring-[#85e510]"
                />
                <span className="text-xs font-semibold text-white">Filtered Students</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={selectedScope === 'all'}
                  onChange={() => setSelectedScope('all')}
                  className="w-4 h-4 text-[#85e510] bg-[#0d1520] border-[#1e2e42] focus:ring-[#85e510]"
                />
                <span className="text-xs font-semibold text-white">Select All Students ({students.length.toLocaleString()})</span>
              </label>
            </div>
          </div>

          {/* Format Selection buttons matching screenshot 9 */}
          <div>
            <label className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider block mb-3">
              Package Format:
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedFormat('zip')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  selectedFormat === 'zip'
                    ? 'bg-[#85e510]/15 border-[#85e510] text-[#85e510]'
                    : 'bg-[#0d1520] border-[#1e2e42] text-[#94a3b8] hover:text-white'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>ZIP (Photos)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  selectedFormat === 'csv'
                    ? 'bg-[#85e510]/15 border-[#85e510] text-[#85e510]'
                    : 'bg-[#0d1520] border-[#1e2e42] text-[#94a3b8] hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('excel')}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  selectedFormat === 'excel'
                    ? 'bg-[#85e510]/15 border-[#85e510] text-[#85e510]'
                    : 'bg-[#0d1520] border-[#1e2e42] text-[#94a3b8] hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Directory Location Preview */}
          <div className="p-4 rounded-xl bg-[#0d1520] border border-[#1e2e42] space-y-1.5 text-xs">
            <div className="text-[#94a3b8]">Archive Structure: <strong className="text-white">School / Grade / StudentID_Name</strong></div>
            <div className="text-[#94a3b8]">Location Path: <span className="font-mono text-[#85e510]">C:\StudentBridge\Photos</span></div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleStartDownload}
              className="px-6 py-3 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] font-extrabold text-xs shadow-lg shadow-[#85e510]/20 transition-all"
            >
              Start Download
            </button>
            <button
              type="button"
              className="px-5 py-3 rounded-xl bg-white/5 text-[#94a3b8] hover:text-white font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Download in Progress Modal matching screenshot 10 */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setDownloadModalOpen(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-1">Download in Progress</h3>
            <p className="text-xs text-[#94a3b8] mb-4">Creating archive and bundling high-resolution portraits...</p>

            {/* Progress bar */}
            <div className="w-full bg-[#0d1520] rounded-full h-2.5 overflow-hidden mb-4">
              <div
                className="bg-[#85e510] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Summary statistics matching screenshot 10 */}
            <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-[#0d1520] border border-[#1e2e42] text-center mb-5 text-xs">
              <div>
                <div className="text-[#94a3b8] text-[10px] uppercase font-bold">Total</div>
                <div className="text-white font-black font-heading text-base">500</div>
              </div>
              <div>
                <div className="text-[#85e510] text-[10px] uppercase font-bold">Completed</div>
                <div className="text-[#85e510] font-black font-heading text-base">{completedCount}</div>
              </div>
              <div>
                <div className="text-red-400 text-[10px] uppercase font-bold">Failed</div>
                <div className="text-red-400 font-black font-heading text-base">{failedCount}</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-[10px] uppercase font-bold">File Size</div>
                <div className="text-white font-black font-heading text-base">1.2 GB</div>
              </div>
            </div>

            {/* Files list table matching screenshot 10 */}
            <div className="border border-[#1e2e42] rounded-xl overflow-hidden max-h-48 overflow-y-auto mb-5 text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#0d1520] text-[#94a3b8] uppercase text-[10px] border-b border-[#1e2e42]">
                  <tr>
                    <th className="py-2.5 pl-3">File Name</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right pr-3">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2e42]/60">
                  {sampleFiles.map((file) => (
                    <tr key={file.name} className="hover:bg-[#172435]">
                      <td className="py-2 pl-3 font-mono text-white text-[11px]">{file.name}</td>
                      <td className="py-2">
                        {file.status === 'Done' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#85e510]/15 text-[#85e510]">
                            Done
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right pr-3 font-mono text-[#94a3b8] text-[11px]">{file.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFailedCount(0);
                  setProgressPercent(100);
                  setCompletedCount(500);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
              >
                Retry Failed
              </button>

              <button
                type="button"
                onClick={() => setDownloadModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-[#94a3b8] hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
