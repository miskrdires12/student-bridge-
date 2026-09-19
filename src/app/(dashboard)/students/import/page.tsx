"use client";

// ============================================================================
// STUDENT BRIDGE — INTERACTIVE EXCEL IMPORTER WITH COLUMN MAPPING
// Fulfills Requirement 13:
// - Upload -> Read -> Map Columns -> Validate -> Preview -> Confirm -> Import
// - Never assume Excel column names are fixed.
// - Downloadable error report for invalid rows.
// ============================================================================

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  ArrowRight,
  FileCheck,
  Columns,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  inspectExcelWorkbookAction,
  importExcelStudentsAction,
  type BulkImportResult,
} from "@/actions/import";

interface PreviewRow {
  rowNumber: number;
  studentId: string;
  fullName: string;
  grade: string;
  sex: string;
  phone: string;
  isValid: boolean;
  errors: string[];
}

export default function BulkImportPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard Steps: 1: Upload, 2: Map Columns, 3: Validate & Preview, 4: Results
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [totalSpreadsheetRows, setTotalSpreadsheetRows] = useState(0);

  // Column Mapping State: system field -> spreadsheet column name
  const [mapping, setMapping] = useState<Record<string, string>>({
    fullName: "",
    studentId: "",
    grade: "",
    sex: "",
    phone: "",
    emailAddress: "",
    school: "",
    department: "",
    academicYear: "",
    guardianFullName: "",
    emergencyContactPhone: "",
  });

  // Validation Preview State
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [errorReportData, setErrorReportData] = useState<{ rowNumber: number; studentId: string; errors: string[] }[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Generates and downloads a sample Excel template.
   */
  const handleDownloadTemplate = () => {
    const headers = [
      {
        "ID Number": "STU-2026-9001",
        "Name": "Julian Drake",
        "Class Grade": "Grade 11-A",
        "Gender": "Male",
        "Telephone Phone": "+1 (555) 789-0011",
        "Department": "Natural Sciences",
      },
      {
        "ID Number": "STU-2026-9002",
        "Name": "Elena Rostova",
        "Class Grade": "Grade 11-A",
        "Gender": "Female",
        "Telephone Phone": "+1 (555) 789-0022",
        "Department": "Natural Sciences",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Bridge_Flexible_Template.xlsx");
  };

  /**
   * Step 1: Upload file and inspect columns
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      const base64 = Buffer.from(buffer).toString("base64");
      setFileBase64(base64);

      try {
        const info = await inspectExcelWorkbookAction(base64);
        setDetectedColumns(info.columns);
        setTotalSpreadsheetRows(info.totalRows);

        // Heuristic auto-mapping
        const autoMap: Record<string, string> = {};
        const findCol = (aliases: string[]) => {
          return info.columns.find((c) =>
            aliases.some((a) => c.toLowerCase().replace(/[^a-z0-9]/g, "").includes(a))
          ) || "";
        };

        autoMap.studentId = findCol(["studentid", "idnumber", "id", "admissionno", "rollno"]);
        autoMap.fullName = findCol(["fullname", "name", "legalname", "studentname"]);
        autoMap.grade = findCol(["grade", "class", "batch", "level"]);
        autoMap.sex = findCol(["sex", "gender"]);
        autoMap.phone = findCol(["phone", "telephone", "mobile", "contact"]);
        autoMap.emailAddress = findCol(["email", "mail"]);
        autoMap.department = findCol(["department", "dept", "track"]);
        autoMap.school = findCol(["school", "institution"]);

        setMapping((prev) => ({ ...prev, ...autoMap }));
        setStep(2); // Advance to mapping step
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Error reading spreadsheet");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /**
   * Step 2: Proceed from Column Mapping to Validation & Preview
   */
  const handleProcessMapping = () => {
    if (!mapping.studentId || !mapping.fullName || !mapping.grade || !mapping.phone) {
      setErrorMessage("Please map all required system fields (Student ID, Full Name, Grade, Phone).");
      return;
    }

    if (!fileBase64) return;

    // Parse locally for immediate responsive preview
    const buffer = Buffer.from(fileBase64, "base64");
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const preview: PreviewRow[] = [];
    const errorsList: { rowNumber: number; studentId: string; errors: string[] }[] = [];
    const seen = new Set<string>();

    let rIndex = 1;
    for (const raw of rawRows) {
      rIndex++;
      const sId = String(raw[mapping.studentId] || "").trim();
      const name = String(raw[mapping.fullName] || "").trim();
      const gr = String(raw[mapping.grade] || "").trim();
      const sx = String(raw[mapping.sex] || "Male").trim();
      const ph = String(raw[mapping.phone] || "").trim();

      const errs: string[] = [];
      if (!sId) errs.push("Missing Student ID");
      else if (seen.has(sId.toLowerCase())) {
        errs.push(`Duplicate ID: ${sId}`);
      } else {
        seen.add(sId.toLowerCase());
      }

      if (!name) errs.push("Missing Full Name");
      if (!gr) errs.push("Missing Grade");
      if (!ph) errs.push("Missing Phone");

      const isValid = errs.length === 0;
      preview.push({
        rowNumber: rIndex,
        studentId: sId,
        fullName: name,
        grade: gr,
        sex: sx,
        phone: ph,
        isValid,
        errors: errs,
      });

      if (!isValid) {
        errorsList.push({ rowNumber: rIndex, studentId: sId || "N/A", errors: errs });
      }
    }

    setPreviewRows(preview);
    setErrorReportData(errorsList);
    setErrorMessage(null);
    setStep(3); // Advance to preview
  };

  /**
   * Step 3: Execute Final Import
   */
  const handleExecuteImport = () => {
    if (!fileBase64) return;

    startTransition(async () => {
      const res = await importExcelStudentsAction(fileBase64, mapping);
      setImportResult(res);
      if (res.errorReport) {
        setErrorReportData(res.errorReport);
      }
      setStep(4); // Advance to results
    });
  };

  /**
   * Download Error Report
   */
  const handleDownloadErrorReport = () => {
    if (errorReportData.length === 0) return;

    const reportRows = errorReportData.map((e) => ({
      "Row Number": e.rowNumber,
      "Student ID": e.studentId,
      "Validation Errors": e.errors.join("; "),
    }));

    const ws = XLSX.utils.json_to_sheet(reportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import_Errors");
    XLSX.writeFile(wb, `Import_Errors_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const validCount = previewRows.filter((r) => r.isValid).length;
  const invalidCount = previewRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              RECEIVER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">EXCEL INGESTION</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <FileSpreadsheet className="h-6 w-6 text-accent" />
            <span>Smart Excel Student Importer</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Upload, map arbitrary spreadsheet columns to system fields, validate, and batch insert
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
        >
          <Download className="h-4 w-4 text-foreground-muted" />
          <span>Sample Spreadsheet</span>
        </button>
      </div>

      {/* Step Wizard Indicator */}
      <div className="flex items-center justify-between border-b border-border pb-4 font-mono text-xs">
        {[
          { num: 1, label: "1. Upload File" },
          { num: 2, label: "2. Map Columns" },
          { num: 3, label: "3. Validate & Preview" },
          { num: 4, label: "4. Confirmation" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${
              step === s.num
                ? "text-accent font-bold"
                : step > s.num
                ? "text-emerald-400"
                : "text-foreground-muted opacity-50"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                step === s.num
                  ? "bg-accent text-white"
                  : step > s.num
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-surface-secondary text-foreground-muted"
              }`}
            >
              {s.num}
            </span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="text-xs text-rose-300">{errorMessage}</div>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-12 text-center hover:border-accent/40 transition-colors">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Upload Student Spreadsheet (.xlsx, .xls, .csv)
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Column names do NOT need to be fixed. You will match them in the next step.
              </p>
            </div>

            <label className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Select Spreadsheet</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Map Columns */}
      {step === 2 && (
        <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Columns className="h-4 w-4 text-accent" />
                <span>Map Spreadsheet Columns to System Fields</span>
              </h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                File: <strong className="text-foreground">{fileName}</strong> ({totalSpreadsheetRows} rows detected)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-accent hover:underline"
            >
              Choose different file
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Required Fields */}
            {[
              { key: "studentId", label: "Student ID (Unique)", required: true },
              { key: "fullName", label: "Name", required: true },
              { key: "grade", label: "Grade / Class", required: true },
              { key: "sex", label: "Sex / Gender", required: false },
              { key: "phone", label: "Phone Number", required: true },
              { key: "emailAddress", label: "Email Address", required: false },
              { key: "department", label: "Department / Track", required: false },
              { key: "school", label: "School Institution", required: false },
            ].map((field) => (
              <div key={field.key} className="rounded-lg border border-border bg-surface-secondary p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {field.label} {field.required && <span className="text-accent">*</span>}
                  </span>
                  <span className="text-[10px] font-mono text-foreground-muted">System Field</span>
                </div>
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">-- Not mapped --</option>
                  {detectedColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 text-xs text-foreground-muted hover:bg-surface-secondary"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleProcessMapping}
              className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover"
            >
              <span>Validate & Preview Rows</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Validate & Preview */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-xs text-foreground-muted">Total Rows Parsed</div>
              <div className="text-2xl font-bold font-mono text-foreground mt-1">
                {previewRows.length}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-xs text-emerald-400">Valid & Ready</div>
              <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{validCount}</div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="text-xs text-rose-400">Invalid / Discrepancies</div>
              <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{invalidCount}</div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="text-xs text-foreground-muted">
              {invalidCount > 0 ? (
                <span>
                  {invalidCount} rows have errors. You can download the report or proceed with the{" "}
                  {validCount} valid records.
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">
                  All {validCount} rows passed validation with 0 errors!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Error Report (.xlsx)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isPending || validCount === 0}
                className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing into Database...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    <span>Confirm & Ingest ({validCount} Records)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-secondary text-[11px] uppercase tracking-wider text-foreground-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Validation Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.slice(0, 100).map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.isValid ? "hover:bg-surface-secondary/40" : "bg-rose-500/5"}
                    >
                      <td className="px-4 py-2.5 font-mono text-foreground-muted">{row.rowNumber}</td>
                      <td className="px-4 py-2.5">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-foreground">
                        {row.studentId || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.fullName || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground-muted">{row.grade || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground-muted">{row.phone || "—"}</td>
                      <td className="px-4 py-2.5 text-rose-400">
                        {row.errors.length > 0 ? row.errors.join(", ") : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Results Confirmation */}
      {step === 4 && importResult && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center max-w-xl mx-auto space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">Bulk Import Completed!</h2>
            <p className="text-xs text-foreground-muted mt-1">
              Student records have been verified, QR credentials provisioned, and added to the production directory.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left border-y border-border py-4">
            <div>
              <div className="text-[11px] text-foreground-muted">Successfully Ingested:</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {importResult.importedCount}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-foreground-muted">Skipped / Duplicates:</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {importResult.databaseDuplicates.length}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setStep(1);
                setPreviewRows([]);
                setFileName(null);
                setFileBase64(null);
              }}
              className="rounded-lg border border-border bg-surface-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-tertiary"
            >
              Import Another File
            </button>
            <button
              onClick={() => router.push("/students")}
              className="rounded-lg bg-accent px-6 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover"
            >
              Go to Student Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
