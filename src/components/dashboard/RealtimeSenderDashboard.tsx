"use client";

// ============================================================================
// STUDENT BRIDGE — SENDER REALTIME OPERATIONAL DASHBOARD
// Ultra-fast registration & photo capture console for Sender Station:
// - True Lemon Green (#8fe617) accents
// - Full Light / Dark / Night Mode support
// - Zero "Enroll" terminology (strictly "Register")
// - Live Real-Time IndexedDB & Cloud Sync stream
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Camera,
  Boxes,
  Receipt,
  ArrowUpRight,
  Clock,
  RefreshCw,
  FolderArchive,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { reconcileLocalCacheWithServer } from "@/lib/idb-storage";

interface SenderDashboardData {
  totalEnrolled: number;
  enrolledToday: number;
  photosCaptured: number;
  totalBatches: number;
  sentBatchesCount: number;
  draftBatchesCount: number;
  recentStudents: Array<{
    id: string;
    studentId: string;
    fullName: string;
    grade: string;
    photoPath?: string | null;
    createdAt?: string;
  }>;
}

export function RealtimeSenderDashboard() {
  const [data, setData] = useState<SenderDashboardData>({
    totalEnrolled: 0,
    enrolledToday: 0,
    photosCaptured: 0,
    totalBatches: 0,
    sentBatchesCount: 0,
    draftBatchesCount: 0,
    recentStudents: [],
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [retakeQueue, setRetakeQueue] = useState<
    Array<{ studentId: string; fullName?: string; message?: string }>
  >([]);

  useEffect(() => {
    const handleRetakeRequired = (e: any) => {
      if (e?.detail?.studentId) {
        setRetakeQueue((prev) => [
          e.detail,
          ...prev.filter((item) => item.studentId !== e.detail.studentId),
        ]);
      }
    };

    window.addEventListener("siliconlabs_photo_retake_required", handleRetakeRequired);
    return () => {
      window.removeEventListener("siliconlabs_photo_retake_required", handleRetakeRequired);
    };
  }, []);

  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch server-side metrics
      const res = await fetch("/api/sender/metrics", { cache: "no-store" });
      let serverData: any = null;
      if (res.ok) {
        serverData = await res.json();
      }

      // 2. Check for currently active/pending outbox items on this workstation
      let outboxPendingCount = 0;
      let activeOutboxItems: any[] = [];
      const activeOutboxIds = new Set<string>();
      try {
        const { getOutboxQueue } = await import("@/lib/outbox-engine");
        const queue = getOutboxQueue();
        queue.forEach((item) => {
          if (item.status === "QUEUED" || item.status === "SYNCING") {
            outboxPendingCount++;
            activeOutboxIds.add(item.studentId);
            activeOutboxItems.push({
              id: item.record?.id || item.studentId,
              studentId: item.studentId,
              fullName: item.payload?.fullName || item.record?.fullName,
              grade: item.payload?.grade || item.record?.grade,
              photoPath: (item.payload as any)?.photo || item.record?.photoPath,
              createdAt: item.timestamp || new Date().toISOString(),
            });
          }
        });
      } catch {}

      // 3. Reconcile local storage with server records: purges deleted ghosts!
      if (serverData?.recentStudents && Array.isArray(serverData.recentStudents)) {
        await reconcileLocalCacheWithServer(serverData.recentStudents, activeOutboxIds);
      }

      const effectiveTotal = (serverData?.totalEnrolled || 0) + outboxPendingCount;
      const map = new Map<string, any>();
      (serverData?.recentStudents || []).forEach((s: any) => map.set(s.studentId, s));
      activeOutboxItems.forEach((s) => {
        if (!map.has(s.studentId)) map.set(s.studentId, s);
      });
      const effectiveRecent = Array.from(map.values());
      effectiveRecent.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setData({
        totalEnrolled: effectiveTotal,
        enrolledToday: serverData?.enrolledToday || 0,
        photosCaptured: (serverData?.photosCaptured || 0) + activeOutboxItems.filter((s: any) => !!s.photoPath).length,
        totalBatches: serverData?.totalBatches || 0,
        sentBatchesCount: serverData?.sentBatchesCount || 0,
        draftBatchesCount: serverData?.draftBatchesCount || 0,
        recentStudents: effectiveRecent.slice(0, 10),
      });

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Sender dashboard metric poll notice:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Real-time Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] px-4 py-3 rounded-2xl text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {autoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8fe617] opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8fe617]" />
          </span>
          <span className="font-mono uppercase tracking-wider font-extrabold text-[#080808] dark:text-[#f2f7f4]">
            {autoRefresh ? "Real-time Station Sync Active" : "Live Sync Paused"}
          </span>
          <span className="text-[#dce7e1] dark:text-[#26332b]">•</span>
          <span className="text-[#6b7771] dark:text-[#7f9488] font-mono text-[11px]">
            Last updated: {lastUpdated || "Just now"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded-xl border transition-all cool-btn-hover ${
              autoRefresh
                ? "border-[#8fe617] bg-[#8fe617] text-[#062404] shadow-[0_0_12px_rgba(143,230,23,0.3)]"
                : "border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] text-[#6b7771] dark:text-[#7f9488] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
            }`}
          >
            Auto-Sync: {autoRefresh ? "ON (4s)" : "OFF"}
          </button>
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-semibold rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] disabled:opacity-50 transition-colors cool-btn-hover"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#8fe617]" : ""}`} />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#dce7e1] dark:border-[#26332b] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8fe617] font-extrabold tracking-wider uppercase">
              SENDER WORKSTATION
            </span>
            <span className="text-[#dce7e1] dark:text-[#26332b]">/</span>
            <span className="text-xs text-[#6b7771] dark:text-[#7f9488] font-semibold">
              REGISTRATION &amp; CAPTURE CONSOLE
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] mt-1">
            Student Registration &amp; Photo Studio
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#7f9488] mt-0.5">
            Rapid student registration, high-resolution 300 DPI studio portraits, dispatch batches, and receipts
          </p>
        </div>

        {/* Action Controls & Fast Dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#8fe617] px-4 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] transition-all shadow-[0_0_15px_rgba(143,230,23,0.35)] cool-btn-hover active:scale-95"
          >
            <UserPlus className="h-4 w-4 stroke-[2.5]" />
            <span>Register New Student</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen(!actionsOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-3 py-2 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] transition-colors shadow-2xs cool-btn-hover"
            >
              <span>Quick Actions</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6b7771] dark:text-[#7f9488]" />
            </button>

            {actionsOpen && (
              <div
                className="absolute right-0 mt-1 w-56 rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setActionsOpen(false)}
              >
                <Link
                  href="/register"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] rounded-xl font-medium"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Student Registration</span>
                </Link>
                <Link
                  href="/sender/photo-import"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] rounded-xl font-medium"
                >
                  <FolderArchive className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Folder Photo Matcher</span>
                </Link>
                <Link
                  href="/sender/batches"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] rounded-xl font-medium"
                >
                  <Boxes className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Dispatch Batches</span>
                </Link>
                <Link
                  href="/sender/receipts"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] rounded-xl font-medium"
                >
                  <Receipt className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Print Registration Receipts</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Internet Photo Retake Alert Banner */}
      {retakeQueue.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="font-bold text-sm">
                Low Internet Retake Alert ({retakeQueue.length} {retakeQueue.length === 1 ? "Student" : "Students"})
              </span>
            </div>
            <button
              onClick={() => setRetakeQueue([])}
              className="text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 font-mono mb-3">
            Weak network connection dropped photo transmission after 3 automatic retries. The broken asset was auto-deleted from the receiver. Please retake photo:
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {retakeQueue.map((item) => (
              <div
                key={item.studentId}
                className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-[#161c18] p-2.5 border border-amber-500/20 text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                    {item.fullName || "Student"}
                  </div>
                  <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    ID: {item.studentId}
                  </div>
                </div>
                <Link
                  href={`/sender/photo-import?search=${encodeURIComponent(item.studentId)}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8fe617] text-[#062404] font-black text-[10px] hover:brightness-110 transition shadow-xs cursor-pointer"
                >
                  <Camera className="h-3 w-3" />
                  <span>Retake Photo</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-4 shadow-sm hover:border-[#8fe617] transition-all cool-hover">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#7f9488]">
            <span className="font-semibold">Total Registered</span>
            <Users className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-2">
            {data.totalEnrolled.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-1 font-mono">DATABASE TOTAL</div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-4 shadow-sm hover:border-[#8fe617] transition-all cool-hover">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#7f9488]">
            <span className="font-semibold">Registered Today</span>
            <UserPlus className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-2">
            {data.enrolledToday.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-1 font-mono">CURRENT SHIFT</div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-4 shadow-sm hover:border-[#8fe617] transition-all cool-hover">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#7f9488]">
            <span className="font-semibold">Photos Attached</span>
            <Camera className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-2">
            {data.photosCaptured.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-1 font-mono">
            {data.totalEnrolled > 0 ? Math.round((data.photosCaptured / data.totalEnrolled) * 100) : 0}% READY
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-4 shadow-sm hover:border-[#8fe617] transition-all cool-hover">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#7f9488]">
            <span className="font-semibold">Dispatch Batches</span>
            <Boxes className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-2">
            {data.totalBatches}
          </div>
          <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-1 font-mono">
            {data.sentBatchesCount} SENT • {data.draftBatchesCount} DRAFT
          </div>
        </div>
      </div>

      {/* Unified Sender Operations Pipeline */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#dce7e1] dark:border-[#26332b] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#8fe617]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
              Registration Operations Pipeline
            </h2>
          </div>
          <span className="text-[11px] text-[#6b7771] dark:text-[#7f9488] font-mono">Step-by-step workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/register"
            className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 hover:border-[#8fe617] hover:shadow-[0_0_15px_rgba(143,230,23,0.15)] transition-all group cool-hover"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4] font-bold">
                STEP 1
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488] group-hover:text-[#8fe617] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4] mt-3">1. Student Registration</h3>
            <p className="text-xs text-[#6b7771] dark:text-[#7f9488] mt-1">
              High-resolution camera photo, precision crop studio, and student credentials
            </p>
          </Link>

          <Link
            href="/sender/photo-import"
            className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 hover:border-[#8fe617] hover:shadow-[0_0_15px_rgba(143,230,23,0.15)] transition-all group cool-hover"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4] font-bold">
                STEP 2
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488] group-hover:text-[#8fe617] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4] mt-3">2. Folder Photo Match</h3>
            <p className="text-xs text-[#6b7771] dark:text-[#7f9488] mt-1">
              Import a folder of portraits and auto-match by student ID
            </p>
          </Link>

          <Link
            href="/sender/batches"
            className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 hover:border-[#8fe617] hover:shadow-[0_0_15px_rgba(143,230,23,0.15)] transition-all group cool-hover"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4] font-bold">
                STEP 3
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488] group-hover:text-[#8fe617] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4] mt-3">3. Dispatch Batches</h3>
            <p className="text-xs text-[#6b7771] dark:text-[#7f9488] mt-1">
              Create batches, validate completeness, and transmit to Receiver
            </p>
          </Link>

          <Link
            href="/sender/receipts"
            className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 hover:border-[#8fe617] hover:shadow-[0_0_15px_rgba(143,230,23,0.15)] transition-all group cool-hover"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4] font-bold">
                STEP 4
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488] group-hover:text-[#8fe617] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4] mt-3">4. Print Receipts</h3>
            <p className="text-xs text-[#6b7771] dark:text-[#7f9488] mt-1">
              Issue registration receipts for students or print batch manifests
            </p>
          </Link>
        </div>
      </div>

      {/* Live Recent Registered Students Stream */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#dce7e1] dark:border-[#26332b] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
              Live Registration Stream ({data.recentStudents.length})
            </h2>
          </div>
          <Link
            href="/sender/receipts"
            className="text-xs text-[#080808] dark:text-[#f2f7f4] hover:text-[#8fe617] dark:hover:text-[#8fe617] hover:underline font-mono font-semibold transition-colors"
          >
            View All Receipts →
          </Link>
        </div>

        {data.recentStudents.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#6b7771] dark:text-[#7f9488]">
            No students registered yet. Click &quot;Register New Student&quot; to begin.
          </div>
        ) : (
          <div className="divide-y divide-[#dce7e1] dark:divide-[#26332b]">
            {data.recentStudents.map((s) => (
              <div key={s.id || s.studentId} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {s.photoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photoPath}
                        alt={s.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488]" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#080808] dark:text-[#f2f7f4]">{s.fullName}</div>
                    <div className="text-[11px] font-mono text-[#6b7771] dark:text-[#7f9488]">
                      ID: {s.studentId} • {s.grade}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                      s.photoPath
                        ? "border-[#8fe617] bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617]"
                        : "border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] text-[#6b7771] dark:text-[#7f9488]"
                    }`}
                  >
                    {s.photoPath ? "PHOTO READY" : "NO PHOTO"}
                  </span>
                  <Link
                    href={`/sender/receipts?studentId=${s.studentId}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-2.5 py-1 text-[11px] font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#8fe617] hover:text-[#062404] dark:hover:bg-[#8fe617] dark:hover:text-[#062404] transition-all shadow-2xs cool-btn-hover"
                  >
                    <Receipt className="h-3 w-3" />
                    <span>Receipt</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
