import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, CalendarDays, ChevronDown, Layers, Loader2,
  RefreshCw, Target, TrendingDown, TrendingUp, Users, WifiOff
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  FleetSenderRow, FleetTelemetryPayload, getFleetTelemetrySnapshot, refreshFleetTelemetry
} from '@/lib/store';
import { getQueueSummary } from '@/lib/offlineQueue';

type Period = 'DAY' | 'WEEK' | 'MONTH';

const PERIOD_DAYS: Record<Period, number> = { DAY: 1, WEEK: 7, MONTH: 30 };
const PERIOD_LABEL: Record<Period, string> = { DAY: 'Daily', WEEK: 'Weekly', MONTH: 'Monthly' };
const SCHOOL_TZ = 'Africa/Addis_Ababa';

const dayFormatter = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: SCHOOL_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    });
  } catch {
    return null;
  }
})();

// School-local calendar day key (UTC+3, no DST) — matches the server rollups.
export function schoolDayKey(ts: number): string {
  if (dayFormatter) {
    try {
      return dayFormatter.format(new Date(ts));
    } catch {
      /* fall through */
    }
  }
  return new Date(ts).toISOString().slice(0, 10);
}

const shortDay = (key: string) => key.slice(5);

const tooltipStyle = {
  background: '#0b1118',
  border: '1px solid #223126',
  borderRadius: '12px',
  color: '#f2f7f4',
  font: '500 11px ui-monospace, monospace',
  padding: '6px 10px'
};

type QueueState = { pending: number; failed: number; total: number; lastSyncAt: string | null };

