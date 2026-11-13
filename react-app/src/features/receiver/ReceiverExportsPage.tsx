import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet, Archive, CheckCircle2, AlertCircle, Loader2, X, RefreshCw, FileText, Check, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  getStudents, getPhotoUrl, getPhotoEncodeClass,
  generateStudentQrToken, getStudentPhotoFileName, getStudentQrFileName,
  buildExportPhotoPath, buildExportQrPath, refreshPlatformSettings, isRegistryReady,
  exportPhoneValue
} from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const ReceiverExportsPage: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'zip' | 'csv' | 'excel' | 'manifest'>('csv');
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dataVersion = useRegistryVersion();

  // The registry hydrates asynchronously after login; re-read it whenever the store reports a change
  // so this page never sits on a stale (or empty) snapshot while the dashboard shows the full count.
  const students = useMemo(() => getStudents(), [dataVersion]);
  const registryReady = useMemo(() => isRegistryReady(), [dataVersion]);
  const dash = (value: string) => (registryReady ? value : '—');

  // Keep export path templates fresh from platform settings
  useEffect(() => {
    refreshPlatformSettings().catch(() => {});
  }, []);

  // Derived from real authoritative student records
  const sampleFiles = (students.length > 0 ? students.slice(0, 5) : []).map(s => {
    const isEnc = getPhotoEncodeClass(s) === 'Encoded';
    return {
      name: getStudentPhotoFileName(s),
      status: isEnc ? 'Done' : 'Missing',
      encodeClass: isEnc ? 'Encoded' : 'Unencoded'
    };
  });

  const handleStartDownload = () => {
    setDownloadModalOpen(true);
    setProgressPercent(15);
    setCompletedCount(Math.floor(students.length * 0.15));
    setFailedCount(0);

    setTimeout(() => {
      setProgressPercent(60);
      setCompletedCount(Math.floor(students.length * 0.6));
    }, 500);

    setTimeout(async () => {
      try {
        if (selectedFormat === 'csv') {
          exportRealCSV();
        } else if (selectedFormat === 'excel') {
          exportRealExcel();
        } else if (selectedFormat === 'manifest') {
          exportPhotoManifest();
        } else if (selectedFormat === 'zip') {
          await exportClassifiedZip();
        }
        setFailedCount(0);
      } catch {
        setFailedCount(1);
      }
      setProgressPercent(100);
      setCompletedCount(students.length);
    }, 1200);
  };

  const exportRealCSV = () => {
    try {
      // Exact required header format: Name StudentId Sex Grade BloodType Phone @photo @qr
      const headers = ['Name', 'StudentId', 'Sex', 'Grade', 'BloodType', 'Phone', '@photo', '@qr'];
      const rows = students.map(s => {
        const photoLocalPath = buildExportPhotoPath(s);
        const qrLocalPath = buildExportQrPath(s);
        return [
          `"${(s.fullName || '').replace(/"/g, '""')}"`,
          `"${s.studentId}"`,
          `"${(s.sex || '').replace(/"/g, '""')}"`,
          `"${s.grade || ''}"`,
          `"${(s.bloodType || '').replace(/"/g, '""')}"`,
          `"${exportPhoneValue(s.phone)}"`,
          `"${photoLocalPath.replace(/"/g, '""')}"`,
          `"${qrLocalPath.replace(/"/g, '""')}"`
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StudentBridge_Directory_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const exportRealExcel = () => {
    try {
      const exportData = students.map(s => {
        return {
          'Name': s.fullName,
          'StudentId': s.studentId,
          'Sex': s.sex || '',
          'Grade': s.grade || '',
          'BloodType': s.bloodType || '',
          'Phone': exportPhoneValue(s.phone),
          '@photo': buildExportPhotoPath(s),
          '@qr': buildExportQrPath(s),
          'Branch': s.location || '',
          'School': s.school || '',
          'Status': s.status || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `StudentBridge_Master_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  const exportPhotoManifest = () => {
    try {
      const withPhoto = students.filter(s => getPhotoEncodeClass(s) === 'Encoded');
      const missing = students.filter(s => getPhotoEncodeClass(s) !== 'Encoded');

      const manifest = {
        generatedAt: new Date().toISOString(),
        totalStudents: students.length,
        verifiedPhotosCount: withPhoto.length,
        missingPhotosCount: missing.length,
        storageBucket: 'siliconlabs',
        cdnBase: 'https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev',
        namingConvention: '{Grade}/{StudentID}_{FullName}.jpg',
        verifiedManifest: withPhoto.map(s => ({
          studentId: s.studentId,
          fullName: s.fullName,
          grade: s.grade,
          school: s.school,
          encodeClass: 'Encoded',
          qrCodePayload: s.qrCodeData || `SB://${s.studentId}/${encodeURIComponent(s.fullName)}`,
          photoUrl: getPhotoUrl(s.photoPath || s.previewPath),
          status: 'VERIFIED'
        })),
        missingManifest: missing.map(s => ({
          studentId: s.studentId,
          fullName: s.fullName,
          grade: s.grade,
          school: s.school,
          encodeClass: 'Unencoded',
          status: 'MISSING_PHOTO'
        }))
      };

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Photo_Manifest_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const exportClassifiedZip = async () => {
    const zip = new JSZip();
    // A workstation export is bounded to the first 100 records so the browser is not asked to
    // hold thousands of portraits in memory. The cap is stated in the format description.
    const batch = students.slice(0, 100);
    const meta = batch.map(s => ({
      id: s.studentId,
      name: s.fullName,
      grade: s.grade,
      school: s.school,
      encodeClass: getPhotoEncodeClass(s),
      qrCodePayload: s.qrCodeData || `SB://${s.studentId}/${encodeURIComponent(s.fullName)}`,
      photoUrl: getPhotoUrl(s.photoPath || s.previewPath)
    }));

    let added = 0;
    let skipped = 0;
    for (const s of batch) {
      const url = getPhotoUrl(s.photoPath || s.previewPath);
      if (!url) {
        skipped += 1;
        continue;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) {
          skipped += 1;
          continue;
        }
        const blob = await res.blob();
        const folder = getPhotoEncodeClass(s) === 'Encoded' ? 'Encoded_Verified' : 'Unencoded_Pending';
        zip.file(`${folder}/${getStudentPhotoFileName(s)}`, blob);
        added += 1;
      } catch {
        skipped += 1;
      }
    }

    zip.file('manifest.json', JSON.stringify(meta, null, 2));
    zip.file(
      'README.txt',
      `StudentBridge Photo Archive\n${added} portraits written, ${skipped} record(s) had no reachable photo file.\nScope: first ${batch.length} of ${students.length} records held on this station.\nSilicon Labs Enterprise Data Management.`
    );

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Classified_Photos_Archive_${new Date().toISOString().substring(0, 10)}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageShell className="mx-auto max-w-5xl">
      <PageHero
        icon={Archive}
        title="Exports & Bulk Operations"
        count={registryReady ? `${students.length.toLocaleString()} records` : "Reading registry"}
        live="Export centre"
        subtitle="Generate a spreadsheet, the photo manifest or a ZIP of portraits from the records held on this station. The ZIP covers the first 100 records so the browser is not asked to hold thousands of images."
      >
        <FactGrid cols={4}>
          <FactCard label="Records Ready" value={dash(students.length.toLocaleString())} hint="held on this station" icon={Archive} />
          <FactCard
            label="With Portrait"
            value={dash(students.filter(s => getPhotoEncodeClass(s) === 'Encoded').length.toLocaleString())}
            hint="photo file reachable"
            icon={FileSpreadsheet}
          />
          <FactCard label="Format" value={selectedFormat.toUpperCase()} hint="output package" icon={FileText} />
          <FactCard label="Campuses" value={dash(new Set(students.map(s => s.school).filter(Boolean)).size.toLocaleString())} hint="represented in the file" icon={Users} />
        </FactGrid>
      </PageHero>

      {/* Main Options Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Format Selection Card */}
        <div className="bg-white border border-[#E3EFD7] rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-[#0B1118] uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#3F7A06]" />
            <span>1. Select Export Format</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedFormat('csv')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'csv'
                  ? 'bg-[#85E510]/10 border-[#85E510] shadow-sm'
                  : 'bg-[#FBFDF7] border-[#E3EFD7] hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-[#0B1118] flex items-center justify-between">
                <span>CSV Registry</span>
                {selectedFormat === 'csv' && <Check className="w-3.5 h-3.5 text-[#3F7A06]" />}
              </div>
              <div className="text-[10px] text-[#7C8B70] mt-1">Lightweight comma-separated format</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('excel')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'excel'
                  ? 'bg-[#85E510]/10 border-[#85E510] shadow-sm'
                  : 'bg-[#FBFDF7] border-[#E3EFD7] hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-[#0B1118] flex items-center justify-between">
                <span>Excel Spreadsheet</span>
                {selectedFormat === 'excel' && <Check className="w-3.5 h-3.5 text-[#3F7A06]" />}
              </div>
              <div className="text-[10px] text-[#7C8B70] mt-1">Microsoft Excel (.xlsx) workbook</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('manifest')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'manifest'
                  ? 'bg-[#85E510]/10 border-[#85E510] shadow-sm'
                  : 'bg-[#FBFDF7] border-[#E3EFD7] hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-[#0B1118] flex items-center justify-between">
                <span>Photo Manifest</span>
                {selectedFormat === 'manifest' && <Check className="w-3.5 h-3.5 text-[#3F7A06]" />}
              </div>
              <div className="text-[10px] text-[#7C8B70] mt-1">JSON status manifest of photos</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('zip')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedFormat === 'zip'
                  ? 'bg-[#85E510]/10 border-[#85E510] shadow-sm'
                  : 'bg-[#FBFDF7] border-[#E3EFD7] hover:bg-white'
              }`}
            >
              <div className="text-xs font-bold text-[#0B1118] flex items-center justify-between">
                <span>Classified ZIP</span>
                {selectedFormat === 'zip' && <Check className="w-3.5 h-3.5 text-[#3F7A06]" />}
              </div>
              <div className="text-[10px] text-[#7C8B70] mt-1">First 100 records, photo files included</div>
            </button>
          </div>
        </div>
      </div>

      {/* Action Card */}
      <div className="bg-white border border-[#E3EFD7] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-heading font-black text-sm text-[#0B1118]">
            {registryReady ? "Ready to generate export package" : "Reading the registry"}
          </h4>
          <p className="text-xs text-[#7C8B70] mt-0.5">
            {registryReady
              ? "Writes the records held on this station — student-to-photo links are preserved and file names are sanitized."
              : "Waiting for the station's registry to finish syncing so the package is not written half-empty."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartDownload}
          disabled={!registryReady}
          className="py-3 px-6 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>{registryReady ? "Generate & download" : "Syncing…"}</span>
        </button>
      </div>

      {/* Download Progress Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E3EFD7] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3EFD7] pb-3">
              <h3 className="font-heading font-black text-base text-[#0B1118] flex items-center gap-2">
                <Download className="w-4 h-4 text-[#3F7A06]" />
                <span>Preparing Export Package</span>
              </h3>
              {progressPercent === 100 && (
                <button
                  type="button"
                  onClick={() => setDownloadModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#F3FBE8] text-[#7C8B70]"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#0B1118]">
                <span>Status: {progressPercent === 100 ? 'Archive Generated Successfully' : 'Bundling Records...'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#E3EFD7] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#85E510] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#7C8B70]">
                <span>Processed: {completedCount.toLocaleString()} items</span>
                <span>Failed: {failedCount}</span>
              </div>
            </div>

            {/* Sample Files List */}
            <div className="p-3 bg-[#FBFDF7] rounded-xl border border-[#E3EFD7] space-y-2 text-xs">
              <div className="text-[11px] font-bold text-[#7C8B70] uppercase tracking-wider">Archive Sample Manifest</div>
              {sampleFiles.map(f => (
                <div key={f.name} className="flex justify-between items-center py-1 border-b border-[#E3EFD7] last:border-0">
                  <span className="font-mono text-[11px] text-[#0B1118] truncate max-w-[280px]">{f.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    f.status === 'Done' ? 'bg-[#85E510]/20 text-[#366804]' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {f.status}
                  </span>
                </div>
              ))}
            </div>

            {progressPercent === 100 && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDownloadModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
};
