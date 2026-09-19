"use client";

// ============================================================================
// STUDENT BRIDGE — SENDER REGISTRATION RECEIPTS & ENROLLMENT MANIFEST
// Fulfills Requirement: "Print or export registration receipts or summary lists"
// Features:
// - Official Student Registration Receipt with printable formatting & barcode
// - Enrollment Summary Manifest (printable table format for A4)
// - CSV Roster Export
// - Instant search & filtering
// ============================================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Receipt,
  Printer,
  Download,
  Search,
  Camera,
  Shield,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { getStudentsAction } from "@/actions/students";

interface StudentRecord {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  sex: string;
  phone: string;
  dateOfBirth?: Date | string | null;
  emailAddress?: string | null;
  address?: string | null;
  school?: string | null;
  department?: string | null;
  academicYear?: string | null;
  guardianFullName?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodType?: string | null;
  photoPath?: string | null;
  createdAt: Date | string;
}

export default function SenderReceiptsPage() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialStudentId);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [viewMode, setViewMode] = useState<"receipt" | "manifest">("receipt");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const match = students.find(
        (s) => s.studentId.toLowerCase() === initialStudentId.toLowerCase()
      );
      if (match) {
        setSelectedStudent(match);
        setViewMode("receipt");
      }
    }
  }, [initialStudentId, students]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const res = await getStudentsAction({ pageSize: 100 });
      if (res.students) {
        setStudents(res.students as unknown as StudentRecord[]);
        if (!selectedStudent && res.students.length > 0 && !initialStudentId) {
          setSelectedStudent(res.students[0] as unknown as StudentRecord);
        }
        setSelectedStudentIds(new Set(res.students.map((s) => s.id)));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q) ||
      (s.department && s.department.toLowerCase().includes(q))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleExportCSV = () => {
    const exportData = filteredStudents
      .filter((s) => selectedStudentIds.has(s.id))
      .map((s) => ({
        "Student ID": s.studentId,
        "Name": s.fullName,
        Grade: s.grade,
        Gender: s.sex,
        Phone: s.phone,
        Department: s.department || "General",
        School: s.school || "Main Campus",
        "Academic Year": s.academicYear || "2026-2027",
        "Guardian Name": s.guardianFullName || "",
        "Emergency Phone": s.emergencyContactPhone || "",
        "Enrollment Date": new Date(s.createdAt).toLocaleDateString(),
        "Photo Captured": s.photoPath ? "YES" : "NO",
      }));

    if (exportData.length === 0) {
      alert("Please select at least one student to export.");
      return;
    }

    const headers = Object.keys(exportData[0]).join(",");
    const rows = exportData
      .map((row) =>
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Student_Enrollment_Summary_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Print-Only Style Definition */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          aside,
          header,
          .no-print,
          nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .receipt-box {
            border: 2px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid;
          }
          .manifest-table {
            border: 1px solid #000000 !important;
            width: 100% !important;
          }
          .manifest-table th,
          .manifest-table td {
            border: 1px solid #cccccc !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Screen Header (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </Link>
            <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              SENDER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">RECEIPTS & SUMMARY MANIFESTS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <Receipt className="h-6 w-6 text-accent" />
            <span>Registration Receipts & Summary Lists</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Generate and print official enrollment verification receipts or export batch registration manifests
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("receipt")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                viewMode === "receipt"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Official Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("manifest")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                viewMode === "manifest"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Summary Manifest</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-accent-hover shadow-glow-sm transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print {viewMode === "receipt" ? "Receipt" : "Manifest"}</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Individual Official Registration Receipt */}
      {viewMode === "receipt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Student Selector (Hidden on Print) */}
          <div className="no-print lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Search Registered Students
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by name, ID, or grade..."
                  className="w-full rounded-lg border border-border bg-surface-secondary py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
                />
              </div>

              <div className="text-[11px] text-foreground-muted">
                Showing {filteredStudents.length} of {students.length} students
              </div>

              <div className="max-h-[500px] overflow-y-auto divide-y divide-border rounded-lg border border-border bg-surface-secondary">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span>Loading enrolled students...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-foreground-muted">
                    No matching student records found.
                  </div>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full text-left p-3 text-xs transition-colors flex items-center gap-3 ${
                        selectedStudent?.id === s.id
                          ? "bg-accent/15 border-l-4 border-accent text-foreground"
                          : "hover:bg-surface-tertiary text-foreground-muted"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {s.photoPath ? (
                          <img
                            src={s.photoPath}
                            alt={s.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Camera className="h-4 w-4 text-foreground-muted" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">
                          {s.fullName}
                        </div>
                        <div className="text-[10px] font-mono text-foreground-muted">
                          {s.studentId} • {s.grade}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Formal Printable Receipt Paper */}
          <div className="lg:col-span-8 print-container">
            {selectedStudent ? (
              <div className="receipt-box rounded-2xl border border-border bg-surface p-8 shadow-2xl space-y-6 text-foreground">
                {/* Official Receipt Header */}
                <div className="flex items-start justify-between border-b-2 border-border pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-6 w-6 text-accent" />
                      <span className="font-mono text-lg font-black tracking-tight uppercase">
                        STUDENT <span className="text-accent">BRIDGE</span>
                      </span>
                    </div>
                    <div className="text-xs uppercase tracking-widest text-foreground-muted font-mono mt-1">
                      Official Institutional Enrollment Verification Receipt
                    </div>
                    <div className="text-[11px] text-foreground-subtle mt-0.5">
                      Issued by Data Collection & Enrollment Station
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-foreground-muted">Receipt Number</div>
                    <div className="text-sm font-bold text-accent">
                      RCP-{selectedStudent.studentId.replace(/[^A-Za-z0-9]/g, "")}
                    </div>
                    <div className="text-[10px] text-foreground-subtle mt-0.5">
                      {new Date(selectedStudent.createdAt).toLocaleDateString()} •{" "}
                      {new Date(selectedStudent.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Primary Student Block */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center bg-surface-secondary p-5 rounded-xl border border-border">
                  {/* Photo with frame */}
                  <div className="flex flex-col items-center">
                    <div className="h-32 w-28 rounded-lg border-2 border-border bg-black flex items-center justify-center overflow-hidden shadow-inner">
                      {selectedStudent.photoPath ? (
                        <img
                          src={selectedStudent.photoPath}
                          alt={selectedStudent.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Camera className="h-8 w-8 text-foreground-muted mx-auto mb-1" />
                          <span className="text-[9px] text-foreground-subtle uppercase">
                            No Photo
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-foreground-muted mt-2">
                      {selectedStudent.photoPath ? "✓ Verified Portrait" : "Photo Pending"}
                    </span>
                  </div>

                  {/* Student Essential Identification */}
                  <div className="sm:col-span-2 space-y-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-foreground-muted">
                        Name
                      </span>
                      <h2 className="text-xl font-bold text-foreground tracking-tight">
                        {selectedStudent.fullName}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-foreground-muted">
                          Student ID
                        </span>
                        <div className="font-mono text-sm font-bold text-accent">
                          {selectedStudent.studentId}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-foreground-muted">
                          Assigned Grade / Class
                        </span>
                        <div className="font-semibold text-xs text-foreground">
                          {selectedStudent.grade}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-foreground-muted">
                          Gender / Sex
                        </span>
                        <div className="text-xs text-foreground">{selectedStudent.sex}</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-foreground-muted">
                          Department
                        </span>
                        <div className="text-xs text-foreground">
                          {selectedStudent.department || "General Studies"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="border border-border p-3 rounded-lg bg-surface">
                    <span className="text-[10px] font-mono uppercase text-foreground-muted block mb-0.5">
                      School Campus
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedStudent.school || "Central Campus"}
                    </span>
                  </div>

                  <div className="border border-border p-3 rounded-lg bg-surface">
                    <span className="text-[10px] font-mono uppercase text-foreground-muted block mb-0.5">
                      Academic Term
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedStudent.academicYear || "2026-2027"}
                    </span>
                  </div>

                  <div className="border border-border p-3 rounded-lg bg-surface">
                    <span className="text-[10px] font-mono uppercase text-foreground-muted block mb-0.5">
                      Primary Contact Phone
                    </span>
                    <span className="font-mono text-foreground font-semibold">
                      {selectedStudent.phone}
                    </span>
                  </div>

                  <div className="border border-border p-3 rounded-lg bg-surface">
                    <span className="text-[10px] font-mono uppercase text-foreground-muted block mb-0.5">
                      Guardian Legal Name
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedStudent.guardianFullName || "Not Specified"}
                    </span>
                  </div>

                  <div className="border border-border p-3 rounded-lg bg-surface">
                    <span className="text-[10px] font-mono uppercase text-foreground-muted block mb-0.5">
                      Emergency Contact Phone
                    </span>
                    <span className="font-mono text-foreground">
                      {selectedStudent.emergencyContactPhone || selectedStudent.phone}
                    </span>
                  </div>

                  <div className="border border-border p-3 rounded-lg bg-surface">
                    <span className="text-[10px] font-mono uppercase text-foreground-muted block mb-0.5">
                      Registration Status
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">ACTIVE ENROLLMENT</span>
                  </div>
                </div>

                {/* Simulated Barcode & Stamp Footer */}
                <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    {/* Visual Barcode */}
                    <div className="h-10 flex items-center gap-0.5 bg-white p-1 rounded">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <span
                          key={i}
                          className={`inline-block h-full ${
                            i % 3 === 0
                              ? "w-1 bg-black"
                              : i % 2 === 0
                              ? "w-0.5 bg-black"
                              : "w-1.5 bg-black"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[9px] font-mono tracking-widest text-center mt-1 text-foreground-muted">
                      *{selectedStudent.studentId}*
                    </div>
                  </div>

                  {/* Verification Official Seal */}
                  <div className="border-2 border-dashed border-emerald-500/40 p-3 rounded-xl text-center">
                    <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      ✓ STATION ENROLLMENT CERTIFIED
                    </div>
                    <div className="text-[9px] text-foreground-muted font-mono mt-0.5">
                      Valid for ID Card Production Queue
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center text-foreground-muted">
                Select a student from the left panel to preview and print their registration receipt.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Enrollment Summary Manifest Table */}
      {viewMode === "manifest" && (
        <div className="space-y-4 print-container">
          {/* Manifest Controls (hidden on print) */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter manifest..."
                  className="rounded-lg border border-border bg-surface-secondary py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
                />
              </div>

              <div className="text-xs text-foreground-muted">
                Selected {selectedStudentIds.size} of {filteredStudents.length}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-xs text-foreground hover:bg-surface-tertiary"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-xs text-foreground hover:bg-surface-tertiary"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Printable Manifest Sheet */}
          <div className="receipt-box rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            {/* Header */}
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Student Registration Enrollment Manifest
                </h2>
                <div className="text-xs text-foreground-muted">
                  Official Registry List • Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-accent font-bold">
                  {selectedStudentIds.size} Students Enrolled
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="manifest-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary text-[11px] font-mono uppercase text-foreground-muted">
                    <th className="no-print p-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudentIds.size === filteredStudents.length &&
                          filteredStudents.length > 0
                        }
                        onChange={(e) =>
                          e.target.checked ? handleSelectAll() : handleDeselectAll()
                        }
                        className="rounded border-border"
                      />
                    </th>
                    <th className="p-3">#</th>
                    <th className="p-3">Student ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Sex</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Photo</th>
                    <th className="p-3">Enrolled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents
                    .filter((s) => selectedStudentIds.has(s.id))
                    .map((s, idx) => (
                      <tr key={s.id} className="hover:bg-surface-secondary/50">
                        <td className="no-print p-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(s.id)}
                            onChange={() => handleToggleSelect(s.id)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="p-3 font-mono text-foreground-subtle">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-accent">{s.studentId}</td>
                        <td className="p-3 font-medium text-foreground">{s.fullName}</td>
                        <td className="p-3">{s.grade}</td>
                        <td className="p-3">{s.sex}</td>
                        <td className="p-3 font-mono">{s.phone}</td>
                        <td className="p-3">{s.department || "General"}</td>
                        <td className="p-3">
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                              s.photoPath
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {s.photoPath ? "YES" : "NO"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-foreground-muted">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Manifest Sign-off Footer */}
            <div className="pt-6 border-t border-border grid grid-cols-2 gap-8 text-xs">
              <div>
                <div className="text-[10px] font-mono text-foreground-muted uppercase">
                  Station Operator Verification
                </div>
                <div className="mt-8 border-b border-border w-48" />
                <div className="text-[10px] text-foreground-subtle mt-1">Authorized Signature</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-foreground-muted uppercase">
                  Production Facility Intake
                </div>
                <div className="mt-8 border-b border-border w-48 ml-auto" />
                <div className="text-[10px] text-foreground-subtle mt-1">
                  Receiver Verification Stamp
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
