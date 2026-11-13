import React, { useState } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle2, Table, Check, FileText, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { addStudent } from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, PrimaryButton, Chip } from '@/components/ui/PageKit';

export const ReceiverImportPage: React.FC = () => {
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedRows(data);
      } catch (err) {
        console.error("Failed parsing spreadsheet:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitImport = () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    let importedCount = 0;
    let skippedCount = 0;

    parsedRows.forEach((row, idx) => {
      const fullName = row['Full Name'] || row['Name'] || row['fullName'] || '';
      const studentId = row['Student ID'] || row['ID'] || row['studentId'] || `SB-${Date.now().toString().slice(-4)}-${idx}`;
      const grade = String(row['Grade'] || row['grade'] || '');
      const school = row['School'] || row['Campus'] || row['school'] || '';

      if (fullName && studentId) {
        addStudent({
          id: `std_${Date.now()}_${idx}`,
          studentId,
          fullName,
          grade,
          school,
          bloodType: row['Blood Type'] || '',
          phone: row['Phone'] || '',
          status: 'PENDING'
        });
        importedCount++;
      } else {
        skippedCount++;
      }
    });

    setTimeout(() => {
      setImporting(false);
      setImportSummary({ imported: importedCount, skipped: skippedCount });
      setParsedRows([]);
    }, 1200);
  };

  const readyRows = parsedRows.filter(r => (r['Full Name'] || r['Name'] || r['fullName']) && (r['Student ID'] || r['ID'] || r['studentId'])).length;

  return (
    <PageShell className="mx-auto max-w-5xl">
      <PageHero
        icon={Upload}
        title="Batch Import"
        count={fileName || 'no file'}
        live="Mapping centre"
        subtitle="Bulk ingest a student roster from Excel or CSV, preview how each column maps, then commit the rows. Blank phone or blood type stays blank — nothing is invented."
      >
        <FactGrid cols={4}>
          <FactCard label="Rows Parsed" value={parsedRows.length.toLocaleString()} hint="in the selected sheet" icon={Table} />
          <FactCard label="Ready to Commit" value={readyRows.toLocaleString()} hint="name and ID present" icon={CheckCircle2} />
          <FactCard label="Will Skip" value={(parsedRows.length - readyRows).toLocaleString()} hint="missing name or ID" icon={FileText} />
          <FactCard label="Last Import" value={importSummary ? importSummary.imported.toLocaleString() : '—'} hint={importSummary ? `${importSummary.skipped} skipped` : 'nothing imported yet'} icon={ArrowRight} />
        </FactGrid>
      </PageHero>

      {importSummary && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#CDEBB4] bg-[#EAF7DA] p-4 text-xs font-bold text-[#2F5E04]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#6FBF0A]" />
            <span>Imported {importSummary.imported} records ({importSummary.skipped} rows skipped).</span>
          </div>
          <button type="button" onClick={() => setImportSummary(null)} className="cursor-pointer text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl border-2 border-dashed border-[#D8E3CC] bg-white p-8 text-center transition-colors hover:border-[#85E510]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF7DA] text-[#3F7A06]">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-black text-[#0B1118]">Drop an Excel (.xlsx) or CSV roster here</h3>
          <p className="mt-0.5 text-xs text-[#7C8B70]">Accepts the official campus and ministry student spreadsheets.</p>
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#85E510] px-5 py-2.5 text-xs font-black text-[#062404] shadow-sm transition-colors hover:bg-[#76CF0C]">
          <Upload className="h-4 w-4" />
          <span>Browse spreadsheet file</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {parsedRows.length > 0 && (
        <SectionCard
          title={`Roster Preview · ${parsedRows.length} rows`}
          subtitle="First 50 rows, exactly as they were parsed"
          icon={Table}
          padded={false}
          actions={
            <>
              <Chip tone="neutral">{readyRows} ready</Chip>
              <PrimaryButton icon={Check} onClick={handleCommitImport} disabled={importing} className="h-8">
                {importing ? 'Committing...' : `Commit ${parsedRows.length}`}
              </PrimaryButton>
            </>
          }
        >
          <div className="custom-scrollbar max-h-80 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
                <tr>
                  <th className="py-2.5 pl-4">Full Name</th>
                  <th className="py-2.5">Student ID</th>
                  <th className="py-2.5">Grade</th>
                  <th className="py-2.5">Section</th>
                  <th className="py-2.5">Campus</th>
                  <th className="py-2.5 pr-4">Contact Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF4E5]">
                {parsedRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FBF4]">
                    <td className="py-2.5 pl-4 font-bold text-[#0B1118]">{row['Full Name'] || row['Name'] || row['fullName'] || '—'}</td>
                    <td className="py-2.5 font-mono font-semibold text-[#3F7A06]">{row['Student ID'] || row['ID'] || row['studentId'] || 'auto'}</td>
                    <td className="py-2.5 text-[#5C6B51]">{row['Grade'] || row['grade'] || '—'}</td>
                    <td className="py-2.5 text-[#5C6B51]">{row['Section'] || '—'}</td>
                    <td className="py-2.5 text-[#5C6B51]">{row['School'] || row['Campus'] || '—'}</td>
                    <td className="py-2.5 pr-4 font-mono text-[#7C8B70]">{row['Phone'] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </PageShell>
  );
};
