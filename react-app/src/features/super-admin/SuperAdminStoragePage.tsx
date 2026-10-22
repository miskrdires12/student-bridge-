import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAuthHeaders } from '@/lib/store';
import {
  HardDrive,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  FolderTree,
  ShieldCheck,
  Image as ImageIcon,
  Boxes,
  ChevronDown,
  ChevronUp,
  ArrowUpDown
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Payload shape served by /api/admin/supabase-status                  */
/* ------------------------------------------------------------------ */

interface FolderStat {
  name: string;
  fileCount: number;
  sizeBytes: number;
  sizeFormatted: string;
}

interface DatabaseStats {
  studentsCount?: number;
  studentsWithPhotos?: number;
  studentsWithoutPhotos?: number;
  usersCount?: number;
  batchesCount?: number;
  auditLogsCount?: number;
  studentPhotosCatalogCount?: number;
  totalDatabaseRecords?: number;
}

interface StorageStatusData {
  databaseConnected?: boolean;
  databaseLatencyMs?: number;
  storageConnected?: boolean;
  storageBucket?: string;
  storageProvider?: string;
  storagePublicBaseUrl?: string;
  storageFileCount?: number;
  storageSizeBytes?: number;
  storageSizeFormatted?: string;
  storageFolders?: FolderStat[];
  database?: DatabaseStats;
  lastActivity?: string;
  timestamp?: string;
}

interface EdgeRealSizeData {
  success?: boolean;
  bucket?: string;
  totalObjects?: number;
  totalBytes?: number;
  formatted?: string;
  verified?: boolean;
  lastScanned?: string;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers (never fabricate — null renders as em dash)      */
/* ------------------------------------------------------------------ */

const fmtInt = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '—';

const fmtBytes = (bytes: number | null | undefined): string => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const pctOf = (part: number, total: number): number =>
  total > 0 && Number.isFinite(part) ? Math.min((part / total) * 100, 100) : 0;

/* ------------------------------------------------------------------ */
/* Reusable primitives                                                  */
/* ------------------------------------------------------------------ */

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, aside, children }) => (
  <section className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19] shadow-xs">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-[#dce7e1] dark:border-[#223126]">
      <div className="flex items-center gap-2.5">
        <span className="text-[#366804] dark:text-[#8fe617]">{icon}</span>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-[#0B1118] dark:text-white">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {aside}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const StatCell: React.FC<{ label: string; value: string; sub?: string; accent?: boolean }> = ({
  label,
  value,
  sub,
  accent = false
}) => (
  <div className="bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] p-3.5">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {label}
    </span>
    <span
      className={`block text-xl font-black mt-1 tabular-nums ${
        accent ? 'text-[#366804] dark:text-[#9EE617]' : 'text-[#0B1118] dark:text-white'
      }`}
    >
      {value}
    </span>
    {sub && <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</span>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

type PrefixSortKey = 'size' | 'files' | 'name';

export const SuperAdminStoragePage: React.FC = () => {
  const [data, setData] = useState<StorageStatusData | null>(null);
  const [edgeStats, setEdgeStats] = useState<EdgeRealSizeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<PrefixSortKey>('size');
  const [sortDesc, setSortDesc] = useState(true);

  const load = useCallback(async (force: boolean) => {
    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/supabase-status${force ? '?refresh=true' : ''}`,
        { cache: 'no-store', headers: getAuthHeaders() }
      );
      if (!res.ok) {
        throw new Error(`Live scan endpoint returned HTTP ${res.status}`);
      }
      const json: StorageStatusData = await res.json();
      setData(json);
      setFetchedAt(new Date().toISOString());
    } catch (err) {
      // Honest failure state — never inject placeholder numbers.
      setData(null);
      setEdgeStats(null);
      setError(err instanceof Error ? err.message : 'Live scan request failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    // Independent edge object-listing cross-check; absence is displayed, not faked.
    try {
      const r = await fetch('/api/storage/real-size', { cache: 'no-store' });
      setEdgeStats(r.ok ? await r.json().catch(() => null) : null);
    } catch {
      setEdgeStats(null);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const folders = useMemo<FolderStat[]>(() => {
    const list = Array.isArray(data?.storageFolders) ? data!.storageFolders! : [];
    const sorted = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * (sortDesc ? -1 : 1);
      const av = sortKey === 'size' ? a.sizeBytes : a.fileCount;
      const bv = sortKey === 'size' ? b.sizeBytes : b.fileCount;
      return (av - bv) * (sortDesc ? -1 : 1);
    });
    return sorted;
  }, [data, sortKey, sortDesc]);

  const toggleSort = (key: PrefixSortKey) => {
    if (sortKey === key) {
      setSortDesc(v => !v);
    } else {
      setSortKey(key);
      setSortDesc(key !== 'name');
    }
  };

  const db = data?.database;
  const fileCount = data?.storageFileCount;
  const sizeBytes = data?.storageSizeBytes;
  const studentsCount = db?.studentsCount;
  const withPhotos = db?.studentsWithPhotos;
  const withoutPhotos = db?.studentsWithoutPhotos;
  const catalogCount = db?.studentPhotosCatalogCount;
  const totalRecords = db?.totalDatabaseRecords;

  const totalBytes = typeof sizeBytes === 'number' ? sizeBytes : 0;
  const folderBytesSum = useMemo(() => folders.reduce((s, f) => s + f.sizeBytes, 0), [folders]);
  const folderFilesSum = useMemo(() => folders.reduce((s, f) => s + f.fileCount, 0), [folders]);
  const breakdownDenom = totalBytes > 0 ? totalBytes : folderBytesSum;

  const avgObjectBytes =
    typeof fileCount === 'number' && fileCount > 0 && typeof sizeBytes === 'number'
      ? sizeBytes / fileCount
      : null;

  const orphanDelta =
    typeof catalogCount === 'number' && typeof studentsCount === 'number'
      ? catalogCount - studentsCount
      : null;

  const edgeTotal = edgeStats?.totalObjects;
  const edgeBytes = edgeStats?.totalBytes;
  const edgeAligned =
    typeof edgeTotal === 'number' &&
    typeof fileCount === 'number' &&
    edgeTotal === fileCount &&
    typeof edgeBytes === 'number' &&
    edgeBytes === sizeBytes;

  const connected = !!data && data.storageConnected !== false;
  const lastScan = data?.timestamp || fetchedAt;

  const SortHeader: React.FC<{ label: string; sortFor: PrefixSortKey; align?: 'left' | 'right' }> = ({
    label,
    sortFor,
    align = 'right'
  }) => (
    <th className={`py-2 px-3 font-bold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => toggleSort(sortFor)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-[#0B1118] dark:hover:text-white cursor-pointer transition-colors ${
          sortKey === sortFor ? 'text-[#366804] dark:text-[#8fe617]' : ''
        }`}
      >
        <span>{label}</span>
        {sortKey === sortFor ? (
          sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-14 font-mono animate-in fade-in duration-200">
      {/* ── Bucket identity header ───────────────────────────────── */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#1b241f] flex items-center justify-center text-[#366804] dark:text-[#8fe617] shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black tracking-tight text-[#0B1118] dark:text-white">
                Storage Bucket Console
              </h1>
              {loading && !data ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#1b241f] text-slate-500 dark:text-slate-400">
                  SCANNING…
                </span>
              ) : error ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 inline-flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> OFFLINE
                </span>
              ) : connected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> LIVE · CONNECTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> DISCONNECTED
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-1 mt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Provider</dt>
                <dd className="text-[#0B1118] dark:text-white font-bold">{data?.storageProvider ?? '—'}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Bucket</dt>
                <dd className="text-[#0B1118] dark:text-white font-bold">{data?.storageBucket ?? '—'}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">DB latency</dt>
                <dd className="text-[#0B1118] dark:text-white font-bold tabular-nums">
                  {typeof data?.databaseLatencyMs === 'number' ? `${data?.databaseLatencyMs} ms` : '—'}
                </dd>
              </div>
              {data?.storagePublicBaseUrl && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <dt className="text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider shrink-0">Public URL</dt>
                  <dd className="text-[#366804] dark:text-[#8fe617] font-bold truncate max-w-[260px]">
                    {data.storagePublicBaseUrl}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 justify-end">
              <Clock className="w-3 h-3" /> Last scan
            </div>
            <div className="text-[11px] font-bold text-[#0B1118] dark:text-white mt-0.5">{fmtTime(lastScan)}</div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="px-3.5 py-2 rounded-2xl bg-[#9EE617] hover:bg-[#8fe617] disabled:opacity-50 text-[#062404] font-black text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer border border-[#366804]/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Scanning…' : 'Force live scan'}</span>
          </button>
        </div>
      </div>

      {/* ── Honest error state ───────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-black text-red-800 dark:text-red-300">Live scan failed</h2>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{error}</p>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/70 mt-1">
                No capacity figures are shown because the storage API is unreachable. Placeholder data is never displayed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="px-3 py-1.5 rounded-2xl border border-red-300 dark:border-red-800 bg-white dark:bg-[#161d19] text-red-700 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading placeholder (no numbers) ─────────────────────── */}
      {loading && !data && !error && (
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-8 text-center">
          <RefreshCw className="w-5 h-5 mx-auto text-[#366804] dark:text-[#8fe617] animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3">
            Querying live bucket inventory…
          </p>
        </div>
      )}

      {data && !error && (
        <>
          {/* ── Capacity Overview ──────────────────────────────────── */}
          <SectionCard
            icon={<Boxes className="w-4 h-4" />}
            title="Capacity Overview"
            subtitle="Object inventory reported by the latest live scan of the bucket"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCell label="Total objects" value={fmtInt(fileCount)} sub="Files in bucket" />
              <StatCell
                label="Total size"
                value={data.storageSizeFormatted || fmtBytes(sizeBytes)}
                sub={typeof sizeBytes === 'number' ? `${sizeBytes.toLocaleString()} bytes` : undefined}
                accent
              />
              <StatCell label="Avg object size" value={fmtBytes(avgObjectBytes)} sub="Size ÷ object count" />
              <StatCell
                label="Student-linked photos"
                value={fmtInt(withPhotos)}
                sub={
                  typeof withoutPhotos === 'number'
                    ? `${withoutPhotos.toLocaleString()} students without`
                    : undefined
                }
              />
              <StatCell label="Records in DB" value={fmtInt(totalRecords)} sub="All tables" />
            </div>

            {/* Edge cross-check line — real numbers or explicit unavailability */}
            <div className="mt-3 pt-3 border-t border-[#dce7e1] dark:border-[#223126] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Edge listing cross-check
              </span>
              {edgeStats && typeof edgeStats.totalObjects === 'number' ? (
                <>
                  <span className="text-[#0B1118] dark:text-white font-bold tabular-nums">
                    {edgeStats.totalObjects.toLocaleString()} objects · {edgeStats.formatted || fmtBytes(edgeStats.totalBytes)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      edgeAligned
                        ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {edgeAligned ? 'ALIGNED WITH STATUS API' : 'DIVERGED — RE-SCAN ADVISED'}
                  </span>
                  {edgeStats.lastScanned && (
                    <span className="text-slate-400 dark:text-slate-500">edge scan {fmtTime(edgeStats.lastScanned)}</span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-bold">
                  Unavailable — /api/storage/real-size did not respond
                </span>
              )}
            </div>
          </SectionCard>

          {/* ── Prefix Breakdown ───────────────────────────────────── */}
          <SectionCard
            icon={<FolderTree className="w-4 h-4" />}
            title="Prefix Breakdown"
            subtitle="Objects grouped by top-level R2 prefix, from the live bucket listing"
            aside={
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                {folders.length} prefix{folders.length === 1 ? '' : 'es'}
              </span>
            }
          >
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e1] dark:border-[#223126]">
              <table className="w-full text-[11px] font-mono text-left">
                <thead className="bg-[#f7faf9] dark:bg-[#1b241f] text-slate-500 dark:text-slate-400 text-[10px] border-b border-[#dce7e1] dark:border-[#223126]">
                  <tr>
                    <SortHeader label="Prefix" sortFor="name" align="left" />
                    <SortHeader label="Files" sortFor="files" />
                    <SortHeader label="Size" sortFor="size" />
                    <th className="py-2 px-3 font-bold uppercase tracking-wider w-[34%]">
                      <span className="float-right">Share of total</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7e1] dark:divide-[#223126]">
                  {folders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-slate-500 dark:text-slate-400">
                        <AlertCircle className="w-4 h-4 mx-auto mb-1.5 text-slate-400" />
                        No prefixes returned by the live scan. Run “Force live scan” to refresh the bucket listing.
                      </td>
                    </tr>
                  ) : (
                    folders.map(f => {
                      const pct = pctOf(f.sizeBytes, breakdownDenom);
                      return (
                        <tr key={f.name} className="hover:bg-[#f7faf9] dark:hover:bg-[#1b241f] transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#1b241f] text-[#0B1118] dark:text-white font-bold">
                              <FolderTree className="w-3 h-3 text-slate-400" />
                              {f.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#0B1118] dark:text-white">
                            {fmtInt(f.fileCount)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#0B1118] dark:text-white">
                            {f.sizeFormatted || fmtBytes(f.sizeBytes)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-[#dce7e1] dark:bg-[#223126] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#8fe617] dark:bg-[#9EE617]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-12 text-right tabular-nums text-slate-500 dark:text-slate-400 font-bold">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {folders.length > 0 && (
                  <tfoot className="bg-[#f7faf9] dark:bg-[#1b241f] border-t border-[#dce7e1] dark:border-[#223126]">
                    <tr>
                      <td className="py-2.5 px-3 font-black uppercase text-[10px] tracking-wider text-slate-500 dark:text-slate-400">
                        Prefix sum
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118] dark:text-white">
                        {folderFilesSum.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118] dark:text-white">
                        {fmtBytes(folderBytesSum)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-500 dark:text-slate-400">
                        {breakdownDenom > 0 ? `${pctOf(folderBytesSum, breakdownDenom).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </SectionCard>

          {/* ── Integrity ──────────────────────────────────────────── */}
          <SectionCard
            icon={<ShieldCheck className="w-4 h-4" />}
            title="Integrity"
            subtitle="Photo coverage across the student roster and catalog-row consistency"
          >
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e1] dark:border-[#223126]">
              <table className="w-full text-[11px] font-mono text-left">
                <thead className="bg-[#f7faf9] dark:bg-[#1b241f] text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider border-b border-[#dce7e1] dark:border-[#223126]">
                  <tr>
                    <th className="py-2 px-3 font-bold">Check</th>
                    <th className="py-2 px-3 font-bold text-right">Value</th>
                    <th className="py-2 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7e1] dark:divide-[#223126]">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        Students with linked photos
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118] dark:text-white">
                      {fmtInt(withPhotos)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                        {pctOf(withPhotos ?? 0, studentsCount ?? 0).toFixed(1)}% of roster
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Students without photo links
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118] dark:text-white">
                      {fmtInt(withoutPhotos)}
                    </td>
                    <td className="py-2.5 px-3">
                      {typeof withoutPhotos === 'number' && withoutPhotos > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                          Coverage gap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Full coverage
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        Photo catalog rows vs student rows
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118] dark:text-white">
                      {fmtInt(catalogCount)} / {fmtInt(studentsCount)}
                    </td>
                    <td className="py-2.5 px-3">
                      {orphanDelta === null ? (
                        <span className="text-slate-400 font-bold">—</span>
                      ) : orphanDelta > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          {orphanDelta.toLocaleString()} orphan catalog row{orphanDelta === 1 ? '' : 's'}
                        </span>
                      ) : orphanDelta < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          {Math.abs(orphanDelta).toLocaleString()} student{Math.abs(orphanDelta) === 1 ? '' : 's'} without catalog row
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Aligned
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        Bucket objects vs student-linked photos
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118] dark:text-white">
                      {fmtInt(fileCount)} / {fmtInt(withPhotos)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                      {typeof fileCount === 'number' && typeof withPhotos === 'number'
                        ? `${(fileCount - withPhotos).toLocaleString()} non-roster objects (diagnostics, exports, misc prefixes)`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default SuperAdminStoragePage;
