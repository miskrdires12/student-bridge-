import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  GitCompareArrows,
  HardDrive,
  MapPin,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  Wifi,
  Workflow,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { refreshFleetTelemetry, getAuthHeaders } from "@/lib/store";
import type { FleetTelemetryPayload } from "@/lib/store";
import { BRANCH_SCHOOL_MAP, DEFAULT_BRANCHES } from "@/lib/gradeUtils";
import {
  PageShell,
  PageHero,
  FactGrid,
  FactCard,
  ToolbarButton,
  PrimaryButton,
} from "@/components/ui/PageKit";

// ---------------------------------------------------------------------------
// The dashboard draws one server snapshot and nothing else.
//
// Every figure here - counters, chart, period block, branch table - comes from
// a single aggregated answer per endpoint, and the page is only swapped once
// every part of the snapshot has arrived. That is what stops "one number first,
// another number a second later": there is no partial render to correct, and a
// failed refresh keeps the previous complete snapshot on screen.
// ---------------------------------------------------------------------------

interface StatsPayload {
  totalStudents: number | null;
  totalPhotos: number | null;
  missingPhotos: number | null;
  statsComplete?: boolean;
  statsMissing?: string[];
  statsSource: string;
  storageFormatted: string | null;
  r2TotalObjects: number | null;
}

interface FlowDay {
  day: string;
  count: number;
  verified: number;
}

interface FlowHour {
  hour: string;
  count: number;
  verified: number;
}

interface FlowBranchDay {
  day: string;
  branch: string;
  count: number;
  verified: number;
}

interface FlowPayload {
  success: boolean;
  rangeDays: number;
  todayKey: string;
  oldestKey: string;
  source: string;
  days: FlowDay[];
  hours: FlowHour[];
  branchDays: FlowBranchDay[];
  totalInWindow: number;
  verifiedInWindow: number;
  generatedAt: string;
  queryLatencyMs: number;
}

interface HealthPayload {
  status: string;
  version: string;
  time: string;
  database: {
    connected: boolean;
    liveRecordCount: number | null;
    d1RecordCount: number | null;
    d1InSync: boolean | null;
  };
}

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  user?: { username?: string; role?: string } | null;
}

interface DuplicateMember {
  studentId: string;
  school: string;
  branch: string;
  createdAt: string;
  photoVerified: boolean;
}

interface DuplicateGroup {
  key: string;
  fullName: string;
  guardianFullName: string;
  grade: string;
  section: string;
  phone: string;
  count: number;
  members: DuplicateMember[];
}

interface DuplicatesPayload {
  success: boolean;
  source: string;
  totalStudents: number;
  totalGroups: number;
  totalDuplicateRows: number;
  extraRows: number;
  groups: DuplicateGroup[];
  truncated: boolean;
  generatedAt: string;
  queryLatencyMs: number;
}

interface Snapshot {
  fetchedAt: number;
  stats: StatsPayload;
  flow: FlowPayload;
  fleet: FleetTelemetryPayload;
  health: HealthPayload | null;
  logs: AuditRow[];
  duplicates: DuplicatesPayload | null;
  latency: { stats: number; flow: number; health: number; dupes: number; total: number };
}

const RANGE_DAYS = { today: 1, "7d": 7, "30d": 30, "90d": 90 } as const;
type RangeKey = keyof typeof RANGE_DAYS;

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};

const REFRESH_INTERVAL_MS = 20000;

function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US");
}

// "In sync" and "Catching up" are two different claims drawn from one comparison; when either side
// was not actually counted, the row has to say nothing rather than pick the alarming one.
function syncStateLabel(health: HealthPayload | null | undefined): string {
  const mirror = health?.database;
  if (!mirror || mirror.d1InSync === null) return "—";
  return mirror.d1InSync ? "In sync" : "Catching up";
}

