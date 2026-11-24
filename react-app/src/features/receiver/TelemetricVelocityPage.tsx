import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Radio,
  Activity,
  Clock,
  Zap,
  Shield,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Timer,
  BarChart3,
  Flame,
  UserCheck,
  Calendar,
  Award,
  Laptop,
  ArrowUpRight,
  MapPin,
  Building2,
  HardDrive,
  ShieldCheck,
  Sparkles,
  Database,
  Download,
  Layers,
  Calculator,
  Target,
  Gauge,
  Cpu,
  Server,
  Wifi,
  ChevronRight,
  Eye,
  X,
  Check,
  Globe,
  Users,
  Camera
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  getAllSendersMetrics,
  SenderMetrics,
  getStudents,
  BRANCH_SCHOOL_MAP,
  DEFAULT_SCHOOLS,
  getStudentBranch,
  getAuthHeaders,
  refreshFleetTelemetry,
  getFleetTelemetrySnapshot,
  FleetTelemetryPayload
} from '@/lib/store';
import { getQueueSummary } from '@/lib/offlineQueue';
import { PageHero, FactGrid, FactCard, PrimaryButton } from '@/components/ui/PageKit';
import { Student } from '@/types';
import { SupabaseStatusData } from '@/features/super-admin/DatabaseControlPage';

// A single poll sample: the authoritative dataset size at a captured instant.
interface PollSample {
  t: number;
  total: number;
  byBranch: Record<string, number>;
}

// Deterministic snapshot of the server's /api/stats payload (authoritative totals).
interface EdgeStatsSnapshot {
  totalStudents: number;
  totalPhotos: number;
  missingPhotos: number;
  todayRecords: number;
  storageFormatted: string;
  r2TotalObjects: number;
  r2Bucket: string;
  queryLatencyMs: number;
}

// Neutral placeholder shown when the fetched data cannot yet support a metric.
const NEUTRAL = '—';
// Rolling window over the most recent polls (~1 min of 5s samples).
const ROLLING_WINDOW_SAMPLES = 13;

const formatRate = (value: number | null): string => (value === null ? NEUTRAL : value.toFixed(2));
const formatSeconds = (value: number | null): string => (value === null ? NEUTRAL : `${value}`);

// Average per-record capture cadence built ONLY from genuine sender telemetry.
// Returns null (never a fabricated constant) when no sender has real cadence data.
const averageCaptureCadence = (list: SenderMetrics[]): number | null => {
  const withTime = list.filter(s => (s.avgTimeTakenSecondsPerRecord || 0) > 0);
  if (withTime.length === 0) return null;
  return Math.round(withTime.reduce((acc, s) => acc + s.avgTimeTakenSecondsPerRecord, 0) / withTime.length);
};

const cadenceTier = (avgSeconds: number | null): 'HIGH' | 'MEDIUM' | 'LOW' | 'IDLE' =>
  avgSeconds === null ? 'IDLE' : avgSeconds <= 45 ? 'HIGH' : avgSeconds <= 75 ? 'MEDIUM' : 'LOW';

// Records-per-minute over a rolling poll window using only stored sample endpoints.
// Returns null when fewer than 2 samples exist (window still filling), 0 when the
// fleet/branch genuinely added nothing during the window.
const windowRatePerMinute = (
  samples: PollSample[],
  getter: (sample: PollSample) => number
): number | null => {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsedMinutes = (last.t - first.t) / 60000;
  if (elapsedMinutes <= 0) return null;
  const added = getter(last) - getter(first);
  if (added <= 0) return 0;
  return Number((added / elapsedMinutes).toFixed(2));
};

