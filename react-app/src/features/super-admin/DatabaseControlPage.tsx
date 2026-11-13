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
  PageShell,
  PageHero,
  FactGrid,
  FactCard,
  SectionCard,
  Chip,
  ToolbarButton,
  PrimaryButton,
} from "@/components/ui/PageKit";

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
  Camera,
  ShieldAlert,
  Lock,
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


  const [activeDatabaseTab, setActiveDatabaseTab] = useState<'DATABASE' | 'STORAGE_LIMITS'>('DATABASE');

  return (
    <PageShell className="mx-auto max-w-7xl">
      <PageHero
        icon={Database}
        title="Database Control"
        count={`${metrics.studentCount.toLocaleString()} records`}
        live="Live console"
        subtitle="Read the PostgreSQL row store, the audit ledger and the Cloudflare R2 object store from one console. Destructive actions are logged."
        actions={
          <>
            <ToolbarButton icon={RefreshCw} onClick={() => fetchSupabaseStatus(true)} disabled={statusLoading}>
              {statusLoading ? "Refreshing…" : "Refresh"}
            </ToolbarButton>
            <PrimaryButton icon={Zap} onClick={handleKeepAlivePing} disabled={pinging}>
              {pinging ? "Pinging…" : "Keep-alive ping"}
            </PrimaryButton>
          </>
        }
      >
        <FactGrid cols={5}>
          <FactCard label="Registry records" value={metrics.studentCount.toLocaleString()} hint="students on this station" icon={Database} />
          <FactCard label="Portraits linked" value={metrics.verifiedPhotoCount.toLocaleString()} hint="photos resolved to a student" icon={Camera} />
          <FactCard label="Operators" value={metrics.userCount.toLocaleString()} hint="provisioned accounts" icon={User} />
          <FactCard label="Missing photos" value={Math.max(0, metrics.studentCount - metrics.verifiedPhotoCount).toLocaleString()} hint="records without a portrait" icon={AlertTriangle} />
          <FactCard label="R2 storage" value={supabaseStatus?.storageSizeFormatted || "—"} hint={`${supabaseStatus?.storageFileCount ?? 0} objects`} icon={HardDrive} />
        </FactGrid>
      </PageHero>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs shadow-sm animate-in fade-in duration-150 ${
 feedback.type === "success"
 ? "border border-[#85E510]/50 bg-[#85E510]/15 text-[#062404]"
 : "border border-red-500/40 bg-red-500/10 text-red-500"
 }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-[#85E510] shrink-0" />
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
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E3EFD7] bg-white p-1.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDatabaseTab('DATABASE')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
              activeDatabaseTab === 'DATABASE'
                ? 'bg-[#85E510] text-[#062404] shadow-sm'
                : 'text-[#4B5B42] hover:bg-[#F6FAEF]'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Records &amp; audit ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDatabaseTab('STORAGE_LIMITS')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
              activeDatabaseTab === 'STORAGE_LIMITS'
                ? 'bg-[#85E510] text-[#062404] shadow-sm'
                : 'text-[#4B5B42] hover:bg-[#F6FAEF]'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Storage capacity &amp; forecast</span>
            <Chip tone="neutral">forecast</Chip>
          </button>
        </div>

        <div className="px-2 text-[11px] font-medium text-[#8A9680]">
          {activeDatabaseTab === 'DATABASE' ? 'PostgreSQL row store & audit ledger' : 'Cloudflare R2 object store'}
        </div>
      </div>

      {activeDatabaseTab === 'STORAGE_LIMITS' ? (
        <SuperAdminStoragePage />
      ) : (
        <>

      <SectionCard
        icon={Cloud}
        title="Cloud status & telemetry"
        subtitle={`PostgreSQL row store over the pooler · ${supabaseStatus?.region || "AWS EU-West"}`}
        actions={
          <>
            <Chip tone={supabaseStatus?.databaseConnected ? 'lime' : 'amber'}>
              {supabaseStatus?.databaseConnected ? 'Online' : statusLoading ? 'Checking' : 'Degraded'}
            </Chip>
            <PrimaryButton icon={Sparkles} onClick={handleOpenSyncModal}>
              Sync &amp; clean storage
            </PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <FactCard
            label="DB latency"
            value={supabaseStatus ? `${supabaseStatus.databaseLatencyMs}ms` : "—"}
            hint={`SSL ${supabaseStatus?.sslMode || "require"} · port 5432`}
            icon={Activity}
          />
          <FactCard
            label="R2 objects"
            value={(supabaseStatus?.storageFileCount ?? 0).toLocaleString()}
            hint={supabaseStatus?.storageSizeFormatted || "0 B"}
            icon={HardDrive}
          />
          <FactCard
            label="Pause guard"
            value={
              !supabaseStatus
                ? "—"
                : (supabaseStatus.daysUntilPause ?? 0) >= 1000
                  ? "No pause"
                  : `${supabaseStatus.daysUntilPause}d safe`
            }
            hint={
              !supabaseStatus
                ? "telemetry unavailable"
                : supabaseStatus.daysSinceActivity === 0
                  ? "active today"
                  : `${supabaseStatus.daysSinceActivity ?? 0}d since activity`
            }
            icon={ShieldCheck}
          />
          <FactCard
            label="Last ping"
            value={
              supabaseStatus?.lastActivity
                ? new Date(supabaseStatus.lastActivity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "—"
            }
            hint="auto-polled every 15s"
            icon={Clock}
          />
        </div>
      </SectionCard>

      {/* SECTION: SUPABASE CLOUD PERMANENT STORAGE & DATA CONTROLS (Issue 6) */}
      <SectionCard
        icon={Cloud}
        title="Permanent storage & database controls"
        subtitle={`Bucket ${supabaseStatus?.storageBucket || "siliconlabs"} · instance hiwhmpuhhakguckckuqv`}
        actions={<Chip tone="lime">Connected</Chip>}
      >
        {/* 3 Interactive Cloud Control Operations */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Card 1: Delete Single Student Permanently */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] p-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0B1118]">
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  Delete one student
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7C8B70]">
                Removes the record from PostgreSQL and deletes its portraits from the Cloudflare R2 bucket.
              </p>
              <input
                type="text"
                value={supabaseDeleteId}
                onChange={(e) => setSupabaseDeleteId(e.target.value)}
                placeholder="Student ID (e.g. SB-2026-001)"
                className="w-full rounded-xl border border-[#E3EFD7] bg-white px-3 py-2 text-xs text-[#0B1118] outline-none focus:border-rose-400"
              />
            </div>

            <button
              type="button"
              onClick={handleDeleteStudentFromSupabase}
              disabled={isSupabaseDeleting || !supabaseDeleteId.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isSupabaseDeleting ? "Deleting…" : "Delete permanently"}</span>
            </button>
          </div>

          {/* Card 2: Purge All Storage Photos */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] p-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0B1118]">
                  <Cloud className="h-3.5 w-3.5 text-[#6FBF0A]" />
                  Purge storage photos
                </span>
                <Chip tone="neutral">Disabled</Chip>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7C8B70]">
                A whole-bucket purge is permanently disabled on this deployment. Delete a single record (left) and its portraits go with it.
              </p>
            </div>

            <button
              type="button"
              disabled
              title="Whole-bucket purge is permanently disabled on StudentBridge production."
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E3EFD7] bg-[#F7FAF3] px-3 py-2 text-[11px] font-bold text-[#9AA792] cursor-not-allowed"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Disabled by safety policy</span>
            </button>
          </div>

          {/* Card 3: Full Wipe — disabled by policy */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] p-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#7C8B70]">
                  <ShieldAlert className="h-3.5 w-3.5 text-[#B4C0AB]" />
                  Full database wipe
                </span>
                <Chip tone="neutral">Disabled</Chip>
              </div>
              <p className="text-[11px] leading-relaxed text-[#7C8B70]">
                Wiping every student, photo and custom field is permanently disabled here. Use individual deletions; nothing is removed in bulk from this console.
              </p>
            </div>

            <button
              type="button"
              disabled
              title="Full system wipe is permanently disabled on StudentBridge production."
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E3EFD7] bg-[#F7FAF3] px-3 py-2 text-[11px] font-bold text-[#9AA792] cursor-not-allowed"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Disabled by safety policy</span>
            </button>
          </div>
        </div>
      </SectionCard>

      {/* SECTION 2: COMPREHENSIVE AUDIT LOG MANAGEMENT CONSOLE */}
      <SectionCard
        icon={FileText}
        title="Operational log management"
        subtitle={`${filteredLogs.length.toLocaleString()} matching events · intake, corrections, sends and deletions`}
        actions={
          <>
            <ToolbarButton icon={Download} onClick={handleExportCSV} disabled={filteredLogs.length === 0} title="Export filtered logs as CSV">
              CSV
            </ToolbarButton>
            <ToolbarButton icon={Download} onClick={handleExportJSON} disabled={filteredLogs.length === 0} title="Export filtered logs as JSON">
              JSON
            </ToolbarButton>
            <button
              type="button"
              onClick={handleClearAuditLogs}
              disabled={isPending || auditLogs.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Purge all audit logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPending ? "Purging…" : "Clear logs"}</span>
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A9680]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search action, keyword or operator"
                className="w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] py-2 pl-9 pr-3 text-xs text-[#0B1118] outline-none placeholder:text-[#8A9680] focus:border-[#85E510]"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-bold text-[#0B1118] outline-none focus:border-[#85E510] cursor-pointer"
            >
              <option value="ALL">All actions ({uniqueActions.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-bold text-[#0B1118] outline-none focus:border-[#85E510] cursor-pointer"
            >
              <option value="ALL">All operators ({uniqueOperators.length})</option>
              {uniqueOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-[#E3EFD7] overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[#EDF4E5] bg-[#FBFDF7] text-[#7C8B70] uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action Event</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Metadata Payload</th>
                  <th className="px-5 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF4E5]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#7C8B70]">
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
                        className="hover:bg-[#FBFDF7] transition-colors"
                      >
                        <td className="px-5 py-3 text-[#7C8B70] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
 log.action.includes("DELETE") || log.action.includes("CLEAR")
 ? "bg-red-500/20 text-red-500 border border-red-500/40"
 : log.action.includes("CREATE")
 ? "bg-[#85E510]/20 text-[#062404] border border-[#85E510]/40"
 : "bg-blue-500/20 text-blue-500 border border-blue-500/40"
 }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#0B1118] font-bold">
                          {log.entityType}
                        </td>
                        <td className="px-5 py-3 text-[#0B1118]">
                          {log.user ? (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-[#85E510]" />
                              <span>{log.user.username}</span>
                              <span className="text-[10px] text-[#7C8B70]">
                                ({log.user.role})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[#7C8B70]">SYSTEM</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#7C8B70] truncate max-w-xs">
                          {log.metadata || "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg text-[#7C8B70] hover:text-[#85E510] hover:bg-[#85E510]/15 transition-colors cursor-pointer"
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
      </SectionCard>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1118]/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-[#E3EFD7] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EDF4E5] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#85E510]" />
                <h3 className="text-sm font-black text-[#0B1118]">
                  Audit Log Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-xl text-[#7C8B70] hover:text-[#0B1118]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#EDF4E5]">
                <span className="text-[#7C8B70]">Event ID:</span>
                <span className="font-bold text-[#0B1118]">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EDF4E5]">
                <span className="text-[#7C8B70]">Timestamp:</span>
                <span className="font-bold text-[#0B1118]">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EDF4E5]">
                <span className="text-[#7C8B70]">Action Event:</span>
                <span className="font-bold text-[#85E510]">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EDF4E5]">
                <span className="text-[#7C8B70]">Entity Type:</span>
                <span className="font-bold text-[#0B1118]">{selectedLog.entityType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EDF4E5]">
                <span className="text-[#7C8B70]">Operator:</span>
                <span className="font-bold text-[#0B1118]">
                  {selectedLog.user ? `${selectedLog.user.username} (${selectedLog.user.role})` : "SYSTEM"}
                </span>
              </div>

              <div>
                <span className="text-[#7C8B70] block mb-1.5">Parsed Metadata:</span>
                <pre className="p-3 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] text-[11px] text-[#0B1118] overflow-x-auto whitespace-pre-wrap">
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
                className="rounded-xl bg-[#85E510] text-[#062404] px-4 py-2 text-xs font-black hover:bg-[#7ecc10] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Storage Synchronization & Orphan Cleaner Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1118]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-[#E3EFD7] bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF4E5]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-sky-50 border border-[#BAE6FD] flex items-center justify-center text-[#0284C7]">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0B1118]">
                    Supabase Storage &amp; Database Synchronizer
                  </h3>
                  <p className="text-[11px] text-[#7C8B70]">
                    Bucket: &apos;{supabaseStatus?.storageBucket || "siliconlabs"}&apos; • Auto-cross references with PostgreSQL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="p-1 rounded-xl text-[#7C8B70] hover:text-[#0B1118] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {syncLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-[#0284C7] animate-spin" />
                <p className="text-xs text-[#7C8B70]">
                  Scanning bucket &apos;{supabaseStatus?.storageBucket || "siliconlabs"}&apos; and matching active students...
                </p>
              </div>
            ) : syncAnalysis ? (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Stats Matrix */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7]">
                    <span className="text-[10px] text-[#7C8B70] block uppercase font-bold">Total in Bucket</span>
                    <span className="text-lg font-black text-[#0B1118]">
                      {syncAnalysis.totalStorageFiles}
                    </span>
                    <span className="text-[10px] text-[#0284C7] block font-bold">Photos in Cloud</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#85E510]/10 border border-[#85E510]/30">
                    <span className="text-[10px] text-[#7C8B70] block uppercase font-bold">Active Records</span>
                    <span className="text-lg font-black text-[#85E510]">
                      {syncAnalysis.activeFilesCount}
                    </span>
                    <span className="text-[10px] text-[#85E510] block font-bold">
                      {syncAnalysis.activeStudentsCount} Students
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl border ${
 syncAnalysis.orphanedCount > 0
 ? "bg-amber-500/10 border-amber-500/30 text-[#B45309]"
 : "bg-[#EAF7DA] border-[#CDEBB4] text-[#3F7A06]"
 }`}>
                    <span className="text-[10px] text-[#7C8B70] block uppercase font-bold">Orphaned Photos</span>
                    <span className="text-lg font-black">
                      {syncAnalysis.orphanedCount}
                    </span>
                    <span className="text-[10px] block font-bold">
                      {syncAnalysis.orphanedSizeFormatted} Reclaimable
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-3 rounded-2xl bg-[#FBFDF7] border border-[#E3EFD7] text-xs space-y-1 text-[#7C8B70]">
                  <p className="font-bold text-[#0B1118]">
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
                    <span className="text-xs font-bold text-[#0B1118] block mb-1.5">
                      Orphaned Files ({syncAnalysis.orphanedFiles.length} preview):
                    </span>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-[#E3EFD7] bg-[#F6FAEF] p-2 text-[11px] space-y-1">
                      {syncAnalysis.orphanedFiles.map((file) => (
                        <div key={file.path} className="flex items-center justify-between text-[#7C8B70] hover:text-[#0B1118]">
                          <span className="truncate pr-2">{file.path}</span>
                          <span className="text-[10px] shrink-0">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-3 border-t border-[#EDF4E5]">
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-[#7C8B70] hover:text-[#0B1118] cursor-pointer"
              >
                Cancel
              </button>

              {syncAnalysis && syncAnalysis.orphanedCount > 0 && (
                <button
                  type="button"
                  disabled={syncPurging}
                  onClick={handleExecuteSyncPurge}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 py-2 text-xs transition cursor-pointer disabled:opacity-50"
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
    </PageShell>
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
    <div className="p-6 min-h-screen bg-[#FBFDF7]">
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
