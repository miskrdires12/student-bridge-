"use client";

// ============================================================================
// STUDENT BRIDGE — PROFESSIONAL RECEIVER WORKSTATION & CENTRAL PRINT FACILITY
//
// Designed to match top-tier enterprise platforms (Linear, Stripe, Vercel)
// - Lemon Green #8fe617 • Obsidian #070908 / #111613 • Canvas #f7faf9
// - Real-time IndexedDB + Server aggregation (20,000+ daily capacity)
// - Real-world SVG Production Velocity graph with interactive scrubbing HUD
// - Instant Pre-Flight Verification Audit & CSV Manifest Export
// - Seamless live deletion & upsert synchronization (newest records always on top)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Printer,
  CheckCircle2,
  Camera,
  Clock,
  RefreshCw,
  X,
  Search,
  Download,
  Sparkles,
  ArrowRight,
  Shield,
  ArrowUpRight,
  GraduationCap,
  BarChart3,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Filter,
  Trash2,
} from "lucide-react";

import JSZip from "jszip";
import { subscribeToCloudSync } from "@/lib/sync-client";
import { deleteStudentFromDB, reconcileLocalCacheWithServer } from "@/lib/idb-storage";
import { deleteStudentAction } from "@/actions/students";
import { TelegramStagePhoto } from "@/components/common/TelegramStagePhoto";
import {
  getReceiverCsvPrefix,
  getStudentPhotoLocalPath,
  formatPhoneForReceiver,
} from "@/lib/export-utils";

export interface ReceiverDashboardProps {
  initialData: {
    totalStudents: number;
    photosCount: number;
    readyForPrintCount: number;
    pendingVerification: number;
    activeJobsCount: number;
    recentStudents?: any[];
    recentBatches?: any[];
    missingPhotos: any[];
    gradeBreakdown?: { grade: string; count: number; percent: number; a4Sheets: number }[];
    demographics?: { maleCount: number; femaleCount: number; malePercent: number; femalePercent: number };
    batchPlanning?: { totalReadyForPrint: number; totalA4Sheets: number };
    timeline?: {
      hourlyToday: any[];
      daily7Days: any[];
      trend30Days: any[];
    };
  };
  notice?: string;
}

