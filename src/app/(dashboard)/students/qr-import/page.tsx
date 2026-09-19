"use client";

// ============================================================================
// STUDENT BRIDGE — EXTERNAL QR CODE IMAGE IMPORTER & MATCHER
// Strict Requirement 9: DO NOT GENERATE QR CODES. External QR images only.
// Features: Individual QR import, Bulk folder QR import, StudentID -> filename matching,
// manual matching fallback, 4-category tracking:
// - Matched QR codes
// - Unmatched QR codes
// - Missing QR codes
// - Duplicate QR codes
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  FolderArchive,
  Loader2,
  Link2,
} from "lucide-react";
import { getStudentsAction } from "@/actions/students";

interface StudentMinimal {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  qrCodeData: string | null;
}

interface QRItem {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  extractedId: string;
  status: "matched" | "unmatched" | "duplicate" | "invalid";
  matchedStudent?: StudentMinimal;
  error?: string;
}

export default function ExternalQRImportPage() {
  // Mode: Bulk Folder vs Individual
  const [mode, setMode] = useState<"bulk" | "individual">("bulk");

  // Individual Form
  const [indivStudentId, setIndivStudentId] = useState("");
  const [indivFile, setIndivFile] = useState<File | null>(null);
  const [indivPreview, setIndivPreview] = useState<string | null>(null);
  const [indivSuccess, setIndivSuccess] = useState<string | null>(null);

  // Bulk State
  const [allStudents, setAllStudents] = useState<StudentMinimal[]>([]);
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [activeTab, setActiveTab] = useState<"matched" | "unmatched" | "missing" | "duplicates">("matched");

  // Commit Progress
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitProgress, setCommitProgress] = useState({ current: 0, total: 0 });
  const [commitSuccessCount, setCommitSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await getStudentsAction({ pageSize: 5000 });
      if (res.students) {
        setAllStudents(
          res.students.map((s) => ({
            id: s.id,
            studentId: s.studentId,
            fullName: s.fullName,
            grade: s.grade,
            qrCodeData: s.qrCodeData,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  /**
   * Bulk files uploaded
   */
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setCommitSuccessCount(null);
    const newItems: QRItem[] = [];
    const seenIds = new Set<string>();

    const studentMap = new Map<string, StudentMinimal>();
    allStudents.forEach((s) => {
      studentMap.set(s.studentId.toLowerCase(), s);
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const previewUrl = URL.createObjectURL(file);
      const ext = fileName.split(".").pop()?.toLowerCase() || "";

      if (!["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) {
        newItems.push({
          id: `qr-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: fileName,
          status: "invalid",
          error: "Not an image file",
        });
        continue;
      }

      // Extract Student ID (e.g. "STU001.png" -> "STU001", "SB-2026-0001_qr.png" -> "SB-2026-0001")
      const baseName = fileName.replace(/\.[^/.]+$/, "").trim();
      const cleanId = baseName.split("_")[0].trim().toLowerCase();

      if (seenIds.has(cleanId)) {
        newItems.push({
          id: `qr-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: baseName,
          status: "duplicate",
          error: `Multiple QR files uploaded for ID "${baseName}".`,
        });
        continue;
      }

      seenIds.add(cleanId);

      const matched = studentMap.get(cleanId);
      if (matched) {
        newItems.push({
          id: `qr-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: baseName,
          status: "matched",
          matchedStudent: matched,
        });
      } else {
        newItems.push({
          id: `qr-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: baseName,
          status: "unmatched",
        });
      }
    }

    setQrItems((prev) => [...prev, ...newItems]);
  };

  /**
   * Manual match selector
   */
  const handleManualMatch = (itemId: string, studentId: string) => {
    const student = allStudents.find((s) => s.studentId === studentId);
    if (!student) return;

    setQrItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          status: "matched",
          matchedStudent: student,
        };
      })
    );
  };

  /**
   * Commit all matched QR files
   */
  const handleCommitMatches = async () => {
    const matched = qrItems.filter((i) => i.status === "matched" && i.matchedStudent);
    if (matched.length === 0) return;

    setIsCommitting(true);
    setCommitProgress({ current: 0, total: matched.length });
    let success = 0;

    for (let i = 0; i < matched.length; i++) {
      const item = matched[i];
      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("studentId", item.matchedStudent!.studentId);
        form.append("fileName", item.fileName);
        form.append("matchedMethod", "AUTO_FILENAME");

        const res = await fetch("/api/qr/upload", {
          method: "POST",
          body: form,
        });

        if (res.ok) success++;
      } catch {
        // ignore individual failure
      }
      setCommitProgress({ current: i + 1, total: matched.length });
    }

    setIsCommitting(false);
    setCommitSuccessCount(success);
    loadStudents();
  };

  /**
   * Individual QR upload submission
   */
  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indivFile || !indivStudentId) return;

    setIsCommitting(true);
    try {
      const form = new FormData();
      form.append("file", indivFile);
      form.append("studentId", indivStudentId);
      form.append("fileName", indivFile.name);
      form.append("matchedMethod", "MANUAL");

      const res = await fetch("/api/qr/upload", {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        setIndivSuccess(`QR Code successfully attached to student ${indivStudentId}!`);
        setIndivFile(null);
        setIndivPreview(null);
        setIndivStudentId("");
        loadStudents();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to attach QR code.");
      }
    } catch {
      alert("Error attaching QR image.");
    } finally {
      setIsCommitting(false);
    }
  };

  const matchedList = qrItems.filter((i) => i.status === "matched");
  const unmatchedList = qrItems.filter((i) => i.status === "unmatched");
  const duplicateList = qrItems.filter((i) => i.status === "duplicate");

  const matchedStudentIds = new Set(matchedList.map((m) => m.matchedStudent?.studentId));
  const missingList = allStudents.filter(
    (s) => (!s.qrCodeData || !s.qrCodeData.startsWith("/uploads/qr/")) && !matchedStudentIds.has(s.studentId)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              RECEIVER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">EXTERNAL QR CODES</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <QrCode className="h-6 w-6 text-accent" />
            <span>Import Existing External QR Images</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Attach pre-generated external QR image files to student production records
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface p-1">
          <button
            onClick={() => setMode("bulk")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "bulk"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Bulk Folder Import
          </button>
          <button
            onClick={() => setMode("individual")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "individual"
                ? "bg-accent text-white shadow-glow"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Individual QR Import
          </button>
        </div>
      </div>

      {/* Individual Mode */}
      {mode === "individual" && (
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-surface p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">
            Attach Single QR Code Image to Student
          </h2>

          {indivSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{indivSuccess}</span>
            </div>
          )}

          <form onSubmit={handleIndividualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Select Target Student:
              </label>
              <select
                value={indivStudentId}
                onChange={(e) => setIndivStudentId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Choose student...</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.studentId}>
                    {s.fullName} ({s.studentId}) — {s.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Upload QR Code Image (PNG / JPEG / SVG):
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIndivFile(file);
                    setIndivPreview(URL.createObjectURL(file));
                  }
                }}
                className="w-full text-xs text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-secondary file:text-foreground hover:file:bg-surface-tertiary"
              />
            </div>

            {indivPreview && (
              <div className="flex items-center justify-center p-4 border border-border rounded-xl bg-black">
                <img src={indivPreview} alt="QR Preview" className="h-32 w-32 object-contain" />
              </div>
            )}

            <button
              type="submit"
              disabled={isCommitting || !indivFile || !indivStudentId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover disabled:opacity-50"
            >
              {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              <span>Attach QR Code</span>
            </button>
          </form>
        </div>
      )}

      {/* Bulk Mode */}
      {mode === "bulk" && (
        <div className="space-y-6">
          {/* Commit Banner */}
          {commitSuccessCount !== null && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div className="text-xs text-emerald-300">
                  Successfully stored and attached {commitSuccessCount} external QR codes to student records!
                </div>
              </div>
              <button
                onClick={() => setCommitSuccessCount(null)}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-8 text-center hover:border-accent/40 transition-colors">
            <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Select Folder of Pre-Generated QR Images
              </h2>
              <p className="text-xs text-foreground-muted">
                Images named after Student IDs (e.g. <span className="font-mono text-accent">STU001.png</span>)
                are automatically linked.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors cursor-pointer">
                  <FolderArchive className="h-4 w-4" />
                  <span>Choose QR Folder</span>
                  <input
                    type="file"
                    // @ts-expect-error webkitdirectory is standard
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="hidden"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-tertiary transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 text-foreground-muted" />
                  <span>Select Individual QR Files</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 4-Category Metric Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab("matched")}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeTab === "matched"
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
                <span className="font-medium">Matched QR</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">{matchedList.length}</div>
              <div className="text-[10px] text-foreground-muted mt-0.5">Ready to commit</div>
            </button>

            <button
              onClick={() => setActiveTab("unmatched")}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeTab === "unmatched"
                  ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
                <span className="font-medium">Unmatched QR</span>
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">{unmatchedList.length}</div>
              <div className="text-[10px] text-foreground-muted mt-0.5">Needs manual linkage</div>
            </button>

            <button
              onClick={() => setActiveTab("missing")}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeTab === "missing"
                  ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
                <span className="font-medium">Missing QR</span>
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">{missingList.length}</div>
              <div className="text-[10px] text-foreground-muted mt-0.5">Students with no QR</div>
            </button>

            <button
              onClick={() => setActiveTab("duplicates")}
              className={`rounded-xl border p-4 text-left transition-all ${
                activeTab === "duplicates"
                  ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-purple-400 mb-1">
                <span className="font-medium">Duplicate QR</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">{duplicateList.length}</div>
              <div className="text-[10px] text-foreground-muted mt-0.5">Same student ID</div>
            </button>
          </div>

          {/* Action Row */}
          {matchedList.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-xs text-emerald-300">
                <strong>{matchedList.length}</strong> QR code images successfully matched to student records.
              </div>
              <button
                onClick={handleCommitMatches}
                disabled={isCommitting}
                className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Linking {commitProgress.current} / {commitProgress.total}...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Attach {matchedList.length} QR Codes to Database</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab Views */}
          <div className="rounded-xl border border-border bg-surface p-6">
            {activeTab === "matched" && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                  Matched QR Codes ({matchedList.length})
                </h3>
                {matchedList.length === 0 ? (
                  <div className="text-center py-12 text-xs text-foreground-muted">
                    No matched QR codes in current session. Upload QR images to match.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {matchedList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary p-3"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          className="h-14 w-14 rounded object-contain border border-border shrink-0 bg-white p-1"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {item.matchedStudent?.fullName}
                          </div>
                          <div className="text-[10px] font-mono text-accent truncate">
                            {item.matchedStudent?.studentId}
                          </div>
                          <div className="text-[9px] text-foreground-muted truncate">
                            File: {item.fileName}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Matched
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "unmatched" && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                  Unmatched QR Images — Manual Assignment ({unmatchedList.length})
                </h3>
                {unmatchedList.length === 0 ? (
                  <div className="text-center py-12 text-xs text-foreground-muted">
                    Zero unmatched QR images.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {unmatchedList.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col rounded-xl border border-border bg-surface-secondary p-3 space-y-2"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.previewUrl}
                            alt={item.fileName}
                            className="h-14 w-14 rounded object-contain border border-border shrink-0 bg-white p-1"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="text-xs font-mono text-foreground truncate">
                              {item.fileName}
                            </div>
                            <div className="text-[10px] text-amber-400">
                              Unrecognized ID: &quot;{item.extractedId}&quot;
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border">
                          <label className="block text-[10px] text-foreground-muted mb-1">
                            Link to Student:
                          </label>
                          <select
                            onChange={(e) => handleManualMatch(item.id, e.target.value)}
                            defaultValue=""
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                          >
                            <option value="" disabled>
                              Select student...
                            </option>
                            {allStudents.map((s) => (
                              <option key={s.id} value={s.studentId}>
                                {s.fullName} ({s.studentId})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "missing" && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                  Students Missing External QR Codes ({missingList.length})
                </h3>
                {missingList.length === 0 ? (
                  <div className="text-center py-12 text-xs text-emerald-400">
                    All students currently have attached QR codes!
                  </div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                    {missingList.slice(0, 100).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-surface-secondary/40 text-xs hover:bg-surface-secondary"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{s.fullName}</span>
                          <span className="text-foreground-muted ml-2 font-mono">({s.studentId})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-foreground-muted">{s.grade}</span>
                          <span className="text-[10px] text-rose-400 font-mono">QR NEEDED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "duplicates" && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                  Duplicate QR Code Files ({duplicateList.length})
                </h3>
                {duplicateList.length === 0 ? (
                  <div className="text-center py-12 text-xs text-foreground-muted">
                    No duplicate QR code files in current upload.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {duplicateList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          className="h-14 w-14 rounded object-contain border border-border shrink-0 bg-white p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono text-foreground truncate">{item.fileName}</div>
                          <div className="text-[10px] text-purple-400 mt-0.5">{item.error}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
