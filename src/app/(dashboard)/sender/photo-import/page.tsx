"use client";

// ============================================================================
// STUDENT BRIDGE — SENDER FOLDER PHOTO IMPORT & SMART MATCHER
// Features: Folder / Multi-file selection, automatic StudentID matching,
// manual matching fallback, categorized tracking:
// - Matched photos
// - Unmatched photos
// - Students without photos
// - Duplicate photos
// - Invalid files
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  FolderArchive,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  FileImage,
  Loader2,
  Trash2,
} from "lucide-react";
import { getStudentsAction } from "@/actions/students";

interface StudentMinimal {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  photoPath: string | null;
}

interface PhotoCandidate {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  extractedId: string;
  status: "matched" | "unmatched" | "duplicate" | "invalid";
  matchedStudent?: StudentMinimal;
  manualSelectedId?: string;
  error?: string;
}

export default function FolderPhotoImportPage() {
  // All students from database
  const [allStudents, setAllStudents] = useState<StudentMinimal[]>([]);

  // Uploaded candidates
  const [candidates, setCandidates] = useState<PhotoCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<
    "matched" | "unmatched" | "missing" | "duplicates" | "invalid"
  >("matched");

  // Commit / Upload Progress
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitProgress, setCommitProgress] = useState({ current: 0, total: 0 });
  const [commitSuccessCount, setCommitSuccessCount] = useState<number | null>(null);

  // Load students on mount
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
            photoPath: s.photoPath,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  /**
   * Handles files from folder or multi-file selection.
   */
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setCommitSuccessCount(null);
    const newCandidates: PhotoCandidate[] = [];
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

      // Validate image format
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        newCandidates.push({
          id: `cand-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: fileName,
          status: "invalid",
          error: "Not a supported image format (JPEG/PNG/WEBP required).",
        });
        continue;
      }

      // Extract Student ID (e.g. "STU001.jpg" -> "STU001", "SB-2026-001_photo.jpg" -> "SB-2026-001")
      const baseName = fileName.replace(/\.[^/.]+$/, "").trim();
      const cleanId = baseName.split("_")[0].trim().toLowerCase();

      // Check duplicate in upload batch
      if (seenIds.has(cleanId)) {
        newCandidates.push({
          id: `cand-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: baseName,
          status: "duplicate",
          error: `Multiple files uploaded matching ID "${baseName}".`,
        });
        continue;
      }

      seenIds.add(cleanId);

      // Check match in database
      const matched = studentMap.get(cleanId);
      if (matched) {
        newCandidates.push({
          id: `cand-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: baseName,
          status: "matched",
          matchedStudent: matched,
        });
      } else {
        newCandidates.push({
          id: `cand-${Date.now()}-${i}`,
          file,
          fileName,
          previewUrl,
          extractedId: baseName,
          status: "unmatched",
        });
      }
    }

    setCandidates((prev) => [...prev, ...newCandidates]);
  };

  /**
   * Manual match selector
   */
  const handleManualMatch = (candidateId: string, studentId: string) => {
    const student = allStudents.find((s) => s.studentId === studentId);
    if (!student) return;

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          status: "matched",
          matchedStudent: student,
          manualSelectedId: student.id,
        };
      })
    );
  };

  /**
   * Commit all matched photos
   */
  const handleCommitMatches = async () => {
    const matchedItems = candidates.filter((c) => c.status === "matched" && c.matchedStudent);
    if (matchedItems.length === 0) return;

    setIsCommitting(true);
    setCommitProgress({ current: 0, total: matchedItems.length });
    let success = 0;

    for (let i = 0; i < matchedItems.length; i++) {
      const item = matchedItems[i];
      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("studentId", item.matchedStudent!.studentId);

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: form,
        });

        if (res.ok) {
          success++;
        }
      } catch {
        // ignore individual error
      }
      setCommitProgress({ current: i + 1, total: matchedItems.length });
    }

    setIsCommitting(false);
    setCommitSuccessCount(success);
    // Reload student records to refresh photo status
    loadStudents();
  };

  // Filter categorized lists
  const matchedList = candidates.filter((c) => c.status === "matched");
  const unmatchedList = candidates.filter((c) => c.status === "unmatched");
  const duplicateList = candidates.filter((c) => c.status === "duplicate");
  const invalidList = candidates.filter((c) => c.status === "invalid");

  // Students missing photo
  const matchedStudentIds = new Set(matchedList.map((m) => m.matchedStudent?.studentId));
  const studentsWithoutPhotos = allStudents.filter(
    (s) => !s.photoPath && !matchedStudentIds.has(s.studentId)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              SENDER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">BULK PHOTO IMPORT</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <FolderArchive className="h-6 w-6 text-accent" />
            <span>Folder Photo Importer & Smart Matcher</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Automatic StudentID → filename matching with manual linkage fallback
          </p>
        </div>

        <div className="flex items-center gap-3">
          {matchedList.length > 0 && (
            <button
              onClick={handleCommitMatches}
              disabled={isCommitting}
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Importing {commitProgress.current} / {commitProgress.total}...
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Commit {matchedList.length} Matched Photos</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {commitSuccessCount !== null && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-300">
                Bulk Import Completed!
              </div>
              <div className="text-xs text-emerald-400/80">
                Successfully stored and attached {commitSuccessCount} student photographs.
              </div>
            </div>
          </div>
          <button
            onClick={() => setCommitSuccessCount(null)}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-8 text-center hover:border-accent/40 transition-colors">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Upload className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Select Photo Folder or Drag & Drop Multiple Images
          </h2>
          <p className="text-xs text-foreground-muted">
            Files named after Student IDs (e.g. <span className="font-mono text-accent">STU001.jpg</span>,{" "}
            <span className="font-mono text-accent">SB-2026-0001.png</span>) will be automatically matched.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors cursor-pointer">
              <FolderArchive className="h-4 w-4" />
              <span>Choose Photo Folder</span>
              <input
                type="file"
                // @ts-expect-error webkitdirectory is standard in Chromium
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-tertiary transition-colors cursor-pointer">
              <FileImage className="h-4 w-4 text-foreground-muted" />
              <span>Select Individual Files</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Categorized Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab("matched")}
          className={`rounded-xl border p-4 text-left transition-all ${
            activeTab === "matched"
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span className="font-medium">Matched</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{matchedList.length}</div>
          <div className="text-[10px] text-foreground-muted mt-0.5">Ready to link</div>
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
            <span className="font-medium">Unmatched</span>
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{unmatchedList.length}</div>
          <div className="text-[10px] text-foreground-muted mt-0.5">Needs manual link</div>
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
            <span className="font-medium">Missing Photos</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {studentsWithoutPhotos.length}
          </div>
          <div className="text-[10px] text-foreground-muted mt-0.5">Students with no photo</div>
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
            <span className="font-medium">Duplicates</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{duplicateList.length}</div>
          <div className="text-[10px] text-foreground-muted mt-0.5">Same student ID</div>
        </button>

        <button
          onClick={() => setActiveTab("invalid")}
          className={`rounded-xl border p-4 text-left transition-all ${
            activeTab === "invalid"
              ? "border-zinc-500 bg-zinc-500/10 ring-1 ring-zinc-500"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Invalid Files</span>
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">{invalidList.length}</div>
          <div className="text-[10px] text-foreground-muted mt-0.5">Non-image files</div>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Matched Tab */}
        {activeTab === "matched" && (
          <div className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Matched Photos ({matchedList.length})
            </h3>
            {matchedList.length === 0 ? (
              <div className="text-center py-12 text-xs text-foreground-muted">
                No matched photos in current session. Upload files to match.
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
                      className="h-16 w-12 rounded object-cover border border-border shrink-0 bg-black"
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

        {/* Unmatched Tab (with manual matching dropdown) */}
        {activeTab === "unmatched" && (
          <div className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Unmatched Photos — Assign to Student Manually ({unmatchedList.length})
            </h3>
            {unmatchedList.length === 0 ? (
              <div className="text-center py-12 text-xs text-foreground-muted">
                Zero unmatched photos. All uploaded files matched student records.
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
                        className="h-16 w-12 rounded object-cover border border-border shrink-0 bg-black"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs font-mono font-medium text-foreground truncate">
                          {item.fileName}
                        </div>
                        <div className="text-[10px] text-amber-400">
                          Unrecognized ID: &quot;{item.extractedId}&quot;
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <label className="block text-[10px] text-foreground-muted mb-1">
                        Select Target Student:
                      </label>
                      <select
                        onChange={(e) => handleManualMatch(item.id, e.target.value)}
                        defaultValue=""
                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="" disabled>
                          Choose student...
                        </option>
                        {allStudents.map((s) => (
                          <option key={s.id} value={s.studentId}>
                            {s.fullName} ({s.studentId}) — {s.grade}
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

        {/* Missing Photos Tab */}
        {activeTab === "missing" && (
          <div className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Students Currently Missing Photographs ({studentsWithoutPhotos.length})
            </h3>
            {studentsWithoutPhotos.length === 0 ? (
              <div className="text-center py-12 text-xs text-emerald-400">
                All students currently have attached photographs!
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {studentsWithoutPhotos.slice(0, 50).map((s) => (
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
                      <span className="text-[10px] text-rose-400 font-mono">PHOTO NEEDED</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Duplicates Tab */}
        {activeTab === "duplicates" && (
          <div className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Duplicate Photos Uploaded ({duplicateList.length})
            </h3>
            {duplicateList.length === 0 ? (
              <div className="text-center py-12 text-xs text-foreground-muted">
                No duplicate photos detected in this batch.
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
                      className="h-16 w-12 rounded object-cover border border-border shrink-0 bg-black"
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

        {/* Invalid Tab */}
        {activeTab === "invalid" && (
          <div className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              Invalid or Non-Image Files ({invalidList.length})
            </h3>
            {invalidList.length === 0 ? (
              <div className="text-center py-12 text-xs text-foreground-muted">
                No invalid files detected.
              </div>
            ) : (
              <div className="space-y-2">
                {invalidList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-secondary p-3 text-xs"
                  >
                    <span className="font-mono text-foreground">{item.fileName}</span>
                    <span className="text-rose-400">{item.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
