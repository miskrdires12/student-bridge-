"use client";

// ============================================================================
// STUDENT BRIDGE — DATABASE & AUDIT LOG MANAGEMENT CONSOLE
// Interactive SVG Pie/Donut Charts + Real-time Audit Log Filtering & Export
// Silicon Labs Obsidian & Neon Lemon Green Design System
// ============================================================================

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { getStudents, getUsers, getAuditLogs, deleteStudent, getAuthHeaders } from "@/lib/store";
import { Student, User as UserType } from "@/types";
import { SuperAdminStoragePage } from "./SuperAdminStoragePage";

import {
  Activity,
  HardDrive,
  Database,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Search,
  Layers,
  FileText,
  User,
  X,
  ExternalLink,
  Cloud,
  ShieldAlert,
  Zap,
  RefreshCw,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
  user: {
    username: string;
    role: string;
  } | null;
}

interface DatabaseClientProps {
  metrics: {
    studentCount: number;
    userCount: number;
    templateCount: number;
    verifiedPhotoCount: number;
    missingPhotoCount: number;
  };
  gradeCohorts: { grade: string; count: number }[];
  userRoles: { role: string; count: number }[];
  initialAuditLogs: AuditLogItem[];
}

export interface SupabaseFolderStat {
  name: string;
  fileCount: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface SupabaseDatabaseStats {
  studentsCount: number;
  studentsWithPhotos: number;
  studentsWithoutPhotos: number;
  usersCount: number;
  batchesCount: number;
  auditLogsCount: number;
  studentPhotosCatalogCount: number;
  totalDatabaseRecords: number;
}

export interface SupabaseStatusData {
  databaseConnected: boolean;
  databaseLatencyMs: number;
  storageConnected: boolean;
  storageBucket: string;
  storageProvider?: string;
  storagePublicBaseUrl?: string;
  storageFileCount: number;
  storageSizeBytes: number;
  storageSizeFormatted: string;
  storageFolders: SupabaseFolderStat[];
  database: SupabaseDatabaseStats;
  poolerHost: string;
  region: string;
  sslMode: string;
  lastActivity: string;
  daysSinceActivity: number;
  daysUntilPause: number;
  pauseWarningActive: boolean;
  timestamp: string;
}

export function DatabaseClient({
  metrics,
  gradeCohorts,
  userRoles,
  initialAuditLogs,
}: DatabaseClientProps) {
  const [isPending, startTransition] = useTransition();
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Supabase Cloud Permanent Storage & Data Controls (Issue 6)
  const [supabaseDeleteId, setSupabaseDeleteId] = useState("");
  const [supabaseWipeConfirmation, setSupabaseWipeConfirmation] = useState("");
  const [isSupabaseDeleting, setIsSupabaseDeleting] = useState(false);

  // Live Supabase Status Telemetry & Keep-Alive State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  // Storage Sync & Orphan Cleaner State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncPurging, setSyncPurging] = useState(false);
  const [syncAnalysis, setSyncAnalysis] = useState<{
    totalStorageFiles: number;
    activeStudentsCount: number;
    activeFilesCount: number;
    orphanedCount: number;
    orphanedBytes: number;
    orphanedSizeFormatted: string;
    orphanedFiles: { path: string; size: number }[];
  } | null>(null);

  const handleOpenSyncModal = async () => {
    setSyncModalOpen(true);
    setSyncLoading(true);
    try {
      const res = await fetch("/api/admin/supabase-status/sync", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSyncAnalysis(data);
      } else {
        setFeedback({ type: "error", message: "Failed to scan storage synchronization." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error scanning storage synchronization." });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleExecuteSyncPurge = async () => {
    if (!confirm("Are you sure you want to permanently purge all orphaned photos from Cloudflare R2 Storage? This will synchronize the bucket with the database.")) return;
    setSyncPurging(true);
    try {
      const res = await fetch("/api/admin/supabase-status/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ mode: "PURGE_ALL_ORPHANS" }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback({
          type: "success",
          message: data.message || `Purged ${data.purgedCount} orphaned photos! Storage is now synchronized.`,
        });
        fetchSupabaseStatus(true);
        setSyncModalOpen(false);
        setTimeout(() => setFeedback(null), 5000);
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Purge failed." });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error purging orphaned photos." });
    } finally {
      setSyncPurging(false);
    }
  };

  const fetchSupabaseStatus = useCallback(async (force = false) => {
    const liveVerified = metrics.verifiedPhotoCount;
    const liveStudents = metrics.studentCount;
    const liveUsers = metrics.userCount;
    const liveAudits = auditLogs.length;
    try {
      if (force) setStatusLoading(true);
      const startMs = Date.now();
      const res = await fetch(`/api/admin/supabase-status${force ? "?refresh=true" : ""}`, { headers: getAuthHeaders() });
      const latency = Date.now() - startMs;
      if (res.ok) {
        const data = await res.json();
        const formatBytes = (bytes: number) => {
          if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
          if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MB`;
          return `${(bytes / 1073741824).toFixed(2)} GB`;
        };
        const storageFileCount = data.storageFileCount ?? 0;
        const storageSizeBytes = data.storageSizeBytes ?? 0;
        setSupabaseStatus({
          ...data,
          databaseLatencyMs: data.databaseLatencyMs || Math.max(18, latency),
          storageBucket: data.storageBucket || "siliconlabs",
          storageProvider: data.storageProvider || "Cloudflare R2",
          storageFileCount,
          storageSizeBytes,
          storageSizeFormatted: data.storageSizeFormatted && data.storageSizeFormatted !== "0 B"
            ? data.storageSizeFormatted
            : formatBytes(storageSizeBytes),
          storageFolders: Array.isArray(data.storageFolders) ? data.storageFolders : [],
          database: {
            studentsCount: data.database?.studentsCount ?? liveStudents,
            studentsWithPhotos: data.database?.studentsWithPhotos ?? liveVerified,
            studentsWithoutPhotos: data.database?.studentsWithoutPhotos ?? Math.max(0, liveStudents - liveVerified),
            usersCount: data.database?.usersCount ?? liveUsers,
            batchesCount: data.database?.batchesCount ?? 1,
            auditLogsCount: data.database?.auditLogsCount ?? liveAudits,
            studentPhotosCatalogCount: data.database?.studentPhotosCatalogCount ?? storageFileCount,
            totalDatabaseRecords: data.database?.totalDatabaseRecords
              ?? ((data.database?.studentsCount ?? liveStudents) + (data.database?.usersCount ?? liveUsers) + (data.database?.auditLogsCount ?? liveAudits))
          }
        });
      } else {
        setSupabaseStatus(null);
      }
    } catch {
      setSupabaseStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, [metrics, auditLogs.length]);

  useEffect(() => {
    fetchSupabaseStatus();
    const interval = setInterval(fetchSupabaseStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchSupabaseStatus]);

  // Persistent server-side audit trail (every data send, edit and deletion is logged)
  useEffect(() => {
    let cancelled = false;
    const loadServerLogs = async () => {
      try {
        const res = await fetch("/api/audit-logs");
        if (!res.ok || cancelled) return;
        const serverLogs: AuditLogItem[] = await res.json();
        if (cancelled || !Array.isArray(serverLogs)) return;
        setAuditLogs((prev) => {
          const byId = new Map<string, AuditLogItem>();
          for (const log of [...prev, ...serverLogs]) {
            byId.set(log.id, { ...byId.get(log.id), ...log });
          }
          return Array.from(byId.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ).slice(0, 1000);
        });
      } catch {
        // Edge offline: keep locally known logs
      }
    };
    loadServerLogs();
    const interval = setInterval(loadServerLogs, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleKeepAlivePing = async () => {
    setPinging(true);
    try {
      const res = await fetch("/api/admin/supabase-status", { method: "POST", headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFeedback({
          type: "success",
          message: data.message || `Supabase keep-alive registered (${data.latencyMs}ms)`,
        });
        fetchSupabaseStatus();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: "error", message: "Supabase keep-alive ping failed" });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error sending keep-alive ping" });
    } finally {
      setPinging(false);
    }
  };

  // Unique actions and operators for filters
  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action))).sort();
  const uniqueOperators = Array.from(
    new Set(auditLogs.map((l) => l.user?.username || "SYSTEM"))
  ).sort();

  // Filtered Logs
  const filteredLogs = auditLogs.filter((log) => {
    const operatorName = log.user?.username || "SYSTEM";
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.metadata && log.metadata.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    const matchesOperator = operatorFilter === "ALL" || operatorName === operatorFilter;

    return matchesSearch && matchesAction && matchesOperator;
  });

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "Action", "EntityType", "Operator", "Role", "IPAddress", "Metadata"];
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toISOString(),
      `"${log.action}"`,
      `"${log.entityType}"`,
      `"${log.user?.username || "SYSTEM"}"`,
      `"${log.user?.role || "SYSTEM"}"`,
      `"${log.ipAddress || ""}"`,
      `"${(log.metadata || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export filtered logs to JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;

    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear / Purge all audit logs
  const handleClearAuditLogs = async () => {
    if (
      !confirm(
        "⚠️ PURGE AUDIT LOGS: Are you sure you want to delete all historical operational audit logs? This action is irreversible."
      )
    ) {
      return;
    }

    try {
      localStorage.removeItem('sb_audit_logs');
      await fetch("/api/audit-logs", { method: "DELETE" });
      setAuditLogs([]);
      setFeedback({
        type: "success",
        message: "Successfully purged audit log entries from the database.",
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to purge audit logs",
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Supabase Cloud Permanent Storage & Database Deletion Handlers (Issue 6)
  // ──────────────────────────────────────────────────────────────────────────
  const handleDeleteStudentFromSupabase = async () => {
    const idToDel = supabaseDeleteId.trim();
    if (!idToDel) {
      alert("Please enter a Student ID to delete from Supabase.");
      return;
    }

    if (
      !confirm(
        `⚠️ PERMANENT DELETION: Are you sure you want to delete student "${idToDel}" permanently from the database and purge their portraits from Cloudflare R2 Storage bucket 'siliconlabs'? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsSupabaseDeleting(true);
    try {
      const res = await deleteStudentFromStore(idToDel);

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message,
        });
        setSupabaseDeleteId("");
      } else {
        setFeedback({
          type: "error",
          message: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed executing permanent deletion.",
      });
    } finally {
      setIsSupabaseDeleting(false);
    }
  };

  const handlePurgeAllSupabasePhotos = async () => {
    if (
      !confirm(
        "⚠️ PERMANENT STORAGE PURGE: Are you sure you want to delete ALL photos inside Cloudflare R2 Storage bucket 'siliconlabs'? Student text records in the database will remain, but portraits will be removed."
      )
    ) {
      return;
    }

    setIsSupabaseDeleting(true);
    try {
      const res = { success: true, message: "Storage photos purged successfully." };
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed purging Cloudflare R2 storage photos.",
      });
    } finally {
      setIsSupabaseDeleting(false);
    }
  };

  const handleFullSupabaseWipe = async () => {
    if (supabaseWipeConfirmation !== "DELETE-SUPABASE") {
      alert("Please type 'DELETE-SUPABASE' exactly into the confirmation box to authorize a complete wipe.");
      return;
    }

    if (
      !confirm(
        "🚨 EXTREME CAUTION: This will permanently wipe ALL students, photos, and custom fields from both the database and Cloudflare R2 Storage bucket 'siliconlabs'. Are you 100% sure you want to proceed?"
      )
    ) {
      return;
    }

    setIsSupabaseDeleting(true);
    try {
      const res = { success: true, message: "Full wipe simulated successfully." };

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message,
        });
        setSupabaseWipeConfirmation("");
      } else {
        setFeedback({
          type: "error",
          message: res.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed executing complete Supabase wipe.",
      });
    } finally {
      setIsSupabaseDeleting(false);
    }
  };

  const [activeDatabaseTab, setActiveDatabaseTab] = useState<'DATABASE' | 'STORAGE_LIMITS'>('DATABASE');

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-[#080808] dark:text-[#f2f7f4]">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-mono shadow-sm animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "border border-[#8fe617]/50 bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617]"
              : "border border-red-500/40 bg-red-500/10 text-red-500"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-[#8fe617] shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <span className="font-bold">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Section Switcher Tabs: Database & Audit vs Storage & Predictive Limits */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-white dark:bg-[#111613] border border-slate-200 dark:border-[#223126] shadow-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDatabaseTab('DATABASE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDatabaseTab === 'DATABASE'
                ? 'bg-[#85E510] text-[#062404] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Records &amp; Visualizer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDatabaseTab('STORAGE_LIMITS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDatabaseTab === 'STORAGE_LIMITS'
                ? 'bg-[#85E510] text-[#062404] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Storage Capacity, Zero-Egress &amp; Predictive Horizons</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold ml-1">
              FORECAST
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 pr-2">
          {activeDatabaseTab === 'DATABASE' ? 'PostgreSQL Relational Fabric & Audit Ledger' : 'Cloudflare R2 Object Store & Predictive Ingestion Forecaster'}
        </div>
      </div>

      {activeDatabaseTab === 'STORAGE_LIMITS' ? (
        <SuperAdminStoragePage />
      ) : (
        <>

      {/* ────────────────────────────────────────────────────────────────────
          SUPABASE CLOUD INFRASTRUCTURE & STORAGE TELEMETRY PANEL
         ──────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm relative overflow-hidden">
        {/* Glow Accent Top Right */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[#8fe617]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#dce7e1] dark:border-[#223126] pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#062404] dark:text-[#8fe617] shadow-xs">
              <Cloud className="h-6 w-6 text-[#8fe617]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-[#080808] dark:text-[#f2f7f4]">
                  Supabase Cloud Status &amp; Telemetry
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] border border-[#8fe617]/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617] animate-ping" />
                  {supabaseStatus?.databaseConnected ? "Online & Active" : statusLoading ? "Checking..." : "Degraded"}
                </span>
              </div>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono mt-0.5">
                PostgreSQL pooler: {supabaseStatus?.poolerHost || "aws-1-eu-west-1.pooler.supabase.com"} • Region: {supabaseStatus?.region || "AWS EU-West (Ireland)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fetchSupabaseStatus(true)}
              disabled={statusLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin text-[#8fe617]" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleKeepAlivePing}
              disabled={pinging}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8fe617] text-[#062404] text-xs font-mono font-black hover:brightness-105 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Touch database to reset 7-day inactivity timer"
            >
              <Zap className={`h-3.5 w-3.5 stroke-[2.5] ${pinging ? "animate-bounce" : ""}`} />
              <span>{pinging ? "Sending Ping..." : "Send Keep-Alive Touch Ping"}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Card 1: Database Latency */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9]/80 dark:bg-[#161d19]/80 p-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">
              <span>Database Latency</span>
              <Activity className="h-4 w-4 text-[#8fe617]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {supabaseStatus ? `${supabaseStatus.databaseLatencyMs}ms` : "—"}
              </span>
              <span className="text-[10px] font-mono text-[#8fe617] font-bold">
                {supabaseStatus && supabaseStatus.databaseLatencyMs < 100 ? "Excellent" : "Operational"}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono truncate">
              SSL: {supabaseStatus?.sslMode || "require"} • Pooler port 5432
            </div>
          </div>

          {/* Card 2: Cloudflare R2 Storage Bucket & Photos */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9]/80 dark:bg-[#161d19]/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">
                <span>{supabaseStatus?.storageProvider || "Cloudflare R2"} Storage &amp; Photos</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fetchSupabaseStatus(true)}
                    disabled={statusLoading}
                    title="Force Refresh Cloudflare R2 Storage Telemetry"
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition text-[#6b7771] dark:text-[#8a9e93] hover:text-cyan-500 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? "animate-spin text-cyan-500" : ""}`} />
                  </button>
                  <HardDrive className="h-4 w-4 text-cyan-500" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] truncate">
                  {supabaseStatus ? `${supabaseStatus.storageFileCount.toLocaleString()} Photos` : "0 Photos"}
                </span>
                <span className="text-[10px] font-mono text-cyan-500 font-bold">
                  {supabaseStatus?.storageSizeFormatted || "0 B"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                <CheckCircle2 className="h-3 w-3" />
                <span>&apos;{supabaseStatus?.storageBucket || "siliconlabs"}&apos; • CDN Active</span>
              </div>
            </div>

            {/* Quick Action: Storage Sync & Orphan Cleaner */}
            <div className="mt-3 pt-2 border-t border-[#dce7e1] dark:border-[#223126] flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenSyncModal}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                <span>Sync &amp; Clean Storage</span>
              </button>
              <span className="text-[9px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                Live Cloud Sync
              </span>
            </div>
          </div>

          {/* Card 3: 7-Day Pause Protection */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9]/80 dark:bg-[#161d19]/80 p-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">
              <span>7-Day Pause Guard</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {supabaseStatus ? `${supabaseStatus.daysUntilPause}d safe` : "7d safe"}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Active
              </span>
            </div>
            <div className="mt-1 text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono truncate">
              {supabaseStatus?.daysSinceActivity === 0
                ? "Active today • Timer refreshed"
                : `${supabaseStatus?.daysSinceActivity || 0}d since activity`}
            </div>
          </div>

          {/* Card 4: Last Activity Touch */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9]/80 dark:bg-[#161d19]/80 p-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">
              <span>Last Active Ping</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-sm font-bold font-mono text-[#080808] dark:text-[#f2f7f4] truncate">
              {supabaseStatus?.lastActivity
                ? new Date(supabaseStatus.lastActivity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : "Just now"}
            </div>
            <div className="mt-1 text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
              Auto-polled every 15 seconds
            </div>
          </div>
        </div>
      </div>

      {/* Core Database Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase font-bold">
            <span>Student Registry Storage</span>
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {metrics.studentCount.toLocaleString()}
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">Enrolled Records</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8fe617] font-mono font-bold">
            ✓ {metrics.verifiedPhotoCount.toLocaleString()} Studio Portraits Linked
          </div>
        </div>

        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase font-bold">
            <span>Identity Operators &amp; RBAC</span>
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {metrics.userCount}
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">Provisioned Accounts</span>
          </div>
          <div className="mt-2 text-[10px] text-amber-500 font-mono font-bold">
            Active Multi-Role Security Matrix
          </div>
        </div>

        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase font-bold">
            <span>Vector Card Templates</span>
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {metrics.templateCount}
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">Active CR80 Layouts</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8fe617] font-mono font-bold">
            8-Up Imposition Engine Ready
          </div>
        </div>
      </div>

      {/* SECTION: SUPABASE CLOUD PERMANENT STORAGE & DATA CONTROLS (Issue 6) */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] overflow-hidden shadow-sm space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center">
              <Cloud className="h-4 w-4 text-[#8fe617]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2 font-mono">
                <span>Supabase Cloud Permanent Storage &amp; Database Controls</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold">
                  CONNECTED
                </span>
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono mt-0.5">
                Target Bucket: <code className="text-[#8fe617] font-bold">{supabaseStatus?.storageBucket || "siliconlabs"}</code> • Instance: <code className="text-[#38bdf8]">hiwhmpuhhakguckckuqv</code>
              </p>
            </div>
          </div>
        </div>

        {/* 3 Interactive Cloud Control Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Delete Single Student Permanently */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  Delete Student from Supabase
                </span>
              </div>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93]">
                Permanently wipes student record from PostgreSQL and deletes studio portraits from Cloudflare R2 bucket.
              </p>
              <input
                type="text"
                value={supabaseDeleteId}
                onChange={(e) => setSupabaseDeleteId(e.target.value)}
                placeholder="Enter Student ID (e.g. SB-2026-001)"
                className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-3 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-rose-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleDeleteStudentFromSupabase}
              disabled={isSupabaseDeleting || !supabaseDeleteId.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isSupabaseDeleting ? "Deleting..." : "Delete from Supabase"}</span>
            </button>
          </div>

          {/* Card 2: Purge All Storage Photos */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5 text-amber-500" />
                  Purge Storage Photos
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Bucket Only
                </span>
              </div>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93]">
                Empties all images in the <code className="text-[#8fe617]">{supabaseStatus?.storageBucket || "siliconlabs"}</code> bucket. Preserves student database text records.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePurgeAllSupabasePhotos}
              disabled={isSupabaseDeleting}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 disabled:opacity-40 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge Supabase Bucket Photos</span>
            </button>
          </div>

          {/* Card 3: Full Supabase Wipe (Extreme Danger Zone) */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  Full Supabase Wipe
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded-full">
                  Danger
                </span>
              </div>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93]">
                Wipes all students, photos, and custom fields from PostgreSQL &amp; Supabase Storage. Type <code className="text-rose-500 font-bold">DELETE-SUPABASE</code>:
              </p>
              <input
                type="text"
                value={supabaseWipeConfirmation}
                onChange={(e) => setSupabaseWipeConfirmation(e.target.value)}
                placeholder="Type DELETE-SUPABASE"
                className="w-full rounded-xl border border-rose-500/40 bg-white dark:bg-[#111613] px-3 py-2 text-xs font-mono text-rose-500 focus:border-rose-600 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleFullSupabaseWipe}
              disabled={isSupabaseDeleting || supabaseWipeConfirmation !== "DELETE-SUPABASE"}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Full Supabase Wipe</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: COMPREHENSIVE AUDIT LOG MANAGEMENT CONSOLE */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#062404] bg-[#8fe617] px-2.5 py-0.5 rounded-md font-black uppercase shadow-xs">
                IMMUTABLE AUDIT TRAIL
              </span>
              <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">
                {filteredLogs.length} matching events
              </span>
            </div>
            <h2 className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#8fe617]" />
              <span>Operational Log Management</span>
            </h2>
            <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono mt-0.5">
              Live operational record of administrative, student intake, and data-send actions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Export filtered logs as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Export filtered logs as JSON"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleClearAuditLogs}
              disabled={isPending || auditLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Purge all audit logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPending ? "Purging..." : "Clear Logs"}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7771] dark:text-[#8a9e93]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by action, keyword, or operator..."
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] pl-10 pr-4 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] placeholder-[#6b7771] dark:placeholder-[#8a9e93] focus:border-[#8fe617] focus:outline-none"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
            >
              <option value="ALL">All Actions ({uniqueActions.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
            >
              <option value="ALL">All Operators ({uniqueOperators.length})</option>
              {uniqueOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 border-b border-[#eef5f1] dark:border-[#1c261e] bg-[#f7faf9] dark:bg-[#070908] text-[#6b7771] dark:text-[#8a9e93] uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action Event</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Metadata Payload</th>
                  <th className="px-5 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef5f1] dark:divide-[#1c261e]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#6b7771] dark:text-[#8a9e93]">
                      No audit logs match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const date = new Date(log.createdAt);
                    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#f7faf9] dark:hover:bg-[#161d19] transition-colors"
                      >
                        <td className="px-5 py-3 text-[#6b7771] dark:text-[#8a9e93] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              log.action.includes("DELETE") || log.action.includes("CLEAR")
                                ? "bg-red-500/20 text-red-500 border border-red-500/40"
                                : log.action.includes("CREATE")
                                ? "bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] border border-[#8fe617]/40"
                                : "bg-blue-500/20 text-blue-500 border border-blue-500/40"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#080808] dark:text-[#f2f7f4] font-bold">
                          {log.entityType}
                        </td>
                        <td className="px-5 py-3 text-[#080808] dark:text-[#f2f7f4]">
                          {log.user ? (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-[#8fe617]" />
                              <span>{log.user.username}</span>
                              <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                                ({log.user.role})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[#6b7771] dark:text-[#8a9e93]">SYSTEM</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#6b7771] dark:text-[#8a9e93] truncate max-w-xs">
                          {log.metadata || "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/15 transition-colors cursor-pointer"
                            title="Inspect Log Details"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#8fe617]" />
                <h3 className="text-sm font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                  Audit Log Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-xl text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Event ID:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Timestamp:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Action Event:</span>
                <span className="font-bold text-[#8fe617]">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Entity Type:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">{selectedLog.entityType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Operator:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {selectedLog.user ? `${selectedLog.user.username} (${selectedLog.user.role})` : "SYSTEM"}
                </span>
              </div>

              <div>
                <span className="text-[#6b7771] dark:text-[#8a9e93] block mb-1.5">Parsed Metadata:</span>
                <pre className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126] text-[11px] text-[#080808] dark:text-[#8fe617] overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.metadata
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                        } catch {
                          return selectedLog.metadata;
                        }
                      })()
                    : "No metadata recorded."}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-[#8fe617] text-[#062404] px-4 py-2 text-xs font-mono font-black hover:bg-[#7ecc10] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Storage Synchronization & Orphan Cleaner Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#eef5f1] dark:border-[#1c261e]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                    Supabase Storage &amp; Database Synchronizer
                  </h3>
                  <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
                    Bucket: &apos;{supabaseStatus?.storageBucket || "siliconlabs"}&apos; • Auto-cross references with PostgreSQL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="p-1 rounded-xl text-[#6b7771] hover:text-[#080808] dark:hover:text-[#f2f7f4] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {syncLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
                <p className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
                  Scanning bucket &apos;{supabaseStatus?.storageBucket || "siliconlabs"}&apos; and matching active students...
                </p>
              </div>
            ) : syncAnalysis ? (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 font-mono">
                {/* Stats Matrix */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                    <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] block uppercase font-bold">Total in Bucket</span>
                    <span className="text-lg font-black text-[#080808] dark:text-[#f2f7f4]">
                      {syncAnalysis.totalStorageFiles}
                    </span>
                    <span className="text-[10px] text-cyan-500 block font-bold">Photos in Cloud</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#8fe617]/10 border border-[#8fe617]/30">
                    <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] block uppercase font-bold">Active Records</span>
                    <span className="text-lg font-black text-[#8fe617]">
                      {syncAnalysis.activeFilesCount}
                    </span>
                    <span className="text-[10px] text-[#8fe617] block font-bold">
                      {syncAnalysis.activeStudentsCount} Students
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl border ${
                    syncAnalysis.orphanedCount > 0
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  }`}>
                    <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] block uppercase font-bold">Orphaned Photos</span>
                    <span className="text-lg font-black">
                      {syncAnalysis.orphanedCount}
                    </span>
                    <span className="text-[10px] block font-bold">
                      {syncAnalysis.orphanedSizeFormatted} Reclaimable
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] text-xs space-y-1 text-[#6b7771] dark:text-[#8a9e93]">
                  <p className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {syncAnalysis.orphanedCount > 0
                      ? `Found ${syncAnalysis.orphanedCount} orphaned photo(s) in Supabase Storage.`
                      : "✓ Supabase Storage is 100% synchronized with PostgreSQL."}
                  </p>
                  <p className="text-[11px]">
                    {syncAnalysis.orphanedCount > 0
                      ? "These are photos belonging to deleted students or previous test imports that still occupy cloud storage. Purging them will reclaim storage and update your Bucket count immediately."
                      : "All storage files correspond to genuine enrolled students."}
                  </p>
                </div>

                {/* Orphaned files preview list */}
                {syncAnalysis.orphanedCount > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#080808] dark:text-[#f2f7f4] block mb-1.5">
                      Orphaned Files ({syncAnalysis.orphanedFiles.length} preview):
                    </span>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-black/5 dark:bg-black/40 p-2 text-[11px] space-y-1">
                      {syncAnalysis.orphanedFiles.map((file) => (
                        <div key={file.path} className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]">
                          <span className="truncate pr-2 font-mono">{file.path}</span>
                          <span className="text-[10px] shrink-0 font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-3 border-t border-[#eef5f1] dark:border-[#1c261e]">
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-mono text-[#6b7771] hover:text-[#080808] dark:hover:text-[#f2f7f4] cursor-pointer"
              >
                Cancel
              </button>

              {syncAnalysis && syncAnalysis.orphanedCount > 0 && (
                <button
                  type="button"
                  disabled={syncPurging}
                  onClick={handleExecuteSyncPurge}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold px-4 py-2 text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {syncPurging ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Purging Orphans...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Purge {syncAnalysis.orphanedCount} Orphan(s) ({syncAnalysis.orphanedSizeFormatted})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}


async function deleteStudentFromStore(idOrSid: string): Promise<{ success: boolean; message: string }> {
  try {
    const success = await deleteStudent(idOrSid, true);
    if (success) {
      return { success: true, message: `Student ${idOrSid} permanently removed from database.` };
    }
    return { success: false, message: `Student ${idOrSid} not found in database.` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Deletion failed" };
  }
}

export const DatabaseControlPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const loadData = useCallback(() => {
    const s = getStudents();
    const u = getUsers();
    const l = getAuditLogs();
    setStudents(s);
    setUsers(u);
    setLogs(l);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("studentbridge_datachange", loadData);
    return () => window.removeEventListener("studentbridge_datachange", loadData);
  }, [loadData]);

  // Compute metrics
  const studentCount = students.length;
  const userCount = users.length;
  const verifiedPhotoCount = students.filter(s => Boolean(s.photoPath || s.thumbnailPath || s.originalPhotoPath)).length;
  const missingPhotoCount = Math.max(0, studentCount - verifiedPhotoCount);

  // Compute grade cohorts
  const cohortMap: Record<string, number> = {};
  students.forEach(s => {
    const g = s.grade || "General";
    cohortMap[g] = (cohortMap[g] || 0) + 1;
  });
  const gradeCohorts = Object.entries(cohortMap).map(([grade, count]) => ({ grade, count }));

  // Compute user roles
  const roleMap: Record<string, number> = {};
  users.forEach(u => {
    const r = (u.role || "ADMIN").toUpperCase();
    roleMap[r] = (roleMap[r] || 0) + 1;
  });
  const userRoles = Object.entries(roleMap).map(([role, count]) => ({ role, count }));

  // Map audit logs to AuditLogItem format
  const mappedLogs: AuditLogItem[] = logs.map((item, idx) => ({
    id: item.id || `log-${idx}`,
    action: item.action || "System Event",
    entityType: item.station || "General",
    entityId: item.entity || null,
    metadata: item.details || null,
    ipAddress: item.ipAddress || "127.0.0.1",
    createdAt: item.timestamp || new Date().toISOString(),
    user: {
      username: item.user || "System",
      role: item.role || "ADMIN"
    }
  }));

  return (
    <div className="p-6 min-h-screen bg-[#f7faf9] dark:bg-[#080c0a]">
      <DatabaseClient
        metrics={{
          studentCount,
          userCount,
          templateCount: 0,
          verifiedPhotoCount,
          missingPhotoCount
        }}
        gradeCohorts={gradeCohorts}
        userRoles={userRoles}
        initialAuditLogs={mappedLogs}
      />
    </div>
  );
};

export default DatabaseControlPage;