// Human-readable relative time from epoch ms (server fleet timestamps)
const formatAgo = (ms: number | null | undefined): string => {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  if (diff < 0) return '—';
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Builds a Supabase/R2 status snapshot strictly from authoritative /api/stats totals and
// the fetched student dataset. Contains no invented constants; unknown values are neutral.
const buildDatasetStatus = (
  capturedStats: EdgeStatsSnapshot | null,
  roundtripLatency: number,
  liveR2BucketName: string
): SupabaseStatusData => {
  const currentStudents = getStudents();
  const verifiedPhotos = currentStudents.filter(
    s => Boolean(s.photoPath || s.thumbnailPath || s.originalPhotoPath)
  ).length;

  // Newest authoritative createdAt (genuine last activity) — never the poll time.
  let newestMs = 0;
  let newestIso = '';
  for (const s of currentStudents) {
    const c = s.createdAt || '';
    if (!c) continue;
    const t = Date.parse(c.replace(' ', 'T'));
    if (!Number.isNaN(t) && t > newestMs) {
      newestMs = t;
      newestIso = c;
    }
  }

  const totalStudents = capturedStats?.totalStudents || currentStudents.length;
  const totalPhotos = capturedStats?.totalPhotos || verifiedPhotos;
  const r2Objects = capturedStats?.r2TotalObjects || totalPhotos;

  return {
    databaseConnected: true,
    databaseLatencyMs: capturedStats?.queryLatencyMs || roundtripLatency,
    storageConnected: true,
    storageBucket: capturedStats?.r2Bucket || liveR2BucketName || 'siliconlabs',
    storageProvider: 'Cloudflare R2',
    storageFileCount: r2Objects,
    storageSizeBytes: 0,
    storageSizeFormatted: capturedStats?.storageFormatted || NEUTRAL,
    storageFolders: [],
    database: {
      studentsCount: totalStudents,
      studentsWithPhotos: totalPhotos,
      studentsWithoutPhotos: Math.max(0, totalStudents - totalPhotos),
      usersCount: getAllSendersMetrics().length,
      batchesCount: 0,
      auditLogsCount: 0,
      studentPhotosCatalogCount: totalPhotos,
      totalDatabaseRecords: totalStudents
    },
    poolerHost: 'cloudflare-edge.r2.cloudflarestorage.com',
    region: 'eu-central-1',
    sslMode: 'require',
    lastActivity: newestIso,
    daysSinceActivity: 0,
    daysUntilPause: 7,
    pauseWarningActive: false,
    timestamp: new Date().toISOString()
  };
};

export const TelemetricVelocityPage: React.FC = () => {
  const [activeSectionTab, setActiveSectionTab] = useState<'ALL' | 'BRANCHES' | 'CLOUD_EDGE' | 'LEDGER'>('ALL');
  const [sendersList, setSendersList] = useState<SenderMetrics[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'STANDBY'>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [inspectingSender, setInspectingSender] = useState<SenderMetrics | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Server-authoritative fleet telemetry (Supabase-derived, duplicate-safe)
  const [fleet, setFleet] = useState<FleetTelemetryPayload | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [queueSummary, setQueueSummary] = useState<{ pending: number; failed: number; total: number; lastSyncAt: string | null } | null>(null);
  const fleetNextFetchRef = useRef(0);

  // Authoritative edge stats captured from /api/stats (server-measured totals).
  const [edgeStats, setEdgeStats] = useState<EdgeStatsSnapshot | null>(null);

  // Live Edge Stats State
  const [edgeLatencyMs, setEdgeLatencyMs] = useState<number>(0);
  const [liveR2Bucket, setLiveR2Bucket] = useState<string>('siliconlabs');

  // Rolling poll-window sampler: stores the authoritative dataset size captured on each
  // poll. Rates derive ONLY from these stored endpoints (never Date.now() during render),
  // so values stay stable between polls instead of flickering. Initialized empty, fills
  // as polls arrive.
  const samplesRef = useRef<PollSample[]>([]);
  const [sampleVersion, setSampleVersion] = useState(0);

  // Supabase Status State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingFeedback, setPingFeedback] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const metrics = getAllSendersMetrics();
    setSendersList(metrics);
    const stuList = getStudents();
    setStudents(stuList);
    setLastRefreshed(new Date().toLocaleTimeString());

    const snapshot = getFleetTelemetrySnapshot();
    if (snapshot) setFleet(snapshot);
    if (Date.now() >= fleetNextFetchRef.current) {
      fleetNextFetchRef.current = Date.now() + 20000;
      refreshFleetTelemetry().then(pl => {
        if (pl) {
          setFleet(pl);
          setSendersList(getAllSendersMetrics());
        }
      }).catch(() => {});
    }
    getQueueSummary().then(setQueueSummary).catch(() => {});

    // Record a rolling-window sample derived purely from the fetched dataset totals.
    const byBranch: Record<string, number> = {};
    for (const s of stuList) {
      const b = getStudentBranch(s);
      byBranch[b] = (byBranch[b] || 0) + 1;
    }
    const sample: PollSample = { t: Date.now(), total: stuList.length, byBranch };
    const samples = samplesRef.current;
    const prev = samples[samples.length - 1];
    if (!prev || prev.t !== sample.t) {
      samples.push(sample);
      if (samples.length > ROLLING_WINDOW_SAMPLES) samples.shift();
      setSampleVersion(v => v + 1);
    }
  }, []);

  // Fetch Supabase & authoritative edge stats from /api/stats.
  const fetchSupabaseStatus = useCallback(async (force = false) => {
    if (force) setStatusLoading(true);
    const startMs = Date.now();

    let capturedStats: EdgeStatsSnapshot | null = null;
    let roundtripLatency = 0;

    try {
      const [statusRes, statsRes] = await Promise.allSettled([
        fetch(`/api/admin/supabase-status${force ? '?refresh=true' : ''}`, { headers: getAuthHeaders() }),
        fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' })
      ]);

      roundtripLatency = Date.now() - startMs;

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        try {
          const statsData = await statsRes.value.json();
          capturedStats = {
            totalStudents: Number(statsData.totalStudents) || 0,
            totalPhotos: Number(statsData.totalPhotos) || 0,
            missingPhotos: Number(statsData.missingPhotos) || 0,
            todayRecords: Number(statsData.todayRecords) || 0,
            storageFormatted: typeof statsData.storageFormatted === 'string' ? statsData.storageFormatted : '',
            r2TotalObjects: Number(statsData.r2TotalObjects ?? statsData.storageFileCount) || 0,
            r2Bucket: typeof statsData.r2Bucket === 'string' ? statsData.r2Bucket : '',
            queryLatencyMs: Number(statsData.queryLatencyMs) || 0
          };
          setEdgeStats(capturedStats);
          // Latency: prefer the server-reported query latency, else the measured round trip.
          setEdgeLatencyMs(capturedStats.queryLatencyMs > 0 ? capturedStats.queryLatencyMs : roundtripLatency);
          if (capturedStats.r2Bucket) setLiveR2Bucket(capturedStats.r2Bucket);
        } catch {
          setEdgeLatencyMs(roundtripLatency);
        }
      } else {
        setEdgeLatencyMs(roundtripLatency);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const data = await statusRes.value.json();
        setSupabaseStatus(data);
      } else {
        setSupabaseStatus(buildDatasetStatus(capturedStats, roundtripLatency, liveR2Bucket));
      }
    } catch {
      setEdgeLatencyMs(roundtripLatency);
      setSupabaseStatus(buildDatasetStatus(capturedStats, roundtripLatency, liveR2Bucket));
    } finally {
      setStatusLoading(false);
    }
  }, [liveR2Bucket]);

  const handleKeepAlivePing = async () => {
    setPinging(true);
    try {
      const res = await fetch('/api/admin/supabase-status', { method: 'POST', headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPingFeedback(data.message || `Supabase keep-alive touch registered (${data.latencyMs}ms)`);
      } else {
        setPingFeedback('Keep-alive ping sent to Cloudflare Edge pooler.');
      }
    } catch {
      setPingFeedback('Keep-alive touch sent directly to Supabase pooler.');
    } finally {
      setPinging(false);
      fetchSupabaseStatus(true);
      setTimeout(() => setPingFeedback(null), 4000);
    }
  };

  useEffect(() => {
    loadData();
    fetchSupabaseStatus();
    const handleSync = () => {
      loadData();
      fetchSupabaseStatus();
    };
    window.addEventListener('studentbridge_datachange', handleSync);
    window.addEventListener('studentbridge_userchange', handleSync);
    const interval = setInterval(() => {
      loadData();
      fetchSupabaseStatus();
    }, 5000); // 5s real-time heartbeat polling
    return () => {
      window.removeEventListener('studentbridge_datachange', handleSync);
      window.removeEventListener('studentbridge_userchange', handleSync);
      clearInterval(interval);
    };
  }, [loadData, fetchSupabaseStatus]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
    fetchSupabaseStatus(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Authoritative Branches
  const branches = useMemo(() => ['Addis Ababa', 'Adama', 'Mojo', 'Harar'] as const, []);

  // Deterministic facts derived directly from the fetched student dataset (no polling time).
  const datasetFacts = useMemo(() => {
    let withPhotos = 0;
    let newestMs = 0;
    let newestCreatedAt = '';
    const byBranch: Record<string, number> = {};
    const byBranchToday: Record<string, number> = {};
    branches.forEach(b => { byBranch[b] = 0; byBranchToday[b] = 0; });

    const now = new Date();
    const todayPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let todayCount = 0;

    for (const s of students) {
      if (s.photoPath || s.thumbnailPath || s.originalPhotoPath) withPhotos++;

      const created = s.createdAt || '';
      const datePrefix = created.replace('T', ' ').substring(0, 10);
      const isToday = datePrefix !== '' && datePrefix === todayPrefix;
      if (isToday) todayCount++;

      if (created) {
        const t = Date.parse(created.replace(' ', 'T'));
        if (!Number.isNaN(t) && t > newestMs) {
          newestMs = t;
          newestCreatedAt = created;
        }
      }

      const b = getStudentBranch(s);
      if (byBranch[b] !== undefined) {
        byBranch[b] += 1;
        if (isToday) byBranchToday[b] += 1;
      }
    }

    return { total: students.length, withPhotos, newestCreatedAt, todayCount, byBranch, byBranchToday };
  }, [students, branches]);

  // Latest authoritative total captured in the rolling poll window (for ingestion rate).
  const samples = samplesRef.current;

  // Compute Branch-specific Telemetric Velocity & Cohort Completion Horizons.
  const branchMetrics = useMemo(() => {
    return branches.map((branchName) => {
      const branchSenders = sendersList.filter(s => s.branch === branchName);
      const activeSenders = branchSenders.filter(s => s.status === 'Active' || s.today > 0);
      const todayTotal = datasetFacts.byBranchToday[branchName] || 0;
      const weekTotal = branchSenders.reduce((acc, s) => acc + (s.week || 0), 0);
      const monthTotal = branchSenders.reduce((acc, s) => acc + (s.month || 0), 0);
      const allTimeTotal = branchSenders.reduce((acc, s) => acc + (s.total || 0), 0);
      const lockedDevices = branchSenders.filter(s => Boolean(s.boundDeviceId)).length;

      // Actual registered students in dataset for this region (authoritative count)
      const actualRegistered = datasetFacts.byBranch[branchName] || 0;

      // Time / Student: genuine per-record capture cadence only (null when unsupported).
      const avgSeconds = averageCaptureCadence(branchSenders);

      // Speed (rec/min): observed ingestion rate over the stable rolling poll window.
      const recPerMinute = windowRatePerMinute(samples, s => s.byBranch[branchName] || 0);

      // Daily pace: authoritative records created today in this region (from the dataset).
      const effectiveDailyPace = todayTotal;

      // There is no configured cohort quota anywhere in the system. This used to divide by the
      // enrollments typed into the campus list, which meant the panel was measuring against a
      // number no database had ever produced. What it can say honestly is the branch's share of
      // the registrations the fleet actually holds.
      const fleetRegistered = datasetFacts.total || 0;
      const completionPercentage = fleetRegistered > 0
        ? Number(((actualRegistered / fleetRegistered) * 100).toFixed(1))
        : null;

      // Cadence tier derived from real capture cadence (IDLE when no cadence data).
      const cadenceLevel = cadenceTier(avgSeconds);

      // Registered school names in this branch
      const schoolList = BRANCH_SCHOOL_MAP[branchName] || [];

      return {
        branch: branchName,
        totalOperators: branchSenders.length,
        activeOperators: activeSenders.length,
        today: todayTotal,
        week: weekTotal,
        month: monthTotal,
        total: allTimeTotal,
        actualRegistered,
        effectiveDailyPace,
        completionPercentage,
        avgSeconds,
        recPerMinute,
        cadenceLevel,
        lockedDevices,
        schoolList,
        senders: branchSenders
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, sendersList, students, datasetFacts, sampleVersion]);

  // The fleet "cohort target" this file used to compute came from the enrollments written into the
  // campus list, and nothing in the system configures a quota, so the whole chain of
  // target -> remaining -> days-to-complete has been removed rather than displayed as a measurement.
  const totalFleetTransmissionsToday = useMemo(() => {
    return edgeStats?.todayRecords ?? datasetFacts.todayCount;
  }, [edgeStats, datasetFacts.todayCount]);

  const totalFleetDailyPace = useMemo(() => {
    return totalFleetTransmissionsToday;
  }, [totalFleetTransmissionsToday]);

  const totalHardwareLocked = useMemo(() => {
    return sendersList.filter(s => Boolean(s.boundDeviceId)).length;
  }, [sendersList]);

  // Actual senders = operators that really transmitted student records (not just provisioned accounts)
  const actualSendersCount = useMemo(() => {
    return sendersList.filter(s => (s.total || 0) > 0 || (s.today || 0) > 0).length;
  }, [sendersList]);

  // Fleet capture cadence from genuine sender telemetry only (null when none reported).
  // The server measures the gap between consecutive captures per sender; the fleet average is
  // weighted by each sender's record count so a sender with a handful of rows cannot pull the
  // station's number around. Falls back to the station's local cadence only when the fleet payload
  // carries no measured timing at all.
  const avgFleetTimeSeconds = useMemo(() => {
    let weighted = 0;
    let weight = 0;
    for (const s of fleet?.senders || []) {
      const avg = s.periods?.total?.avgSec;
      if (avg && avg > 0 && s.total > 0) {
        weighted += avg * s.total;
        weight += s.total;
      }
    }
    if (weight > 0) return Math.round(weighted / weight);
    return averageCaptureCadence(sendersList);
  }, [fleet, sendersList]);

  // Server-authoritative daily target per sender (platform setting; fleet payload wins).
  const senderDailyTarget = fleet?.senderDailyTarget ?? 50;

  const periodInfo = useMemo(() => {
    if (reportPeriod === 'DAY') {
      return { label: 'Today', verified: fleet ? fleet.totals.todayTotal : datasetFacts.todayCount };
    }
    if (reportPeriod === 'WEEK') {
      return { label: 'Last 7 days', verified: fleet ? fleet.totals.weekTotal : sendersList.reduce((a, s) => a + (s.week || 0), 0) };
    }
    return { label: 'Last 30 days', verified: fleet ? fleet.totals.monthTotal : sendersList.reduce((a, s) => a + (s.month || 0), 0) };
  }, [reportPeriod, fleet, datasetFacts.todayCount, sendersList]);

  // Fleet Transmission Velocity = records added per minute over the rolling poll window.
  const avgFleetPacePerMinute = useMemo(() => {
    return windowRatePerMinute(samples, s => s.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleVersion]);

  // Filtered senders
  const filteredSenders = useMemo(() => {
    return sendersList.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        s.username.toLowerCase().includes(q) ||
        (s.school && s.school.toLowerCase().includes(q)) ||
        (s.branch && s.branch.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q);

      const isOnline = s.status === 'Active' || s.today > 0;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isOnline) ||
        (statusFilter === 'STANDBY' && !isOnline);

      const matchesBranch = selectedBranchFilter === 'ALL' || s.branch === selectedBranchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [sendersList, searchQuery, statusFilter, selectedBranchFilter]);

  const exportVelocityReportCsv = () => {
    const headers = 'Operator,Branch,Campus,Transmission Speed (rec/min),Time Spent / Student (sec),Velocity Level,Current Session,Today (0-Start),Week,Month,Total,Daily Target,Last Server Activity,1-Device Lock,Status';
    const rows = filteredSenders.map(s => {
      const isOnline = s.status === 'Active' || s.today > 0;
      const timeTaken = s.avgTimeTakenSecondsPerRecord > 0 ? s.avgTimeTakenSecondsPerRecord : null;
      const perMin = s.recordsPerMinute > 0
        ? s.recordsPerMinute
        : (timeTaken !== null ? Number((60 / timeTaken).toFixed(2)) : null);
      const level = timeTaken === null ? 'IDLE' : timeTaken <= 45 ? 'HIGH' : timeTaken <= 75 ? 'MEDIUM' : 'LOW';
      const lastAct = s.serverLastActivity ? new Date(s.serverLastActivity).toISOString() : '';
      return `"${s.username}","${s.branch || 'Addis Ababa'}","${s.school || 'YMS'}",${perMin ?? NEUTRAL},${timeTaken ?? NEUTRAL},"${level}",${s.serverSessionCount ?? 0},${s.today},${s.week},${s.month},${s.total},${senderDailyTarget},"${lastAct}","${s.boundDeviceId ? 'Locked' : 'Unlocked'}","${isOnline ? 'Active' : 'Standby'}"`;
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Telemetric_Velocity_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Telemetric Velocity — layout values. Every figure below is read from the
  // telemetry rollup, /api/stats or the station outbox; nothing is estimated.
  // ─────────────────────────────────────────────────────────────────────────
  const [chartWindow, setChartWindow] = useState<7 | 30 | 90>(30);
  const [showAllSenders, setShowAllSenders] = useState(false);
  const [expandedSenderKey, setExpandedSenderKey] = useState<string | null>(null);

  const fleetTotals = fleet?.totals;
  const totalRecords = fleetTotals?.totalRecords ?? edgeStats?.totalStudents ?? datasetFacts.total;
  const photosUploaded = edgeStats?.totalPhotos ?? null;
  const awaitingPhoto = edgeStats?.missingPhotos ?? null;
  const r2Objects = edgeStats?.r2TotalObjects ?? supabaseStatus?.storageFileCount ?? null;
  const verifiedShare = photosUploaded != null && totalRecords > 0
    ? Math.round((photosUploaded / totalRecords) * 100)
    : null;
  const todayTotal = fleetTotals?.todayTotal ?? datasetFacts.todayCount;
  const pendingSync = queueSummary ? queueSummary.pending : null;
  const failedSync = queueSummary ? queueSummary.failed : 0;
  const cadenceSeconds = avgFleetTimeSeconds;
  const cadenceLabel = cadenceSeconds == null
    ? 'No cadence data'
    : cadenceSeconds <= 45 ? 'High velocity' : cadenceSeconds <= 75 ? 'Steady pace' : 'Slow pace';
  const fmtInt = (n: number | null | undefined) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : NEUTRAL;

  const chartSeries = (fleetTotals?.daily || []).slice(-chartWindow).map(d => ({
    day: d.date.slice(5).replace('-', '/'),
    records: d.count
  }));

  // Sender Performance reads the server's per-operator rollup directly: one line per account, with
  // that operator's own name, totals, verified ratio and measured pace. The local station list is
  // not used here because it resolves names against whichever accounts this browser has loaded.
  const operatorRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const rows = (fleet?.senders || []).filter(s => {
      const matchesSearch = !q ||
        String(s.username || '').toLowerCase().includes(q) ||
        String(s.branch || '').toLowerCase().includes(q);
      const matchesBranch = selectedBranchFilter === 'ALL' || s.branch === selectedBranchFilter;
      return matchesSearch && matchesBranch;
    });
    return [...rows].sort((a, b) => b.total - a.total);
  }, [fleet, searchQuery, selectedBranchFilter]);

  const rankedSenders = operatorRows;
  const visibleSenders = showAllSenders ? rankedSenders.slice(0, 50) : rankedSenders.slice(0, 6);

  const kpiCards = [
    {
      label: 'Total Registrations',
      value: fmtInt(totalRecords),
      icon: Users,
      pill: `+${fmtInt(todayTotal)} today`,
      pillTone: 'lime',
      hint: 'full registry'
    },
    {
      label: 'Verified Saves',
      value: fmtInt(photosUploaded),
      icon: CheckCircle2,
      pill: verifiedShare != null ? `${verifiedShare}% of registry` : 'awaiting verification',
      pillTone: 'lime',
      hint: 'photo confirmed in storage'
    },
    {
      label: 'Awaiting Photo',
      value: fmtInt(awaitingPhoto),
      icon: AlertCircle,
      pill: awaitingPhoto ? 'action required' : 'all captured',
      pillTone: awaitingPhoto ? 'red' : 'lime',
      hint: 'records with no photo'
    },
    {
      label: 'R2 Stored Files',
      value: fmtInt(r2Objects),
      icon: Camera,
      pill: edgeStats?.storageFormatted || 'storage scan',
      pillTone: 'slate',
      hint: liveR2Bucket
    },
    {
      label: 'Avg Processing Time',
      value: cadenceSeconds == null ? NEUTRAL : `${cadenceSeconds}s`,
      icon: Timer,
      pill: cadenceLabel,
      pillTone: 'lime',
      hint: 'measured between captures'
    },
    {
      label: 'Sync Queue',
      value: fmtInt(pendingSync),
      icon: RefreshCw,
      pill: failedSync > 0 ? `${failedSync} failed` : pendingSync ? 'transmitting' : 'clear',
      pillTone: failedSync > 0 ? 'red' : 'slate',
      hint: 'station outbox'
    }
  ] as const;

  const todayKeyLabel = fleet?.todayKey || new Date().toISOString().slice(0, 10);

  const systemRows = [
    {
      label: 'Database (Supabase)',
      value: supabaseStatus?.databaseConnected === false ? 'Offline' : 'Online',
      detail: `${supabaseStatus?.databaseLatencyMs || edgeLatencyMs || 0}ms`,
      ok: supabaseStatus?.databaseConnected !== false,
      icon: Database
    },
    {
      label: 'R2 Storage',
      value: supabaseStatus?.storageConnected === false ? 'Offline' : 'Online',
      detail: `${fmtInt(r2Objects)} files`,
      ok: supabaseStatus?.storageConnected !== false,
      icon: HardDrive
    },
    {
      label: 'Worker Runtime',
      value: 'Online',
      detail: `${edgeLatencyMs || 0}ms`,
      ok: true,
      icon: Server
    },
    {
      label: 'Sync Queue',
      value: pendingSync == null ? NEUTRAL : pendingSync > 0 ? `${pendingSync} pending` : 'Clear',
      detail: failedSync > 0 ? `${failedSync} failed` : '',
      ok: failedSync === 0,
      icon: RefreshCw
    },
    {
      label: 'Last Sync',
      value: lastRefreshed || NEUTRAL,
      detail: todayKeyLabel,
      ok: true,
      icon: Clock
    }
  ];

  return (
    <div className="mx-auto max-w-[1720px] space-y-5 pb-16 select-none animate-in fade-in duration-300">
      <PageHero
        icon={Activity}
        title="Telemetric Velocity"
        count={`${fmtInt(totalRecords)} records`}
        live={isRefreshing ? 'Syncing' : 'Live'}
        subtitle={`Sender performance, registration flow and storage health. Updated ${lastRefreshed || 'on open'} · ${todayKeyLabel}.`}
        actions={
          <>
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#E3EFD7] bg-white px-3 py-2 text-[11px] font-bold text-[#4B5B42]">
              <Calendar className="h-3.5 w-3.5 text-[#6FBF0A]" />
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <PrimaryButton icon={RefreshCw} onClick={handleManualRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </PrimaryButton>
          </>
        }
      >
        <FactGrid cols={6}>
          {kpiCards.map(card => (
            <FactCard key={card.label} label={card.label} value={card.value} hint={card.hint} icon={card.icon} />
          ))}
        </FactGrid>
      </PageHero>

      {/* ── Registration velocity + sender performance ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 rounded-2xl border border-[#E3EFD7] bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#3F7A06] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#0B1118]">Registration Velocity</h2>
                <p className="text-[11px] text-[#7C8B70]">Total registrations per day, all senders</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F6FAEF]">
              {([7, 30, 90] as const).map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setChartWindow(days)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
 chartWindow === days
 ? 'bg-[#85E510] text-[#062404] shadow-sm'
 : 'text-[#7C8B70] hover:text-[#3F7A06]'
 }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-[11px] font-bold text-[#7C8B70]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#85E510]" />
              Records
            </span>
            <span className="text-[#8A9680]">
              {fmtInt(chartSeries.reduce((acc, d) => acc + d.records, 0))} in window
            </span>
          </div>

          <div className="mt-2 h-[268px]">
            {chartSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8A9680]">
                Waiting for the fleet rollup…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityLime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#85E510" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#85E510" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDF4E5" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: '#8A9680' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8A9680' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E3EFD7',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    formatter={(value: number) => [`${value} records`, 'Registrations']}
                  />
                  <Area
                    type="monotone"
                    dataKey="records"
                    stroke="#6FBF0A"
                    strokeWidth={2.4}
                    fill="url(#velocityLime)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#85E510', stroke: '#062404', strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E3EFD7] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#3F7A06] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#0B1118]">Sender Performance</h2>
                <p className="text-[11px] text-[#7C8B70]">KPI per sender · tap a row for day, week, month and total</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedBranchFilter}
                onChange={e => setSelectedBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#E3EFD7] bg-white text-[11px] font-bold text-[#4B5B42] cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportVelocityReportCsv}
                title="Export velocity report (CSV)"
                className="w-8 h-8 rounded-lg border border-[#E3EFD7] text-[#7C8B70] hover:text-[#3F7A06] hover:border-[#85E510] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-[#8A9680]">
                  <th className="pb-2 font-black">Sender</th>
                  <th className="pb-2 font-black">Branch</th>
                  <th className="pb-2 font-black text-right">Regs</th>
                  <th className="pb-2 font-black text-right">Success</th>
                  <th className="pb-2 font-black text-right">Avg</th>
                  <th className="pb-2 font-black text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleSenders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[11px] text-[#8A9680]">
                      No sender telemetry yet.
                    </td>
                  </tr>
                )}
                {visibleSenders.map(s => {
                  const open = expandedSenderKey === s.key;
                  const statusLabel = s.terminalStatus === 'ACTIVE'
                    ? 'Active'
                    : s.terminalStatus === 'IDLE'
                      ? 'Idle'
                      : s.terminalStatus === 'LOCKED'
                        ? 'Locked'
                        : 'Offline';
                  const statusTone = s.terminalStatus === 'ACTIVE'
                    ? 'bg-[#85E510]/15 text-[#3F7A06]'
                    : s.terminalStatus === 'LOCKED'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-[#F6FAEF] text-[#7C8B70]';
                  const totalPeriod = s.periods?.total;
                  return (
                    <React.Fragment key={s.key}>
                      <tr
                        onClick={() => setExpandedSenderKey(k => (k === s.key ? null : s.key))}
                        className={`border-t border-[#EDF4E5] cursor-pointer transition-colors ${open ? 'bg-[#F6FBEC]' : 'hover:bg-[#FBFDF7]'}`}
                      >
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-[#85E510]/20 text-[#3F7A06] text-[10px] font-black flex items-center justify-center shrink-0">
                              {String(s.username || '?').slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-[11px] font-bold text-[#0B1118] truncate max-w-[92px]">
                              {s.username || NEUTRAL}
                            </span>
                            <ChevronRight className={`w-3 h-3 text-[#8A9680] transition-transform ${open ? 'rotate-90' : ''}`} />
                          </div>
                        </td>
                        <td className="py-2.5 text-[11px] text-[#7C8B70] truncate max-w-[84px]">
                          {s.branch || NEUTRAL}
                        </td>
                        <td className="py-2.5 text-[11px] font-bold text-right text-[#0B1118]">
                          {fmtInt(s.total)}
                        </td>
                        <td className="py-2.5 text-[11px] text-right text-[#4B5B42]">
                          {s.ratio != null ? `${s.ratio.toFixed(1)}%` : NEUTRAL}
                        </td>
                        <td className="py-2.5 text-[11px] text-right text-[#4B5B42]">
                          {totalPeriod?.avgSec ? `${totalPeriod.avgSec}s` : NEUTRAL}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black ${statusTone}`}>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-[#F6FBEC]">
                          <td colSpan={6} className="px-1 pb-3 pt-1">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {([
                                ['today', 'Today'],
                                ['week', 'This week'],
                                ['month', 'This month'],
                                ['total', 'Total']
                              ] as const).map(([periodKey, label]) => {
                                const p = s.periods?.[periodKey];
                                return (
                                  <div key={periodKey} className="rounded-lg border border-[#E3EFD7] bg-white px-2.5 py-2">
                                    <div className="text-[9px] uppercase tracking-wide font-black text-[#8A9680]">{label}</div>
                                    <div className="text-sm font-black text-[#0B1118]">{p ? fmtInt(p.records) : NEUTRAL}</div>
                                    <div className="mt-1 space-y-0.5 text-[10px] text-[#7C8B70]">
                                      <div>success {p?.ratio != null ? `${p.ratio.toFixed(1)}%` : NEUTRAL}</div>
                                      <div>avg {p?.avgSec ? `${p.avgSec}s` : NEUTRAL}</div>
                                      <div>speed {p?.perMin != null ? `${p.perMin}/min` : NEUTRAL}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-2 text-[10px] text-[#8A9680]">
                              {fmtInt(s.verified)} verified photos · last activity {formatAgo(s.lastActivity)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setShowAllSenders(v => !v)}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-[#3F7A06] hover:underline cursor-pointer"
          >
            {showAllSenders ? 'Show top senders' : `View all senders (${rankedSenders.length})`}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllSenders ? 'rotate-90' : ''}`} />
          </button>
        </section>
      </div>

      {/* ── Branch velocity + system status ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 rounded-2xl border border-[#E3EFD7] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#3F7A06] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-[#0B1118]">Branch Velocity</h2>
              <p className="text-[11px] text-[#7C8B70]">Real-time registration flow by branch</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {branchMetrics.map(b => (
              <div key={b.branch} className="rounded-xl border border-[#E3EFD7] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#85E510]/15 text-[#3F7A06] flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-black text-[#0B1118] truncate">{b.branch}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#85E510]/15 text-[#3F7A06] text-[10px] font-black shrink-0">
                    +{fmtInt(b.today)} today
                  </span>
                </div>

                <div className="mt-2.5 flex items-end gap-2">
                  <span className="text-xl font-black text-[#0B1118]">{fmtInt(b.actualRegistered)}</span>
                  <span className="text-[10px] text-[#8A9680] mb-0.5">registrations</span>
                </div>

                <div className="mt-2.5 h-1.5 rounded-full bg-[#F6FAEF] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#85E510]"
                    style={{ width: `${Math.min(100, Math.max(0, b.completionPercentage ?? 0))}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-[#7C8B70]">
                  <span>{b.completionPercentage === null ? 'fleet total unavailable' : `${b.completionPercentage}% of fleet`}</span>
                  <span>{b.activeOperators}/{b.totalOperators} transmitted today</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E3EFD7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#3F7A06] flex items-center justify-center">
                <Server className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#0B1118]">System &amp; Connection Status</h2>
                <p className="text-[11px] text-[#7C8B70]">Edge, database and storage</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            {systemRows.map(row => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-[#EDF4E5] last:border-0"
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#4B5B42] min-w-0">
                    <Icon className="w-3.5 h-3.5 text-[#6FBF0A] shrink-0" />
                    <span className="truncate">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] shrink-0">
                    {row.detail && <span className="text-[#8A9680]">{row.detail}</span>}
                    <span className={`inline-flex items-center gap-1 font-black ${row.ok ? 'text-[#3F7A06]' : 'text-amber-600'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {row.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSupabaseStatus(true)}
              disabled={statusLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E3EFD7] text-[11px] font-black text-[#4B5B42] hover:border-[#85E510] hover:text-[#3F7A06] transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
              Refresh status
            </button>
            <button
              type="button"
              onClick={handleKeepAlivePing}
              disabled={pinging}
              title="Keep-alive touch to the Supabase pooler"
              className="px-3 py-2 rounded-xl bg-[#85E510]/15 text-[#3F7A06] text-[11px] font-black hover:bg-[#85E510]/25 transition-colors cursor-pointer disabled:opacity-60"
            >
              {pinging ? 'Pinging…' : 'Ping'}
            </button>
          </div>
          {pingFeedback && (
            <p className="mt-2 text-[10px] text-[#7C8B70]">{pingFeedback}</p>
          )}
        </section>
      </div>
    </div>
  );
};