function shiftDayKey(key: string, delta: number): string {
  const parts = String(key).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return key;
  const t = Date.UTC(parts[0], parts[1] - 1, parts[2]) + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function mondayOf(key: string): string {
  const parts = String(key).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return key;
  const idx = (new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay() + 6) % 7;
  return shiftDayKey(key, -idx);
}

function dayShort(key: string): string {
  const parts = String(key).split("-").map(Number);
  if (parts.length !== 3) return key;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function dayLong(key: string): string {
  const parts = String(key).split("-").map(Number);
  if (parts.length !== 3) return key;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatAgo(from: number, now: number): string {
  const secs = Math.max(0, Math.round((now - from) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function actionLabel(action: string): string {
  return String(action || "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchJson<T>(
  url: string,
  timeoutMs: number
): Promise<{ data: T | null; ms: number }> {
  const started = performance.now();
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      cache: "no-store",
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) return { data: null, ms: Math.round(performance.now() - started) };
    const data = (await res.json()) as T;
    return { data, ms: Math.round(performance.now() - started) };
  } catch {
    return { data: null, ms: Math.round(performance.now() - started) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// The fleet rollup is single-flighted in the store, so one stalled request would hold this page's
// in-flight flag forever and freeze the refresh. The dashboard gives up waiting and keeps the
// snapshot it already has; the underlying request finishes on its own.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const card = "rounded-2xl border border-[#E3EFD7] bg-white shadow-sm";

export interface DashboardPageProps {
  title?: string;
  subtitle?: string;
}

export const AdminDashboardPage: React.FC<DashboardPageProps> = ({
  title = "Live Dashboard",
  subtitle = "One server snapshot per refresh — counters, chart and branches always agree.",
}) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [range, setRange] = useState<RangeKey>("7d");
  const [now, setNow] = useState(() => Date.now());
  const [expandedDupes, setExpandedDupes] = useState<Set<string>>(new Set());

  const inFlight = useRef(false);
  const seq = useRef(0);
  const hasSnapshot = useRef(false);

  const loadSnapshot = useCallback(async (mode: "initial" | "timer" | "manual") => {
    if (inFlight.current) return;
    inFlight.current = true;
    const mySeq = ++seq.current;
    if (mode !== "timer") setIsRefreshing(true);
    const started = performance.now();

    try {
      const [statsRes, flowRes, healthRes, logsRes, dupesRes, fleet] = await Promise.all([
        fetchJson<StatsPayload>("/api/stats", 20000),
        fetchJson<FlowPayload>("/api/dashboard/flow?days=90", 25000),
        fetchJson<HealthPayload>("/api/health", 20000),
        fetchJson<AuditRow[]>("/api/audit-logs?limit=12", 20000),
        fetchJson<DuplicatesPayload>("/api/students/duplicates", 25000),
        withTimeout(refreshFleetTelemetry().catch(() => null), 25000, null),
      ]);

      // A slower, earlier request must never overwrite a newer snapshot.
      if (mySeq !== seq.current) return;

      const stats = statsRes.data;
      const flow = flowRes.data;
      if (!stats || !flow || !flow.success || !Array.isArray(flow.days) || !fleet) {
        setLoadError(
          hasSnapshot.current
            ? "A complete server snapshot did not arrive, so the previous figures are still shown."
            : "The server snapshot is not ready yet. Retrying automatically."
        );
        return;
      }

      hasSnapshot.current = true;
      setSnapshot({
        fetchedAt: Date.now(),
        stats,
        flow,
        fleet,
        health: healthRes.data,
        logs: Array.isArray(logsRes.data) ? logsRes.data : [],
        duplicates: dupesRes.data && dupesRes.data.success ? dupesRes.data : null,
        latency: {
          stats: statsRes.ms,
          flow: flowRes.ms,
          health: healthRes.ms,
          dupes: dupesRes.ms,
          total: Math.round(performance.now() - started),
        },
      });
      setLoadError(null);
    } finally {
      inFlight.current = false;
      if (mySeq === seq.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot("initial");
  }, [loadSnapshot]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      loadSnapshot("timer");
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, loadSnapshot]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && autoRefresh) loadSnapshot("timer");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [autoRefresh, loadSnapshot]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(tick);
  }, []);

  const flow = snapshot?.flow;
  const stats = snapshot?.stats;
  const fleet = snapshot?.fleet;

  const dayMap = useMemo(() => {
    const map = new Map<string, FlowDay>();
    flow?.days.forEach((d) => map.set(d.day, d));
    return map;
  }, [flow]);

  const periods = useMemo(() => {
    if (!flow) return null;
    const todayKey = flow.todayKey;
    const yesterdayKey = shiftDayKey(todayKey, -1);
    const weekStart = mondayOf(todayKey);
    const monthStart = `${todayKey.slice(0, 8)}01`;
    const sumSince = (startKey: string) => {
      let count = 0;
      let verified = 0;
      for (const d of flow.days) {
        if (d.day >= startKey && d.day <= todayKey) {
          count += d.count;
          verified += d.verified;
        }
      }
      return { count, verified };
    };
    const today = dayMap.get(todayKey) || { count: 0, verified: 0 };
    const yesterday = dayMap.get(yesterdayKey) || { count: 0, verified: 0 };
    return {
      todayKey,
      yesterdayKey,
      today,
      yesterday,
      week: sumSince(weekStart),
      month: sumSince(monthStart),
    };
  }, [flow, dayMap]);

  const chartData = useMemo(() => {
    if (!flow) return [] as Array<{ label: string; full: string; count: number; verified: number }>;
    if (range === "today") {
      // The 24 hour buckets are complete in the payload; only the part of the day that has
      // actually happened is drawn, so the trailing hours are not a cliff of zeros.
      const eatNow = new Date((snapshot?.fetchedAt || Date.now()) + 3 * 3600 * 1000);
      const currentHour = eatNow.getUTCHours();
      return flow.hours.slice(0, Math.max(1, currentHour + 1)).map((h) => ({
        label: `${h.hour}:00`,
        full: `${h.hour}:00`,
        count: h.count,
        verified: h.verified,
      }));
    }
    return flow.days.slice(-RANGE_DAYS[range]).map((d) => ({
      label: dayShort(d.day),
      full: dayLong(d.day),
      count: d.count,
      verified: d.verified,
    }));
  }, [flow, range, snapshot?.fetchedAt]);

  const peak = useMemo(() => {
    let best: { label: string; full: string; count: number } | null = null;
    chartData.forEach((p) => {
      if (!best || p.count > best.count) best = { label: p.label, full: p.full, count: p.count };
    });
    return best;
  }, [chartData]);

  const chartTotals = useMemo(() => {
    let count = 0;
    let verified = 0;
    chartData.forEach((p) => {
      count += p.count;
      verified += p.verified;
    });
    return { count, verified, rate: count > 0 ? Math.round((verified / count) * 100) : null };
  }, [chartData]);

  const branchRows = useMemo(() => {
    if (!flow || !fleet) return [];
    const startKey =
      range === "today" ? flow.todayKey : flow.days.slice(-RANGE_DAYS[range])[0]?.day || flow.oldestKey;

    const totals = new Map<string, { today: number; period: number; verified: number }>();
    const ensure = (branch: string) => {
      if (!totals.has(branch)) totals.set(branch, { today: 0, period: 0, verified: 0 });
      return totals.get(branch)!;
    };

    for (const row of flow.branchDays) {
      if (!row.branch) continue;
      const entry = ensure(row.branch);
      if (row.day >= startKey) {
        entry.period += row.count;
        entry.verified += row.verified;
      }
      if (row.day === flow.todayKey) entry.today += row.count;
    }

    const operators = new Map<string, { online: number; total: number }>();
    for (const sender of fleet.senders) {
      const branch = String(sender.branch || "").trim() || "Unassigned";
      if (!operators.has(branch)) operators.set(branch, { online: 0, total: 0 });
      const slot = operators.get(branch)!;
      slot.total += 1;
      if (sender.terminalStatus === "ACTIVE") slot.online += 1;
    }

    const names = new Set<string>([...totals.keys(), ...operators.keys()]);
    return [...names]
      .map((branch) => {
        const t = totals.get(branch) || { today: 0, period: 0, verified: 0 };
        const o = operators.get(branch) || { online: 0, total: 0 };
        return {
          branch,
          schools: BRANCH_SCHOOL_MAP[branch]?.length ?? 0,
          operatorsOnline: o.online,
          operatorsTotal: o.total,
          today: t.today,
          period: t.period,
          verifiedRate: t.period > 0 ? Math.round((t.verified / t.period) * 100) : null,
        };
      })
      .sort((a, b) => b.period - a.period || a.branch.localeCompare(b.branch));
  }, [flow, fleet, range]);

  const maxBranchPeriod = useMemo(
    () => branchRows.reduce((max, r) => Math.max(max, r.period), 0),
    [branchRows]
  );

  const photoCoverage = useMemo(() => {
    if (!stats || stats.totalStudents === null || stats.totalPhotos === null) return null;
    if (stats.totalStudents === 0) return null;
    return Math.round((stats.totalPhotos / stats.totalStudents) * 100);
  }, [stats]);

  const duplicates = snapshot?.duplicates ?? null;

  const toggleDupe = (key: string) => {
    setExpandedDupes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const freshness = snapshot ? formatAgo(snapshot.fetchedAt, now) : "";
  const isStale = snapshot ? now - snapshot.fetchedAt > 90000 : false;

  // "Online" is a live claim, so it can only mean a station transmitted inside the fleet's 15-minute
  // window. Counting everyone who touched the registry in the last day made the card read 22 online
  // while the network was quiet, which is exactly the number an administrator cannot trust.
  const activeNow = fleet?.totals.activeSenders ?? 0;
  const idleRecently = Math.max(0, (fleet?.totals.recentlyActiveSenders ?? 0) - activeNow);

  const kpis = [
    {
      label: "Total Students",
      value: fmtInt(stats?.totalStudents),
      // The mirror's state is only claimed when both stores were actually measured. null means the
      // backup did not answer this refresh, which is not the same statement as "the mirror is behind".
      hint: snapshot?.health?.database
        ? snapshot.health.database.d1InSync === null
          ? "Backup size not measured"
          : snapshot.health.database.d1InSync
            ? "Backup mirror in sync"
            : "Backup mirror catching up"
        : "Registry of record",
      icon: Users,
    },
    {
      label: "Photos Uploaded",
      value: fmtInt(stats?.totalPhotos),
      hint: photoCoverage === null ? "Coverage —" : `${photoCoverage}% photo coverage`,
      icon: Camera,
    },
    {
      label: "Registered Today",
      value: fmtInt(periods?.today.count),
      hint: "Since 00:00 (EAT)",
      icon: Activity,
    },
    {
      label: "Operators Active Now",
      value: fmtInt(activeNow),
      hint: `${fmtInt(idleRecently)} idle in the last 24 h`,
      icon: Radio,
    },
    {
      label: "Missing Photos",
      value: fmtInt(stats?.missingPhotos),
      hint: "Records awaiting a portrait",
      icon: ShieldCheck,
    },
  ];

  const db = snapshot?.health?.database;

  const systemRows = [
    {
      label: "Pages",
      value: "Serving",
      ok: true,
      detail: "Cloudflare edge",
      icon: Server,
    },
    {
      label: "Worker API",
      value: snapshot ? "Healthy" : "—",
      ok: Boolean(snapshot?.health?.status === "healthy"),
      detail: snapshot?.health ? `${snapshot.latency.health} ms /api/health` : "Awaiting snapshot",
      icon: Wifi,
    },
    {
      label: "D1 (record)",
      value: db ? (db.d1RecordCount === null ? "—" : "Readable") : "—",
      ok: Boolean(db && db.d1RecordCount && db.d1RecordCount > 0),
      detail: db ? `${fmtInt(db.d1RecordCount)} rows` : "Awaiting snapshot",
      icon: Database,
    },
    {
      label: "Backup mirror",
      value: db ? (db.liveRecordCount === null ? "—" : db.connected ? "Connected" : "Degraded") : "—",
      ok: Boolean(db?.connected),
      detail: db
        ? db.liveRecordCount === null
          ? "size not measured"
          : `${fmtInt(db.liveRecordCount)} rows`
        : "Awaiting snapshot",
      icon: Workflow,
    },
    {
      label: "Mirror sync",
      value: syncStateLabel(snapshot?.health),
      ok: Boolean(db && db.d1InSync === true),
      detail: db
        ? `${fmtInt(db.d1RecordCount)} D1 vs ${fmtInt(db.liveRecordCount)} backup`
        : "Awaiting snapshot",
      icon: GitCompareArrows,
    },
    {
      label: "R2 Storage",
      value: stats?.storageFormatted || "—",
      ok: Boolean(stats?.storageFormatted),
      detail: stats ? `${fmtInt(stats.r2TotalObjects)} objects` : "Awaiting snapshot",
      icon: HardDrive,
    },
  ];

  return (
    <PageShell className="mx-auto max-w-[1400px]">
      <PageHero
        icon={BarChart3}
        title={title}
        count={stats ? `${fmtInt(stats.totalStudents)} students` : "Reading snapshot"}
        live={autoRefresh ? "Live · 20s" : false}
        subtitle={
          snapshot
            ? `${subtitle} Snapshot ${freshness}, taken ${new Date(snapshot.fetchedAt).toLocaleTimeString()}.`
            : subtitle
        }
        actions={
          <>
            <ToolbarButton
              icon={autoRefresh ? Pause : Play}
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? "Pause auto refresh" : "Resume auto refresh"}
            >
              {autoRefresh ? "Pause" : "Resume"}
            </ToolbarButton>
            <PrimaryButton
              icon={RefreshCw}
              onClick={() => loadSnapshot("manual")}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </PrimaryButton>
          </>
        }
      >
        <FactGrid cols={5}>
          {kpis.map((kpi) => (
            <FactCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} icon={kpi.icon} />
          ))}
        </FactGrid>
      </PageHero>

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#F0D9A8] bg-[#FDF6E7] px-4 py-3 text-sm text-[#7a5a10]">
          <Clock size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">{loadError}</div>
            {snapshot && (
              <div className="mt-0.5 text-xs text-[#8a6c2a]">
                Last complete snapshot: {new Date(snapshot.fetchedAt).toLocaleTimeString()} ({freshness})
              </div>
            )}
          </div>
        </div>
      )}

      {!snapshot ? (
        <div className="space-y-6">
          <div className={`${card} p-6`}>
            <div className="h-4 w-40 rounded bg-[#EDF4E5] animate-pulse" />
            <div className="mt-6 h-64 rounded-xl bg-[#F4F8EE] animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Live flow + period totals */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={`${card} xl:col-span-2 p-6`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 size={16} className="text-[#6FBF0A]" />
                    Live Registration Flow
                  </div>
                  <div className="mt-1 text-xs text-[#7C8B70]">
                    {RANGE_LABEL[range]} · {fmtInt(chartTotals.count)} records ·{" "}
                    {chartTotals.rate === null ? "—" : `${chartTotals.rate}% verified`}
                  </div>
                </div>
                <div className="inline-flex rounded-xl border border-[#E3EFD7] p-1">
                  {(Object.keys(RANGE_DAYS) as RangeKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRange(key)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        range === key
                          ? "bg-[#85E510] text-[#062404]"
                          : "text-[#7C8B70] hover:bg-[#F3F8EC]"
                      }`}
                    >
                      {RANGE_LABEL[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#85E510" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="#85E510" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="verifiedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3F7A06" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#3F7A06" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9F2DE" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#7C8B70" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#7C8B70" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={52}
                    />
                    <Tooltip
                      cursor={{ stroke: "#85E510", strokeWidth: 1, strokeDasharray: "4 4" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const point = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-[#E3EFD7] bg-white px-3 py-2 shadow-lg">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7C8B70]">
                              {point.full}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#0B1118]">
                              {fmtInt(point.count)} records
                            </div>
                            <div className="text-xs text-[#3F7A06]">{fmtInt(point.verified)} verified</div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6FBF0A"
                      strokeWidth={2.2}
                      fill="url(#flowFill)"
                      activeDot={{ r: 4, fill: "#3F7A06", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="verified"
                      stroke="#3F7A06"
                      strokeWidth={1.4}
                      strokeDasharray="4 3"
                      fill="url(#verifiedFill)"
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#7C8B70]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#6FBF0A]" /> Registrations
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3F7A06]" /> Verified
                </span>
                {peak && (
                  <span>
                    Busiest {range === "today" ? "hour" : "day"}:{" "}
                    <span className="font-medium text-[#3F7A06]">
                      {peak.full} · {fmtInt(peak.count)}
                    </span>
                  </span>
                )}
                <span className="ml-auto">
                  Source: {flow.source === "d1" ? "D1 aggregate" : "Supabase"} · {flow.queryLatencyMs} ms
                </span>
              </div>
            </div>

            <div className={`${card} p-6`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ArrowUpRight size={16} className="text-[#6FBF0A]" />
                Period Totals
              </div>
              <div className="mt-4 divide-y divide-[#EDF4E5]">
                {[
                  { label: "Today", value: periods?.today.count, verified: periods?.today.verified },
                  { label: "Yesterday", value: periods?.yesterday.count, verified: periods?.yesterday.verified },
                  { label: "This Week", value: periods?.week.count, verified: periods?.week.verified },
                  { label: "This Month", value: periods?.month.count, verified: periods?.month.verified },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{row.label}</div>
                      <div className="text-[11px] text-[#7C8B70]">
                        {fmtInt(row.verified)} verified
                      </div>
                    </div>
                    <div className="text-xl font-semibold tabular-nums">{fmtInt(row.value)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-[#FBFDF7] px-3 py-2.5 text-[11px] leading-relaxed text-[#4B5B42]">
                Calendar days in Addis Ababa time (UTC+3), Monday weeks. The same windows the Fleet and
                Velocity screens use.
              </div>
            </div>
          </div>

          {/* System status + Branch performance */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={`${card} p-6`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={16} className="text-[#6FBF0A]" />
                System Status
              </div>
              <div className="mt-4 space-y-3">
                {systemRows.map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F3F8EC] text-[#3F7A06]">
                      <row.icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{row.label}</div>
                      <div className="truncate text-[11px] text-[#7C8B70]">{row.detail}</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        row.ok ? "bg-[#EAF7DA] text-[#3F7A06]" : "bg-[#FDF6E7] text-[#7A5A10]"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${row.ok ? "bg-[#6FBF0A]" : "bg-[#D8A72A]"}`} />
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${card} xl:col-span-2 p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin size={16} className="text-[#6FBF0A]" />
                  Branch Performance
                </div>
                <span className="text-[11px] text-[#7C8B70]">
                  {RANGE_LABEL[range]} · registrations
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.1em] text-[#7C8B70]">
                      <th className="pb-2 text-left font-semibold">Branch</th>
                      <th className="pb-2 text-right font-semibold">Schools</th>
                      <th className="pb-2 text-right font-semibold">Active / Total</th>
                      <th className="pb-2 text-right font-semibold">Today</th>
                      <th className="pb-2 pl-6 text-left font-semibold">{RANGE_LABEL[range]}</th>
                      <th className="pb-2 text-right font-semibold">Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF4E5]">
                    {branchRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-[#7C8B70]">
                          No registrations recorded in this window.
                        </td>
                      </tr>
                    )}
                    {branchRows.map((row) => (
                      <tr key={row.branch}>
                        <td className="py-3">
                          <div className="flex items-center gap-2 font-medium">
                            <Building2 size={13} className="text-[#6FBF0A]" />
                            {row.branch}
                          </div>
                        </td>
                        <td className="py-3 text-right tabular-nums text-[#5C6B51]">
                          {row.schools || "—"}
                        </td>
                        <td className="py-3 text-right tabular-nums text-[#5C6B51]">
                          {row.operatorsOnline}/{row.operatorsTotal}
                        </td>
                        <td className="py-3 text-right tabular-nums font-medium">{fmtInt(row.today)}</td>
                        <td className="py-3 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-[#EDF4E5]">
                              <div
                                className="h-full rounded-full bg-[#85E510]"
                                style={{
                                  width: `${
                                    maxBranchPeriod > 0
                                      ? Math.max(2, Math.round((row.period / maxBranchPeriod) * 100))
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="w-12 text-right tabular-nums font-medium">{fmtInt(row.period)}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {row.verifiedRate === null ? "—" : `${row.verifiedRate}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Duplicate records — same name + father + grade + section + phone */}
          <div className={`${card} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Copy size={16} className="text-[#6FBF0A]" />
                  Duplicate Records
                </div>
                <div className="mt-1 text-xs text-[#7C8B70]">
                  Same name, father, grade, section and phone — keep one, review the rest
                </div>
              </div>
              {duplicates && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    duplicates.totalGroups > 0
                      ? "bg-[#FDF6E7] text-[#7A5A10]"
                      : "bg-[#EAF7DA] text-[#3F7A06]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${duplicates.totalGroups > 0 ? "bg-[#D8A72A]" : "bg-[#6FBF0A]"}`}
                  />
                  {duplicates.totalGroups === 0
                    ? "No duplicates found"
                    : `${fmtInt(duplicates.totalGroups)} groups · ${fmtInt(duplicates.extraRows)} extra rows`}
                </span>
              )}
            </div>

            {snapshot && !duplicates && (
              <div className="mt-4 rounded-xl bg-[#FBFDF7] px-3 py-2.5 text-[11px] text-[#7C8B70]">
                Duplicate classification did not answer this refresh; it retries on the next one.
              </div>
            )}

            {duplicates && duplicates.totalGroups > 0 && (
              <div className="mt-4 max-h-[380px] divide-y divide-[#EDF4E5] overflow-y-auto pr-1">
                {duplicates.groups.map((g) => {
                  const open = expandedDupes.has(g.key);
                  return (
                    <div key={g.key} className="py-2.5 first:pt-0">
                      <button
                        type="button"
                        onClick={() => toggleDupe(g.key)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                            g.count > 2 ? "bg-[#FBE3E3] text-[#B42318]" : "bg-[#FDF6E7] text-[#7A5A10]"
                          }`}
                        >
                          ×{g.count}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{g.fullName}</div>
                          <div className="truncate text-[11px] text-[#7C8B70]">
                            {g.guardianFullName ? `Father: ${g.guardianFullName} · ` : ""}
                            {g.grade}
                            {g.section ? ` ${g.section}` : ""}
                            {g.phone ? ` · ${g.phone}` : ""}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-medium text-[#3F7A06]">
                          {open ? "Hide" : "Review"}
                        </span>
                      </button>
                      {open && (
                        <div className="mt-2 overflow-x-auto rounded-xl border border-[#EDF4E5]">
                          <table className="w-full min-w-[560px] text-xs">
                            <thead>
                              <tr className="text-left text-[10px] uppercase tracking-wide text-[#7C8B70]">
                                <th className="px-3 py-2 font-semibold">Student ID</th>
                                <th className="px-3 py-2 font-semibold">School</th>
                                <th className="px-3 py-2 font-semibold">Registered</th>
                                <th className="px-3 py-2 font-semibold">Photo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EDF4E5]">
                              {g.members.map((m) => (
                                <tr key={m.studentId}>
                                  <td className="px-3 py-2 font-mono">{m.studentId}</td>
                                  <td className="px-3 py-2">{m.school || "—"}</td>
                                  <td className="px-3 py-2">
                                    {m.createdAt ? m.createdAt.slice(0, 10) : "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {m.photoVerified ? (
                                      <span className="text-[#3F7A06]">Verified</span>
                                    ) : (
                                      <span className="text-[#7A5A10]">Pending</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {duplicates.truncated && (
                  <div className="py-3 text-center text-[11px] text-[#7C8B70]">
                    Showing the first {duplicates.groups.length} of {fmtInt(duplicates.totalGroups)} groups —
                    clearing the oldest copies reveals the rest.
                  </div>
                )}
              </div>
            )}

            {duplicates && (
              <div className="mt-3 text-[11px] text-[#7C8B70]">
                Source: {duplicates.source === "d1" ? "D1 aggregate" : "Supabase"} ·{" "}
                {fmtInt(duplicates.totalStudents)} rows scanned · {duplicates.queryLatencyMs} ms
              </div>
            )}
          </div>

          {/* Recent activity + live branches */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={`${card} xl:col-span-2 p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock size={16} className="text-[#6FBF0A]" />
                  Recent Activity
                </div>
                <span className="text-[11px] text-[#7C8B70]">
                  latest {snapshot.logs.length}
                </span>
              </div>
              <div className="mt-4 divide-y divide-[#EDF4E5]">
                {snapshot.logs.length === 0 && (
                  <div className="py-6 text-center text-sm text-[#7C8B70]">No audit entries recorded yet.</div>
                )}
                {snapshot.logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F3F8EC] text-[#3F7A06]">
                      <CheckCircle2 size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{actionLabel(log.action)}</div>
                      <div className="truncate text-[11px] text-[#7C8B70]">
                        {log.user?.username || "SYSTEM"} · {log.entityType || "Record"}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-[#7C8B70]">
                      {log.createdAt ? formatAgo(new Date(log.createdAt).getTime(), snapshot.fetchedAt) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${card} p-6`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Radio size={16} className="text-[#6FBF0A]" />
                Live Branch Velocity
              </div>
              <div className="mt-4 space-y-3">
                {branchRows.length === 0 && (
                  <div className="text-sm text-[#7C8B70]">No branch activity in this window.</div>
                )}
                {branchRows.slice(0, 6).map((row) => {
                  const share = chartTotals.count > 0 ? (row.period / chartTotals.count) * 100 : 0;
                  return (
                    <div key={row.branch}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{row.branch}</span>
                        <span className="text-[#7C8B70]">
                          {fmtInt(row.period)} · {share.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EDF4E5]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#85E510] to-[#3F7A06]"
                          style={{ width: `${Math.max(1, Math.min(100, share))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 size={16} className="text-[#6FBF0A]" />
                  Branch Locations
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {DEFAULT_BRANCHES.map((branch) => (
                    <span
                      key={branch}
                      className="rounded-full border border-[#E3EFD7] px-2.5 py-1 text-[11px] font-medium text-[#4B5B42]"
                    >
                      {branch} · {BRANCH_SCHOOL_MAP[branch]?.length ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-[11px] text-[#7C8B70]">
            <span className="inline-flex items-center gap-1.5">
              <Activity size={12} />
              {isStale ? "Snapshot is older than 90s — refresh running" : "Snapshot is current"}
            </span>
            <span>stats {snapshot.latency.stats} ms</span>
            <span>flow {snapshot.latency.flow} ms</span>
            <span>dupes {snapshot.latency.dupes} ms</span>
            <span>health {snapshot.latency.health} ms</span>
            <span>total {snapshot.latency.total} ms</span>
            <span>worker {snapshot.health?.version || "—"}</span>
            {stats && stats.statsComplete === false && (
              <span className="text-[#7A5A10]">
                Stats served from last complete snapshot
                {stats.statsMissing?.length ? ` (${stats.statsMissing.join(", ")})` : ""}
              </span>
            )}
          </div>
        </>
      )}

      <span className="sr-only">
        {autoRefresh ? `Auto refresh every ${REFRESH_INTERVAL_MS / 1000} seconds` : "Auto refresh paused"}
      </span>
    </PageShell>
  );
};

export default AdminDashboardPage;