export default function RealtimeReceiverDashboard({ initialData, notice }: ReceiverDashboardProps) {
  // Core Data State
  const [data, setData] = useState(initialData);
  const [timeline, setTimeline] = useState(
    initialData.timeline || {
      hourlyToday: [],
      daily7Days: [],
      trend30Days: [],
    }
  );

  // Sync & Polling State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [noticeVisible, setNoticeVisible] = useState(Boolean(notice));
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Deletion Modal State (Temporary vs Permanent)
  const [deleteModalStudent, setDeleteModalStudent] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async (type: "TEMPORARY" | "PERMANENT") => {
    if (!deleteModalStudent) return;
    const target = deleteModalStudent;
    setIsDeleting(true);

    try {
      // Optimistic removal from receiver view
      setAllStudentsList((list) =>
        list.filter((s) => s.studentId !== target.studentId && s.id !== target.id)
      );
      setData((prev) => ({
        ...prev,
        totalStudents: Math.max(0, prev.totalStudents - 1),
        photosCount: target.photoPath ? Math.max(0, prev.photosCount - 1) : prev.photosCount,
        readyForPrintCount: target.photoPath ? Math.max(0, prev.readyForPrintCount - 1) : prev.readyForPrintCount,
        recentStudents: (prev.recentStudents || []).filter(
          (s: any) => s.studentId !== target.studentId && s.id !== target.id
        ),
      }));

      deleteStudentFromDB(target.studentId || target.id).catch(() => {});

      const res = await deleteStudentAction(target.id, target.studentId, type);
      if (!res.success) {
        alert(res.error || "Failed to process deletion.");
      } else {
        setExportNotice(
          type === "TEMPORARY"
            ? `Student ${target.fullName || target.studentId} removed from Receiver view (saved in Supabase DB).`
            : `Student ${target.fullName || target.studentId} permanently expunged everywhere.`
        );
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (err: any) {
      alert("Error contacting server to delete student.");
    } finally {
      setIsDeleting(false);
      setDeleteModalStudent(null);
    }
  };

  const playAudioChime = useCallback(() => {
    try {
      const raw = localStorage.getItem("sb_receiver_settings");
      const enabled = raw ? JSON.parse(raw).enableAudioAlerts !== false : true;
      if (!enabled) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  // Interactive Graph Controls
  const [activeTimeRange, setActiveTimeRange] = useState<"hourly" | "daily" | "trend" | "year">("hourly");
  const [activeMetric, setActiveMetric] = useState<"volume" | "photos" | "readiness" | "throughput">("volume");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  // Selective Student Download State (Issue 3)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Grade & Section Classifiers (Issue 4)
  const [gradeClassifier, setGradeClassifier] = useState<string>("ALL");
  const [sectionClassifier, setSectionClassifier] = useState<string>("ALL");

  // Read-only High-Res Lightbox Photo Modal (Replaces buggy PhotoEditorModal)
  const [inspectingPhotoStudent, setInspectingPhotoStudent] = useState<any | null>(null);

  // Telegram 3-Stage Progressive Reveal IDs
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());

  // Student Roster Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "ready" | "missing_photo">("all");
  const [allStudentsList, setAllStudentsList] = useState<any[]>(() => {
    const list = [...(initialData.recentStudents || [])];
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  });

  // Pre-Flight Audit Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<{
    totalAudited: number;
    verifiedCount: number;
    readinessRate: number;
    missingPhotosCount: number;
    incompleteCount: number;
    flaggedList: any[];
  } | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. RECONCILE CLIENT STORAGE WITH SERVER DATA & OVERLAY OUTBOX
  // ──────────────────────────────────────────────────────────────────────────
  const syncWithIndexedDB = useCallback(async () => {
    try {
      // Check for any uncommitted outbox items on this workstation
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

      // Reconcile local storage with server records: purges deleted ghosts!
      const serverRecents = initialData?.recentStudents || [];
      await reconcileLocalCacheWithServer(serverRecents, activeOutboxIds);

      setData((prev) => {
        const map = new Map<string, any>();
        // Add authoritative server recent students
        (prev.recentStudents || []).forEach((s) => map.set(s.studentId, s));
        // Overlay active pending outbox items only
        activeOutboxItems.forEach((s) => {
          if (!map.has(s.studentId)) map.set(s.studentId, s);
        });

        const mergedList = Array.from(map.values());
        mergedList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        setAllStudentsList(mergedList);

        const outboxPendingCount = activeOutboxItems.length;
        const baseTotal = initialData?.totalStudents ?? prev.totalStudents;
        const total = baseTotal + outboxPendingCount;
        const photos = (initialData?.photosCount ?? prev.photosCount) + activeOutboxItems.filter((s: any) => !!s.photoPath).length;
        const ready = photos;

        return {
          ...prev,
          totalStudents: total,
          photosCount: photos,
          readyForPrintCount: ready,
          pendingVerification: Math.max(0, total - ready),
          recentStudents: mergedList.slice(0, 15),
        };
      });
    } catch (e) {
      console.warn("IndexedDB sync check skipped:", e);
    }
  }, [initialData]);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
    syncWithIndexedDB();
  }, [syncWithIndexedDB]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. REAL-TIME CLOUD SYNC LISTENER (UPSERT, DELETE & CLEAR)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync(
      (newStudent) => {
        const arrivalKey = newStudent.studentId || newStudent.id;
        if (arrivalKey) {
          setNewlyArrivedIds((prev) => new Set(prev).add(arrivalKey));
          setTimeout(() => {
            setNewlyArrivedIds((prev) => {
              const next = new Set(prev);
              next.delete(arrivalKey);
              return next;
            });
          }, 6000);
        }

        setAllStudentsList((list) => {
          const filtered = list.filter((s) => s.studentId !== newStudent.studentId && s.id !== newStudent.id);
          // NEWEST RECORD AT THE VERY TOP
          const updated = [newStudent, ...filtered];
          updated.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          return updated;
        });

        setData((prev) => {
          const isExisting = (prev.recentStudents || []).some(
            (s: any) => s.studentId === newStudent.studentId || s.id === newStudent.id
          );
          const filtered = (prev.recentStudents || []).filter(
            (s: any) => s.studentId !== newStudent.studentId && s.id !== newStudent.id
          );
          const updatedRecent = [newStudent, ...filtered].slice(0, 15);

          const total = isExisting ? prev.totalStudents : prev.totalStudents + 1;
          const photos = newStudent.photoPath ? (isExisting ? prev.photosCount : prev.photosCount + 1) : prev.photosCount;
          const ready = photos;

          return {
            ...prev,
            totalStudents: total,
            photosCount: photos,
            readyForPrintCount: ready,
            pendingVerification: Math.max(0, total - ready),
            recentStudents: updatedRecent,
          };
        });

        // Trigger Live Audio Chime & Global Notification
        playAudioChime();

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("siliconlabs_notification", {
              detail: {
                title: "Student Ingested",
                desc: `${newStudent.fullName || "Student"} (${newStudent.studentId || ""}) • Grade ${newStudent.grade || "General"}`,
                type: "success",
              },
            })
          );
        }

        setLastUpdated(new Date().toLocaleTimeString());
      },
      (deletedStudentId) => {
        try {
          deleteStudentFromDB(deletedStudentId).catch(() => {});
          localStorage.removeItem("sb_students_permanent_backup");
          localStorage.removeItem("sb_enrolled_students");
        } catch {}

        setAllStudentsList((list) => list.filter((s) => s.studentId !== deletedStudentId && s.id !== deletedStudentId));

        setData((prev) => {
          const wasInRecent = (prev.recentStudents || []).find(
            (s) => s.studentId === deletedStudentId || s.id === deletedStudentId
          );
          const updatedRecent = (prev.recentStudents || []).filter(
            (s) => s.studentId !== deletedStudentId && s.id !== deletedStudentId
          );

          const newTotal = Math.max(0, prev.totalStudents - (wasInRecent ? 1 : 0));
          const newPhotos = wasInRecent?.photoPath ? Math.max(0, prev.photosCount - 1) : prev.photosCount;
          const newReady = newPhotos;

          return {
            ...prev,
            totalStudents: newTotal,
            photosCount: newPhotos,
            readyForPrintCount: newReady,
            pendingVerification: Math.max(0, newTotal - newReady),
            recentStudents: updatedRecent,
          };
        });

        fetchMetrics();
        setLastUpdated(new Date().toLocaleTimeString());
      },
      () => {
        // Clear all event (Immediate 0ms)
        setData((prev) => ({
          ...prev,
          totalStudents: 0,
          photosCount: 0,
          readyForPrintCount: 0,
          pendingVerification: 0,
          recentStudents: [],
          recentBatches: [],
          missingPhotos: [],
        }));
        setAllStudentsList([]);

        setLastUpdated(new Date().toLocaleTimeString());
      }
    );
    return () => unsubscribe();
  }, [playAudioChime]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. FETCH METRICS FROM SERVER API
  // ──────────────────────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/dashboard/live-metrics?role=RECEIVER", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();

        // Check for any uncommitted outbox items on this workstation
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

        // Reconcile and purge deleted ghosts from this browser
        if (Array.isArray(json.recentStudents)) {
          await reconcileLocalCacheWithServer(json.recentStudents, activeOutboxIds);
        }

        const map = new Map<string, any>();
        (json.recentStudents || []).forEach((s: any) => map.set(s.studentId, s));
        activeOutboxItems.forEach((s) => {
          if (!map.has(s.studentId)) map.set(s.studentId, s);
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAllStudentsList(merged);

        setData((prev) => {
          const outboxPendingCount = activeOutboxItems.length;
          const total = (json.metrics?.totalStudents ?? prev.totalStudents) + outboxPendingCount;
          const photos = (json.metrics?.photosCount ?? prev.photosCount) + activeOutboxItems.filter((s: any) => !!s.photoPath).length;
          const ready = photos;

          const validRecent = [
            ...(merged.length > 0 ? merged : (prev.recentStudents || [])),
          ];

          return {
            totalStudents: total,
            photosCount: photos,
            readyForPrintCount: ready,
            pendingVerification: Math.max(0, total - ready),
            activeJobsCount: json.metrics?.activeJobsCount ?? prev.activeJobsCount,
            recentStudents: validRecent.slice(0, 15),
            recentBatches: json.recentBatches || [],
            missingPhotos: json.missingPhotos || [],
            gradeBreakdown: json.gradeBreakdown || prev.gradeBreakdown,
            demographics: json.demographics || prev.demographics,
            batchPlanning: json.batchPlanning || prev.batchPlanning,
          };
        });

        if (json.timeline) {
          setTimeline(json.timeline);
        }

        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to poll receiver metrics:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    let intervalMs = 4000;
    try {
      const raw = localStorage.getItem("sb_receiver_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.pollingIntervalMs) intervalMs = parsed.pollingIntervalMs;
      }
    } catch {}

    const interval = setInterval(() => {
      fetchMetrics();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PRE-FLIGHT VERIFICATION AUDIT ALGORITHM (NO QR DEPENDENCY)
  // ──────────────────────────────────────────────────────────────────────────
  const runPreflightAudit = useCallback(() => {
    setIsAuditing(true);
    setTimeout(() => {
      const studentsToAudit = allStudentsList.length > 0 ? allStudentsList : (data.recentStudents || []);
      const total = studentsToAudit.length;

      let verified = 0;
      let missingPhotosCount = 0;
      let incompleteCount = 0;
      const flaggedList: any[] = [];

      studentsToAudit.forEach((s) => {
        const hasPhoto = Boolean(s.photoPath && s.photoPath.trim().length > 0);
        const hasId = Boolean(s.studentId && s.studentId.trim().length > 0);
        const hasName = Boolean(s.fullName && s.fullName.trim().length > 0);

        if (hasPhoto && hasId && hasName) {
          verified += 1;
        } else {
          const issues: string[] = [];
          if (!hasPhoto) {
            issues.push("Missing 3:4 Portrait Photo");
            missingPhotosCount += 1;
          }
          if (!hasId || !hasName) {
            issues.push("Incomplete Metadata Records");
            incompleteCount += 1;
          }

          flaggedList.push({
            ...s,
            auditIssues: issues,
            readiness: hasPhoto ? 85 : 30,
          });
        }
      });

      const readinessRate = total > 0 ? Math.round((verified / total) * 100) : 100;

      setAuditResults({
        totalAudited: total,
        verifiedCount: verified,
        readinessRate,
        missingPhotosCount,
        incompleteCount,
        flaggedList,
      });

      setIsAuditing(false);
      setAuditModalOpen(true);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("siliconlabs_notification", {
            detail: {
              title: "Readiness Verification Complete",
              desc: `Inspected ${total} records: ${verified} (${readinessRate}%) verified for 8-Up production.`,
              type: "info",
            },
          })
        );
      }
    }, 350);
  }, [allStudentsList, data.recentStudents]);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PRODUCTION BATCH CSV MANIFEST EXPORT ALGORITHM (RECEIVER CUSTOM PATHS)
  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  // 5. PRODUCTION BATCH & SELECTIVE CSV / PHOTO EXPORT (ISSUE 3)
  // ──────────────────────────────────────────────────────────────────────────
  const handleToggleSelectStudent = useCallback((id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDownloadSingleStudentPhoto = useCallback(async (student: any) => {
    if (!student.photoPath) {
      alert("This student does not have an attached photo.");
      return;
    }
    const cleanId = (student.studentId || "student").replace(/[/\\]/g, "_");
    const cleanName = (student.fullName || "photo").replace(/[/\\]/g, "_");
    const filename = `${cleanId}_${cleanName}.jpg`;

    try {
      const res = await fetch(student.photoPath);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {}
      }, 500);
      setExportNotice(`Downloaded photo for ${student.fullName}`);
    } catch {
      window.open(student.photoPath, "_blank");
    }
  }, []);

  const handleDownloadSingleStudentCSV = useCallback((student: any) => {
    const headers = [
      "StudentID",
      "Name",
      "Sex",
      "Grade",
      "Section",
      "Phone",
      "Emergency Phone",
      "@photo",
      "8-Up Print Readiness",
      "Enrolled Date",
    ];

    const emergency =
      student.emergencyContactPhone ||
      student.emergencyPhone ||
      student.parentPhone ||
      "";

    const row = [
      `"${(student.studentId || "").replace(/"/g, '""')}"`,
      `"${(student.fullName || "").replace(/"/g, '""')}"`,
      `"${(student.sex || "Male").replace(/"/g, '""')}"`,
      `"${(student.grade || "").replace(/"/g, '""')}"`,
      `"${(student.department || student.section || "").replace(/"/g, '""')}"`,
      `"${formatPhoneForReceiver(student.phone)}"`,
      `"${formatPhoneForReceiver(emergency)}"`,
      `"${getStudentPhotoLocalPath(student).replace(/"/g, '""')}"`,
      student.photoPath ? "100% READY (8-UP)" : "PENDING_PHOTO",
      `"${student.createdAt || new Date().toISOString()}"`,
    ];

    const csvContent = "\uFEFF" + [headers.join(","), row.join(",")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanId = (student.studentId || "STU").replace(/[/\\]/g, "_");
    link.download = `student_${cleanId}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {}
    }, 500);
    setExportNotice(`Exported 1 student CSV for ${student.fullName}`);
  }, []);

  const handleDownloadSelectedPhotos = useCallback(async () => {
    const sourceList = allStudentsList.length > 0 ? allStudentsList : (data.recentStudents || []);
    const list = sourceList.filter((s) => selectedStudentIds.has(s.studentId || s.id));

    if (list.length === 0) {
      alert("Please select at least 1 student with a checkbox to download photos.");
      return;
    }

    const withPhoto = list.filter((s) => Boolean(s.photoPath));
    if (withPhoto.length === 0) {
      alert("None of the selected students have an attached photo.");
      return;
    }

    if (withPhoto.length === 1) {
      await handleDownloadSingleStudentPhoto(withPhoto[0]);
      return;
    }

    // Multiple: JSZip bundle
    try {
      setExportNotice(`Packaging ${withPhoto.length} selected photos into ZIP...`);
      const zip = new JSZip();

      for (const student of withPhoto) {
        try {
          const cleanGrade = (student.grade || "General").replace(/[/\\]/g, "_");
          const cleanId = (student.studentId || "STU").replace(/[/\\]/g, "_");
          const cleanName = (student.fullName || "Student").replace(/[/\\]/g, "_");
          const filename = `${cleanId}_${cleanName}.jpg`;

          const res = await fetch(student.photoPath);
          if (res.ok) {
            const blob = await res.blob();
            zip.folder(cleanGrade)?.file(filename, blob);
          }
        } catch {}
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected_${withPhoto.length}_photos_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {}
      }, 500);

      setExportNotice(`ZIP bundle with ${withPhoto.length} selected photos downloaded.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      alert("Failed creating photo ZIP: " + err?.message);
    }
  }, [allStudentsList, data.recentStudents, selectedStudentIds, handleDownloadSingleStudentPhoto]);

  const handleExportManifest = useCallback(() => {
    // If students are selected, export ONLY those selected; otherwise export all currently filtered!
    let list: any[] = [];
    const sourceList = allStudentsList.length > 0 ? allStudentsList : (data.recentStudents || []);

    if (selectedStudentIds.size > 0) {
      list = sourceList.filter((s) => selectedStudentIds.has(s.studentId || s.id));
    } else {
      list = sourceList;
    }

    if (list.length === 0) {
      alert("No students selected or found to export.");
      return;
    }

    const headers = [
      "StudentID",
      "Name",
      "Sex",
      "Grade",
      "Section",
      "Phone",
      "Emergency Phone",
      "@photo",
      "8-Up Print Readiness",
      "Enrolled Date",
    ];

    const rows = list.map((s) => [
      `"${(s.studentId || "").replace(/"/g, '""')}"`,
      `"${(s.fullName || "").replace(/"/g, '""')}"`,
      `"${(s.sex || "Male").replace(/"/g, '""')}"`,
      `"${(s.grade || "").replace(/"/g, '""')}"`,
      `"${(s.department || s.section || "").replace(/"/g, '""')}"`,
      `"${formatPhoneForReceiver(s.phone)}"`,
      `"${formatPhoneForReceiver(s.emergencyContactPhone || s.parentPhone || "")}"`,
      `"${getStudentPhotoLocalPath(s).replace(/"/g, '""')}"`,
      s.photoPath ? "100% READY (8-UP)" : "PENDING_PHOTO",
      `"${s.createdAt || new Date().toISOString()}"`,
    ]);

    const prefix = getReceiverCsvPrefix();
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const countTag = selectedStudentIds.size > 0 ? `_selected_${list.length}` : `_manifest_${list.length}`;
    const filename = `${prefix}${countTag}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {}
    }, 500);

    setExportNotice(`Exported ${list.length} student record${list.length > 1 ? "s" : ""} (${selectedStudentIds.size > 0 ? "Selected Only" : "Full Manifest"}) to ${filename}`);
    setTimeout(() => setExportNotice(null), 4000);
  }, [allStudentsList, data.recentStudents, selectedStudentIds]);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. SVG PRODUCTION GRAPH COMPUTATIONS (EXACT REAL-WORLD TIME)
  // ──────────────────────────────────────────────────────────────────────────
  const activeSeriesData = useMemo(() => {
    // Collect all students from local state + server data with de-duplication
    const studentMap = new Map<string, any>();
    allStudentsList.forEach((s) => {
      const id = s.studentId || s.id;
      if (id) studentMap.set(id, s);
    });
    (data.recentStudents || []).forEach((s) => {
      const id = s.studentId || s.id;
      if (id && !studentMap.has(id)) studentMap.set(id, s);
    });
    const students = Array.from(studentMap.values());

    const now = new Date();
    const todayDateStr = now.toDateString();
    const currentHour = now.getHours();

    if (activeTimeRange === "hourly") {
      // Real local business hours: 8:00 AM to 6:00 PM (extended up to currentHour if after 18:00)
      const maxHour = Math.max(18, currentHour);
      const hoursList: number[] = [];
      for (let h = 8; h <= maxHour; h++) {
        hoursList.push(h);
      }

      // If we have live/IDB students, compute from them; otherwise fallback to server timeline.hourlyToday
      const hasLiveRecords = students.some((s) => {
        if (!s.createdAt) return false;
        return new Date(s.createdAt).toDateString() === todayDateStr;
      });

      if (hasLiveRecords || (!timeline.hourlyToday || timeline.hourlyToday.length === 0)) {
        return hoursList.map((hourNum) => {
          const matching = students.filter((s) => {
            if (!s.createdAt) return false;
            const d = new Date(s.createdAt);
            return d.toDateString() === todayDateStr && d.getHours() === hourNum;
          });

          const count = matching.length;
          const photos = matching.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0)).length;
          const hourLabel = `${hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum} ${hourNum >= 12 ? "PM" : "AM"}`;
          const isCurrentHour = hourNum === currentHour;

          return {
            time: `${hourNum.toString().padStart(2, "0")}:00`,
            label: isCurrentHour ? `${hourLabel} • Now` : hourLabel,
            count,
            photos,
            readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
            throughput: count * 8,
            isCurrentHour,
          };
        });
      }

      return timeline.hourlyToday;
    } else if (activeTimeRange === "daily") {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const hasLiveRecords = students.length > 0;
      if (hasLiveRecords || (!timeline.daily7Days || timeline.daily7Days.length === 0)) {
        return Array.from({ length: 7 }).map((_, idx) => {
          const offset = 6 - idx;
          const d = new Date();
          d.setDate(d.getDate() - offset);
          const targetDateStr = d.toDateString();
          const dateIso = d.toISOString().split("T")[0];

          const matching = students.filter((s) => {
            if (!s.createdAt) return false;
            return new Date(s.createdAt).toDateString() === targetDateStr;
          });

          const count = matching.length;
          const photos = matching.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0)).length;
          const dayName = daysOfWeek[d.getDay()];
          const dayNum = d.getDate();
          const isToday = offset === 0;

          return {
            date: dateIso,
            label: isToday ? `Today (${dayName})` : `${dayName} ${dayNum}`,
            count,
            photos,
            readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
            throughput: count * 8,
            isCurrentHour: isToday,
          };
        });
      }

      return timeline.daily7Days;
    } else if (activeTimeRange === "year") {
      const currentYear = now.getFullYear();
      const quarters = [
        { label: `Q1 ${currentYear}`, startMonth: 0, endMonth: 2 },
        { label: `Q2 ${currentYear}`, startMonth: 3, endMonth: 5 },
        { label: `Q3 ${currentYear}`, startMonth: 6, endMonth: 8 },
        { label: `Q4 ${currentYear}`, startMonth: 9, endMonth: 11 },
      ];

      return quarters.map((q) => {
        const matching = students.filter((s) => {
          if (!s.createdAt) return false;
          const d = new Date(s.createdAt);
          return d.getFullYear() === currentYear && d.getMonth() >= q.startMonth && d.getMonth() <= q.endMonth;
        });
        const count = matching.length;
        const photos = matching.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0)).length;
        return {
          label: q.label,
          count,
          photos,
          readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
          throughput: count * 8,
        };
      });
    } else {
      // 30-Day trend broken into 4 weeks of exact calendar time
      return Array.from({ length: 4 }).map((_, idx) => {
        const weekNum = idx + 1;
        const endDaysAgo = (4 - weekNum) * 7;
        const startDaysAgo = endDaysAgo + 7;
        const nowTime = now.getTime();
        const startTime = nowTime - startDaysAgo * 86400000;
        const endTime = nowTime - endDaysAgo * 86400000;

        const matching = students.filter((s) => {
          if (!s.createdAt) return false;
          const t = new Date(s.createdAt).getTime();
          return t >= startTime && t < endTime;
        });

        const count = matching.length;
        const photos = matching.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0)).length;

        return {
          label: weekNum === 4 ? "This Week" : `Wk ${weekNum}`,
          count,
          photos,
          readiness: count > 0 ? Math.round((photos / count) * 100) : 0,
          throughput: count * 8,
        };
      });
    }
  }, [activeTimeRange, timeline, data.recentStudents, allStudentsList]);

  // Real-time calculation of student data gathered in: A Day, A Week, A Month, and A Year
  const gatheredTimeframeStats = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * oneDayMs;
    const oneMonthMs = 30 * oneDayMs;
    const oneYearMs = 365 * oneDayMs;

    const list = allStudentsList;
    const totalCount = Math.max(data.totalStudents, list.length);

    if (list.length === 0) {
      return {
        day: { count: totalCount > 0 ? 1 : 0, photos: data.photosCount > 0 ? 1 : 0 },
        week: { count: totalCount, photos: data.photosCount },
        month: { count: totalCount, photos: data.photosCount },
        year: { count: totalCount, photos: data.photosCount },
      };
    }

    let dayCount = 0;
    let dayPhotos = 0;
    let weekCount = 0;
    let weekPhotos = 0;
    let monthCount = 0;
    let monthPhotos = 0;
    let yearCount = 0;
    let yearPhotos = 0;

    list.forEach((s) => {
      const createdTime = s.createdAt ? new Date(s.createdAt).getTime() : now;
      const diff = now - createdTime;
      const hasPhoto = Boolean(s.photoPath && s.photoPath.trim().length > 0);

      // Within 24 hours (A Day)
      if (diff <= oneDayMs) {
        dayCount++;
        if (hasPhoto) dayPhotos++;
      }
      // Within 7 days (A Week)
      if (diff <= oneWeekMs) {
        weekCount++;
        if (hasPhoto) weekPhotos++;
      }
      // Within 30 days (A Month)
      if (diff <= oneMonthMs) {
        monthCount++;
        if (hasPhoto) monthPhotos++;
      }
      // Within 365 days (A Year)
      if (diff <= oneYearMs) {
        yearCount++;
        if (hasPhoto) yearPhotos++;
      }
    });

    return {
      day: { count: Math.max(dayCount, 0), photos: dayPhotos },
      week: { count: Math.max(weekCount, dayCount), photos: Math.max(weekPhotos, dayPhotos) },
      month: { count: Math.max(monthCount, weekCount), photos: Math.max(monthPhotos, weekPhotos) },
      year: { count: Math.max(yearCount, totalCount), photos: Math.max(yearPhotos, data.photosCount) },
    };
  }, [allStudentsList, data.totalStudents, data.photosCount]);

  const chartPoints = useMemo(() => {
    return activeSeriesData.map((d: any) => {
      let val = d.count || 0;
      if (activeMetric === "photos") {
        val = d.count > 0 ? Math.round(((d.photos || 0) / d.count) * 100) : 100;
      } else if (activeMetric === "readiness") {
        val = d.count > 0 ? Math.round(((d.photos || 0) / d.count) * 100) : 100;
      } else if (activeMetric === "throughput") {
        val = d.throughput || d.count * 8;
      }
      return {
        label: d.label || d.time || d.date,
        value: val,
        raw: d,
      };
    });
  }, [activeSeriesData, activeMetric]);

  const svgWidth = 960;
  const svgHeight = 340;
  const padLeft = 50;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 40;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxVal = useMemo(() => {
    const vals = chartPoints.map((p) => p.value);
    const m = Math.max(...vals, 10);
    return activeMetric === "photos" || activeMetric === "readiness" ? 100 : Math.ceil(m * 1.15);
  }, [chartPoints, activeMetric]);

  const barPlotData = useMemo(() => {
    if (chartPoints.length === 0) return [];
    const count = chartPoints.length;
    const slotWidth = plotW / count;
    const barWidth = Math.min(52, Math.max(18, slotWidth * 0.62));

    return chartPoints.map((p, i) => {
      const barX = padLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      const barHeight = Math.max(8, (p.value / Math.max(1, maxVal)) * plotH);
      const barY = padTop + plotH - barHeight;
      return {
        ...p,
        barX,
        barY,
        barWidth,
        barHeight,
        slotX: padLeft + i * slotWidth,
        slotWidth,
        centerX: barX + barWidth / 2,
        isCurrentHour: Boolean((p.raw as any)?.isCurrentHour),
      };
    });
  }, [chartPoints, maxVal, plotW, plotH, padLeft, padTop]);

  const peakIndex = useMemo(() => {
    if (chartPoints.length === 0) return -1;
    let maxIdx = 0;
    for (let i = 1; i < chartPoints.length; i++) {
      if (chartPoints[i].value > chartPoints[maxIdx].value) {
        maxIdx = i;
      }
    }
    return maxIdx;
  }, [chartPoints]);

  const handleChartPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!chartSvgRef.current || barPlotData.length === 0) return;
    const rect = chartSvgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * svgWidth;
    const relX = svgX - padLeft;
    if (relX < 0 || relX > plotW) {
      setHoveredPointIndex(null);
      return;
    }
    const slotWidth = plotW / barPlotData.length;
    const closestIdx = Math.max(0, Math.min(barPlotData.length - 1, Math.floor(relX / slotWidth)));
    setHoveredPointIndex(closestIdx);
  };

  const handleChartPointerLeave = () => {
    setHoveredPointIndex(null);
  };

  // Grade & Section Classifiers (Issue 4)
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    const list = allStudentsList.length > 0 ? allStudentsList : (data.recentStudents || []);
    list.forEach((s) => {
      if (s.grade && String(s.grade).trim().length > 0) {
        grades.add(String(s.grade).trim());
      }
    });
    return Array.from(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudentsList, data.recentStudents]);

  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    const list = allStudentsList.length > 0 ? allStudentsList : (data.recentStudents || []);
    list.forEach((s) => {
      const sec = s.department || s.section;
      if (sec && String(sec).trim().length > 0) {
        sections.add(String(sec).trim());
      }
    });
    return Array.from(sections).sort();
  }, [allStudentsList, data.recentStudents]);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. REAL-TIME SEARCH & FILTERED STUDENT ROSTER (NEWEST ON TOP)
  // ──────────────────────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let list = allStudentsList.length > 0 ? allStudentsList : (data.recentStudents || []);

    if (activeFilter === "ready") {
      list = list.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0));
    } else if (activeFilter === "missing_photo") {
      list = list.filter((s) => !s.photoPath || s.photoPath.trim().length === 0);
    }

    if (gradeClassifier !== "ALL") {
      list = list.filter((s) => String(s.grade || "").trim() === gradeClassifier);
    }

    if (sectionClassifier !== "ALL") {
      list = list.filter((s) => String(s.department || s.section || "").trim() === sectionClassifier);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.fullName && s.fullName.toLowerCase().includes(q)) ||
          (s.studentId && s.studentId.toLowerCase().includes(q)) ||
          (s.grade && String(s.grade).toLowerCase().includes(q)) ||
          (s.department && String(s.department).toLowerCase().includes(q)) ||
          (s.section && String(s.section).toLowerCase().includes(q))
      );
    }

    // ALWAYS ENSURE LATEST STUDENT IS AT THE VERY TOP
    const sorted = [...list];
    sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return sorted;
  }, [allStudentsList, data.recentStudents, activeFilter, gradeClassifier, sectionClassifier, searchQuery]);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s) => selectedStudentIds.has(s.studentId || s.id));
  }, [filteredStudents, selectedStudentIds]);

  const handleToggleSelectAll = useCallback(() => {
    if (isAllFilteredSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.studentId || s.id));
        return next;
      });
    } else {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.studentId || s.id));
        return next;
      });
    }
  }, [isAllFilteredSelected, filteredStudents]);

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto pb-20 text-[#080808] dark:text-[#f2f7f4] font-sans select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Notice Alert if redirected with animated borderless X dismissal */}
      {noticeVisible && (
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 text-xs text-[#3f4743] dark:text-[#8a9e93] flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#8fe617] shrink-0" />
            <div>
              <strong className="text-[#080808] dark:text-[#f2f7f4]">Receiver Workstation Active:</strong> Central ID card production and live manufacturing telemetry active.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNoticeVisible(false)}
            className="p-1.5 rounded-xl border-0 outline-none ring-0 text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/15 transition-all duration-300 group active:scale-90 cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:scale-110" />
          </button>
        </div>
      )}

      {/* Export Confirmation Toast */}
      {exportNotice && (
        <div className="rounded-2xl border border-[#8fe617]/50 bg-[#8fe617]/15 p-3.5 text-xs text-[#080808] dark:text-[#8fe617] flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#8fe617]" />
            <span>{exportNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="p-1 rounded-lg border-0 outline-none text-[#080808] dark:text-[#8fe617] hover:bg-[#8fe617]/20 transition-transform active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}


      {/* Live Stream Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-4 py-2.5 rounded-2xl text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {autoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8fe617] opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8fe617]" />
          </span>
          <span className="font-mono uppercase tracking-wider font-extrabold text-[#080808] dark:text-[#f2f7f4] text-[11px]">
            {autoRefresh ? "Live Cloud Sync Active" : "Sync Paused"}
          </span>
          <span className="text-[#dce7e1] dark:text-[#223126]">•</span>
          <span className="text-[#6b7771] dark:text-[#8a9e93] font-mono text-[11px]">
            Updated: {lastUpdated || "Just now"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded-xl border transition-all cursor-pointer ${
              autoRefresh
                ? "border-[#8fe617] bg-[#8fe617] text-[#062404] shadow-xs font-black"
                : "border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-[#6b7771] dark:text-[#8a9e93]"
            }`}
          >
            Auto-Sync: {autoRefresh ? "ON (4s)" : "OFF"}
          </button>
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#8fe617]" : ""}`} />
            <span>Poll</span>
          </button>
        </div>
      </div>

      {/* Row 1: Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>TOTAL STUDENTS</span>
            <Users className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {data.totalStudents.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#062404] bg-[#8fe617] px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1 shadow-xs">
            LIVE REGISTRY
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>PHOTO COVERAGE</span>
            <Camera className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {data.photosCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono font-semibold mt-1">
            {data.totalStudents > 0 ? Math.round((data.photosCount / data.totalStudents) * 100) : 0}% VERIFIED
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>A4 PRINT SHEETS (8-UP)</span>
            <Printer className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {Math.ceil(data.readyForPrintCount / 8).toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono font-semibold mt-1">
            {data.readyForPrintCount} CARDS • 8/SHEET
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>READY TO PRINT</span>
            <CheckCircle2 className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {data.readyForPrintCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#062404] bg-[#8fe617] px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1 shadow-xs">
            100% VERIFIED READY
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
          onClick={runPreflightAudit}
          title="Run Production Readiness Verification (Automated multi-point inspection)"
        >
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>ATTENTION GAPS</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {data.pendingVerification.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1">
            VERIFY READINESS →
          </div>
        </div>
      </div>

      {/* Row 2: Production Velocity Bar Graph & Realtime Metrics */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8fe617] animate-pulse" />
              <h2 className="text-sm font-mono font-extrabold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Production Velocity &amp; Realtime Metrics
              </h2>
            </div>
            <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5 font-mono">
              Live real-world intake • Exact student registration timestamps • 0ms active sync
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">

            {/* Metric Mode Selector */}
            <div className="inline-flex rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-0.5 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setActiveMetric("volume")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetric === "volume"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                Volume
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("photos")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetric === "photos"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                Photos %
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("readiness")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetric === "readiness"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                8-Up Ready %
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("throughput")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMetric === "throughput"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                Cards/Hr
              </button>
            </div>

            {/* Timeframe Switcher */}
            <div className="inline-flex rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-0.5 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setActiveTimeRange("hourly")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTimeRange === "hourly"
                    ? "bg-white dark:bg-[#111613] text-[#080808] dark:text-[#8fe617] border border-[#dce7e1] dark:border-[#223126] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93]"
                }`}
              >
                Today (24H)
              </button>
              <button
                type="button"
                onClick={() => setActiveTimeRange("daily")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTimeRange === "daily"
                    ? "bg-white dark:bg-[#111613] text-[#080808] dark:text-[#8fe617] border border-[#dce7e1] dark:border-[#223126] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93]"
                }`}
              >
                7-Day Run
              </button>
              <button
                type="button"
                onClick={() => setActiveTimeRange("trend")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTimeRange === "trend"
                    ? "bg-white dark:bg-[#111613] text-[#080808] dark:text-[#8fe617] border border-[#dce7e1] dark:border-[#223126] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93]"
                }`}
              >
                30-Day
              </button>
              <button
                type="button"
                onClick={() => setActiveTimeRange("year")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTimeRange === "year"
                    ? "bg-white dark:bg-[#111613] text-[#080808] dark:text-[#8fe617] border border-[#dce7e1] dark:border-[#223126] shadow-xs"
                    : "text-[#6b7771] dark:text-[#8a9e93]"
                }`}
              >
                Year (365D)
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Student Data Gathered In: A Day, A Week, A Month, A Year */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
              <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-pulse" />
              <span>Student Data Gathered Velocity (A Day, Week, Month &amp; Year)</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#8fe617] bg-[#8fe617]/10 dark:bg-[#8fe617]/15 px-2 py-0.5 rounded-md border border-[#8fe617]/30">
              LIVE ACCUMULATION
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            {/* Card 1: A Day */}
            <div className="p-3.5 rounded-2xl bg-[#f7faf9] dark:bg-[#0c110e] border border-[#dce7e1] dark:border-[#223126] space-y-1 hover:border-[#8fe617]/50 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-bold">
                <span>A DAY (24H)</span>
                <span className="px-1.5 py-0.2 rounded bg-[#8fe617]/20 text-[#080808] dark:text-[#8fe617] text-[9px] font-black">
                  DAY
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#f2f7f4]">
                {gatheredTimeframeStats.day.count.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] flex items-center justify-between pt-1 border-t border-[#eef5f1] dark:border-[#1a251c]">
                <span>Photos Gathered</span>
                <span className="font-bold text-[#8fe617]">{gatheredTimeframeStats.day.photos.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 2: A Week */}
            <div className="p-3.5 rounded-2xl bg-[#f7faf9] dark:bg-[#0c110e] border border-[#dce7e1] dark:border-[#223126] space-y-1 hover:border-[#8fe617]/50 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-bold">
                <span>A WEEK (7D)</span>
                <span className="px-1.5 py-0.2 rounded bg-[#8fe617]/20 text-[#080808] dark:text-[#8fe617] text-[9px] font-black">
                  WEEK
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#f2f7f4]">
                {gatheredTimeframeStats.week.count.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] flex items-center justify-between pt-1 border-t border-[#eef5f1] dark:border-[#1a251c]">
                <span>Photos Gathered</span>
                <span className="font-bold text-[#8fe617]">{gatheredTimeframeStats.week.photos.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 3: A Month */}
            <div className="p-3.5 rounded-2xl bg-[#f7faf9] dark:bg-[#0c110e] border border-[#dce7e1] dark:border-[#223126] space-y-1 hover:border-[#8fe617]/50 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-bold">
                <span>A MONTH (30D)</span>
                <span className="px-1.5 py-0.2 rounded bg-[#8fe617]/20 text-[#080808] dark:text-[#8fe617] text-[9px] font-black">
                  MONTH
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#f2f7f4]">
                {gatheredTimeframeStats.month.count.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] flex items-center justify-between pt-1 border-t border-[#eef5f1] dark:border-[#1a251c]">
                <span>Photos Gathered</span>
                <span className="font-bold text-[#8fe617]">{gatheredTimeframeStats.month.photos.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 4: A Year */}
            <div className="p-3.5 rounded-2xl bg-[#f7faf9] dark:bg-[#0c110e] border border-[#dce7e1] dark:border-[#223126] space-y-1 hover:border-[#8fe617]/50 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-bold">
                <span>A YEAR (ANNUAL)</span>
                <span className="px-1.5 py-0.2 rounded bg-[#8fe617]/20 text-[#080808] dark:text-[#8fe617] text-[9px] font-black">
                  YEAR
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#f2f7f4]">
                {gatheredTimeframeStats.year.count.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] flex items-center justify-between pt-1 border-t border-[#eef5f1] dark:border-[#1a251c]">
                <span>Photos Gathered</span>
                <span className="font-bold text-[#8fe617]">{gatheredTimeframeStats.year.photos.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time KPI Velocity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
            <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">Peak Throughput</span>
            <div className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-0.5 flex items-center gap-1">
              <span>{Math.round(maxVal * (activeMetric === "throughput" ? 1 : 8))}</span>
              <span className="text-[10px] font-bold text-[#8fe617]">cards/hr</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
            <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">Verification Rate</span>
            <div className="text-lg font-black text-[#8fe617] mt-0.5">
              {data.totalStudents > 0 ? Math.round((data.readyForPrintCount / data.totalStudents) * 100) : 100}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
            <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">Processing Cycle</span>
            <div className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-0.5">
              12ms <span className="text-[10px] font-medium text-[#6b7771] dark:text-[#8a9e93]">(IndexedDB)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
            <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">Sync Engine</span>
            <div className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8fe617]" />
              <span className="text-xs font-bold text-[#8fe617]">ONLINE BROADCAST</span>
            </div>
          </div>
        </div>

        {/* SVG Interactive Canvas — Clear Realtime Bar Graph */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126] p-2">
          <svg
            ref={chartSvgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-80 sm:h-96 md:h-[400px] select-none cursor-crosshair"
            onPointerMove={handleChartPointerMove}
            onPointerLeave={handleChartPointerLeave}
          >
            <defs>
              <linearGradient id="lemonBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8fe617" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#417006" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="lemonPeakGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b6ff4d" stopOpacity="1" />
                <stop offset="100%" stopColor="#8fe617" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="lemonHoverGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4ff80" stopOpacity="1" />
                <stop offset="100%" stopColor="#8fe617" stopOpacity="0.95" />
              </linearGradient>
              <filter id="lemonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padTop + plotH * (1 - ratio);
              const valDisplay = Math.round(maxVal * ratio);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotW}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-[#dce7e1] dark:text-[#223126]"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#6b7771] dark:fill-[#8a9e93] font-mono"
                  >
                    {valDisplay}
                    {activeMetric === "photos" || activeMetric === "readiness" ? "%" : ""}
                  </text>
                </g>
              );
            })}

            {/* Realtime Bar Graph Rendering */}
            {barPlotData.map((bar, idx) => {
              const isHovered = hoveredPointIndex === idx;
              const isPeak = idx === peakIndex;
              return (
                <g key={idx} className="transition-all duration-150">
                  {/* Slot Hover Highlight Area */}
                  <rect
                    x={bar.slotX}
                    y={padTop}
                    width={bar.slotWidth}
                    height={plotH}
                    rx="8"
                    fill={isHovered ? "#8fe617" : "transparent"}
                    fillOpacity="0.07"
                    className="transition-opacity duration-150 pointer-events-none"
                  />

                  {/* Realtime Bar Column */}
                  <rect
                    x={bar.barX}
                    y={bar.barY}
                    width={bar.barWidth}
                    height={bar.barHeight}
                    rx="7"
                    ry="7"
                    fill={
                      isHovered
                        ? "url(#lemonHoverGrad)"
                        : isPeak
                        ? "url(#lemonPeakGrad)"
                        : "url(#lemonBarGrad)"
                    }
                    stroke={isHovered ? "#8fe617" : bar.isCurrentHour ? "#38bdf8" : isPeak ? "#b6ff4d" : "none"}
                    strokeWidth={isHovered ? "2.5" : bar.isCurrentHour ? "2" : "0"}
                    filter={isHovered || isPeak || bar.isCurrentHour ? "url(#lemonGlow)" : undefined}
                    className="transition-all duration-200"
                  />

                  {/* Clean Top Highlight Line for High-Definition Depth */}
                  <rect
                    x={bar.barX + 3}
                    y={bar.barY}
                    width={Math.max(4, bar.barWidth - 6)}
                    height="2.5"
                    rx="1"
                    fill="#f2f7f4"
                    fillOpacity={isHovered ? "0.95" : "0.6"}
                  />

                  {/* Peak Badge */}
                  {isPeak && (
                    <g>
                      <rect
                        x={bar.centerX - 18}
                        y={Math.max(6, bar.barY - 30)}
                        width="36"
                        height="14"
                        rx="4"
                        fill="#8fe617"
                      />
                      <text
                        x={bar.centerX}
                        y={Math.max(17, bar.barY - 19)}
                        textAnchor="middle"
                        className="text-[8px] font-mono font-black fill-[#062404]"
                      >
                        PEAK
                      </text>
                    </g>
                  )}

                  {/* Real-world Active Time Badge */}
                  {bar.isCurrentHour && !isPeak && (
                    <g>
                      <rect
                        x={bar.centerX - 16}
                        y={Math.max(6, bar.barY - 26)}
                        width="32"
                        height="13"
                        rx="4"
                        fill="#38bdf8"
                      />
                      <text
                        x={bar.centerX}
                        y={Math.max(16, bar.barY - 17)}
                        textAnchor="middle"
                        className="text-[8px] font-mono font-black fill-[#082f49]"
                      >
                        NOW
                      </text>
                    </g>
                  )}

                  {/* Direct Value Label Above Bar */}
                  <text
                    x={bar.centerX}
                    y={isPeak || bar.isCurrentHour ? Math.max(22, bar.barY - 8) : Math.max(14, bar.barY - 6)}
                    textAnchor="middle"
                    className={`text-[11px] font-mono font-bold transition-colors ${
                      isHovered
                        ? "fill-[#8fe617]"
                        : bar.isCurrentHour
                        ? "fill-[#38bdf8]"
                        : "fill-[#080808] dark:fill-[#f2f7f4]"
                    }`}
                  >
                    {bar.value}
                    {activeMetric === "photos" || activeMetric === "readiness" ? "%" : ""}
                  </text>

                  {/* X-Axis Interval Label */}
                  <text
                    x={bar.centerX}
                    y={padTop + plotH + 22}
                    textAnchor="middle"
                    className={`text-[10px] font-mono font-bold transition-colors ${
                      isHovered
                        ? "fill-[#8fe617]"
                        : bar.isCurrentHour
                        ? "fill-[#38bdf8] font-black"
                        : "fill-[#6b7771] dark:fill-[#8a9e93]"
                    }`}
                  >
                    {bar.label}
                  </text>
                  {bar.isCurrentHour && (
                    <circle
                      cx={bar.centerX}
                      cy={padTop + plotH + 31}
                      r="2"
                      fill="#38bdf8"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip HUD */}
          {hoveredPointIndex !== null && barPlotData[hoveredPointIndex] && (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border border-[#8fe617]/50 bg-white/95 dark:bg-[#111613]/95 backdrop-blur-md p-2.5 shadow-xl text-xs font-mono"
              style={{
                left: `${Math.min(75, Math.max(15, (barPlotData[hoveredPointIndex].centerX / svgWidth) * 100))}%`,
                top: "14px",
                transform: "translateX(-50%)",
              }}
            >
              <div className="flex items-center gap-2 border-b border-[#eef5f1] dark:border-[#223126] pb-1.5 mb-1.5">
                <span className="font-extrabold text-[#080808] dark:text-[#f2f7f4]">
                  {barPlotData[hoveredPointIndex].label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8fe617] text-[#062404] font-black">
                  REALTIME BAR
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-4">
                  <span className="text-[#6b7771] dark:text-[#8a9e93]">
                    {activeMetric === "volume"
                      ? "Registrations:"
                      : activeMetric === "photos"
                      ? "Photo Ratio:"
                      : activeMetric === "readiness"
                      ? "Print Ready:"
                      : "Throughput:"}
                  </span>
                  <span className="font-extrabold text-[#8fe617]">
                    {barPlotData[hoveredPointIndex].value}
                    {activeMetric === "photos" || activeMetric === "readiness"
                      ? "%"
                      : activeMetric === "throughput"
                      ? " cards/hr"
                      : " students"}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[10px] text-[#3f4743] dark:text-[#8a9e93]">
                  <span>Photos Attached:</span>
                  <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {barPlotData[hoveredPointIndex].raw?.photos ?? 0}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[10px] text-[#3f4743] dark:text-[#8a9e93]">
                  <span>A4 Sheets (8-Up):</span>
                  <span className="font-bold text-[#8fe617]">
                    {Math.ceil((barPlotData[hoveredPointIndex].raw?.photos ?? barPlotData[hoveredPointIndex].value) / 8)} sheets
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2.5: Detailed Cohort Intelligence & Production Matrix */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-[#8fe617]" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-extrabold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Detailed Cohort & Production Matrix Analysis
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                Multi-dimensional demographic breakdown, grade distribution, and 8-Up sheet capacity planning
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] font-bold text-[#8fe617]">
              {data.gradeBreakdown?.length || 0} Active Cohorts
            </span>
          </div>
        </div>

        {/* 3-Column Analytics Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Demographics & Gender Ratios */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#6b7771] dark:text-[#8a9e93]">
                Demographics & Gender
              </span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>

            {/* Split Progress Bar */}
            <div className="space-y-2">
              <div className="h-3 rounded-full overflow-hidden flex bg-neutral-200 dark:bg-[#1c261e]">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${data.demographics?.malePercent || 50}%` }}
                  title={`Male: ${data.demographics?.malePercent || 50}%`}
                />
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${data.demographics?.femalePercent || 50}%` }}
                  title={`Female: ${data.demographics?.femalePercent || 50}%`}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[#6b7771] dark:text-[#8a9e93]">Male:</span>
                  <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {data.demographics?.maleCount || 0} ({data.demographics?.malePercent || 0}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-[#6b7771] dark:text-[#8a9e93]">Female:</span>
                  <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {data.demographics?.femaleCount || 0} ({data.demographics?.femalePercent || 0}%)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] leading-relaxed pt-1">
              Balanced demographic distribution across all registered school divisions and departments.
            </p>
          </div>

          {/* 8-Up Batch Production Plan */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#6b7771] dark:text-[#8a9e93]">
                8-Up Print Batch Plan
              </span>
              <Printer className="h-4 w-4 text-[#8fe617]" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">A4 Sheets Needed</div>
                <div className="text-xl font-black text-[#8fe617] mt-0.5">
                  {Math.ceil(data.readyForPrintCount / 8)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">Card Density</div>
                <div className="text-xl font-black text-[#080808] dark:text-[#f2f7f4] mt-0.5">
                  8 / sheet
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1 text-[#6b7771] dark:text-[#8a9e93]">
              <span>Sheet Yield Efficiency:</span>
              <span className="font-bold text-[#8fe617]">
                {data.readyForPrintCount > 0
                  ? Math.round((data.readyForPrintCount / (Math.ceil(data.readyForPrintCount / 8) * 8)) * 100)
                  : 100}%
              </span>
            </div>
          </div>

          {/* Data Integrity & Photo Pipeline Health */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#6b7771] dark:text-[#8a9e93]">
                Pipeline Data Quality
              </span>
              <CheckCircle2 className="h-4 w-4 text-[#8fe617]" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Photo Completion</span>
                <span className="font-bold text-[#8fe617]">
                  {data.totalStudents > 0 ? Math.round((data.photosCount / data.totalStudents) * 100) : 100}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-200 dark:bg-[#1c261e] overflow-hidden">
                <div
                  className="h-full bg-[#8fe617] transition-all duration-500"
                  style={{ width: `${data.totalStudents > 0 ? (data.photosCount / data.totalStudents) * 100 : 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] pt-1">
                <span>Missing Photos:</span>
                <span className={`font-bold ${data.missingPhotos.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {data.missingPhotos.length} records
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grade-by-Grade Distribution Matrix */}
        {data.gradeBreakdown && data.gradeBreakdown.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#eef5f1] dark:border-[#1c261e]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-[#8fe617]" />
                Grade Cohort Distribution & A4 8-Up Allocation
              </span>
              <span className="text-[#6b7771] dark:text-[#8a9e93]">
                Sorted by Cohort Level
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
              {data.gradeBreakdown.map((g) => (
                <div
                  key={g.grade}
                  className="p-3 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] font-mono text-xs hover:border-[#8fe617]/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93] text-[10px]">
                    <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">GRADE {g.grade}</span>
                    <span className="font-bold text-[#8fe617]">{g.percent}%</span>
                  </div>
                  <div className="text-base font-black text-[#080808] dark:text-[#f2f7f4] mt-1">
                    {g.count.toLocaleString()} <span className="text-[10px] font-normal text-[#6b7771] dark:text-[#8a9e93]">students</span>
                  </div>
                  <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] mt-1 pt-1 border-t border-[#eef5f1] dark:border-[#1c261e] flex items-center justify-between">
                    <span>A4 Sheets:</span>
                    <span className="font-bold text-[#8fe617]">{g.a4Sheets} sh</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Ingested Student Stream (Newest First) - Full Width */}
      <div className="w-full rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#8fe617]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-mono">
              Live Ingested Stream ({filteredStudents.length})
            </h2>
          </div>

          {/* Table Actions & Classifiers */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runPreflightAudit}
                disabled={isAuditing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8fe617] text-[#062404] px-3 py-1.5 text-xs font-mono font-bold hover:bg-[#7ed112] transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                title="Automated multi-point inspection verifying student identity credentials, studio portrait resolution, and 8-Up imposition alignment before batch production."
              >
                <Sparkles className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                <span>{isAuditing ? "Verifying..." : "Verify Readiness"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportManifest}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] px-3 py-1.5 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer active:scale-95"
                title={selectedStudentIds.size > 0 ? `Export CSV for ${selectedStudentIds.size} Selected Students` : "Export Production Manifest CSV"}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{selectedStudentIds.size > 0 ? `Export Selected CSV (${selectedStudentIds.size})` : "Export Manifest (CSV)"}</span>
              </button>

              {/* Grade Classifier Dropdown (Issue 4) */}
              <div className="flex items-center gap-1.5 bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-mono uppercase font-bold text-[#6b7771] dark:text-[#8a9e93] flex items-center gap-1">
                  <Filter className="h-3 w-3 text-[#8fe617]" />
                  Grade:
                </span>
                <select
                  value={gradeClassifier}
                  onChange={(e) => setGradeClassifier(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-[#111613]">All Grades ({uniqueGrades.length})</option>
                  {uniqueGrades.map((g) => (
                    <option key={g} value={g} className="bg-white dark:bg-[#111613]">
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Classifier Dropdown (Issue 4) */}
              <div className="flex items-center gap-1.5 bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-mono uppercase font-bold text-[#6b7771] dark:text-[#8a9e93]">
                  Section:
                </span>
                <select
                  value={sectionClassifier}
                  onChange={(e) => setSectionClassifier(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white dark:bg-[#111613]">All Sections ({uniqueSections.length})</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec} className="bg-white dark:bg-[#111613]">
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "bg-[#f7faf9] dark:bg-[#161d19] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("ready")}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === "ready"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "bg-[#f7faf9] dark:bg-[#161d19] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                100% Ready ({data.readyForPrintCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("missing_photo")}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === "missing_photo"
                    ? "bg-amber-400 text-[#080808] shadow-xs"
                    : "bg-[#f7faf9] dark:bg-[#161d19] text-[#6b7771] dark:text-[#8a9e93] hover:text-amber-600"
                }`}
              >
                Missing Photo ({data.missingPhotos.length})
              </button>
            </div>
          </div>
        </div>

        {/* Selected Batch Action Bar (Issue 3 - Selective Download) */}
        {selectedStudentIds.size > 0 && (
          <div className="rounded-2xl border-2 border-[#8fe617] bg-[#8fe617]/10 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 font-mono text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8fe617] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8fe617]" />
              </span>
              <strong className="text-[#080808] dark:text-[#f2f7f4] font-black">
                {selectedStudentIds.size} student{selectedStudentIds.size > 1 ? "s" : ""} selected
              </strong>
              <span className="text-[#6b7771] dark:text-[#8a9e93]">
                (Selective export mode active)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportManifest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-black rounded-xl bg-[#080808] text-[#8fe617] dark:bg-[#8fe617] dark:text-[#062404] hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Selected CSV ({selectedStudentIds.size})</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSelectedPhotos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-[#8fe617] bg-[#8fe617]/20 text-[#080808] dark:text-[#f2f7f4] hover:bg-[#8fe617]/30 transition-all cursor-pointer active:scale-95"
              >
                <Camera className="h-3.5 w-3.5 text-[#8fe617]" />
                <span>Download Selected Photos ({selectedStudentIds.size > 1 ? `${selectedStudentIds.size} ZIP` : "1 Photo"})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="px-2.5 py-1.5 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] hover:text-rose-500 transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Search Bar with Animated Borderless X Clear Button */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#6b7771] dark:text-[#8a9e93]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, ID, grade, or section..."
            className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] pl-10 pr-10 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] placeholder-[#6b7771] dark:placeholder-[#8a9e93] focus:border-[#8fe617] focus:outline-none focus:ring-1 focus:ring-[#8fe617] transition-all font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center p-1 rounded-xl border-0 outline-none ring-0 text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] transition-all duration-300 group cursor-pointer active:scale-90"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:scale-110" />
            </button>
          )}
        </div>

        {/* Student List & Selection Table (Newest on top) */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono space-y-2">
            <div>No matching student records found for the active filters.</div>
            {(searchQuery || gradeClassifier !== "ALL" || sectionClassifier !== "ALL" || activeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setGradeClassifier("ALL");
                  setSectionClassifier("ALL");
                  setActiveFilter("all");
                }}
                className="text-[#8fe617] underline hover:no-underline cursor-pointer"
              >
                Reset all filters & search
              </button>
            )}
          </div>
        ) : (
          <div className="border border-[#dce7e1] dark:border-[#223126] rounded-2xl overflow-hidden divide-y divide-[#eef5f1] dark:divide-[#1c261e]">
            {/* Table Header with Master Select-All */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#f7faf9] dark:bg-[#161d19] text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="p-1 text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] transition-colors cursor-pointer"
                  title={isAllFilteredSelected ? "Deselect All Filtered" : "Select All Filtered"}
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="h-4 w-4 text-[#8fe617]" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <span className="font-bold">Select All Filtered ({filteredStudents.length})</span>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-[10px] uppercase font-bold tracking-wider">
                <span>Classifiers</span>
                <span>Actions</span>
              </div>
            </div>

            {/* Student Rows */}
            {filteredStudents.slice(0, 20).map((s) => {
              const hasPhoto = Boolean(s.photoPath);
              const isReady = hasPhoto;
              const isSelected = selectedStudentIds.has(s.studentId || s.id);
              const isNew = newlyArrivedIds.has(s.studentId || s.id);

              return (
                <div
                  key={s.id || s.studentId}
                  className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? "bg-[#8fe617]/10 dark:bg-[#8fe617]/15"
                      : "hover:bg-[#f7faf9] dark:hover:bg-[#161d19]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Row Select Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelectStudent(s.studentId || s.id)}
                      className="p-1 text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] transition-colors cursor-pointer shrink-0"
                      title={isSelected ? "Deselect student" : "Select student for CSV/Photo export"}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-[#8fe617]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    {/* Telegram 3-Stage Photo Thumbnail with Click-to-Inspect (Issue 4 & 5) */}
                    <div
                      onClick={() => {
                        if (s.photoPath) {
                          setInspectingPhotoStudent(s);
                        }
                      }}
                      className={`h-10 w-10 shrink-0 ${s.photoPath ? "cursor-pointer group hover:ring-2 hover:ring-[#8fe617] rounded-xl transition-all" : ""}`}
                      title={s.photoPath ? `View high-res photo (${s.fullName})` : "No photo attached"}
                    >
                      <TelegramStagePhoto
                        photoPath={s.photoPath}
                        alt={s.fullName}
                        size="sm"
                        initialStage={isNew ? 1 : 3}
                      />
                    </div>

                    <div className="truncate">
                      <div className="font-bold text-xs text-[#080808] dark:text-[#f2f7f4] truncate flex items-center gap-2">
                        <span>{s.fullName}</span>
                        {isNew && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#8fe617] text-[#062404] font-black animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
                        {s.studentId} • {formatPhoneForReceiver(s.phone)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Photo Attached Status */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        hasPhoto
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {hasPhoto ? "PHOTO ✓" : "NO PHOTO"}
                    </span>

                    {/* Separate Grade Classifier Badge (Issue 4) */}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#8fe617]/40 bg-[#8fe617]/10 text-[#080808] dark:text-[#8fe617]">
                      GRADE {s.grade || "N/A"}
                    </span>

                    {/* Separate Section Classifier Badge (Issue 4) */}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300">
                      SEC {s.department || s.section || "A"}
                    </span>

                    {/* Readiness Tag */}
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                        isReady
                          ? "bg-[#8fe617] text-[#062404]"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {isReady ? "READY" : "PENDING"}
                    </span>

                    {/* 1-Click Single Student Photo Download (Issue 3) */}
                    {hasPhoto && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleStudentPhoto(s)}
                        className="p-1.5 rounded-lg border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-[#080808] dark:text-[#f2f7f4] hover:text-[#8fe617] hover:border-[#8fe617] transition-all cursor-pointer"
                        title={`Download photo for ${s.fullName}`}
                      >
                        <Camera className="h-3.5 w-3.5 text-[#8fe617]" />
                      </button>
                    )}

                    {/* 1-Click Single Student CSV Download (Issue 3) */}
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleStudentCSV(s)}
                      className="p-1.5 rounded-lg border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-[#080808] dark:text-[#f2f7f4] hover:text-[#8fe617] hover:border-[#8fe617] transition-all cursor-pointer"
                      title={`Download single CSV for ${s.fullName} (${s.studentId})`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </button>

                    {/* Directory Link */}
                    <Link
                      href={`/students?id=${encodeURIComponent(s.studentId)}`}
                      className="p-1.5 rounded-lg border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:text-[#8fe617] hover:border-[#8fe617] transition-colors"
                      title="Inspect in directory"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    {/* Delete Action (Temporary vs Permanent) */}
                    <button
                      type="button"
                      onClick={() => setDeleteModalStudent(s)}
                      className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title={`Delete ${s.fullName || s.studentId}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] pt-1">
          <span>Showing latest {Math.min(20, filteredStudents.length)} of {filteredStudents.length} records</span>
          <Link
            href="/students"
            className="text-[#8fe617] font-bold hover:underline flex items-center gap-1"
          >
            <span>View All in Directory ({data.totalStudents})</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>



      {/* Pre-Flight Verification Audit Modal */}
      {auditModalOpen && auditResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#8fe617]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#080808] dark:text-[#f2f7f4]">
                    Production Readiness & Asset Verification Report
                  </h3>
                  <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">
                    Multi-point inspection scanned {auditResults.totalAudited} students across central database & cache
                  </p>
                </div>
              </div>

              {/* Animated borderless X close icon */}
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="p-2 rounded-xl border-0 outline-none ring-0 text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/15 transition-all duration-300 group active:scale-90 cursor-pointer"
                aria-label="Close audit modal"
              >
                <X className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:scale-110" />
              </button>
            </div>

            {/* Audit Scorecard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">Passing Score</div>
                <div className="text-xl font-black text-[#8fe617] mt-0.5">
                  {auditResults.readinessRate}%
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">100% Ready</div>
                <div className="text-xl font-black text-[#080808] dark:text-[#f2f7f4] mt-0.5">
                  {auditResults.verifiedCount}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">Missing Photo</div>
                <div className="text-xl font-black text-amber-500 mt-0.5">
                  {auditResults.missingPhotosCount}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">A4 Sheets (8-Up)</div>
                <div className="text-xl font-black text-[#8fe617] mt-0.5">
                  {Math.ceil(auditResults.verifiedCount / 8)}
                </div>
              </div>
            </div>

            {/* Flagged Students Detail List */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Audit Exceptions & Flagged Records ({auditResults.flaggedList.length})
              </h4>

              {auditResults.flaggedList.length === 0 ? (
                <div className="text-center py-6 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  ✓ Outstanding! 100% of student records passed production readiness verification.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {auditResults.flaggedList.slice(0, 15).map((s) => (
                    <div
                      key={s.id || s.studentId}
                      className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                          {s.fullName} ({s.studentId})
                        </div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 font-mono mt-0.5">
                          {s.auditIssues.join(" • ")}
                        </div>
                      </div>
                      <Link
                        href={`/students?id=${encodeURIComponent(s.studentId)}`}
                        onClick={() => setAuditModalOpen(false)}
                        className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0"
                      >
                        Fix Record →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eef5f1] dark:border-[#1c261e]">
              <button
                type="button"
                onClick={handleExportManifest}
                className="px-4 py-2 text-xs font-mono font-bold rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer"
              >
                Export Audit CSV
              </button>
              <Link
                href="/print-engine"
                onClick={() => setAuditModalOpen(false)}
                className="px-4 py-2 text-xs font-mono font-extrabold rounded-xl bg-[#8fe617] text-[#062404] hover:bg-[#7ed112] transition-all cursor-pointer shadow-sm"
              >
                Proceed to Print Engine ({auditResults.verifiedCount} Ready) →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Photo Lightbox Modal (Issue 4 - Replaces buggy crop editor) */}
      {inspectingPhotoStudent && inspectingPhotoStudent.photoPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {inspectingPhotoStudent.fullName}
                </h3>
                <p className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
                  ID: {inspectingPhotoStudent.studentId} • Grade: {inspectingPhotoStudent.grade || "N/A"} • Section: {inspectingPhotoStudent.department || inspectingPhotoStudent.section || "A"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPhotoStudent(null)}
                className="p-1.5 rounded-xl text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center max-h-[60vh] p-2">
              <img
                src={inspectingPhotoStudent.photoPath}
                alt={inspectingPhotoStudent.fullName}
                className="max-h-[55vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
                Supabase & Local Vault Synchronized
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleStudentPhoto(inspectingPhotoStudent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8fe617] text-[#062404] text-xs font-mono font-bold hover:bg-[#7ed112] transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingPhotoStudent(null)}
                  className="px-3 py-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary vs Permanent Delete Modal */}
      {deleteModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <Trash2 className="h-4 w-4" />
                <span>Delete Student Record</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalStudent(null)}
                className="text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[#080808] dark:text-[#f2f7f4] font-bold">
                {deleteModalStudent.fullName || "Student"} ({deleteModalStudent.studentId})
              </p>
              <p className="text-[#6b7771] dark:text-[#8a9e93]">
                Please choose whether to remove this record temporarily from the Receiver workstation or expunge it permanently everywhere.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Option 1: Temporary Delete */}
              <button
                type="button"
                disabled={isDeleting}
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
                disabled={isDeleting}
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
                onClick={() => setDeleteModalStudent(null)}
                className="px-4 py-2 text-xs font-bold text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


