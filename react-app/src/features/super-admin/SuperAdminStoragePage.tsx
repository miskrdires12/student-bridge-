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
  ArrowUpDown,
  FileText,
  Layers,
  Cloud
} from 'lucide-react';
import { PageShell, PageHero, FactGrid, FactCard, PrimaryButton } from '@/components/ui/PageKit';

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
  <section className="overflow-hidden rounded-2xl border border-[#E3EFD7] bg-white shadow-sm">
    <header className="flex flex-col justify-between gap-2 border-b border-[#EDF4E5] px-3.5 py-2.5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[#6FBF0A]">{icon}</span>
        <div>
          <h2 className="text-sm font-black tracking-tight text-[#0B1118]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] font-medium text-[#7C8B70]">{subtitle}</p>
          )}
        </div>
      </div>
      {aside}
    </header>
    <div className="p-3.5">{children}</div>
  </section>
);

const StatCell: React.FC<{ label: string; value: string; sub?: string; accent?: boolean }> = ({
  label,
  value,
  sub,
  accent = false
}) => (
  <div className="rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] p-3.5">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7C8B70]">
      {label}
    </span>
    <span
      className={`block text-xl font-black mt-1 tabular-nums ${
 accent ? 'text-[#366804]' : 'text-[#0B1118]'
 }`}
    >
      {value}
    </span>
    {sub && <span className="block text-[10px] text-[#8A9680] mt-0.5">{sub}</span>}
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
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-[#0B1118] cursor-pointer transition-colors ${
 sortKey === sortFor ? 'text-[#366804]' : ''
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
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={HardDrive}
        title="Storage Console"
        count={data?.storageBucket ? `R2 · ${data.storageBucket}` : 'R2 bucket'}
        live={connected ? 'Connected' : false}
        subtitle={`Object store behind the portraits. Provider ${data?.storageProvider ?? '—'} · database latency ${typeof data?.databaseLatencyMs === 'number' ? `${data.databaseLatencyMs} ms` : '—'} · last scan ${fmtTime(lastScan)}.`}
        actions={
          <PrimaryButton icon={RefreshCw} onClick={() => load(true)} disabled={loading || refreshing}>
            {refreshing ? 'Scanning…' : 'Force live scan'}
          </PrimaryButton>
        }
      >
        <FactGrid cols={4}>
          <FactCard label="Objects" value={data ? fmtInt(data.storageFileCount) : '—'} hint="files in the bucket" icon={FileText} />
          <FactCard label="Folders" value={data ? fmtInt(data.storageFolders?.length ?? 0) : '—'} hint="school partitions" icon={Layers} />
          <FactCard label="Used" value={data ? fmtBytes(sizeBytes) : '—'} hint="stored bytes" icon={HardDrive} />
          <FactCard label="Provider" value={data?.storageProvider ?? '—'} hint={error ? 'live scan failed' : 'live object store'} icon={Cloud} />
        </FactGrid>
      </PageHero>

      {/* ── Honest error state ───────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-black text-red-800">Live scan failed</h2>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
              <p className="text-[11px] text-red-600/80 mt-1">
                No capacity figures are shown because the storage API is unreachable. Placeholder data is never displayed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="px-3 py-1.5 rounded-2xl border border-red-300 bg-white text-red-700 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading placeholder (no numbers) ─────────────────────── */}
      {loading && !data && !error && (
        <div className="rounded-2xl border border-[#E3EFD7] bg-[#FBFDF7] p-8 text-center">
          <RefreshCw className="w-5 h-5 mx-auto text-[#366804] animate-spin" />
          <p className="text-xs font-bold text-[#7C8B70] mt-3">
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
            <div className="mt-3 pt-3 border-t border-[#E3EFD7] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="uppercase font-bold tracking-wider text-[#7C8B70]">
                Edge listing cross-check
              </span>
              {edgeStats && typeof edgeStats.totalObjects === 'number' ? (
                <>
                  <span className="text-[#0B1118] font-bold tabular-nums">
                    {edgeStats.totalObjects.toLocaleString()} objects · {edgeStats.formatted || fmtBytes(edgeStats.totalBytes)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
 edgeAligned
 ? 'border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04]'
 : 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
 }`}
                  >
                    {edgeAligned ? 'ALIGNED WITH STATUS API' : 'DIVERGED — RE-SCAN ADVISED'}
                  </span>
                  {edgeStats.lastScanned && (
                    <span className="text-[#8A9680]">edge scan {fmtTime(edgeStats.lastScanned)}</span>
                  )}
                </>
              ) : (
                <span className="text-[#7C8B70] font-bold">
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
              <span className="text-[11px] font-bold text-[#7C8B70] tabular-nums">
                {folders.length} prefix{folders.length === 1 ? '' : 'es'}
              </span>
            }
          >
            <div className="overflow-x-auto rounded-2xl border border-[#E3EFD7]">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[#FBFDF7] text-[#7C8B70] text-[10px] border-b border-[#E3EFD7]">
                  <tr>
                    <SortHeader label="Prefix" sortFor="name" align="left" />
                    <SortHeader label="Files" sortFor="files" />
                    <SortHeader label="Size" sortFor="size" />
                    <th className="py-2 px-3 font-bold uppercase tracking-wider w-[34%]">
                      <span className="float-right">Share of total</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EFD7]">
                  {folders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center text-[#7C8B70]">
                        <AlertCircle className="w-4 h-4 mx-auto mb-1.5 text-[#8A9680]" />
                        No prefixes returned by the live scan. Run “Force live scan” to refresh the bucket listing.
                      </td>
                    </tr>
                  ) : (
                    folders.map(f => {
                      const pct = pctOf(f.sizeBytes, breakdownDenom);
                      return (
                        <tr key={f.name} className="hover:bg-[#FBFDF7] transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#E3EFD7] bg-[#FBFDF7] text-[#0B1118] font-bold">
                              <FolderTree className="w-3 h-3 text-[#8A9680]" />
                              {f.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#0B1118]">
                            {fmtInt(f.fileCount)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#0B1118]">
                            {f.sizeFormatted || fmtBytes(f.sizeBytes)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-[#E3EFD7] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#85E510]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-12 text-right tabular-nums text-[#7C8B70] font-bold">
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
                  <tfoot className="bg-[#FBFDF7] border-t border-[#E3EFD7]">
                    <tr>
                      <td className="py-2.5 px-3 font-black uppercase text-[10px] tracking-wider text-[#7C8B70]">
                        Prefix sum
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118]">
                        {folderFilesSum.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118]">
                        {fmtBytes(folderBytesSum)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#7C8B70]">
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
            <div className="overflow-x-auto rounded-2xl border border-[#E3EFD7]">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[#FBFDF7] text-[#7C8B70] text-[10px] uppercase tracking-wider border-b border-[#E3EFD7]">
                  <tr>
                    <th className="py-2 px-3 font-bold">Check</th>
                    <th className="py-2 px-3 font-bold text-right">Value</th>
                    <th className="py-2 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EFD7]">
                  <tr>
                    <td className="py-2.5 px-3 text-[#4B5B42]">
                      <span className="inline-flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#8A9680]" />
                        Students with linked photos
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118]">
                      {fmtInt(withPhotos)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[#7C8B70] font-bold tabular-nums">
                        {pctOf(withPhotos ?? 0, studentsCount ?? 0).toFixed(1)}% of roster
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#4B5B42]">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
                        Students without photo links
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118]">
                      {fmtInt(withoutPhotos)}
                    </td>
                    <td className="py-2.5 px-3">
                      {typeof withoutPhotos === 'number' && withoutPhotos > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]">
                          Coverage gap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04]">
                          <CheckCircle2 className="w-3 h-3" /> Full coverage
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#4B5B42]">
                      <span className="inline-flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-[#8A9680]" />
                        Photo catalog rows vs student rows
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118]">
                      {fmtInt(catalogCount)} / {fmtInt(studentsCount)}
                    </td>
                    <td className="py-2.5 px-3">
                      {orphanDelta === null ? (
                        <span className="text-[#8A9680] font-bold">—</span>
                      ) : orphanDelta > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]">
                          <AlertTriangle className="w-3 h-3" />
                          {orphanDelta.toLocaleString()} orphan catalog row{orphanDelta === 1 ? '' : 's'}
                        </span>
                      ) : orphanDelta < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]">
                          <AlertTriangle className="w-3 h-3" />
                          {Math.abs(orphanDelta).toLocaleString()} student{Math.abs(orphanDelta) === 1 ? '' : 's'} without catalog row
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04]">
                          <CheckCircle2 className="w-3 h-3" /> Aligned
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-[#4B5B42]">
                      <span className="inline-flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-[#8A9680]" />
                        Bucket objects vs student-linked photos
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-[#0B1118]">
                      {fmtInt(fileCount)} / {fmtInt(withPhotos)}
                    </td>
                    <td className="py-2.5 px-3 text-[#7C8B70] font-bold tabular-nums">
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
    </PageShell>
  );
};

export default SuperAdminStoragePage;