export const DashboardAnalytics: React.FC<{ actions?: React.ReactNode }> = ({ actions }) => {
  const [period, setPeriod] = useState<Period>('DAY');
  const [asOf, setAsOf] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [senderFilter, setSenderFilter] = useState<string>('ALL');
  const [fleet, setFleet] = useState<FleetTelemetryPayload | null>(() => getFleetTelemetrySnapshot());
  const [queue, setQueue] = useState<QueueState>({ pending: 0, failed: 0, total: 0, lastSyncAt: null });
  const [isLoading, setIsLoading] = useState<boolean>(() => !getFleetTelemetrySnapshot());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' && navigator.onLine === false);

  const loadTelemetry = useCallback(async () => {
    const payload = await refreshFleetTelemetry();
    if (payload) {
      setFleet(payload);
      setLoadError(null);
    } else {
      setLoadError('Telemetry feed unreachable — server totals could not be read.');
    }
    setIsLoading(false);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) setIsOffline(true);
    else setIsOffline(false);
  }, []);

  useEffect(() => {
    loadTelemetry();
    getQueueSummary().then(setQueue).catch(() => {});
    const interval = setInterval(() => {
      loadTelemetry();
      getQueueSummary().then(setQueue).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [loadTelemetry]);

  const daySeries = fleet?.totals?.daily ?? [];
  const latestKey = fleet?.todayKey || daySeries[daySeries.length - 1]?.date || schoolDayKey(Date.now());
  const earliestKey = daySeries[0]?.date || latestKey;

  const effectiveAsOf = useMemo(() => {
    if (!asOf || asOf > latestKey) return latestKey;
    if (asOf < earliestKey) return earliestKey;
    return asOf;
  }, [asOf, latestKey, earliestKey]);

  const windowKeys = useMemo(() => {
    if (!daySeries.length) return [];
    const idx = daySeries.findIndex(d => d.date === effectiveAsOf);
    const end = idx >= 0 ? idx : daySeries.length - 1;
    const days = PERIOD_DAYS[period];
    return daySeries.slice(Math.max(0, end - days + 1), end + 1).map(d => d.date);
  }, [daySeries, effectiveAsOf, period]);

  const previousKeys = useMemo(() => {
    if (!daySeries.length) return [];
    const idx = daySeries.findIndex(d => d.date === effectiveAsOf);
    const end = idx >= 0 ? idx : daySeries.length - 1;
    const days = PERIOD_DAYS[period];
    const prev = daySeries.slice(Math.max(0, end - days * 2 + 1), end - days + 1).map(d => d.date);
    return prev.length === days ? prev : [];
  }, [daySeries, effectiveAsOf, period]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    (fleet?.senders || []).forEach(s => set.add(s.branch || 'Unassigned'));
    return Array.from(set).sort();
  }, [fleet]);

  const senderNames = useMemo(
    () => (fleet?.senders || []).map(s => s.username || s.key).sort(),
    [fleet]
  );

  const filteredSenders = useMemo(() => {
    const list = fleet?.senders || [];
    return list.filter(s => {
      const branch = s.branch || 'Unassigned';
      if (branchFilter !== 'ALL' && branch !== branchFilter) return false;
      if (senderFilter !== 'ALL' && (s.username || s.key) !== senderFilter) return false;
      return true;
    });
  }, [fleet, branchFilter, senderFilter]);

  const sumWindow = (sender: FleetSenderRow, keys: string[]) =>
    keys.reduce((acc, k) => acc + (sender.daily?.[k] || 0), 0);

  const model = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const countFor = (keys: string[]) =>
      keys.map(k => ({
        date: shortDay(k),
        full: k,
        count: filteredSenders.reduce((acc, s) => acc + (s.daily?.[k] || 0), 0)
      }));

    const chart = countFor(windowKeys);

    // 14-day context ending on the selected day (for the Daily view)
    const ctxIdx = daySeries.findIndex(d => d.date === effectiveAsOf);
    const ctxEnd = ctxIdx >= 0 ? ctxIdx : daySeries.length - 1;
    const contextKeys = daySeries.slice(Math.max(0, ctxEnd - 13), ctxEnd + 1).map(d => d.date);
    const context14 = countFor(contextKeys);

    const total = chart.reduce((acc, d) => acc + d.count, 0);
    const previousTotal = previousKeys.length
      ? filteredSenders.reduce((acc, s) => acc + sumWindow(s, previousKeys), 0)
      : null;

    const perSender = filteredSenders
      .map(s => ({
        sender: s,
        name: s.username || s.key,
        branch: s.branch || 'Unassigned',
        count: sumWindow(s, windowKeys),
        lifetime: s.total
      }))
      .filter(row => row.count > 0)
      .sort((a, b) => b.count - a.count);

    const byBranch = new Map<string, { count: number; senders: Set<string> }>();
    filteredSenders.forEach(s => {
      const branch = s.branch || 'Unassigned';
      const bucket = byBranch.get(branch) || { count: 0, senders: new Set<string>() };
      const inPeriod = sumWindow(s, windowKeys);
      bucket.count += inPeriod;
      if (inPeriod > 0) bucket.senders.add(s.username || s.key);
      byBranch.set(branch, bucket);
    });
    const branchRows = Array.from(byBranch.entries())
      .map(([branch, bucket]) => ({ branch, count: bucket.count, activeSenders: bucket.senders.size }))
      .filter(r => r.count > 0 || branchFilter === r.branch)
      .sort((a, b) => b.count - a.count);

    const weeklyRollup: { label: string; count: number }[] = [];
    if (period === 'MONTH') {
      for (let i = 0; i < windowKeys.length; i += 7) {
        const chunk = windowKeys.slice(i, i + 7);
        weeklyRollup.push({
          label: `W${weeklyRollup.length + 1} ${shortDay(chunk[0])}`,
          count: chunk.reduce((acc, k) => acc + filteredSenders.reduce((a, s) => a + (s.daily?.[k] || 0), 0), 0)
        });
      }
    }

    const terminals = filteredSenders.length;
    const dailyTarget = fleet?.senderDailyTarget || 50;
    const targetTotal = dailyTarget * terminals * days;
    const activeSenders = perSender.length;
    const participation = terminals > 0 ? Math.round((activeSenders / terminals) * 100) : 0;
    const avgPerDay = windowKeys.length > 0 ? Math.round((total / windowKeys.length) * 10) / 10 : 0;

    return {
      chart,
      context14,
      total,
      previousTotal,
      perSender,
      branchRows,
      weeklyRollup,
      terminals,
      activeSenders,
      participation,
      dailyTarget,
      targetTotal,
      targetPct: targetTotal > 0 ? Math.round((total / targetTotal) * 100) : 0,
      avgPerDay,
      windowStart: windowKeys[0] || effectiveAsOf,
      windowEnd: effectiveAsOf,
      days
    };
  }, [windowKeys, previousKeys, filteredSenders, period, fleet, branchFilter, effectiveAsOf]);

  const delta = model.previousTotal === null ? null : model.total - model.previousTotal;
  const deltaPct = model.previousTotal && model.previousTotal > 0 && delta !== null
    ? Math.round((delta / model.previousTotal) * 100)
    : null;

  const hasSnapshot = !!fleet;
  const periodRangeLabel = model.days === 1
    ? model.windowEnd
    : `${model.windowStart} → ${model.windowEnd} (${model.days} calendar days)`;

  return (
    <div className="w-full rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-5">
      {/* Reporting controls */}
      <div className="flex flex-col gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#8fe617]" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-mono">
              Operational Analytics
            </h2>
            <p className="text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
              {PERIOD_LABEL[period]} status &bull; {periodRangeLabel} &bull; school timezone {SCHOOL_TZ}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 rounded-2xl border border-[#dce7e1] dark:border-[#223126] p-1">
            {(['DAY', 'WEEK', 'MONTH'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                title={`${PERIOD_LABEL[p]} report — last ${PERIOD_DAYS[p]} school-local calendar day${PERIOD_DAYS[p] > 1 ? 's' : ''} up to the selected date`}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-[#8fe617] text-[#062404] shadow-xs'
                    : 'text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]'
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7771] dark:text-[#8a9e93]">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">As of</span>
            <input
              type="date"
              value={effectiveAsOf}
              min={earliestKey}
              max={latestKey}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-2 py-1 text-xs text-[#080808] dark:text-[#f2f7f4] outline-none"
            />
          </label>

          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] pl-2.5 pr-7 py-1 text-xs text-[#080808] dark:text-[#f2f7f4] outline-none"
            >
              <option value="ALL">All branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1.5 h-3.5 w-3.5 text-[#6b7771]" />
          </div>

          <div className="relative">
            <select
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              className="max-w-[150px] rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] pl-2.5 pr-7 py-1 text-xs text-[#080808] dark:text-[#f2f7f4] outline-none"
            >
              <option value="ALL">All senders</option>
              {senderNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1.5 h-3.5 w-3.5 text-[#6b7771]" />
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              loadTelemetry();
              getQueueSummary().then(setQueue).catch(() => {});
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] px-2.5 py-1 text-[11px] font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] transition-colors cursor-pointer"
            title="Re-read the server telemetry rollup (cached 60s server-side)"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actions}

      {isOffline && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>
            Offline{hasSnapshot ? ` — showing the last server snapshot (${fleet!.updatedAt.replace('T', ' ').slice(0, 19)} UTC).` : ' — no server snapshot available yet.'}
          </span>
        </div>
      )}

      {!isOffline && loadError && !hasSnapshot && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-300/60 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-[11px] font-mono font-bold text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {isLoading && !hasSnapshot ? (
        <div className="flex items-center justify-center gap-2 py-16 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
          <Loader2 className="h-4 w-4 animate-spin text-[#8fe617]" />
          <span>Reading verified registration rollups from the server…</span>
        </div>
      ) : !hasSnapshot ? (
        <div className="rounded-2xl border border-dashed border-[#dce7e1] dark:border-[#223126] p-10 text-center text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
          No analytics snapshot yet. Sign in with an authorized station and refresh.
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                <span>Verified {PERIOD_LABEL[period].toLowerCase()} registrations</span>
                <Activity className="h-3.5 w-3.5 text-[#8fe617]" />
              </div>
              <div className="mt-1.5 text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {model.total.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                {delta === null ? (
                  <span>No prior-period history in the 62-day window</span>
                ) : (
                  <>
                    {delta >= 0
                      ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                    <span className={delta >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-700 dark:text-rose-400 font-bold'}>
                      {delta >= 0 ? '+' : ''}{delta.toLocaleString()}
                      {deltaPct !== null ? ` (${delta >= 0 ? '+' : ''}${deltaPct}%)` : ''}
                    </span>
                    <span>vs prior {model.days} days</span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                <span>Sender participation</span>
                <Users className="h-3.5 w-3.5 text-[#8fe617]" />
              </div>
              <div className="mt-1.5 text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {model.activeSenders}<span className="text-base text-[#6b7771] dark:text-[#8a9e93]"> / {model.terminals}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-[#1c261e] overflow-hidden">
                <div className="h-full bg-[#8fe617] transition-all duration-500" style={{ width: `${model.participation}%` }} />
              </div>
              <div className="mt-1 text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                {model.participation}% of terminals registered at least 1 record &bull; {model.avgPerDay}/day avg
              </div>
            </div>

            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                <span>Target vs actual</span>
                <Target className="h-3.5 w-3.5 text-[#8fe617]" />
              </div>
              <div className="mt-1.5 text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {model.total.toLocaleString()}
                <span className="text-base text-[#6b7771] dark:text-[#8a9e93]"> / {model.targetTotal.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-[#1c261e] overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${model.targetPct >= 100 ? 'bg-emerald-500' : 'bg-[#8fe617]'}`}
                  style={{ width: `${Math.min(100, model.targetPct)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]" title={`Target basis: ${model.dailyTarget} registrations per sender per day × ${model.terminals} sender terminals in scope × ${model.days} day(s)`}>
                {model.targetPct}% of plan &bull; {model.dailyTarget}/sender/day × {model.terminals} × {model.days}d
              </div>
            </div>

            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                <span>Sync health (this terminal)</span>
                <Layers className="h-3.5 w-3.5 text-[#8fe617]" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-3 font-mono">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400" title="Operations still queued in this browser's offline queue">{queue.pending}</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400" title="Operations that failed after 3 automatic retries">{queue.failed}</span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                pending &bull; failed &bull; last sync {queue.lastSyncAt ? queue.lastSyncAt.replace('T', ' ').slice(0, 16) : 'never'}
              </div>
              <div className="mt-1 text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]" title="Deduplicated server records. 'Attributed' rows carry a sender name; 'unattributed' rows are legacy or imported records with no sender, so they appear in the Student directory total but not in any sender's lifetime count.">
                server records: {(fleet.totals.totalRecords ?? fleet.totals.totalVerified).toLocaleString()} &bull; attributed {fleet.totals.totalVerified.toLocaleString()} &bull; unattributed {(fleet.totals.unattributedRecords ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-[#dce7e1] dark:border-[#223126] p-4">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                <span>
                  {period === 'MONTH' ? 'Daily trend — last 30 calendar days' : `Registrations per day — ${model.days === 1 ? '14-day context, selected day is the rightmost bar' : `${model.days}-day window`}`}
                </span>
                <span className="text-[10px] normal-case">source: /api/telemetry/senders (Supabase rollup)</span>
              </div>
              <div className="h-56 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  {period === 'MONTH' ? (
                    <AreaChart data={model.chart} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8fe617" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#8fe617" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef5f1" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7771' }} interval={4} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7771' }} allowDecimals={false} tickLine={false} axisLine={false} width={44} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} registrations`, 'Verified']} labelFormatter={(l: any) => `Day ${l}`} />
                      <Area type="monotone" dataKey="count" stroke="#256002" strokeWidth={2} fill="url(#dashArea)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={period === 'DAY' ? model.context14 : model.chart} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef5f1" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7771' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7771' }} allowDecimals={false} tickLine={false} axisLine={false} width={44} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} registrations`, 'Verified']} labelFormatter={(l: any) => `Day ${l}`} />
                      <Bar dataKey="count" fill="#8fe617" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] p-4">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                Branch comparison
              </div>
              {model.branchRows.length === 0 ? (
                <div className="mt-6 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
                  No branch activity recorded in this period.
                </div>
              ) : (
                <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {model.branchRows.map((row) => {
                    const max = model.branchRows[0].count || 1;
                    const share = model.total > 0 ? Math.round((row.count / model.total) * 100) : 0;
                    return (
                      <div key={row.branch}>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-[#080808] dark:text-[#f2f7f4] truncate">{row.branch}</span>
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">{row.count.toLocaleString()} &bull; {share}%</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-neutral-200 dark:bg-[#1c261e] overflow-hidden">
                          <div className="h-full bg-[#8fe617]" style={{ width: `${Math.max(3, Math.round((row.count / max) * 100))}%` }} />
                        </div>
                        <div className="mt-0.5 text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                          {row.activeSenders} active sender{row.activeSenders === 1 ? '' : 's'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {period === 'MONTH' && model.weeklyRollup.length > 1 && (
            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] p-4">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                Weekly rollup inside the 30-day window
              </div>
              <div className="h-40 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.weeklyRollup} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7771' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7771' }} allowDecimals={false} tickLine={false} axisLine={false} width={44} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} registrations`, 'Verified']} />
                    <Bar dataKey="count" fill="#8fe617" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sender ranking */}
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#eef5f1] dark:border-[#1c261e]">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                Sender ranking — {PERIOD_LABEL[period].toLowerCase()} ({model.windowStart} → {model.windowEnd})
              </div>
              <span className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                rank metric: verified registrations in period
              </span>
            </div>
            {model.perSender.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
                No sender recorded a verified registration in this period. Adjust the date, branch or sender filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="text-[10px] uppercase tracking-wider text-[#6b7771] dark:text-[#8a9e93] bg-[#f7faf9] dark:bg-[#070908]">
                    <tr>
                      <th className="px-4 py-2 font-bold">#</th>
                      <th className="px-2 py-2 font-bold">Sender</th>
                      <th className="px-2 py-2 font-bold">Branch</th>
                      <th className="px-2 py-2 text-right font-bold">In period</th>
                      <th className="px-2 py-2 text-right font-bold">Share</th>
                      <th className="px-2 py-2 text-right font-bold">Avg/day</th>
                      <th className="px-2 py-2 text-right font-bold">Target</th>
                      <th className="px-4 py-2 text-right font-bold">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef5f1] dark:divide-[#1c261e] text-[#080808] dark:text-[#f2f7f4]">
                    {model.perSender.slice(0, 12).map((row, idx) => {
                      const share = model.total > 0 ? Math.round((row.count / model.total) * 100) : 0;
                      const perDay = model.days > 0 ? Math.round((row.count / model.days) * 10) / 10 : 0;
                      const targetPct = Math.round((row.count / (model.dailyTarget * model.days)) * 100);
                      return (
                        <tr key={row.name}>
                          <td className="px-4 py-2 text-[#6b7771] dark:text-[#8a9e93]">{idx + 1}</td>
                          <td className="px-2 py-2 font-bold truncate max-w-[160px]">{row.name}</td>
                          <td className="px-2 py-2 text-[#6b7771] dark:text-[#8a9e93] truncate max-w-[140px]">{row.branch}</td>
                          <td className="px-2 py-2 text-right font-bold">{row.count.toLocaleString()}</td>
                          <td className="px-2 py-2 text-right">{share}%</td>
                          <td className="px-2 py-2 text-right">{perDay}</td>
                          <td className={`px-2 py-2 text-right font-bold ${targetPct >= 100 ? 'text-emerald-600' : targetPct >= 50 ? 'text-amber-600' : 'text-[#6b7771] dark:text-[#8a9e93]'}`}>
                            {targetPct}%
                          </td>
                          <td className="px-4 py-2 text-right">{row.lifetime.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Metric definitions */}
          <div className="rounded-2xl border border-dashed border-[#dce7e1] dark:border-[#223126] px-4 py-3 text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93] space-y-1">
            <div className="font-bold uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">Metric definitions</div>
            <div>&bull; Verified registration: a distinct Student ID stored on the server (deduplicated, retries and replays never add a second record).</div>
            <div>&bull; Sender counts cover records that carry a sender name; the Student directory total also includes unattributed legacy/imported records (shown in Sync health).</div>
            <div>&bull; Periods are school-local calendar days ({SCHOOL_TZ}); every record falls in exactly one day bucket, so charts cannot double-count.</div>
            <div>&bull; Daily/weekly/monthly totals = sum of the last 1/7/30 calendar day buckets up to the selected "As of" date — identical to Fleet and Telemetry Velocity.</div>
            <div>&bull; Pending / failed operations come from this workstation's offline queue; other terminals' queues are not visible server-side.</div>
            <div>&bull; Snapshot computed server-side at {fleet.updatedAt.replace('T', ' ').slice(0, 19)} UTC (cached 60s).</div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardAnalytics;
