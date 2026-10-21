import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
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
  TrendingUp,
  Layers,
  HeartPulse,
  Bus,
  MapPin,
  Calendar,
  Radio,
  UserCheck,
  Activity,
  Award
} from "lucide-react";
import JSZip from "jszip";
import { getStudents, updateStudent, deleteStudent, getCurrentUser, getAllSendersMetrics, SenderMetrics } from "@/lib/store";
import { Student } from "@/types";
import { getGradeDisplay, getCleanSection, getStudentBranch } from "@/lib/gradeUtils";

export const AdminDashboardPage: React.FC = () => {
  const [allStudentsList, setAllStudentsList] = useState<Student[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Deletion Modal State
  const [deleteModalStudent, setDeleteModalStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Time Range & Metrics for Graph
  const [activeTimeRange, setActiveTimeRange] = useState<"hourly" | "daily" | "trend" | "year">("hourly");
  const [activeMetric, setActiveMetric] = useState<"volume" | "photos" | "readiness" | "throughput">("volume");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  // Student Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Classifiers & Search
  const [gradeClassifier, setGradeClassifier] = useState<string>("ALL");
  const [sectionClassifier, setSectionClassifier] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "ready" | "missing_photo">("all");

  // Lightbox Modal
  const [inspectingPhotoStudent, setInspectingPhotoStudent] = useState<Student | null>(null);

  // Pre-Flight Audit Modal
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

  const [sendersList, setSendersList] = useState<SenderMetrics[]>([]);

  const loadData = useCallback(() => {
    const list = getStudents();
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setAllStudentsList((prev) => {
      if (prev.length === list.length && prev.length > 0) {
        if (
          prev[0]?.id === list[0]?.id &&
          prev[prev.length - 1]?.id === list[list.length - 1]?.id &&
          prev[0]?.photoPath === list[0]?.photoPath
        ) {
          return prev; // Reference stability: prevents re-rendering and data fluctuating!
        }
      }
      return list;
    });
    setSendersList((prev) => {
      const next = getAllSendersMetrics();
      if (
        prev.length === next.length &&
        prev.every(
          (p, i) =>
            p.total === next[i]?.total &&
            p.today === next[i]?.today &&
            p.status === next[i]?.status &&
            p.boundDeviceId === next[i]?.boundDeviceId
        )
      ) {
        return prev;
      }
      return next;
    });
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    loadData();
    const handleDataChange = () => loadData();
    window.addEventListener('studentbridge_datachange', handleDataChange);
    window.addEventListener('studentbridge_userchange', handleDataChange);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleDataChange);
      window.removeEventListener('studentbridge_userchange', handleDataChange);
    };
  }, [loadData]);

  // Polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleExecuteDelete = async (type: "TEMPORARY" | "PERMANENT") => {
    if (!deleteModalStudent) return;
    const target = deleteModalStudent;
    setIsDeleting(true);

    try {
      if (type === "TEMPORARY") {
        await deleteStudent(target.studentId || target.id, false);
        setExportNotice(`Student ${target.fullName || target.studentId} hidden from Receiver queue.`);
      } else {
        await deleteStudent(target.studentId || target.id, true);
        setExportNotice(`Student ${target.fullName || target.studentId} permanently expunged everywhere.`);
      }
      loadData();
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      alert("Error deleting student.");
    } finally {
      setIsDeleting(false);
      setDeleteModalStudent(null);
    }
  };

  const handleToggleSelectStudent = useCallback((id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalStudents = allStudentsList.length;
  const photosCount = allStudentsList.filter(s => Boolean(s.photoPath && s.photoPath.trim().length > 0)).length;
  const readyForPrintCount = photosCount;
  const pendingVerification = Math.max(0, totalStudents - readyForPrintCount);
  const missingPhotos = allStudentsList.filter(s => !s.photoPath || s.photoPath.trim().length === 0);

  // Demographics
  const demographics = useMemo(() => {
    let maleCount = 0;
    let femaleCount = 0;
    allStudentsList.forEach(s => {
      if ((s.sex || '').toLowerCase() === 'female') femaleCount++;
      else maleCount++;
    });
    return {
      maleCount,
      femaleCount,
      malePercent: totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0,
      femalePercent: totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0,
    };
  }, [allStudentsList, totalStudents]);

  // Timeframe stats: A Day, A Week, A Month, A Year - Anchored to Calendar Boundaries
  const gatheredTimeframeStats = useMemo(() => {
    const dNow = new Date();
    // Midnight start of today (00:00:00)
    const todayStart = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate()).getTime();
    // 7 days ago at midnight
    const weekStart = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() - 7).getTime();
    // 30 days ago at midnight
    const monthStart = new Date(dNow.getFullYear(), dNow.getMonth(), dNow.getDate() - 30).getTime();
    // Start of current calendar year
    const yearStart = new Date(dNow.getFullYear(), 0, 1).getTime();

    let dayCount = 0, dayPhotos = 0;
    let weekCount = 0, weekPhotos = 0;
    let monthCount = 0, monthPhotos = 0;
    let yearCount = 0, yearPhotos = 0;

    allStudentsList.forEach((s) => {
      let createdTime = 0;
      if (s.createdAt) {
        const parsed = new Date(s.createdAt).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          createdTime = parsed;
        }
      }
      const hasPhoto = Boolean(s.photoPath && s.photoPath.trim().length > 0);

      if (createdTime >= todayStart) {
        dayCount++;
        if (hasPhoto) dayPhotos++;
      }
      if (createdTime >= weekStart) {
        weekCount++;
        if (hasPhoto) weekPhotos++;
      }
      if (createdTime >= monthStart) {
        monthCount++;
        if (hasPhoto) monthPhotos++;
      }
      if (createdTime >= yearStart || createdTime === 0) {
        yearCount++;
        if (hasPhoto) yearPhotos++;
      }
    });

    return {
      day: { count: dayCount, photos: dayPhotos },
      week: { count: weekCount, photos: weekPhotos },
      month: { count: monthCount, photos: monthPhotos },
      year: { count: yearCount || totalStudents, photos: yearPhotos || photosCount },
    };
  }, [allStudentsList, totalStudents, photosCount]);

  // Graph Data Series
  const activeSeriesData = useMemo(() => {
    const now = new Date();
    const todayDateStr = now.toDateString();
    const currentHour = now.getHours();

    if (activeTimeRange === "hourly") {
      const hoursList: number[] = [];
      const maxHour = Math.max(18, currentHour);
      for (let h = 8; h <= maxHour; h++) hoursList.push(h);

      return hoursList.map((hourNum) => {
        const matching = allStudentsList.filter((s) => {
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
    } else if (activeTimeRange === "daily") {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return Array.from({ length: 7 }).map((_, idx) => {
        const offset = 6 - idx;
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const targetDateStr = d.toDateString();
        const dateIso = d.toISOString().split("T")[0];

        const matching = allStudentsList.filter((s) => {
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
    } else {
      return Array.from({ length: 4 }).map((_, idx) => {
        const weekNum = idx + 1;
        const endDaysAgo = (4 - weekNum) * 7;
        const startDaysAgo = endDaysAgo + 7;
        const nowTime = now.getTime();
        const startTime = nowTime - startDaysAgo * 86400000;
        const endTime = nowTime - endDaysAgo * 86400000;

        const matching = allStudentsList.filter((s) => {
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
  }, [activeTimeRange, allStudentsList]);

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
      if (chartPoints[i].value > chartPoints[maxIdx].value) maxIdx = i;
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

  // Classifiers for roster
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    allStudentsList.forEach(s => {
      if (s.grade && s.grade.trim()) grades.add(s.grade.trim());
    });
    return Array.from(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudentsList]);

  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    allStudentsList.forEach(s => {
      const sec = s.department || (s as any).section;
      if (sec && sec.trim()) sections.add(sec.trim());
    });
    return Array.from(sections).sort();
  }, [allStudentsList]);

  // Filtered roster stream
  const filteredStudents = useMemo(() => {
    return allStudentsList.filter((s) => {
      if (activeFilter === "ready" && (!s.photoPath || !s.photoPath.trim())) return false;
      if (activeFilter === "missing_photo" && s.photoPath && s.photoPath.trim().length > 0) return false;

      if (gradeClassifier !== "ALL") {
        const studentGrade = (s.grade || "").trim().toLowerCase();
        if (studentGrade !== gradeClassifier.toLowerCase()) return false;
      }

      if (sectionClassifier !== "ALL") {
        const studentSec = (s.department || (s as any).section || "").trim().toLowerCase();
        if (studentSec !== sectionClassifier.toLowerCase()) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const idMatch = (s.studentId || "").toLowerCase().includes(q);
        const nameMatch = (s.fullName || "").toLowerCase().includes(q);
        const phoneMatch = (s.phone || "").toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [allStudentsList, activeFilter, gradeClassifier, sectionClassifier, searchQuery]);

  // Pre-flight audit
  const runPreflightAudit = useCallback(() => {
    setIsAuditing(true);
    setTimeout(() => {
      const total = allStudentsList.length;
      let verified = 0;
      let missingPhotosCount = 0;
      let incompleteCount = 0;
      const flaggedList: any[] = [];

      allStudentsList.forEach((s) => {
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
    }, 350);
  }, [allStudentsList]);

  // Export handlers
  const handleDownloadSingleStudentPhoto = useCallback(async (student: Student) => {
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

  const handleDownloadSingleStudentCSV = useCallback((student: Student) => {
    const headers = [
      "StudentID", "Name", "Sex", "Grade", "Section", "Phone", "Emergency Phone", "@photo", "8-Up Print Readiness", "Enrolled Date"
    ];
    const row = [
      `"${(student.studentId || "").replace(/"/g, '""')}"`,
      `"${(student.fullName || "").replace(/"/g, '""')}"`,
      `"${(student.sex || "Male").replace(/"/g, '""')}"`,
      `"${(student.grade || "").replace(/"/g, '""')}"`,
      `"${(student.department || (student as any).section || "").replace(/"/g, '""')}"`,
      `"${student.phone || ""}"`,
      `"${student.emergencyContactPhone || ""}"`,
      `"${student.photoPath || ""}"`,
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
    const list = allStudentsList.filter((s) => selectedStudentIds.has(s.studentId || s.id));
    if (list.length === 0) {
      alert("Please select at least 1 student with a checkbox to download photos.");
      return;
    }
    const withPhoto = list.filter((s) => Boolean(s.photoPath));
    if (withPhoto.length === 0) {
      alert("None of the selected students have an attached photo.");
      return;
    }

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
  }, [allStudentsList, selectedStudentIds]);

  const handleExportManifest = useCallback(() => {
    let list = selectedStudentIds.size > 0
      ? allStudentsList.filter((s) => selectedStudentIds.has(s.studentId || s.id))
      : allStudentsList;

    if (list.length === 0) {
      alert("No students selected or found to export.");
      return;
    }

    const headers = [
      "StudentID", "Name", "Sex", "Grade", "Section", "Phone", "Emergency Phone", "@photo", "8-Up Print Readiness", "Enrolled Date"
    ];

    const rows = list.map((s) => [
      `"${(s.studentId || "").replace(/"/g, '""')}"`,
      `"${(s.fullName || "").replace(/"/g, '""')}"`,
      `"${(s.sex || "Male").replace(/"/g, '""')}"`,
      `"${(s.grade || "").replace(/"/g, '""')}"`,
      `"${(s.department || (s as any).section || "").replace(/"/g, '""')}"`,
      `"${s.phone || ""}"`,
      `"${s.emergencyContactPhone || ""}"`,
      `"${s.photoPath || ""}"`,
      s.photoPath ? "100% READY (8-UP)" : "PENDING_PHOTO",
      `"${s.createdAt || new Date().toISOString()}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `student_manifest_${list.length}_${new Date().toISOString().split("T")[0]}.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {}
    }, 500);

    setExportNotice(`Exported ${list.length} student records to ${filename}`);
    setTimeout(() => setExportNotice(null), 4000);
  }, [allStudentsList, selectedStudentIds]);

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto pb-20 text-[#080808] dark:text-[#f2f7f4] font-sans select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Notice Alert */}
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
            className="p-1.5 rounded-xl border-0 outline-none text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/15 transition-all duration-300 group cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
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
            onClick={loadData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#8fe617]" : ""}`} />
            <span>Poll</span>
          </button>
        </div>
      </div>

      {/* Row 1: Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>TOTAL STUDENTS</span>
            <Users className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {totalStudents.toLocaleString()}
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
            {photosCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono font-semibold mt-1">
            {totalStudents > 0 ? Math.round((photosCount / totalStudents) * 100) : 0}% VERIFIED
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>READY TO PRINT</span>
            <CheckCircle2 className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1.5">
            {readyForPrintCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#062404] bg-[#8fe617] px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1 shadow-xs">
            100% VERIFIED READY
          </div>
        </div>

        <div
          className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
          onClick={runPreflightAudit}
          title="Run Production Readiness Verification"
        >
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-bold font-mono">
            <span>UNRESOLVED ISSUES</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1.5">
            {pendingVerification}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold mt-1">
            {pendingVerification === 0 ? "100% READY" : "ACTION REQUIRED"}
          </div>
        </div>
      </div>

      {/* Detailed Cohort & Production Matrix Analysis */}

      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-5 w-5 text-[#8fe617]" />
            <div>
              <h2 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Detailed Cohort & Demographic Analysis
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono mt-0.5">
                School-bound and demographic breakdown with data ingestion telemetry
              </p>
            </div>
          </div>
        </div>

        {/* 2 Metric Cards: Demographics, Pipeline Data Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Demographics & Gender Ratios */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#6b7771] dark:text-[#8a9e93]">
                Demographics & Gender
              </span>
              <Users className="h-4 w-4 text-[#8fe617]" />
            </div>

            <div className="space-y-2">
              <div className="h-2.5 rounded-full bg-purple-500 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${demographics.malePercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[#6b7771] dark:text-[#8a9e93]">Male:</span>
                  <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {demographics.maleCount} ({demographics.malePercent}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-[#6b7771] dark:text-[#8a9e93]">Female:</span>
                  <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {demographics.femaleCount} ({demographics.femalePercent}%)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] leading-relaxed pt-1">
              Balanced demographic distribution across all registered school divisions and departments.
            </p>
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
                  {totalStudents > 0 ? Math.round((photosCount / totalStudents) * 100) : 100}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-200 dark:bg-[#1c261e] overflow-hidden">
                <div
                  className="h-full bg-[#8fe617] transition-all duration-500"
                  style={{ width: `${totalStudents > 0 ? (photosCount / totalStudents) * 100 : 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] pt-1">
                <span>Missing Photos:</span>
                <span className={`font-bold ${missingPhotos.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {missingPhotos.length} records
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Ingested Student Feed (Newest First) - Full Width */}
      <div className="w-full rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#8fe617]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-mono">
              Live Ingested Records ({filteredStudents.length})
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
              >
                <Sparkles className="h-3.5 w-3.5 text-[#062404]" />
                <span>Verify Readiness</span>
              </button>

              <button
                type="button"
                onClick={handleExportManifest}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-3 py-1.5 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV ({selectedStudentIds.size > 0 ? selectedStudentIds.size : "All"})</span>
              </button>

              {selectedStudentIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadSelectedPhotos}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#8fe617]/50 bg-[#8fe617]/15 hover:bg-[#8fe617]/25 text-[#080808] dark:text-[#8fe617] px-3 py-1.5 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Download {selectedStudentIds.size} Photos (ZIP)</span>
                </button>
              )}
            </div>

            {/* Classifiers & Search */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <select
                value={gradeClassifier}
                onChange={(e) => setGradeClassifier(e.target.value)}
                className="rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-2.5 py-1 text-xs text-[#080808] dark:text-[#f2f7f4] outline-none"
              >
                <option value="ALL">All Grades</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>

              <select
                value={sectionClassifier}
                onChange={(e) => setSectionClassifier(e.target.value)}
                className="rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-2.5 py-1 text-xs text-[#080808] dark:text-[#f2f7f4] outline-none"
              >
                <option value="ALL">All Sections</option>
                {uniqueSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#6b7771] dark:text-[#8a9e93]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] pl-8 pr-3 py-1 text-xs text-[#080808] dark:text-[#f2f7f4] outline-none focus:border-[#8fe617] w-36 sm:w-48"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Student Ingested Rows */}
        {filteredStudents.length === 0 ? (
          <div className="p-10 text-center text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] border border-dashed border-[#dce7e1] dark:border-[#223126] rounded-2xl">
            No students found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-[#eef5f1] dark:divide-[#1c261e] border border-[#dce7e1] dark:border-[#223126] rounded-2xl overflow-hidden bg-white dark:bg-[#111613]">
            {filteredStudents.slice(0, 20).map((s) => {
              const isSelected = selectedStudentIds.has(s.studentId || s.id);
              const hasPhoto = Boolean(s.photoPath && s.photoPath.trim().length > 0);
              const isReady = hasPhoto;

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
                    <button
                      type="button"
                      onClick={() => handleToggleSelectStudent(s.studentId || s.id)}
                      className="p-1 text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] transition-colors cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-[#8fe617]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    <div
                      onClick={() => {
                        if (s.photoPath) setInspectingPhotoStudent(s);
                      }}
                      className={`h-10 w-10 shrink-0 ${s.photoPath ? "cursor-pointer group hover:ring-2 hover:ring-[#8fe617] rounded-xl transition-all" : ""}`}
                    >
                      {s.photoPath ? (
                        <img
                          src={s.photoPath}
                          alt={s.fullName}
                          className="h-10 w-10 object-cover rounded-xl border border-neutral-700 bg-neutral-900"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
                          {s.fullName?.charAt(0) || "S"}
                        </div>
                      )}
                    </div>

                    <div className="truncate">
                      <div className="font-bold text-xs text-[#080808] dark:text-[#f2f7f4] truncate flex items-center gap-2">
                        <span>{s.fullName}</span>
                      </div>
                      <div className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
                        {s.studentId} • {s.school || 'YMS'} ({getStudentBranch(s)}) • {s.phone || "No phone"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        hasPhoto
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {hasPhoto ? "PHOTO ✓" : "NO PHOTO"}
                    </span>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#8fe617]/40 bg-[#8fe617]/10 text-[#080808] dark:text-[#8fe617]">
                      GRADE {getGradeDisplay(s)}
                    </span>

                    {getCleanSection(s) && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300">
                        SEC {getCleanSection(s)}
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                        isReady
                          ? "bg-[#8fe617] text-[#062404]"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {isReady ? "READY" : "PENDING"}
                    </span>

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

                    <button
                      type="button"
                      onClick={() => handleDownloadSingleStudentCSV(s)}
                      className="p-1.5 rounded-lg border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-[#080808] dark:text-[#f2f7f4] hover:text-[#8fe617] hover:border-[#8fe617] transition-all cursor-pointer"
                      title={`Download single CSV for ${s.fullName}`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </button>

                    <Link
                      to={`/receiver/students`}
                      className="p-1.5 rounded-lg border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:text-[#8fe617] hover:border-[#8fe617] transition-colors"
                      title="Inspect in directory"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

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
            to="/receiver/students"
            className="text-[#8fe617] font-bold hover:underline flex items-center gap-1"
          >
            <span>View All in Directory ({totalStudents})</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Pre-Flight Verification Audit Modal */}
      {auditModalOpen && auditResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-[#8fe617]" />
                <h3 className="text-base font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  Production Readiness & Asset Verification Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="p-1.5 rounded-xl text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">Total Audited</div>
                <div className="text-xl font-black text-[#080808] dark:text-[#f2f7f4] mt-1">
                  {auditResults.totalAudited.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">Ready For Print</div>
                <div className="text-xl font-black text-[#8fe617] mt-1">
                  {auditResults.verifiedCount.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">Readiness Rate</div>
                <div className="text-xl font-black text-[#8fe617] mt-1">
                  {auditResults.readinessRate}%
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126]">
                <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">Missing Photos</div>
                <div className={`text-xl font-black mt-1 ${auditResults.missingPhotosCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {auditResults.missingPhotosCount}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eef5f1] dark:border-[#1c261e]">
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="px-4 py-2 text-xs font-mono font-bold rounded-xl border border-[#dce7e1] dark:border-[#223126] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {inspectingPhotoStudent && inspectingPhotoStudent.photoPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {inspectingPhotoStudent.fullName}
                </h3>
                <p className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
                  ID: {inspectingPhotoStudent.studentId} • Grade: {inspectingPhotoStudent.grade || "N/A"} • Section: {inspectingPhotoStudent.department || (inspectingPhotoStudent as any).section || "A"}
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
                Supabase & Cloudflare R2 Synchronized
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
};
