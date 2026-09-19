"use client";

// ============================================================================
// STUDENT BRIDGE — HIGH-PERFORMANCE 20,000+ STUDENT DIRECTORY CLIENT
// Scalable server-side pagination, multi-filtering, bulk photo downloads,
// single photo downloads, and deep profile inspection drawer.
// ============================================================================

import React, { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Printer,
  Eye,
  Trash2,
  X,
  Download,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  UserPlus,
  Users,
  Upload,
  FileSpreadsheet,
  Crop,
  Loader2,
  Zap,
  Link2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  deleteStudentAction,
  clearAllStudentsAction,
  deleteMultipleStudentsAction,
  updateStudentPhotoAction,
} from "@/actions/students";
import type { UserRole } from "@/types/auth";
import { subscribeToCloudSync, publishStudentSync } from "@/lib/sync-client";
import {
  getReceiverExcelHeaders,
  formatStudentForReceiverExcel,
  resolveGradeAndSection,
} from "@/lib/export-utils";
import { PhotoEditorModal } from "@/components/camera/PhotoEditorModal";
import { ResilientStudentPhoto } from "@/components/ui/ResilientStudentPhoto";

interface StudentExtended {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  sex: string;
  phone: string;
  department?: string | null;
  school?: string | null;
  emailAddress?: string | null;
  address?: string | null;
  academicYear?: string | null;
  guardianFullName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactName?: string | null;
  bloodType?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | Date | null;
  photoPath?: string | null;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  originalPhotoPath?: string | null;
  qrCodeData?: string | null;
  status: string;
  batch?: { batchNumber: string; title: string } | null;
  senderId?: string | null;
  senderName?: string | null;
  customValues?: {
    value: string;
    customField: {
      label: string;
    };
  }[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

interface StudentDirectoryClientProps {
  students: StudentExtended[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  grades: string[];
  departments: string[];
  batches: { id: string; batchNumber: string; title: string }[];
  userRole: UserRole;
  gradeCounts?: Record<string, number>;
}

import {
  saveStudentToDB,
  saveStudentsToDB,
  deleteStudentFromDB,
  clearAllStudentsFromDB,
  reconcileLocalCacheWithServer,
} from "@/lib/idb-storage";

// Harmless no-op placeholder: Supabase database is authoritative; local cache is reconciled via reconcileLocalCacheWithServer
const safeSaveLocalEnrolledStudents = (_list: StudentExtended[]) => {};

function parseSecureLocalList(raw: string | null): any[] {
  if (!raw) return [];
  try {
    if (raw.startsWith("[")) return JSON.parse(raw);
    const decoded = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(decoded);
  } catch {
    return [];
  }
}


export const StudentDirectoryClient: React.FC<StudentDirectoryClientProps> = ({
  students,
  totalCount,
  currentPage,
  pageSize,
  grades,
  departments,
  batches: _batches,
  userRole,
  gradeCounts,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Dual-Persistence Client State
  const [displayStudents, setDisplayStudents] = useState<StudentExtended[]>(students);
  const [editingStudent, setEditingStudent] = useState<StudentExtended | null>(null);
  const [activePage, setActivePage] = useState<number>(currentPage || 1);
  const [activePageSize, setActivePageSize] = useState<number>(pageSize || 25);

  useEffect(() => {
    if (currentPage) setActivePage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (pageSize) setActivePageSize(pageSize);
  }, [pageSize]);

  // 1. Initial Load: Server is authoritative. Local cache only overlays in-flight outbox records.
  useEffect(() => {
    const loadAndReconcile = async () => {
      // Fetch currently active/pending outbox items on this station
      let activeOutboxItems: any[] = [];
      const activeOutboxIds = new Set<string>();
      try {
        const { getOutboxQueue } = await import("@/lib/outbox-engine");
        const queue = getOutboxQueue();
        queue.forEach((item) => {
          if (item.status === "QUEUED" || item.status === "SYNCING") {
            activeOutboxIds.add(item.studentId);
            activeOutboxItems.push({
              ...item.record,
              studentId: item.studentId,
              fullName: item.payload?.fullName || item.record?.fullName,
              grade: item.payload?.grade || item.record?.grade || "General",
              photoPath: (item.payload as any)?.photo || item.record?.photoPath,
              isOutboxPending: true,
              createdAt: item.timestamp || new Date().toISOString(),
            });
          }
        });
      } catch {}

      // Reconcile local cache with authoritative server records:
      // Purges old deleted ghost records from this PC's IndexedDB and localStorage!
      try {
        await reconcileLocalCacheWithServer(students, activeOutboxIds);
      } catch {}

      // Build authoritative map: Server students + pending outbox items
      const map = new Map<string, StudentExtended>();
      students.forEach((s) => {
        map.set(s.studentId, s);
      });
      activeOutboxItems.forEach((s) => {
        if (!map.has(s.studentId)) {
          map.set(s.studentId, s as StudentExtended);
        }
      });

      const authoritativeList = Array.from(map.values());
      authoritativeList.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      setDisplayStudents(authoritativeList);

      // Non-blocking background sync from cloud
      fetch("/api/students/sync")
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.students)) {
              // Reconcile again with fresh cloud state
              await reconcileLocalCacheWithServer(data.students, activeOutboxIds);

              const freshMap = new Map<string, StudentExtended>();
              data.students.forEach((s: any) => {
                freshMap.set(s.studentId, s);
              });
              // Overlay only pending outbox items
              activeOutboxItems.forEach((s) => {
                if (!freshMap.has(s.studentId)) {
                  freshMap.set(s.studentId, s as StudentExtended);
                }
              });

              const next = Array.from(freshMap.values());
              next.sort((a, b) => {
                const tA = new Date(a.createdAt || 0).getTime();
                const tB = new Date(b.createdAt || 0).getTime();
                return tB - tA;
              });

              setDisplayStudents(next);
            }
          }
        })
        .catch(() => {});
    };

    loadAndReconcile();
  }, [students]);

  // Network photo load status: Photos are NEVER auto-deleted on low internet
  const handlePhotoAutoDeleted = useCallback((_studentId: string, _fullName?: string) => {
    // Intentionally non-destructive: keep student record and photo path intact
  }, []);

  // 2. Real-time Live Sync across devices (Mobile Phone to Receiver Desktop)
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync(
      (newStudent) => {
        setDisplayStudents((prev) => {
          const map = new Map<string, StudentExtended>();
          // Put the newest student at the very top
          map.set(newStudent.studentId, newStudent);
          prev.forEach((s) => {
            if (s.studentId !== newStudent.studentId) {
              map.set(s.studentId, s);
            }
          });
          const updated = Array.from(map.values());
          updated.sort((a, b) => {
            const tA = new Date(a.createdAt || 0).getTime();
            const tB = new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });
          safeSaveLocalEnrolledStudents(updated);
          return updated;
        });
      },
      (studentIdOrId) => {
        try {
          deleteStudentFromDB(studentIdOrId).catch(() => {});
          localStorage.removeItem("sb_students_permanent_backup");
          localStorage.removeItem("sb_enrolled_students");
          localStorage.removeItem("sb_offline_pending_students");
          localStorage.removeItem("sb_deleted_student_ids");
        } catch {}

        setDisplayStudents((prev) => {
          const updated = prev.filter((s) => s.studentId !== studentIdOrId && s.id !== studentIdOrId);
          safeSaveLocalEnrolledStudents(updated);
          return updated;
        });
      },
      () => {
        setDisplayStudents([]);
        try {
          localStorage.removeItem("sb_enrolled_students");
          localStorage.removeItem("sb_students_permanent_backup");
          localStorage.removeItem("sb_offline_pending_students");
          localStorage.removeItem("sb_deleted_student_ids");
        } catch {}
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get("grade") || "ALL");
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "ALL");
  const [selectedPhotoStatus, setSelectedPhotoStatus] = useState(searchParams.get("photoStatus") || "ALL");

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeStudent, setActiveStudent] = useState<StudentExtended | null>(null);
  const [isDownloadingPhotos, setIsDownloadingPhotos] = useState(false);

  // Photo ZIP Download Progress & Real-Time MB Metrics State
  const [zipProgress, setZipProgress] = useState<{
    isOpen: boolean;
    status: "idle" | "fetching" | "compressing" | "ready" | "error";
    current: number;
    total: number;
    downloadedBytes: number;
    speedMBps: number;
    currentFileName: string;
    zipSizeBytes?: number;
    errorMessage?: string;
  }>({
    isOpen: false,
    status: "idle",
    current: 0,
    total: 0,
    downloadedBytes: 0,
    speedMBps: 0,
    currentFileName: "",
  });

  // Single Photo Download Toast State (with MB metrics)
  const [singleDownloadToast, setSingleDownloadToast] = useState<{
    show: boolean;
    studentName: string;
    status: "downloading" | "success" | "error";
    sizeFormatted?: string;
    message?: string;
  }>({
    show: false,
    studentName: "",
    status: "downloading",
  });

  const [downloadingSingleStudentId, setDownloadingSingleStudentId] = useState<string | null>(null);

  // Table Column Interactive Sorting (A-Z / Z-A / Default Newest First)
  const [sortField, setSortField] = useState<keyof StudentExtended | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Direct Photo Upload, Auto-Resend & Link Generation State
  const [targetStudentForUpload, setTargetStudentForUpload] = useState<StudentExtended | null>(null);
  const attachFileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectFileUploadClick = (student: StudentExtended) => {
    setTargetStudentForUpload(student);
    if (attachFileInputRef.current) {
      attachFileInputRef.current.value = "";
      attachFileInputRef.current.click();
    }
  };

  const handleAttachFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetStudentForUpload) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const target = targetStudentForUpload;
      setTargetStudentForUpload(null);
      setEditingStudent({ ...target, photoPath: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // 1-Click Direct Image Link Copy
  const handleCopyImageLink = (student: StudentExtended) => {
    const sId = student.studentId || student.id;
    const url = `${window.location.origin}/api/uploads?studentId=${encodeURIComponent(sId)}`;
    try {
      navigator.clipboard.writeText(url);
      alert(`🔗 Direct Image Link Generated & Copied to Clipboard:\n${url}\n\nThis direct endpoint serves the portrait dynamically across any device.`);
    } catch {
      prompt("Direct Image Link (Press Ctrl+C to copy):", url);
    }
  };

  // 1-Click Auto-Resend / Sync from Sender Station & Cloud Vault
  const handleAutoResendPhoto = async (student: StudentExtended) => {
    const sId = student.studentId || student.id;
    try {
      // 1. Check if server already has the photo uploaded
      const res = await fetch(`/api/uploads?studentId=${encodeURIComponent(sId)}`);
      if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
        const directUrl = `/api/uploads?studentId=${encodeURIComponent(sId)}`;
        setDisplayStudents((prev) =>
          prev.map((s) => (s.studentId === sId || s.id === sId ? { ...s, photoPath: directUrl } : s))
        );
        if (activeStudent && (activeStudent.studentId === sId || activeStudent.id === sId)) {
          setActiveStudent((prev) => (prev ? { ...prev, photoPath: directUrl } : null));
        }
        saveStudentToDB({ ...student, photoPath: directUrl } as any).catch(() => {});
        alert(`⚡ Direct photo successfully resolved and linked for ${student.fullName} (${sId})!`);
        return;
      }
    } catch {}

    // 2. Request auto-resend from sender station over cloud sync bus
    publishStudentSync("RESEND_PHOTO_REQUEST", {
      studentId: sId,
      fullName: student.fullName,
    }).catch(() => {});

    alert(`⚡ Auto-resend signal dispatched to Sender Station for ${student.fullName} (${sId})!\n\nIf the sender station has this student queued or stored locally, the photo will auto-transmit immediately.`);
  };

  const handleSort = (field: keyof StudentExtended) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null); // Reset to default newest-first
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Update URL search parameters to trigger server-side query
  const applyFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === "ALL" || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    // Reset page to 1 on filter changes unless page itself is explicitly modified
    if (!newParams.page) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q: searchQuery });
  };

  const handlePageChange = (newPage: number) => {
    setActivePage(newPage);
    applyFilters({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    setActivePageSize(newSize);
    setActivePage(1);
    applyFilters({ pageSize: newSize, page: 1 });
  };

  // Bulk Selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Photo Download with Real-Time MB Size, Metrics, Speed & Progress Modal
  const handleBulkDownloadPhotos = async () => {
    const targetStudents =
      selectedIds.size > 0
        ? filteredStudents.filter(
            (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
          )
        : filteredStudents;

    if (targetStudents.length === 0) {
      alert("No student found to download in this view.");
      return;
    }

    const withPhotos = targetStudents.filter(
      (s) => Boolean(s.photoPath && s.photoPath.trim().length > 0)
    );

    if (withPhotos.length === 0) {
      alert("None of the selected students have a photograph.");
      return;
    }

    setIsDownloadingPhotos(true);
    setZipProgress({
      isOpen: true,
      status: "fetching",
      current: 0,
      total: withPhotos.length,
      downloadedBytes: 0,
      speedMBps: 0,
      currentFileName: "Connecting to student photo storage...",
    });

    const startTime = Date.now();
    let accumulatedBytes = 0;
    let completedCount = 0;

    try {
      const zip = new JSZip();
      const CONCURRENCY = 6; // 6 parallel streams for fast download without browser thrashing

      for (let i = 0; i < withPhotos.length; i += CONCURRENCY) {
        const batch = withPhotos.slice(i, i + CONCURRENCY);

        await Promise.all(
          batch.map(async (student) => {
            const sId = student.studentId || student.id;
            let cleanName = (student.fullName || sId || "student")
              .replace(/[/\\]/g, " - ")
              .replace(/[:*?"<>|]/g, "")
              .replace(/\s+/g, " ")
              .trim();
            cleanName = cleanName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || "student";
            const photoFileName = `${cleanName}.jpg`;

            // Organize strictly into Grade and Section Folders (e.g. Grade_9/Section_A/)
            const { gradeFolder, sectionFolder } = resolveGradeAndSection(student);
            const targetFolder = zip.folder(gradeFolder)?.folder(sectionFolder) || zip;
            const fullPathLabel = `${gradeFolder}/${sectionFolder}/${photoFileName}`;

            const rawPhoto = student.originalPhotoPath || student.photoPath;
            if (!rawPhoto) {
              completedCount++;
              return;
            }

            try {
              if (rawPhoto.startsWith("data:image/")) {
                const base64Data = rawPhoto.split(",")[1];
                if (base64Data) {
                  targetFolder.file(photoFileName, base64Data, { base64: true });
                  const approxSize = Math.round((base64Data.length * 3) / 4);
                  accumulatedBytes += approxSize;
                }
              } else {
                let imgBlob: Blob | null = null;
                try {
                  const res = await fetch(rawPhoto, { signal: AbortSignal.timeout(10000) });
                  if (res.ok) {
                    imgBlob = await res.blob();
                  }
                } catch {
                  // Direct fetch failed (e.g. cross-origin), try server proxy
                  try {
                    const proxyRes = await fetch(
                      `/api/photos/download-single?id=${encodeURIComponent(student.id)}`
                    );
                    if (proxyRes.ok) {
                      imgBlob = await proxyRes.blob();
                    }
                  } catch {}
                }

                if (imgBlob) {
                  accumulatedBytes += imgBlob.size;
                  targetFolder.file(photoFileName, imgBlob);
                }
              }
            } catch (photoErr) {
              console.warn(`Failed to package photo for ${sId}:`, photoErr);
            } finally {
              completedCount++;
              const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.1);
              const speed = (accumulatedBytes / (1024 * 1024)) / elapsedSec;

              setZipProgress({
                isOpen: true,
                status: "fetching",
                current: completedCount,
                total: withPhotos.length,
                downloadedBytes: accumulatedBytes,
                speedMBps: Number(speed.toFixed(2)),
                currentFileName: fullPathLabel,
              });
            }
          })
        );
      }

      // Step 2: ZIP Compression Phase
      setZipProgress((prev) => ({
        ...prev,
        status: "compressing",
        currentFileName: "Compressing into Grade & Section ZIP archive...",
      }));

      const zipBlob = await zip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 5 },
        },
        (metadata) => {
          setZipProgress((prev) => ({
            ...prev,
            status: "compressing",
            currentFileName: `Compressing archive: ${metadata.percent.toFixed(0)}%`,
          }));
        }
      );

      // Step 3: Trigger Browser Download with Metrics
      const dateTag = new Date().toISOString().split("T")[0];
      const scopeLabel =
        selectedIds.size > 0
          ? `Selected_${withPhotos.length}`
          : `All_${withPhotos.length}`;
      const zipFileName = `Student_Photos_Grade_Section_${scopeLabel}_${dateTag}.zip`;

      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();

      // Track encode metric for receiver download
      fetch("/api/users/record-encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: withPhotos.length }),
      }).catch(() => {});

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch {}
      }, 4000);

      setZipProgress({
        isOpen: true,
        status: "ready",
        current: withPhotos.length,
        total: withPhotos.length,
        downloadedBytes: accumulatedBytes,
        speedMBps: 0,
        currentFileName: zipFileName,
        zipSizeBytes: zipBlob.size,
      });
    } catch (err: any) {
      console.error("ZIP creation error:", err);
      setZipProgress((prev) => ({
        ...prev,
        status: "error",
        errorMessage: err?.message || "Failed to generate ZIP archive.",
      }));
    } finally {
      setIsDownloadingPhotos(false);
    }
  };

  // Single Photo Direct Download by Real Student Name with Live MB Metrics
  const handleDownloadSinglePhoto = async (
    photoUrl: string,
    studentName: string,
    studentId?: string
  ) => {
    const cleanName =
      studentName
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ") || "Student_Portrait";

    if (studentId) setDownloadingSingleStudentId(studentId);

    setSingleDownloadToast({
      show: true,
      studentName: cleanName,
      status: "downloading",
      message: "Fetching portrait...",
    });

    try {
      let blob: Blob | null = null;

      // 1. Try direct fetch first
      try {
        const response = await fetch(photoUrl);
        if (response.ok) {
          blob = await response.blob();
        }
      } catch {
        // Direct fetch failed, fallback to server proxy
      }

      // 2. If direct fetch failed or wasn't ok, use server download-single proxy
      if (!blob && studentId) {
        try {
          const proxyRes = await fetch(
            `/api/photos/download-single?id=${encodeURIComponent(studentId)}`
          );
          if (proxyRes.ok) {
            blob = await proxyRes.blob();
          }
        } catch {}
      }

      if (!blob) {
        throw new Error("Unable to retrieve photo data");
      }

      // Calculate exact MB size
      const bytes = blob.size;
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      const sizeFormatted =
        bytes < 1024 * 1024
          ? `${(bytes / 1024).toFixed(1)} KB (${mb} MB)`
          : `${mb} MB`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}.jpg`;
      document.body.appendChild(a);
      a.click();

      // Track encode metric for receiver single photo download
      fetch("/api/users/record-encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      }).catch(() => {});

      // Safe timeout for revokeObjectURL (3.5s ensures browser finishes reading blob before revocation)
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch {}
      }, 3500);

      setSingleDownloadToast({
        show: true,
        studentName: cleanName,
        status: "success",
        sizeFormatted,
        message: `✓ Downloaded ${cleanName}.jpg (${sizeFormatted})`,
      });

      // Auto dismiss success toast after 4.5s
      setTimeout(() => {
        setSingleDownloadToast((prev) =>
          prev.status === "success" ? { ...prev, show: false } : prev
        );
      }, 4500);
    } catch (err: any) {
      console.warn("Direct blob download failed, triggering server attachment download:", err);
      if (studentId) {
        window.open(
          `/api/photos/download-single?id=${encodeURIComponent(studentId)}`,
          "_blank"
        );
      }
      setSingleDownloadToast({
        show: true,
        studentName: cleanName,
        status: "error",
        message: "Triggered native browser download",
      });
      setTimeout(() => setSingleDownloadToast((p) => ({ ...p, show: false })), 4000);
    } finally {
      if (studentId) setDownloadingSingleStudentId(null);
    }
  };

  // Bulk Print
  const handleBulkPrint = () => {
    if (selectedIds.size === 0) return;
    router.push(`/print-engine?ids=${Array.from(selectedIds).join(",")}`);
  };

  // Single Delete (Total Expunge across all tiers: DB, disk files, IndexedDB, local storage)
  const [deleteTargetModal, setDeleteTargetModal] = useState<{ id: string; name: string; studentId?: string } | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  const handleDelete = (id: string, name: string, studentId?: string) => {
    setDeleteTargetModal({ id, name, studentId });
  };

  const handleExecuteDelete = (type: "TEMPORARY" | "PERMANENT") => {
    if (!deleteTargetModal) return;
    const { id, studentId } = deleteTargetModal;
    setIsDeletingRecord(true);

    try {
      deleteStudentFromDB(id).catch(() => {});
      if (studentId) deleteStudentFromDB(studentId).catch(() => {});
      localStorage.removeItem("sb_students_permanent_backup");
      localStorage.removeItem("sb_enrolled_students");
      localStorage.removeItem("sb_deleted_student_ids");
      publishStudentSync("DELETE", studentId || id).catch(() => {});
    } catch {}

    setDisplayStudents((prev) =>
      prev.filter((s) => s.id !== id && s.studentId !== studentId && s.id !== studentId)
    );
    if (activeStudent && (activeStudent.id === id || activeStudent.studentId === studentId)) {
      setActiveStudent(null);
    }
    setDeleteTargetModal(null);
    setIsDeletingRecord(false);

    startTransition(async () => {
      try {
        const res = await deleteStudentAction(id, studentId, type);
        if (!res.success) {
          alert(res.error || "Failed to delete student record.");
        }
      } catch (err: any) {
        console.error("Delete communication error:", err);
        alert("Failed to communicate with server to delete record.");
      }
      router.refresh();
    });
  };

  // Bulk Delete Selected Students
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete the ${selectedIds.size} selected student records?`
      )
    )
      return;

    const idsToDelete = Array.from(selectedIds);
    const selectedItems: { id: string; studentId: string }[] = [];
    displayStudents.forEach((s) => {
      if (selectedIds.has(s.id) || selectedIds.has(s.studentId)) {
        selectedItems.push({ id: s.id, studentId: s.studentId });
      }
    });

    try {
      idsToDelete.forEach((id) => deleteStudentFromDB(id).catch(() => {}));
      selectedItems.forEach((item) => {
        if (item.id) deleteStudentFromDB(item.id).catch(() => {});
        if (item.studentId) deleteStudentFromDB(item.studentId).catch(() => {});
      });

      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList = parseSecureLocalList(raw);
        const filtered = localList.filter(
          (s: any) => !selectedIds.has(s.id) && !selectedIds.has(s.studentId)
        );
        safeSaveLocalEnrolledStudents(filtered);
      }

      localStorage.removeItem("sb_students_permanent_backup");
      localStorage.removeItem("sb_enrolled_students");
      localStorage.removeItem("sb_offline_pending_students");
      localStorage.removeItem("sb_deleted_student_ids");

      idsToDelete.forEach((id) => {
        publishStudentSync("DELETE", id).catch(() => {});
      });
    } catch {}

    setDisplayStudents((prev) =>
      prev.filter((s) => !selectedIds.has(s.id) && !selectedIds.has(s.studentId))
    );
    setSelectedIds(new Set());
    if (activeStudent && (selectedIds.has(activeStudent.id) || selectedIds.has(activeStudent.studentId))) {
      setActiveStudent(null);
    }

    startTransition(async () => {
      try {
        const res = await deleteMultipleStudentsAction(selectedItems.length > 0 ? selectedItems : idsToDelete);
        if (!res.success) {
          alert(res.error || "Failed to delete selected student records.");
        }
      } catch (err: any) {
        console.error("Bulk delete error:", err);
        alert("Failed to communicate with server for bulk deletion.");
      }
      router.refresh();
    });
  };

  // Clear All Students (User Requirement: Total Purge)
  const handleClearAllStudents = () => {
    if (
      confirm(
        "Are you sure you want to permanently delete ALL student records? This will clear the entire credential directory so you can feed your own fresh data."
      )
    ) {
      clearAllStudentsFromDB().catch(() => {});
      try {
        localStorage.removeItem("sb_enrolled_students");
        localStorage.removeItem("sb_students_permanent_backup");
        localStorage.removeItem("sb_offline_pending_students");
        localStorage.removeItem("sb_deleted_student_ids");
        publishStudentSync("CLEAR").catch(() => {});
      } catch {}
      setDisplayStudents([]);
      setSelectedIds(new Set());
      setActiveStudent(null);

      startTransition(async () => {
        try {
          const res = await clearAllStudentsAction();
          if (!res.success) {
            alert(res.error || "Failed to clear all student records.");
          }
        } catch (err: any) {
          console.error("Clear all action error:", err);
          alert("Failed to clear records on server.");
        }
        router.refresh();
      });
    }
  };

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Force Re-Sync with Cloud & Wipe Local Browser Stale Cache
  const handleForceCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await fetch("/api/students/sync", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.students)) {
          // 1. Wipe local browser ghost records completely
          await clearAllStudentsFromDB();
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("sb_enrolled_students");
              localStorage.removeItem("sb_students_permanent_backup");
              localStorage.removeItem("sb_deleted_student_ids");
              localStorage.removeItem("sb_offline_pending_students");
            } catch {}
          }

          // 2. Re-populate with live server records
          await saveStudentsToDB(data.students);
          safeSaveLocalEnrolledStudents(data.students);
          setDisplayStudents(data.students);
          alert(`✓ Synchronized with Supabase Cloud: ${data.students.length} active students loaded. Any deleted ghost records on this PC were removed.`);
        }
      }
    } catch (err: any) {
      console.error("Force sync failed:", err);
      alert("Failed to synchronize with cloud database: " + (err?.message || "Unknown error"));
    } finally {
      setIsSyncingCloud(false);
      router.refresh();
    }
  };

  // Export Feeded Data to Excel / CSV with dynamic columns & local desktop path:
  // [StudentID, Name, Sex, Grade, Phone, (BloodType?), @photo]
  const handleExportExcel = (selectedOnly: boolean = false, overrideGrade?: string) => {
    const targetGrade = overrideGrade !== undefined ? overrideGrade : (selectedGrade !== "ALL" ? selectedGrade : "");

    let listToExport: StudentExtended[] = [];
    if (selectedOnly) {
      listToExport = filteredStudents.filter(
        (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
      );
      if (listToExport.length === 0) {
        alert("No student found to download in this view.");
        return;
      }
    } else {
      listToExport = targetGrade
        ? filteredStudents.filter((s) => s.grade === targetGrade)
        : filteredStudents;
    }

    if (listToExport.length === 0) {
      alert("No student found to download in this view.");
      return;
    }

    // Determine if BloodType column should be included (only if at least 1 student has a selected blood type)
    const hasBloodType = listToExport.some(
      (s) => s.bloodType && s.bloodType.trim() && s.bloodType.trim() !== "Unknown"
    );
    const headers = getReceiverExcelHeaders(hasBloodType);
    const dataRows = listToExport.map((s) => formatStudentForReceiverExcel(s, hasBloodType));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = hasBloodType
      ? [
          { wch: 18 }, // StudentID
          { wch: 28 }, // Name
          { wch: 10 }, // Sex
          { wch: 14 }, // Grade
          { wch: 18 }, // Phone
          { wch: 18 }, // EmergencyPhone
          { wch: 14 }, // BloodType
          { wch: 70 }, // @photo
        ]
      : [
          { wch: 18 }, // StudentID
          { wch: 28 }, // Name
          { wch: 10 }, // Sex
          { wch: 14 }, // Grade
          { wch: 18 }, // Phone
          { wch: 18 }, // EmergencyPhone
          { wch: 70 }, // @photo
        ];
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    const dateTag = new Date().toISOString().split("T")[0];
    const scopeLabel = selectedOnly
      ? `Selected_${listToExport.length}`
      : targetGrade
      ? `Grade_${targetGrade.replace(/[^a-zA-Z0-9_-]/g, "_")}`
      : `All_${listToExport.length}`;
    const fileName = `Student_Credentials_${scopeLabel}_${dateTag}.xlsx`;
    XLSX.writeFile(wb, fileName);

    // Track encode metric for receiver Excel download
    fetch("/api/users/record-encode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: listToExport.length }),
    }).catch(() => {});
  };

  const handleExportCSV = (selectedOnly: boolean = false, overrideGrade?: string) => {
    const targetGrade = overrideGrade !== undefined ? overrideGrade : (selectedGrade !== "ALL" ? selectedGrade : "");

    let listToExport: StudentExtended[] = [];
    if (selectedOnly) {
      listToExport = filteredStudents.filter(
        (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
      );
      if (listToExport.length === 0) {
        alert("No student found to download in this view.");
        return;
      }
    } else {
      listToExport = targetGrade
        ? filteredStudents.filter((s) => s.grade === targetGrade)
        : filteredStudents;
    }

    if (listToExport.length === 0) {
      alert("No student found to download in this view.");
      return;
    }

    // Determine if BloodType column should be included (only if at least 1 student has a selected blood type)
    const hasBloodType = listToExport.some(
      (s) => s.bloodType && s.bloodType.trim() && s.bloodType.trim() !== "Unknown"
    );
    const headers = getReceiverExcelHeaders(hasBloodType);
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).trim();
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = listToExport.map((s) =>
      formatStudentForReceiverExcel(s, hasBloodType)
        .map((cell) => escapeCSV(cell))
        .join(",")
    );

    // Add UTF-8 BOM so Excel opens with proper character encoding
    const csvContent = "\uFEFF" + [headers.map((h) => escapeCSV(h)).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const dateTag = new Date().toISOString().split("T")[0];
    const scopeLabel = selectedOnly
      ? `Selected_${listToExport.length}`
      : targetGrade
      ? `Grade_${targetGrade.replace(/[^a-zA-Z0-9_-]/g, "_")}`
      : `All_${listToExport.length}`;
    const fileName = `Student_Credentials_${scopeLabel}_${dateTag}.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Track encode metric for receiver CSV download
    fetch("/api/users/record-encode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: listToExport.length }),
    }).catch(() => {});
  };

  // Download all selected students together into 1 combined CSV or Excel file (Client-Side Instant Export)
  const downloadSelectedTogether = (format: "csv" | "xlsx" = "csv") => {
    if (selectedIds.size === 0) {
      alert("Please select at least one student from the table first.");
      return;
    }

    if (format === "xlsx") {
      handleExportExcel(true);
    } else {
      handleExportCSV(true);
    }
  };

  // Save edited/cropped photo from PhotoEditorModal studio & sync to receiver
  const handleSaveEditedPhoto = async (editedBlob: Blob, _originalBlob?: Blob | null, _metadata?: any) => {
    if (!editingStudent) return;
    const studentToUpdate = editingStudent;
    setEditingStudent(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;

      let cleanName = (studentToUpdate.fullName || studentToUpdate.studentId || "student")
        .replace(/[/\\]/g, " - ")
        .replace(/[:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      cleanName = cleanName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || "student";
      const safePhotoName = `${cleanName}.jpg`;

      const form = new FormData();
      form.append("file", editedBlob, safePhotoName);
      form.append("studentId", studentToUpdate.studentId);
      form.append("fullName", studentToUpdate.fullName || "");
      form.append("grade", studentToUpdate.grade || "");

      let finalPath = dataUri;
      let uploadResultData: any = null;
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const uploadRes = await res.json();
          uploadResultData = uploadRes;
          if (uploadRes.relativePath) {
            finalPath = uploadRes.relativePath;
          }
        }
      } catch (uploadErr) {
        console.warn("Upload fallback to dataUri:", uploadErr);
      }

      // Invalidate service worker and browser CacheStorage for student photos
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const cache = await caches.open("siliconlabs_student_photos_v1");
          if (studentToUpdate.photoPath) {
            const cleanUrl = studentToUpdate.photoPath.split("?")[0];
            await cache.delete(cleanUrl);
            await cache.delete(studentToUpdate.photoPath);
          }
        } catch {}
      }

      const updatedStudent: StudentExtended = {
        ...studentToUpdate,
        photoPath: finalPath,
        originalPhotoPath: uploadResultData?.originalPath || studentToUpdate.originalPhotoPath || finalPath,
        previewPath: uploadResultData?.previewPath || studentToUpdate.previewPath || finalPath,
        thumbnailPath: uploadResultData?.thumbnailPath || studentToUpdate.thumbnailPath || dataUri,
      };

      // 1. Persist to secure client vault
      try {
        await saveStudentToDB(updatedStudent as any);
      } catch (idbErr) {
        console.warn("Secure vault photo update error:", idbErr);
      }

      // 2. Broadcast live update across all tabs and mobile/desktop clients
      try {
        publishStudentSync("UPSERT", updatedStudent as any);
      } catch (syncErr) {
        console.warn("Real-time sync photo broadcast notice:", syncErr);
      }

      // 3. Update database via server action
      try {
        await updateStudentPhotoAction(studentToUpdate.id, finalPath);
      } catch (actionErr) {
        console.warn("Server action photo update warning:", actionErr);
      }

      // 4. Update local React state immediately
      setDisplayStudents((prev) => {
        const next = prev.map((s) =>
          s.id === studentToUpdate.id || s.studentId === studentToUpdate.studentId
            ? updatedStudent
            : s
        );
        safeSaveLocalEnrolledStudents(next);
        return next;
      });

      if (
        activeStudent &&
        (activeStudent.id === studentToUpdate.id || activeStudent.studentId === studentToUpdate.studentId)
      ) {
        setActiveStudent((prev) => (prev ? { ...prev, photoPath: finalPath } : null));
      }
    };
    reader.readAsDataURL(editedBlob);
  };

  // Multi-Field Instant Search and Filter across all attributes
  const filteredStudents = React.useMemo(() => {
    let list = displayStudents;

    // Filter by Search Query across ALL fields
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.fullName || "").toLowerCase();
        const sId = (s.studentId || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const dept = (s.department || "").toLowerCase();
        const school = (s.school || "").toLowerCase();
        const grade = (s.grade || "").toLowerCase();
        const email = (s.emailAddress || "").toLowerCase();
        const guardian = (s.guardianFullName || "").toLowerCase();
        const emPhone = (s.emergencyContactPhone || "").toLowerCase();
        const emName = (s.emergencyContactName || "").toLowerCase();
        const blood = (s.bloodType || "").toLowerCase();
        const customMatch = s.customValues?.some((cv) =>
          (cv.value || "").toLowerCase().includes(q)
        );
        return (
          name.includes(q) ||
          sId.includes(q) ||
          phone.includes(q) ||
          dept.includes(q) ||
          school.includes(q) ||
          grade.includes(q) ||
          email.includes(q) ||
          guardian.includes(q) ||
          emPhone.includes(q) ||
          emName.includes(q) ||
          blood.includes(q) ||
          Boolean(customMatch)
        );
      });
    }

    // Filter by Grade
    if (selectedGrade && selectedGrade !== "ALL") {
      list = list.filter(
        (s) => (s.grade || "").trim().toLowerCase() === selectedGrade.trim().toLowerCase()
      );
    }

    // Filter by Department
    if (selectedDept && selectedDept !== "ALL") {
      list = list.filter(
        (s) => (s.department || "").trim().toLowerCase() === selectedDept.trim().toLowerCase()
      );
    }

    // Filter by Photo Status
    if (selectedPhotoStatus === "HAS_PHOTO") {
      list = list.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0));
    } else if (selectedPhotoStatus === "MISSING_PHOTO") {
      list = list.filter((s) => !s.photoPath || s.photoPath.trim().length === 0);
    }

    return list;
  }, [displayStudents, searchQuery, selectedGrade, selectedDept, selectedPhotoStatus]);

  const totalEffective = filteredStudents.length;
  const totalPages = Math.ceil(totalEffective / activePageSize) || 1;
  const startItem = totalEffective === 0 ? 0 : (activePage - 1) * activePageSize + 1;
  const endItem = Math.min(activePage * activePageSize, totalEffective);

  // Sorted students based on active column sort or default newest first
  const sortedStudents = React.useMemo(() => {
    if (!sortField) return filteredStudents;
    const sorted = [...filteredStudents];
    sorted.sort((a, b) => {
      const valA = (a as any)[sortField] ?? "";
      const valB = (b as any)[sortField] ?? "";
      const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? comp : -comp;
    });
    return sorted;
  }, [filteredStudents, sortField, sortDirection]);

  // Dynamic grade counts and tabs synchronized with real active records
  const dynamicGradeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    displayStudents.forEach((s) => {
      const g = s.grade?.trim() || "Unassigned";
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [displayStudents]);

  const allAvailableGrades = React.useMemo(() => {
    const set = new Set<string>(grades);
    displayStudents.forEach((s) => {
      if (s.grade && s.grade.trim()) set.add(s.grade.trim());
    });
    const arr = Array.from(set);
    arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    return arr;
  }, [grades, displayStudents]);

  const activeTotalStudentsCount = Math.max(totalCount, displayStudents.length);

  // Client-side pagination slice ensuring Per page (25, 50, 100) functions instantaneously
  const paginatedStudents = React.useMemo(() => {
    const start = (activePage - 1) * activePageSize;
    return sortedStudents.slice(start, start + activePageSize);
  }, [sortedStudents, activePage, activePageSize]);

  return (
    <div
      className={`space-y-4 pb-28 ${userRole === "RECEIVER" ? "select-none" : ""}`}
      onContextMenu={userRole === "RECEIVER" ? (e) => e.preventDefault() : undefined}
      onCopy={userRole === "RECEIVER" ? (e) => e.preventDefault() : undefined}
    >
      {/* Grade Cohort Tabs (Clean, Sleek, Instant Filtering) */}
      {allAvailableGrades.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setSelectedGrade("ALL");
              applyFilters({ grade: "ALL" });
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedGrade === "ALL"
                ? "bg-[#8fe617] text-[#070908] font-bold shadow-xs"
                : "bg-surface dark:bg-[#111613] border border-border dark:border-[#223126] text-foreground-muted dark:text-[#8a9e93] hover:text-foreground dark:hover:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#161e19]"
            }`}
          >
            All Students ({activeTotalStudentsCount.toLocaleString()})
          </button>
          {allAvailableGrades.map((g) => {
            const count = dynamicGradeCounts[g] ?? gradeCounts?.[g];
            const isSelected = selectedGrade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setSelectedGrade(g);
                  applyFilters({ grade: g });
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-[#8fe617] text-[#070908] font-bold shadow-xs"
                    : "bg-surface dark:bg-[#111613] border border-border dark:border-[#223126] text-foreground-muted dark:text-[#8a9e93] hover:text-foreground dark:hover:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#161e19]"
                }`}
              >
                {g} {count !== undefined ? `(${count.toLocaleString()})` : ""}
              </button>
            );
          })}
        </div>
      )}


      {/* Search & Multi-Filter Controls Bar (Comfortable Size & Enterprise Layout) */}
      <div className="rounded-2xl border border-border dark:border-[#223126] bg-surface dark:bg-[#111613] p-4 sm:p-5 space-y-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-foreground-muted dark:text-[#8a9e93]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Student ID, Phone, Department, or School..."
              className="w-full h-11 rounded-xl border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#070908] pl-11 pr-4 text-sm text-foreground dark:text-[#f2f7f4] placeholder:text-foreground-subtle dark:placeholder:text-[#6c8074] focus:border-[#8fe617] focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-11 px-6 rounded-xl bg-[#8fe617] text-[#070908] font-bold text-sm hover:brightness-105 transition-all shadow-xs cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => handleExportCSV(false)}
            className="h-11 px-4 rounded-xl border border-border dark:border-[#223126] bg-surface dark:bg-[#161e19] hover:bg-surface-secondary dark:hover:bg-[#202b23] text-foreground dark:text-[#f2f7f4] text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            title="Download full student directory as CSV"
          >
            <Download className="h-4 w-4 text-foreground-muted dark:text-[#8a9e93]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportExcel(false)}
            className="h-11 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            title="Download full student directory as Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            disabled={isDownloadingPhotos}
            onClick={handleBulkDownloadPhotos}
            className="h-11 px-5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:border dark:border-[#223126] text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            title="Download student portraits organized into Grade & Section folders (ZIP archive)"
          >
            {isDownloadingPhotos ? (
              <Loader2 className="h-4 w-4 text-[#8fe617] animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-[#8fe617]" />
            )}
            <span>
              {isDownloadingPhotos
                ? "Packaging ZIP..."
                : selectedIds.size > 0
                ? `Download Photos ZIP (${selectedIds.size})`
                : "Download Photos (.zip)"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleClearAllStudents}
            className="h-11 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Delete all data to feed fresh records"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Data</span>
          </button>
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={handleForceCloudSync}
            className="h-11 px-4 rounded-xl border border-[#8fe617]/40 bg-[#8fe617]/10 text-[#8fe617] hover:bg-[#8fe617]/20 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Clean local browser cache and synchronize with live Supabase database"
          >
            <RefreshCw className={`h-4 w-4 text-[#8fe617] ${isSyncingCloud ? "animate-spin" : ""}`} />
            <span>{isSyncingCloud ? "Syncing..." : "Re-Sync Cloud"}</span>
          </button>
        </form>

        {/* 3-Column Streamlined Filters Grid (QR removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              applyFilters({ grade: e.target.value });
            }}
            className="h-10 rounded-xl border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#070908] px-3.5 text-sm text-foreground dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none transition-colors"
          >
            <option value="ALL">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              applyFilters({ department: e.target.value });
            }}
            className="h-10 rounded-xl border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#070908] px-3.5 text-sm text-foreground dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none transition-colors"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Photo Status Filter */}
          <select
            value={selectedPhotoStatus}
            onChange={(e) => {
              setSelectedPhotoStatus(e.target.value);
              applyFilters({ photoStatus: e.target.value });
            }}
            className="h-10 rounded-xl border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#070908] px-3.5 text-sm text-foreground dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none transition-colors"
          >
            <option value="ALL">Photo: All</option>
            <option value="HAS_PHOTO">Photo: Available</option>
            <option value="MISSING_PHOTO">Photo: Missing</option>
          </select>
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="rounded-2xl border border-border dark:border-[#223126] bg-surface dark:bg-[#111613] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#161e19] text-xs uppercase tracking-wider text-foreground-muted dark:text-[#8a9e93] font-mono select-none">
              <tr>
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === displayStudents.length && displayStudents.length > 0}
                    onChange={handleToggleSelectAll}
                    className="accent-[#8fe617] rounded h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 w-16">Photo</th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("studentId")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Student ID"
                  >
                    <span>Student ID</span>
                    {sortField === "studentId" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("fullName")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Full Name (A-Z / Z-A)"
                  >
                    <span>Name</span>
                    {sortField === "fullName" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("sex")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Sex"
                  >
                    <span>Sex</span>
                    {sortField === "sex" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("grade")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Grade"
                  >
                    <span>Grade</span>
                    {sortField === "grade" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("phone")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Phone"
                  >
                    <span>Phone</span>
                    {sortField === "phone" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Sent By</th>
                <th className="px-4 py-3.5">Photo Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-[#223126]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 px-6 text-center bg-surface dark:bg-[#111613]">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-surface-secondary dark:bg-[#161e19] border border-border dark:border-[#223126] flex items-center justify-center text-accent">
                        <Users className="w-8 h-8 text-[#8fe617]" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-lg font-bold text-foreground dark:text-[#f2f7f4] tracking-tight">No student found to download in this view.</h4>
                        <p className="text-xs text-foreground-muted dark:text-[#8a9e93] leading-relaxed">
                          All previous data has been purged or no recorded student credentials match this view. The database is clean and ready to accept your fresh real-world data feed.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <Link
                          href="/students/import"
                          className="px-5 py-2.5 bg-[#8fe617] text-[#070908] text-sm font-bold rounded-xl hover:brightness-105 transition-all shadow-xs flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Import Excel / CSV
                        </Link>
                        <Link
                          href="/register"
                          className="px-5 py-2.5 bg-surface dark:bg-[#161e19] text-foreground dark:text-[#f2f7f4] border border-border dark:border-[#223126] text-sm font-semibold rounded-xl hover:bg-surface-secondary dark:hover:bg-[#202b23] transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Enroll Single Student
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  const hasPhoto = Boolean(student.photoPath);

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isSelected ? "bg-[#8fe617]/10" : "hover:bg-surface-secondary/60 dark:hover:bg-[#161e19]/60"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="accent-[#8fe617] rounded h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Photo Thumbnail with Hover Zoom Popover */}
                      <td className="px-4 py-3">
                        <div className="relative group/thumb inline-block">
                          <div
                            onClick={() => {
                              if (student.photoPath) {
                                setEditingStudent(student);
                              } else {
                                handleAutoResendPhoto(student);
                              }
                            }}
                            className="h-14 w-11 rounded-xl border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#161e19] overflow-hidden flex items-center justify-center shadow-xs transition-transform duration-150 group-hover/thumb:scale-105 cursor-pointer relative"
                            title={student.photoPath ? `Click to Crop & Edit Studio Portrait (${student.fullName})` : "Click to auto-resend / resolve photo"}
                          >
                            <ResilientStudentPhoto
                              src={student.thumbnailPath || student.previewPath || student.photoPath}
                              alt={student.fullName}
                              fullName={student.fullName}
                              studentId={student.studentId}
                              onAutoDelete={handlePhotoAutoDeleted}
                            />
                            {student.photoPath && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                                <Crop className="h-4 w-4 text-[#8fe617]" />
                              </div>
                            )}
                          </div>

                          {/* Studio Portrait Hover Zoom Popover */}
                          {student.photoPath && (
                            <div className="hidden group-hover/thumb:flex flex-col absolute left-14 top-1/2 -translate-y-1/2 z-30 w-44 rounded-2xl border border-border dark:border-[#223126] bg-surface dark:bg-[#111613] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                              <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-border dark:border-[#223126]">
                                <ResilientStudentPhoto
                                  src={student.previewPath || student.photoPath}
                                  alt={student.fullName}
                                  fullName={student.fullName}
                                  studentId={student.studentId}
                                  onAutoDelete={handlePhotoAutoDeleted}
                                />
                              </div>
                              <div className="pt-2 px-1">
                                <div className="font-bold text-xs text-foreground dark:text-[#f2f7f4] truncate">{student.fullName}</div>
                                <div className="font-mono text-[10px] text-foreground-muted dark:text-[#8a9e93] flex items-center justify-between pt-0.5">
                                  <span>{student.studentId}</span>
                                  <span className="text-[#8fe617] font-semibold">{student.grade}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-sm text-foreground dark:text-[#f2f7f4]">
                        {student.studentId}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-sm text-foreground dark:text-[#f2f7f4]">
                        {student.fullName}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              student.sex?.toLowerCase() === "female"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            {student.sex || "Male"}
                          </span>
                          {student.bloodType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              🩸 {student.bloodType}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-sm font-medium text-foreground dark:text-[#f2f7f4]">{student.grade}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-foreground-muted dark:text-[#8a9e93]">{student.phone}</td>

                      {/* Data Sent By Attribution */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#161e19] text-foreground dark:text-[#f2f7f4]"
                          title={student.senderName || "Self / Direct Station"}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617] shrink-0" />
                          <span className="truncate max-w-[130px] font-semibold text-[11px]">
                            {student.senderName || "Direct Station"}
                          </span>
                        </span>
                      </td>

                      {/* Photo Status */}
                      <td className="px-4 py-3.5">
                        {hasPhoto ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8fe617]/15 text-[#8fe617] border border-[#8fe617]/30">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Photo OK
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyImageLink(student)}
                              className="p-1 rounded-md text-foreground-muted hover:text-[#8fe617] hover:bg-[#8fe617]/10 transition-colors cursor-pointer"
                              title="Generate / Copy Direct Image Link"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleAutoResendPhoto(student)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 transition-all shadow-xs cursor-pointer"
                              title="Auto-resend photo from sender station or resolve cloud link"
                            >
                              <Zap className="h-3 w-3" />
                              <span>Auto-Resend</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyImageLink(student)}
                              className="p-1 rounded-md text-foreground-muted hover:text-[#8fe617] hover:bg-[#8fe617]/10 transition-colors cursor-pointer"
                              title="Generate / Copy Direct Image Link"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectFileUploadClick(student)}
                              className="p-1 rounded-md text-foreground-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title="Pick file directly from device (zero popup modal)"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {student.photoPath ? (
                            <>
                              <button
                                type="button"
                                disabled={downloadingSingleStudentId === student.id}
                                onClick={() =>
                                  handleDownloadSinglePhoto(
                                    student.originalPhotoPath || student.photoPath!,
                                    student.fullName,
                                    student.id
                                  )
                                }
                                className="rounded-lg p-2 text-foreground-muted dark:text-[#8a9e93] hover:bg-surface-secondary dark:hover:bg-[#161e19] hover:text-foreground dark:hover:text-[#f2f7f4] transition-colors cursor-pointer disabled:opacity-50"
                                title={`Download Original Photo (${student.fullName}.jpg)`}
                              >
                                {downloadingSingleStudentId === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-[#8fe617]" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudent(student)}
                                className="rounded-lg p-2 text-[#8fe617] bg-[#8fe617]/10 hover:bg-[#8fe617]/20 border border-[#8fe617]/30 transition-colors cursor-pointer"
                                title={`Crop & Edit Photo (${student.fullName})`}
                              >
                                <Crop className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyImageLink(student)}
                                className="rounded-lg p-2 text-foreground-muted dark:text-[#8a9e93] hover:bg-surface-secondary dark:hover:bg-[#161e19] hover:text-[#8fe617] transition-colors cursor-pointer"
                                title="Copy Direct Image Link"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDirectFileUploadClick(student)}
                                className="rounded-lg p-2 text-foreground-muted dark:text-[#8a9e93] hover:bg-surface-secondary dark:hover:bg-[#161e19] hover:text-foreground dark:hover:text-[#f2f7f4] transition-colors cursor-pointer"
                                title="Replace Photo File Directly"
                              >
                                <Upload className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAutoResendPhoto(student)}
                                className="rounded-lg p-2 text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title={`Auto-Resend Photo from Sender (${student.fullName})`}
                              >
                                <Zap className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyImageLink(student)}
                                className="rounded-lg p-2 text-foreground-muted hover:text-[#8fe617] hover:bg-[#8fe617]/10 transition-colors cursor-pointer"
                                title="Generate / Copy Direct Image Link"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDirectFileUploadClick(student)}
                                className="rounded-lg p-2 text-foreground-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title="Upload Image File Directly"
                              >
                                <Upload className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveStudent(student)}
                            className="rounded-lg p-2 text-foreground-muted dark:text-[#8a9e93] hover:bg-surface-secondary dark:hover:bg-[#161e19] hover:text-foreground dark:hover:text-[#f2f7f4] transition-colors cursor-pointer"
                            title="Inspect Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {(userRole === "RECEIVER" || userRole === "ADMIN" || userRole === "SENDER") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id, student.fullName, student.studentId)}
                              className="rounded-lg p-2 text-foreground-muted dark:text-[#8a9e93] hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border dark:border-[#223126] bg-surface-secondary/50 dark:bg-[#161e19]/50 px-6 py-3 text-xs text-foreground-muted dark:text-[#8a9e93]">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-foreground dark:text-[#f2f7f4]">{startItem}</strong> to{" "}
              <strong className="text-foreground dark:text-[#f2f7f4]">{endItem}</strong> of{" "}
              <strong className="text-foreground dark:text-[#f2f7f4] font-mono">{totalEffective.toLocaleString()}</strong> students
            </span>

            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={activePageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                className="rounded-lg border border-border dark:border-[#223126] bg-surface dark:bg-[#070908] px-2.5 py-1 text-xs font-semibold text-foreground dark:text-[#f2f7f4] focus:border-accent focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">
              Page {activePage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage <= 1}
              className="rounded-lg border border-border dark:border-[#223126] bg-surface dark:bg-[#161e19] p-1.5 text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage >= totalPages}
              className="rounded-lg border border-border dark:border-[#223126] bg-surface dark:bg-[#161e19] p-1.5 text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sleek Floating Bulk Action Dock (Linear / Vercel Style) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-[#0c100e]/95 backdrop-blur-md px-5 py-3.5 shadow-2xl text-white ring-1 ring-white/10">
            {/* Left: Counter and 8-Up calculation */}
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center bg-[#8fe617] text-[#070908] px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-xs">
                {selectedIds.size}
              </span>
              <div className="text-xs">
                <span className="text-white font-semibold">Selected</span>
                <span className="text-neutral-500 mx-2">•</span>
                <span className="text-[#8fe617] font-mono font-semibold">
                  {Math.ceil(selectedIds.size / 8)} A4 {Math.ceil(selectedIds.size / 8) === 1 ? "Sheet" : "Sheets"} (8-Up)
                </span>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Export Selected to Excel */}
              <button
                type="button"
                onClick={() => downloadSelectedTogether("xlsx")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-white transition-colors cursor-pointer"
                title="Export selected students to Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              {/* Export Selected to CSV */}
              <button
                type="button"
                onClick={() => downloadSelectedTogether("csv")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-white transition-colors cursor-pointer"
                title="Export selected students to CSV"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>CSV</span>
              </button>

              {/* If 1 student selected with photo, show direct photo download button */}
              {selectedIds.size === 1 && (() => {
                const singleSel = filteredStudents.find(
                  (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
                );
                if (!singleSel || !singleSel.photoPath) return null;
                return (
                  <button
                    type="button"
                    disabled={downloadingSingleStudentId === singleSel.id}
                    onClick={() =>
                      handleDownloadSinglePhoto(
                        singleSel.originalPhotoPath || singleSel.photoPath!,
                        singleSel.fullName,
                        singleSel.id
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#8fe617]/50 bg-[#8fe617]/15 hover:bg-[#8fe617]/25 text-xs font-semibold text-[#8fe617] transition-colors cursor-pointer disabled:opacity-50"
                    title={`Download photo for ${singleSel.fullName}`}
                  >
                    {downloadingSingleStudentId === singleSel.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8fe617]" />
                    ) : (
                      <Download className="h-3.5 w-3.5 text-[#8fe617]" />
                    )}
                    <span>Download Photo (1)</span>
                  </button>
                );
              })()}

              {/* Download Selected Photos ZIP */}
              <button
                type="button"
                onClick={handleBulkDownloadPhotos}
                disabled={isDownloadingPhotos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
                title="Download selected student photos organized by grade and section (.zip)"
              >
                {isDownloadingPhotos ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8fe617]" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-[#8fe617]" />
                )}
                <span>Photos ZIP {selectedIds.size > 1 ? `(${selectedIds.size})` : "(1)"}</span>
              </button>

              {/* Batch Print 8-Up Engine */}
              <button
                type="button"
                onClick={handleBulkPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#8fe617] hover:bg-[#80d312] text-[#070908] text-xs font-bold transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                title="Open selected students in 8-Up A4 Print Engine"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print 8-Up ({Math.ceil(selectedIds.size / 8)} sheets)</span>
              </button>

              {/* Bulk Delete */}
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-900/40 bg-red-950/40 hover:bg-red-900/60 text-xs font-medium text-red-300 transition-colors cursor-pointer"
                title="Delete selected student records"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              {/* Deselect All */}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
                title="Deselect all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Deep Inspection Drawer */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col border-l border-border dark:border-[#223126] bg-surface dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-border dark:border-[#223126] pb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground dark:text-[#f2f7f4]">Student Profile Details</h3>
                <span className="text-[10px] font-mono text-accent">{activeStudent.studentId}</span>
              </div>
              <button
                onClick={() => setActiveStudent(null)}
                className="rounded-lg p-1.5 text-foreground-muted dark:text-[#8a9e93] hover:bg-surface-secondary dark:hover:bg-[#161e19] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Studio Photo Showcase (QR Removed) */}
            <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl border border-border dark:border-[#223126] bg-surface-secondary/40 dark:bg-[#070908]">
              <span className="text-xs font-mono uppercase tracking-wider text-foreground-muted dark:text-[#8a9e93] font-semibold">
                Official Studio Portrait (3:4)
              </span>
              <div
                onClick={() => {
                  if (activeStudent.photoPath) {
                    setEditingStudent(activeStudent);
                  }
                }}
                className={`w-48 aspect-[3/4] rounded-2xl border-2 border-border dark:border-[#223126] bg-black overflow-hidden flex items-center justify-center shadow-lg relative ${activeStudent.photoPath ? "cursor-pointer group/drawerPhoto" : ""}`}
                title={activeStudent.photoPath ? "Click to Crop & Edit Studio Portrait" : undefined}
              >
                <ResilientStudentPhoto
                  src={activeStudent.previewPath || activeStudent.photoPath}
                  alt={activeStudent.fullName}
                  fullName={activeStudent.fullName}
                  studentId={activeStudent.studentId}
                  priority={true}
                  onAutoDelete={handlePhotoAutoDeleted}
                />
                {activeStudent.photoPath && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/drawerPhoto:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold pointer-events-none">
                    <Crop className="h-6 w-6 text-[#8fe617]" />
                    <span className="bg-black/60 px-2.5 py-1 rounded-full text-[11px] font-mono border border-white/20">Click to Edit Photo</span>
                  </div>
                )}
              </div>
              {activeStudent.photoPath ? (
                <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                  <button
                    type="button"
                    disabled={downloadingSingleStudentId === activeStudent.id}
                    onClick={() =>
                      handleDownloadSinglePhoto(
                        activeStudent.originalPhotoPath || activeStudent.photoPath!,
                        activeStudent.fullName,
                        activeStudent.id
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-surface dark:bg-[#161e19] border border-border dark:border-[#223126] text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {downloadingSingleStudentId === activeStudent.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8fe617]" />
                    ) : (
                      <Download className="h-3.5 w-3.5 text-[#8fe617]" />
                    )}
                    <span>Download Original Portrait (.jpg)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(activeStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-[#8fe617] text-[#070908] font-bold hover:brightness-105 transition-all shadow-xs cursor-pointer"
                  >
                    <Crop className="h-3.5 w-3.5" /> Crop & Edit Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyImageLink(activeStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-surface dark:bg-[#161e19] border border-border dark:border-[#223126] text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] transition-colors cursor-pointer"
                  >
                    <Link2 className="h-3.5 w-3.5 text-[#8fe617]" /> 🔗 Copy Direct Image Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectFileUploadClick(activeStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-surface dark:bg-[#161e19] border border-border dark:border-[#223126] text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] transition-colors cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-500" /> 📁 Replace Photo File Directly
                  </button>
                  <div className="text-[11px] font-mono text-foreground-muted dark:text-[#8a9e93] text-center truncate pt-0.5">
                    /api/uploads?studentId={activeStudent.studentId}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full max-w-xs pt-2 text-center p-3 rounded-xl bg-surface dark:bg-[#161e19] border border-amber-500/30">
                  <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Photo Delayed or Disrupted
                  </span>
                  <p className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] leading-normal">
                    Transmission disrupted by internet. Auto-resend from sender station, generate direct image link, or upload directly.
                  </p>
                  <div className="w-full space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAutoResendPhoto(activeStudent)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-[#8fe617] text-[#070908] hover:brightness-105 transition-all shadow-xs cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" /> ⚡ Auto-Resend from Sender Station
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyImageLink(activeStudent)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-surface dark:bg-[#161e19] border border-border dark:border-[#223126] text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] transition-colors cursor-pointer"
                    >
                      <Link2 className="h-3.5 w-3.5 text-[#8fe617]" /> 🔗 Copy Direct Image Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectFileUploadClick(activeStudent)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-surface dark:bg-[#161e19] border border-border dark:border-[#223126] text-foreground dark:text-[#f2f7f4] hover:bg-surface-secondary dark:hover:bg-[#202b23] transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-500" /> 📁 Upload File Directly
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Field Details */}
            <div className="space-y-3 divide-y divide-border dark:divide-[#223126] text-sm">
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted dark:text-[#8a9e93]">Name:</span>
                <strong className="text-foreground dark:text-[#f2f7f4]">{activeStudent.fullName}</strong>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted dark:text-[#8a9e93]">Grade:</span>
                <span className="text-foreground dark:text-[#f2f7f4]">{activeStudent.grade}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted dark:text-[#8a9e93]">Sex:</span>
                <span className="text-foreground dark:text-[#f2f7f4] font-semibold">{activeStudent.sex || "Male"}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted dark:text-[#8a9e93]">Phone:</span>
                <span className="text-foreground dark:text-[#f2f7f4] font-mono">{activeStudent.phone}</span>
              </div>
              {activeStudent.school && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted dark:text-[#8a9e93]">School:</span>
                  <span className="text-foreground dark:text-[#f2f7f4]">{activeStudent.school}</span>
                </div>
              )}
              {activeStudent.department && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted dark:text-[#8a9e93]">Department:</span>
                  <span className="text-foreground dark:text-[#f2f7f4]">{activeStudent.department}</span>
                </div>
              )}
              {activeStudent.emailAddress && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted dark:text-[#8a9e93]">Email:</span>
                  <span className="text-foreground dark:text-[#f2f7f4]">{activeStudent.emailAddress}</span>
                </div>
              )}
              {activeStudent.guardianFullName && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted dark:text-[#8a9e93]">Guardian:</span>
                  <span className="text-foreground dark:text-[#f2f7f4]">{activeStudent.guardianFullName}</span>
                </div>
              )}
              {activeStudent.emergencyContactPhone && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted dark:text-[#8a9e93]">Emergency Phone:</span>
                  <span className="text-foreground dark:text-[#f2f7f4] font-mono">{activeStudent.emergencyContactPhone}</span>
                </div>
              )}
              {activeStudent.bloodType && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted dark:text-[#8a9e93]">Blood Group:</span>
                  <span className="text-accent font-bold">{activeStudent.bloodType}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-foreground-muted dark:text-[#8a9e93]">Data Sent By:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#8fe617]/15 text-[#8fe617] border border-[#8fe617]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                  {activeStudent.senderName || (activeStudent as any).senderId || "Direct Station"}
                </span>
              </div>
            </div>

            {/* Custom Fields Section */}
            {activeStudent.customValues && activeStudent.customValues.length > 0 && (
              <div className="rounded-xl border border-border dark:border-[#223126] bg-surface-secondary dark:bg-[#161e19] p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground dark:text-[#f2f7f4] border-b border-border dark:border-[#223126] pb-2">
                  <Tag className="h-3.5 w-3.5 text-accent" />
                  <span>Custom Attributes</span>
                </div>
                {activeStudent.customValues.map((cv, i) => (
                  <div key={i} className="flex justify-between text-xs pt-1">
                    <span className="text-foreground-muted dark:text-[#8a9e93]">{cv.customField.label}:</span>
                    <strong className="text-foreground dark:text-[#f2f7f4]">{cv.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions in Drawer */}
            {(userRole === "RECEIVER" || userRole === "ADMIN" || userRole === "SENDER") && (
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDelete(activeStudent.id, activeStudent.fullName, activeStudent.studentId)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Student Record</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Photo Crop & Edit Studio Modal */}
      {editingStudent && (editingStudent.photoPath || editingStudent.originalPhotoPath || editingStudent.thumbnailPath) && (
        <PhotoEditorModal
          isOpen={Boolean(editingStudent)}
          studentId={editingStudent.id || editingStudent.studentId}
          originalImageSrc={
            editingStudent.originalPhotoPath ||
            editingStudent.previewPath ||
            editingStudent.photoPath ||
            editingStudent.thumbnailPath ||
            ""
          }
          fallbackImageSrc={
            editingStudent.photoPath ||
            editingStudent.thumbnailPath ||
            undefined
          }
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveEditedPhoto}
        />
      )}

      {/* Hidden file input for direct photo upload (zero popup modals) */}
      <input
        type="file"
        ref={attachFileInputRef}
        accept="image/*"
        onChange={handleAttachFileSelected}
        className="hidden"
      />

      {/* Photo ZIP Download Real-Time Progress & Metrics Modal */}
      {zipProgress.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0c100e] p-6 shadow-2xl text-white ring-1 ring-white/10">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    zipProgress.status === "ready"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : zipProgress.status === "error"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-[#8fe617]/15 text-[#8fe617] border border-[#8fe617]/30"
                  }`}
                >
                  {zipProgress.status === "ready" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : zipProgress.status === "error" ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Download className="h-5 w-5 animate-bounce" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {zipProgress.status === "ready"
                      ? "Photos ZIP Ready!"
                      : zipProgress.status === "compressing"
                      ? "Generating ZIP Archive..."
                      : zipProgress.status === "error"
                      ? "Download Error"
                      : "Downloading Student Portraits"}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {zipProgress.status === "ready"
                      ? "Organized in Grade & Section folders"
                      : `${zipProgress.current} of ${zipProgress.total} portraits processed`}
                  </p>
                </div>
              </div>

              {zipProgress.status === "ready" || zipProgress.status === "error" ? (
                <button
                  type="button"
                  onClick={() => setZipProgress((p) => ({ ...p, isOpen: false }))}
                  className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Metrics Display Grid */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-center">
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                  Downloaded
                </div>
                <div className="text-sm font-bold font-mono text-[#8fe617] mt-0.5">
                  {(zipProgress.downloadedBytes / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-center">
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                  Speed
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {zipProgress.speedMBps > 0 ? `${zipProgress.speedMBps} MB/s` : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-center">
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                  Progress
                </div>
                <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                  {zipProgress.total > 0
                    ? `${Math.min(
                        Math.round((zipProgress.current / zipProgress.total) * 100),
                        100
                      )}%`
                    : "0%"}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden my-3">
              <div
                className={`h-full transition-all duration-200 ${
                  zipProgress.status === "ready"
                    ? "bg-emerald-500"
                    : zipProgress.status === "error"
                    ? "bg-red-500"
                    : "bg-[#8fe617]"
                }`}
                style={{
                  width: `${
                    zipProgress.status === "ready"
                      ? 100
                      : zipProgress.total > 0
                      ? Math.min(
                          Math.round((zipProgress.current / zipProgress.total) * 100),
                          100
                        )
                      : 5
                  }%`,
                }}
              />
            </div>

            {/* Current File / Status Subtitle */}
            <div className="text-xs text-neutral-400 font-mono truncate px-1 py-1">
              {zipProgress.status === "ready" && zipProgress.zipSizeBytes ? (
                <div className="flex items-center justify-between text-emerald-400 font-sans font-medium">
                  <span>✓ Archive downloaded</span>
                  <span className="font-mono font-bold">
                    ZIP: {(zipProgress.zipSizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ) : zipProgress.status === "error" ? (
                <span className="text-red-400 font-sans">
                  {zipProgress.errorMessage || "Failed to download photos."}
                </span>
              ) : (
                <span className="truncate">{zipProgress.currentFileName}</span>
              )}
            </div>

            {/* Action Footer */}
            {(zipProgress.status === "ready" || zipProgress.status === "error") && (
              <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setZipProgress((p) => ({ ...p, isOpen: false }))}
                  className="px-4 py-2 rounded-xl bg-[#8fe617] hover:bg-[#80d312] text-[#070908] text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temporary vs Permanent Delete Modal */}
      {deleteTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <Trash2 className="h-4 w-4" />
                <span>Delete Student Record</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetModal(null)}
                className="text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[#080808] dark:text-[#f2f7f4] font-bold">
                {deleteTargetModal.name} ({deleteTargetModal.studentId || deleteTargetModal.id})
              </p>
              <p className="text-[#6b7771] dark:text-[#8a9e93]">
                Please choose whether to remove this record temporarily from the Receiver workstation or expunge it permanently everywhere.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Option 1: Temporary Delete */}
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => handleExecuteDelete("TEMPORARY")}
                className="w-full text-left p-3.5 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 dark:text-amber-300 text-xs">
                    Temporary Delete (Hide from Receiver)
                  </span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-md font-black">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-1">
                  Removes the student from the Receiver queue and printing view. All demographic data and photos remain intact in Supabase database.
                </p>
              </button>

              {/* Option 2: Permanent Delete */}
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => handleExecuteDelete("PERMANENT")}
                className="w-full text-left p-3.5 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 hover:border-red-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-600 dark:text-red-400 text-xs">
                    Permanent Delete (Expunge Everywhere)
                  </span>
                  <span className="text-[10px] bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-md font-black">
                    IRREVERSIBLE
                  </span>
                </div>
                <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-1">
                  Irreversibly erases this student record, photos, and files across Supabase database, cloud storage, and all connected workstations.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#eef5f1] dark:border-[#1c261e]">
              <button
                type="button"
                onClick={() => setDeleteTargetModal(null)}
                className="px-4 py-2 text-xs font-bold text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Photo Download Toast Banner (Real-time MB size feedback) */}
      {singleDownloadToast.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-[#0c100e]/95 backdrop-blur-md px-4 py-3 shadow-2xl text-white ring-1 ring-white/10">
            {singleDownloadToast.status === "downloading" ? (
              <Loader2 className="h-4 w-4 text-[#8fe617] animate-spin shrink-0" />
            ) : singleDownloadToast.status === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <X className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-semibold text-white truncate max-w-[220px]">
                {singleDownloadToast.studentName}.jpg
              </div>
              <div className="text-neutral-400 text-[11px]">
                {singleDownloadToast.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSingleDownloadToast((p) => ({ ...p, show: false }))}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-auto cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
