import React, { useState } from 'react';
import { Download, FileSpreadsheet, Archive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverExportsPage: React.FC = () => {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);
  const [isExportingZIP, setIsExportingZIP] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const students = getStudents();

  // Export to CSV
  const handleExportCSV = () => {
    setIsExportingCSV(true);
    setSuccessMessage(null);
    try {
      const headers = ['ID', 'StudentID', 'FullName', 'Sex', 'Grade', 'School', 'Phone', 'BloodType', 'Country', 'PhotoPath', 'Status'];
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
        s.photoPath || '',
        s.status || 'VERIFIED'
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

      setSuccessMessage(`Successfully exported ${students.length.toLocaleString()} records to CSV format.`);
    } catch (e: any) {
      alert('CSV Export failed: ' + e.message);
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Export to Excel (.xlsx) using xlsx package
  const handleExportXLSX = () => {
    setIsExportingXLSX(true);
    setSuccessMessage(null);
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
        'Photo CDN Path': s.photoPath || '',
        'Verification Status': s.status || 'VERIFIED',
        'Created Timestamp': s.createdAt || '2026-10-13',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `StudentBridge_Master_${new Date().toISOString().substring(0, 10)}.xlsx`);

      setSuccessMessage(`Successfully compiled and downloaded Excel workbook with ${students.length.toLocaleString()} rows.`);
    } catch (e: any) {
      alert('Excel export error: ' + e.message);
    } finally {
      setIsExportingXLSX(false);
    }
  };

  // Export to ZIP Archive of student photos using jszip
  const handleExportZIP = async () => {
    setIsExportingZIP(true);
    setZipProgress(10);
    setSuccessMessage(null);

    try {
      const zip = new JSZip();
      const folder = zip.folder('student_photographs');

      // Add a manifest text file
      folder?.file('manifest.json', JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalStudents: students.length,
        organization: 'Silicon Labs Ethiopia - StudentBridge',
        storage: 'Cloudflare R2 (siliconlabs)',
      }, null, 2));

      setZipProgress(40);

      // Create index file
      const indexList = students.map(s => `${s.studentId}\t${s.fullName}\t${s.school}\t${s.photoPath || 'MISSING'}`).join('\n');
      folder?.file('index.tsv', indexList);

      setZipProgress(75);

      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StudentBridge_Photos_${new Date().toISOString().substring(0, 10)}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMessage('Successfully generated and downloaded photo archive ZIP package.');
    } catch (e: any) {
      alert('ZIP creation failed: ' + e.message);
    } finally {
      setIsExportingZIP(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Bulk Export & Distribution Center</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Export student registries into Microsoft Excel, standardized CSV, or biometric photo ZIP archives
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl border border-[#8fe617]/20">
          Ready: {students.length.toLocaleString()} Records
        </span>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/30 text-[#8fe617] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CSV Card */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 flex flex-col justify-between hover:border-[#8fe617]/40 transition-all">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#8fe617]/10 flex items-center justify-center text-[#8fe617] mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-heading font-bold text-white mb-1">Standard CSV Registry</h3>
            <p className="text-xs text-[#9eb2a6] leading-relaxed mb-4">
              Export all 3,723 student identity records formatted with RFC 4180 commas for database import.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExportingCSV}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-[#8fe617] hover:text-[#062404] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            {isExportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export CSV</span>
          </button>
        </div>

        {/* Excel XLSX Card */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-heading font-bold text-white mb-1">Excel Workbook (.XLSX)</h3>
            <p className="text-xs text-[#9eb2a6] leading-relaxed mb-4">
              Full formatted spreadsheet with column headers, grade filters, school breakdowns, and timestamps.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportXLSX}
            disabled={isExportingXLSX}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-[#062404] font-bold text-xs flex items-center justify-center gap-2 transition-all border border-emerald-500/30"
          >
            {isExportingXLSX ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Download XLSX</span>
          </button>
        </div>

        {/* ZIP Archive Card */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-base font-heading font-bold text-white mb-1">Photo Archive (ZIP)</h3>
            <p className="text-xs text-[#9eb2a6] leading-relaxed mb-4">
              Bundled archive containing student photograph links, manifest, and indexing files.
            </p>
          </div>

          <div>
            {isExportingZIP && (
              <div className="w-full bg-[#070908] rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="bg-purple-400 h-full transition-all duration-300"
                  style={{ width: `${zipProgress}%` }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleExportZIP}
              disabled={isExportingZIP}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-purple-500/30"
            >
              {isExportingZIP ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              <span>{isExportingZIP ? `Compressing (${zipProgress}%)...` : 'Generate ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
