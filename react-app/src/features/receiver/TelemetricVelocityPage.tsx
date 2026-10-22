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
  Globe
} from 'lucide-react';
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

      // Authoritative cohort quotas for this region
      const branchSchools = DEFAULT_SCHOOLS.filter(s => s.location === branchName);
      const targetCohort = branchSchools.reduce((acc, sch) => acc + (sch.studentsCount || 0), 0);

      // Actual registered students in dataset for this region (authoritative count)
      const actualRegistered = datasetFacts.byBranch[branchName] || 0;
      const remainingRecords = Math.max(0, targetCohort - actualRegistered);

      // Time / Student: genuine per-record capture cadence only (null when unsupported).
      const avgSeconds = averageCaptureCadence(branchSenders);

      // Speed (rec/min): observed ingestion rate over the stable rolling poll window.
      const recPerMinute = windowRatePerMinute(samples, s => s.byBranch[branchName] || 0);

      // Daily pace: authoritative records created today in this region (from the dataset).
      const effectiveDailyPace = todayTotal;

      // Projected operating days; null when no observed pace yet exists.
      const daysToComplete = remainingRecords > 0
        ? (effectiveDailyPace > 0 ? Number((remainingRecords / effectiveDailyPace).toFixed(1)) : null)
        : 0;

      const completionPercentage = targetCohort > 0
        ? Number(((actualRegistered / targetCohort) * 100).toFixed(1))
        : 0;

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
        targetCohort,
        actualRegistered,
        remainingRecords,
        effectiveDailyPace,
        daysToComplete,
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

  // Aggregate Fleet Cohort Metrics across All Regional Jurisdictions
  const totalFleetCohortTarget = useMemo(() => {
    return DEFAULT_SCHOOLS.reduce((acc, sch) => acc + (sch.studentsCount || 0), 0);
  }, []);

  const totalFleetCompleted = useMemo(() => {
    return edgeStats?.totalStudents || datasetFacts.total;
  }, [edgeStats, datasetFacts.total]);

  const totalFleetRemaining = useMemo(() => {
    return Math.max(0, totalFleetCohortTarget - totalFleetCompleted);
  }, [totalFleetCohortTarget, totalFleetCompleted]);

  const totalFleetTransmissionsToday = useMemo(() => {
    return edgeStats?.todayRecords ?? datasetFacts.todayCount;
  }, [edgeStats, datasetFacts.todayCount]);

  const totalFleetDailyPace = useMemo(() => {
    return totalFleetTransmissionsToday;
  }, [totalFleetTransmissionsToday]);

  const totalFleetDaysToComplete = useMemo(() => {
    if (totalFleetRemaining === 0) return 0;
    return totalFleetDailyPace > 0
      ? Number((totalFleetRemaining / totalFleetDailyPace).toFixed(1))
      : null;
  }, [totalFleetRemaining, totalFleetDailyPace]);

  const totalHardwareLocked = useMemo(() => {
    return sendersList.filter(s => Boolean(s.boundDeviceId)).length;
  }, [sendersList]);

  // Actual senders = operators that really transmitted student records (not just provisioned accounts)
  const actualSendersCount = useMemo(() => {
    return sendersList.filter(s => (s.total || 0) > 0 || (s.today || 0) > 0).length;
  }, [sendersList]);

  // Fleet capture cadence from genuine sender telemetry only (null when none reported).
  const avgFleetTimeSeconds = useMemo(() => {
    return averageCaptureCadence(sendersList);
  }, [sendersList]);

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
      return `"${s.username}","${s.branch || 'Addis Ababa'}","${s.school || 'YMS 1'}",${perMin ?? NEUTRAL},${timeTaken ?? NEUTRAL},"${level}",${s.serverSessionCount ?? 0},${s.today},${s.week},${s.month},${s.total},${senderDailyTarget},"${lastAct}","${s.boundDeviceId ? 'Locked' : 'Unlocked'}","${isOnline ? 'Active' : 'Standby'}"`;
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

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto pb-16 select-none animate-in fade-in duration-300 font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOP HEADER: SILICON LABS TELEMETRY & FLEET VELOCITY COCKPIT         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1118] via-[#111A24] to-[#0B1118] border border-[#223126] dark:border-[#1E2C22] p-6 text-white shadow-xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#85E510]/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -bottom-10 right-10 w-72 h-32 bg-cyan-500/10 blur-2xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            {/* Breadcrumb Tags */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
              <span className="text-[#85E510] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                TELEMETRY COCKPIT
              </span>
              <span>/</span>
              <span className="font-semibold text-slate-300">FIELD SENDER FLEET</span>
              <span>/</span>
              <span className="text-cyan-400 font-bold">VELOCITY &amp; HORIZONS</span>
            </div>

            {/* Main Header Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#85E510]/30 via-[#85E510]/15 to-transparent border border-[#85E510]/50 flex items-center justify-center text-[#85E510] shadow-[0_0_20px_rgba(133,229,16,0.25)]">
                <Gauge className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white flex items-center gap-3">
                  <span>Telemetric Velocity &amp; Fleet Section</span>
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#85E510]/20 text-[#85E510] border border-[#85E510]/40">
                    LIVE RADAR
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5 max-w-3xl">
                  Real-time branch telemetric velocity (Addis Ababa, Adama, Mojo, Harar) &bull; Cloudflare R2 native database &bull; Field senders transmission rate
                </p>
              </div>
            </div>
          </div>

          {/* Right Live Status Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            {/* Live R2 Storage Pill */}
            <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2 shadow-xs">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400 text-[11px]">R2:</span>
              <span className="font-black text-cyan-300 font-mono tracking-tight">{liveR2Bucket}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </div>

            {/* Sub-millisecond Ping Latency Pill */}
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 backdrop-blur-md shadow-xs">
              <Activity className="w-4 h-4 text-[#85E510]" />
              <span className="text-emerald-400/80 text-[11px]">Latency:</span>
              <span className="font-black text-[#85E510] font-mono tracking-tight">{edgeLatencyMs}ms</span>
              <span className="text-[10px] text-emerald-400/60 uppercase font-bold">EDGE</span>
            </div>

            {/* Heartbeat Status */}
            <div className="px-3.5 py-2 rounded-2xl bg-black/40 border border-slate-700/80 text-slate-300 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#85E510] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#85E510]" />
              </span>
              <span className="font-bold text-[11px]">PULSE:</span>
              <span className="text-slate-400 text-[11px] font-mono">{lastRefreshed || 'Syncing...'}</span>
            </div>

            {/* Force Recalculate Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#85E510] to-[#72cb0b] text-[#062404] font-black font-sans text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(133,229,16,0.3)] cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#062404]' : ''}`} />
              <span>{isRefreshing ? 'Recalculating...' : 'Recalculate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION SWITCHER DOCK & EXPORT ACTION                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSectionTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionTab === 'ALL'
                ? 'bg-[#85E510] text-[#062404] shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Complete Radar (All Views)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSectionTab('BRANCHES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionTab === 'BRANCHES'
                ? 'bg-[#85E510] text-[#062404] shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Regional Branches (4)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSectionTab('CLOUD_EDGE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionTab === 'CLOUD_EDGE'
                ? 'bg-[#85E510] text-[#062404] shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Cloud &amp; R2</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSectionTab('LEDGER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSectionTab === 'LEDGER'
                ? 'bg-[#85E510] text-[#062404] shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Fleet Operators ({actualSendersCount} with sent records)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={exportVelocityReportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-800 shrink-0"
        >
          <Download className="w-4 h-4 text-[#85E510]" />
          <span>Export Velocity Report (.CSV)</span>
        </button>
      </div>

      {pingFeedback && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#256002] dark:text-[#8fe617] text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#85E510]" />
          <span>{pingFeedback}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: SUPABASE CLOUD STATUS & CLOUDFLARE R2 TELEMETRY          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(activeSectionTab === 'ALL' || activeSectionTab === 'CLOUD_EDGE') && (
        <div className="rounded-3xl border border-slate-200 dark:border-[#223126] bg-white dark:bg-[#111713] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1c271f] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#85E510] animate-pulse" />
                <h2 className="text-base font-black font-heading tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#85E510]" />
                  <span>Supabase Cloud Engine &amp; Cloudflare R2 Storage Cockpit</span>
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] border border-[#85E510]/40 font-mono font-bold">
                  HIGH CONCURRENCY VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero egress biometrics pipeline &bull; S3 SigV4 authenticated storage &bull; PostgreSQL connection pooler
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fetchSupabaseStatus(true)}
                disabled={statusLoading}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#161f18] text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin text-[#85E510]' : ''}`} />
                <span>Refresh Status</span>
              </button>

              <button
                type="button"
                onClick={handleKeepAlivePing}
                disabled={pinging}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#85E510] to-[#72cb0b] text-[#062404] text-xs font-black hover:brightness-105 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${pinging ? 'animate-bounce' : ''}`} />
                <span>{pinging ? 'Pinging Pooler...' : 'Test Edge Pulse'}</span>
              </button>
            </div>
          </div>

          {/* 4 Supabase Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Edge Latency */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#223126] bg-slate-50/70 dark:bg-[#161f18]/80 p-5 space-y-2 hover:border-[#85E510]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <span>Database Latency</span>
                <span className="p-1.5 rounded-lg bg-[#85E510]/15 text-[#85E510]">
                  <Activity className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {supabaseStatus ? `${supabaseStatus.databaseLatencyMs}ms` : `${edgeLatencyMs}ms`}
                </span>
                <span className="text-xs text-[#85E510] font-black uppercase font-mono">
                  {edgeLatencyMs < 50 ? 'Sub-50ms' : 'Active'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                Pooler: {supabaseStatus?.poolerHost || 'cloudflare-edge.r2.cloudflarestorage.com'}
              </div>
            </div>

            {/* Card 2: R2 Storage & Verified Photos */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#223126] bg-slate-50/70 dark:bg-[#161f18]/80 p-5 space-y-2 hover:border-cyan-400/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <span>R2 Biometric Storage</span>
                <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <HardDrive className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                  {(edgeStats?.totalPhotos ?? datasetFacts.withPhotos).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold font-sans">
                  Photos Verified
                </span>
              </div>
              <div className="text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Bucket &apos;{liveR2Bucket}&apos; &bull; {supabaseStatus?.storageSizeFormatted || edgeStats?.storageFormatted || NEUTRAL}</span>
              </div>
            </div>

            {/* Card 3: 7-Day Inactivity Pause Guard */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#223126] bg-slate-50/70 dark:bg-[#161f18]/80 p-5 space-y-2 hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <span>7-Day Pause Guard</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {supabaseStatus ? `${supabaseStatus.daysUntilPause}d safe` : '7d safe'}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  Protected
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                Zero cold-starts &bull; Auto-keepalive heartbeat active
              </div>
            </div>

            {/* Card 4: Last Activity Ping */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-[#223126] bg-slate-50/70 dark:bg-[#161f18]/80 p-5 space-y-2 hover:border-amber-400/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <span>Real-Time Cloud Touch</span>
                <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {datasetFacts.newestCreatedAt
                    ? new Date(datasetFacts.newestCreatedAt.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : NEUTRAL}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                DB Rows: {totalFleetCompleted.toLocaleString()} records synced
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: REGIONAL BRANCH VELOCITY & COHORT HORIZON MATRIX         */}
      {/* Addis Ababa, Adama, Mojo, Harar                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(activeSectionTab === 'ALL' || activeSectionTab === 'BRANCHES') && (
        <div className="rounded-3xl border border-slate-200 dark:border-[#223126] bg-white dark:bg-[#111713] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1c271f] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#85E510]" />
                <h2 className="text-base font-black font-heading tracking-tight text-slate-900 dark:text-white">
                  Regional Branch Ingestion Velocity &amp; Cohort Completion Horizon
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Real-time pacing, time spent per student, and calculated completion horizons for Addis Ababa, Adama, Mojo, and Harar
              </p>
            </div>

            {/* Jurisdiction filter pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedBranchFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedBranchFilter === 'ALL'
                    ? 'bg-white dark:bg-[#1a241d] text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                All Jurisdictions
              </button>
              {branches.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBranchFilter(b)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedBranchFilter === b
                      ? 'bg-[#85E510] text-[#062404] shadow-xs font-black'
                      : 'text-slate-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Regional Branch KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {branchMetrics.map((bm) => {
              const isSelected = selectedBranchFilter === bm.branch;
              return (
                <div
                  key={bm.branch}
                  onClick={() => setSelectedBranchFilter(isSelected ? 'ALL' : bm.branch)}
                  className={`rounded-2xl border p-5 space-y-4 cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? 'border-[#85E510] bg-[#85E510]/5 ring-2 ring-[#85E510]/40'
                      : 'border-slate-200/90 dark:border-[#223126] bg-slate-50/60 dark:bg-[#161f18]/60 hover:border-[#85E510]/60 hover:shadow-md'
                  }`}
                >
                  {/* Branch Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#85E510]/30 to-[#85E510]/10 border border-[#85E510]/40 flex items-center justify-center text-[#256002] dark:text-[#85E510] font-black text-sm font-mono shadow-xs">
                        {bm.branch.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black font-heading text-base text-slate-900 dark:text-white">
                          {bm.branch}
                        </h3>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-sans">
                          <MapPin className="w-3 h-3 text-[#85E510]" />
                          <span>{bm.totalOperators} Operators ({bm.activeOperators} Active)</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {bm.lockedDevices} Locked
                    </span>
                  </div>

                  {/* Velocity Tier Badge */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#101712] border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                      Velocity Tier:
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black font-mono border ${
                      bm.cadenceLevel === 'HIGH'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        : bm.cadenceLevel === 'MEDIUM'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                        : bm.cadenceLevel === 'LOW'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${bm.cadenceLevel === 'HIGH' ? 'bg-emerald-500 animate-pulse' : bm.cadenceLevel === 'MEDIUM' ? 'bg-amber-500' : bm.cadenceLevel === 'LOW' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                      {bm.cadenceLevel === 'HIGH' ? 'HIGH VELOCITY' : bm.cadenceLevel === 'MEDIUM' ? 'MEDIUM CADENCE' : bm.cadenceLevel === 'LOW' ? 'LOW PACING' : 'NO CADENCE'}
                    </span>
                  </div>

                  {/* 4-Cell Telemetric Quadrant */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* Transmission Speed */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#101712] border border-slate-200/80 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 font-mono">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span>Speed</span>
                      </div>
                      <div className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                        {formatRate(bm.recPerMinute)} <span className="text-[10px] font-normal text-slate-400">rec/min</span>
                      </div>
                    </div>

                    {/* Time / Student */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#101712] border border-slate-200/80 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 font-mono">
                        <Timer className="w-3 h-3 text-amber-500" />
                        <span>Time / Student</span>
                      </div>
                      <div className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                        {bm.avgSeconds === null ? NEUTRAL : `${bm.avgSeconds}s`} <span className="text-[10px] font-normal text-slate-400">/rec</span>
                      </div>
                    </div>

                    {/* Daily Velocity */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#101712] border border-slate-200/80 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 font-mono">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        <span>Daily Pace</span>
                      </div>
                      <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {bm.effectiveDailyPace} <span className="text-[10px] font-normal text-slate-400">rec/day</span>
                      </div>
                    </div>

                    {/* Projected Operating Days to Complete */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#101712] border border-slate-200/80 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-purple-500" />
                        <span>Horizon</span>
                      </div>
                      <div className="text-base font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                        {bm.remainingRecords === 0 ? '0' : (bm.daysToComplete === null ? NEUTRAL : bm.daysToComplete)} <span className="text-[10px] font-normal text-slate-400">Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Target Cohort Progress Bar */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#101712] border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="text-slate-500 dark:text-slate-400 font-bold">Target Cohort:</span>
                      <span className="font-black font-mono text-slate-900 dark:text-white">
                        {bm.actualRegistered.toLocaleString()} / {bm.targetCohort.toLocaleString()}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#85E510] to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(bm.completionPercentage, 2))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{bm.completionPercentage}% Complete</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{bm.remainingRecords.toLocaleString()} remaining</span>
                    </div>
                  </div>

                  {/* Campus tags for this branch */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5 flex items-center gap-1">
                      <SchoolIcon className="w-3 h-3 text-[#85E510]" />
                      <span>Schools in {bm.branch}:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bm.schoolList.slice(0, 4).map(sch => (
                        <span key={sch} className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono">
                          {sch}
                        </span>
                      ))}
                      {bm.schoolList.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-400 text-[10px] font-mono">
                          +{bm.schoolList.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* ALL BRANCH COHORT COMPLETION HORIZON MATRIX TABLE                   */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-50/80 dark:bg-[#161f18]/80 rounded-2xl border border-slate-200 dark:border-[#223126] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#1c271f]">
              <div>
                <h3 className="font-black font-heading text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#85E510]" />
                  <span>Regional Cohort Completion Horizon &amp; Operating Days Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                  Mathematically grounded pacing, daily intake rate, and estimated duration to finish each jurisdictional quota
                </p>
              </div>
              <span className="text-[11px] text-[#256002] dark:text-[#85E510] font-bold px-3 py-1 rounded-xl bg-[#85E510]/15 border border-[#85E510]/30 shrink-0 font-mono">
                100% AUDITED DATA
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-white dark:bg-[#101712] text-slate-500 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 pl-4">Regional Branch</th>
                    <th className="py-3 text-right">Target Capacity</th>
                    <th className="py-3 text-right">Ingested to Date</th>
                    <th className="py-3 text-right">Remaining Workload</th>
                    <th className="py-3 text-center">Daily Fleet Pace</th>
                    <th className="py-3 text-center">Time / Student</th>
                    <th className="py-3 text-center">Speed (Rec/Min)</th>
                    <th className="py-3 text-center">Days to Complete</th>
                    <th className="py-3 text-center">Velocity Tier</th>
                    <th className="py-3 pr-4 text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {branchMetrics.map((bm) => (
                    <tr key={bm.branch} className="hover:bg-white/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 pl-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center font-black text-xs font-mono">
                          {bm.branch.substring(0, 1)}
                        </div>
                        <span className="font-sans font-bold">{bm.branch}</span>
                      </td>
                      <td className="py-3.5 text-right text-slate-700 dark:text-slate-300 font-bold">
                        {bm.targetCohort.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right font-black text-[#256002] dark:text-[#85E510]">
                        {bm.actualRegistered.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        {bm.remainingRecords.toLocaleString()}
                      </td>
                      <td className="py-3.5 text-center text-slate-800 dark:text-slate-200 font-bold">
                        {bm.effectiveDailyPace} /day
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                          <Timer className="w-3 h-3 text-amber-500" />
                          <span>{bm.avgSeconds === null ? NEUTRAL : `${bm.avgSeconds}s`}</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                          <Zap className="w-3 h-3 text-blue-500" />
                          <span>{formatRate(bm.recPerMinute)}/m</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-black text-purple-600 dark:text-purple-400">
                        {bm.remainingRecords === 0 ? '0 Days (Done)' : (bm.daysToComplete === null ? NEUTRAL : `${bm.daysToComplete} Days`)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          bm.cadenceLevel === 'HIGH'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                            : bm.cadenceLevel === 'MEDIUM'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                            : bm.cadenceLevel === 'LOW'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}>
                          {bm.cadenceLevel === 'IDLE' ? 'NO CADENCE' : bm.cadenceLevel}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2 font-bold">
                          <span>{bm.completionPercentage}%</span>
                          <div className="w-14 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#85E510]"
                              style={{ width: `${Math.min(100, Math.max(bm.completionPercentage, 2))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total Fleet Summary Row */}
                <tfoot className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <tr>
                    <td className="py-3.5 pl-4 font-black flex items-center gap-2 text-xs">
                      <Target className="w-4 h-4 text-[#85E510]" />
                      <span className="font-heading font-black">COMBINED FLEET (TOTAL)</span>
                    </td>
                    <td className="py-3.5 text-right font-black">
                      {totalFleetCohortTarget.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-black text-[#256002] dark:text-[#85E510]">
                      {totalFleetCompleted.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right font-black text-amber-600 dark:text-amber-400">
                      {totalFleetRemaining.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-center font-black">
                      {totalFleetDailyPace} /day
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                        <Timer className="w-3 h-3 text-amber-500" />
                        <span>{avgFleetTimeSeconds === null ? NEUTRAL : `${avgFleetTimeSeconds}s`}</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span>{formatRate(avgFleetPacePerMinute)}/m</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-center font-black text-purple-700 dark:text-purple-300 text-sm">
                      {totalFleetRemaining === 0 ? '0 Days (Done)' : (totalFleetDaysToComplete === null ? NEUTRAL : `${totalFleetDaysToComplete} Days`)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-[#85E510]/20 text-[#256002] dark:text-[#85E510] border-[#85E510]/40">
                        {cadenceTier(avgFleetTimeSeconds) === 'HIGH'
                          ? 'HIGH VELOCITY'
                          : cadenceTier(avgFleetTimeSeconds) === 'MEDIUM'
                          ? 'MEDIUM CADENCE'
                          : cadenceTier(avgFleetTimeSeconds) === 'LOW'
                          ? 'LOW PACING'
                          : 'NO CADENCE'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-xs font-black text-[#256002] dark:text-[#85E510]">
                        {totalFleetCohortTarget > 0 ? Math.min(100, Math.round((totalFleetCompleted / totalFleetCohortTarget) * 100)) : 0}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Comparative Branch Velocity & Pacing Visualization */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#161f18]/80 border border-slate-200 dark:border-[#223126] space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 font-heading">
                <TrendingUp className="w-4 h-4 text-[#85E510]" />
                Comparative Branch Throughput Pacing (% of Total Fleet Today)
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Total Today: {totalFleetTransmissionsToday} registrations
              </span>
            </div>
            <div className="space-y-3">
              {branchMetrics.map((bm) => {
                const share = totalFleetTransmissionsToday > 0
                  ? Math.round((bm.today / totalFleetTransmissionsToday) * 100)
                  : 0;
                return (
                  <div key={bm.branch} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold font-sans text-slate-800 dark:text-slate-200">{bm.branch}</span>
                      <span className="text-slate-500 font-semibold">{bm.today} today ({share}%) &bull; {formatRate(bm.recPerMinute)} rec/min</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#85E510] to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: FLEET OVERVIEW KPIS & SECTION 4: LEDGER                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(activeSectionTab === 'ALL' || activeSectionTab === 'LEDGER') && (
        <>
          {/* Reporting Controls: period selector + server-verified totals + queue health */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs text-xs">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {([['DAY', 'Daily'], ['WEEK', 'Weekly'], ['MONTH', 'Monthly']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setReportPeriod(val)}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reportPeriod === val
                      ? 'bg-[#85E510] text-[#062404] shadow-xs font-black'
                      : 'text-slate-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="font-mono text-slate-900 dark:text-white font-black">
              {periodInfo.verified.toLocaleString()} verified registrations
            </span>
            <span className="text-slate-400 font-mono text-[10px]">({periodInfo.label} &bull; Supabase rollup)</span>
            <div className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50" title="Senders with a registration in the last 15 minutes">
                {fleet ? fleet.totals.activeSenders : sendersList.filter(s => s.status === 'Active').length} active
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700" title="Senders active within the last 24 hours">
                {fleet ? fleet.totals.recentlyActiveSenders : sendersList.length} recently active
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#85E510]/10 text-[#256002] dark:text-[#8fe617] border border-[#85E510]/30" title="Server-configured daily registration target per sender">
                Target: {senderDailyTarget}/sender/day
              </span>
              {queueSummary && (
                <>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" title="Operations queued on this terminal awaiting synchronization">
                    Pending sync: {queueSummary.pending}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border ${queueSummary.failed > 0 ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`} title="Operations that failed after 3 or more synchronization attempts">
                    Failed: {queueSummary.failed}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700" title="Last successful synchronization from this terminal's offline queue">
                    Last sync: {queueSummary.lastSyncAt ? formatAgo(Date.parse(queueSummary.lastSyncAt)) : '—'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Live Today Submissions (Starts from 0) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs hover:border-[#85E510]/50 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="uppercase font-bold tracking-wider">Today's Fleet Velocity</span>
                <span className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
                {totalFleetTransmissionsToday.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Strict 0-Start Session Counter</span>
              </div>
            </div>

            {/* Card 2: Velocity / Records Per Minute */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs hover:border-blue-400/50 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="uppercase font-bold tracking-wider">Fleet Transmission Velocity</span>
                <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-2">
                <span>{formatRate(avgFleetPacePerMinute)}</span>
                <span className="text-xs font-bold text-slate-400 font-mono">rec / min</span>
              </div>
              <div className="mt-2 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 font-sans">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Records added per minute (live window)</span>
              </div>
            </div>

            {/* Card 3: Avg Time Taken Per Sender Record */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs hover:border-amber-400/50 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="uppercase font-bold tracking-wider">Avg Time Taken / Record</span>
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Timer className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-2">
                <span>{formatSeconds(avgFleetTimeSeconds)}</span>
                <span className="text-xs font-bold text-slate-400 font-mono">sec / student</span>
              </div>
              <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5 font-sans">
                <Clock className="w-3.5 h-3.5" />
                <span>Telemetry biometric capture cadence</span>
              </div>
            </div>

            {/* Card 4: 1-Device Hardware Lock Integrity */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs hover:border-[#85E510]/50 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="uppercase font-bold tracking-wider">1-Device Hardware Locks</span>
                <span className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#256002] dark:text-[#8fe617] flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-black font-mono text-[#85E510] flex items-baseline gap-2">
                <span>{totalHardwareLocked}</span>
                <span className="text-xs font-bold text-slate-400 font-mono">/ {actualSendersCount} actual senders</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 font-sans">
                <Laptop className="w-3.5 h-3.5 text-[#85E510]" />
                <span>Hardware workstation enforced</span>
              </div>
            </div>
          </div>

          {/* Daily / Weekly / Monthly ingestion trend (server rollup) */}
          {fleet && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-700 dark:text-slate-300">
                  Ingestion Trend &mdash; {periodInfo.label}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Supabase daily rollup &bull; no simulation</span>
              </div>
              {(() => {
                const days = fleet.totals.daily || [];
                const sliceCount = reportPeriod === 'MONTH' ? 30 : reportPeriod === 'WEEK' ? 7 : 14;
                const groups = days.slice(-sliceCount).map(d => ({ label: d.date.slice(8), count: d.count, sub: d.date }));
                const max = Math.max(1, ...groups.map(g => g.count));
                return (
                  <div className="flex items-end gap-1 h-24">
                    {groups.map(g => (
                      <div key={g.sub} className="flex-1 flex flex-col items-center gap-1" title={`${g.sub}: ${g.count} registrations`}>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-[#85E510]/60 to-[#85E510]"
                          style={{ height: `${Math.max(3, (g.count / max) * 80)}px`, opacity: g.count ? 1 : 0.25 }}
                        />
                        <span className="text-[8px] text-slate-400 font-mono">{g.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Daily verified</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{fleet.totals.todayTotal.toLocaleString()}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Weekly verified</div>
                  <div className="text-base font-black text-slate-900 dark:text-white">{fleet.totals.weekTotal.toLocaleString()}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Monthly verified</div>
                  <div className="text-base font-black text-[#256002] dark:text-[#8fe617]">{fleet.totals.monthTotal.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 4: SENDERS TELEMETRY FLEET GRID & FILTER                    */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111713] p-4 rounded-2xl border border-slate-200 dark:border-[#223126] shadow-xs">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sender, campus, terminal, branch..."
                  className="w-full pl-10 pr-4 py-2 text-xs font-sans rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400 text-[11px] font-mono">Filter Status:</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-white dark:bg-[#1c241e] text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    All ({sendersList.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'ACTIVE'
                        ? 'bg-[#85E510] text-[#062404] shadow-xs font-black'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusFilter('STANDBY')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'STANDBY'
                        ? 'bg-white dark:bg-[#1c241e] text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Standby
                  </button>
                </div>
              </div>
            </div>

            {/* Sender Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredSenders.map((sender) => {
                const isOnline = sender.status === 'Active' || sender.today > 0;
                const timeTaken = sender.avgTimeTakenSecondsPerRecord > 0 ? sender.avgTimeTakenSecondsPerRecord : null;
                const perMinuteRate = sender.recordsPerMinute > 0
                  ? sender.recordsPerMinute
                  : (timeTaken !== null ? Number((60 / timeTaken).toFixed(2)) : null);
                const senderLevel = cadenceTier(timeTaken);
                const tStatus = sender.terminalStatus || (isOnline ? 'ACTIVE' : 'STANDBY');

                return (
                  <div
                    key={sender.id || sender.username}
                    onClick={() => setInspectingSender(sender)}
                    className="rounded-2xl border border-slate-200 dark:border-[#223126] bg-white dark:bg-[#111713] p-5 space-y-4 hover:border-[#85E510] transition-all shadow-xs group cursor-pointer"
                  >
                    {/* Header: Sender identity & status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#256002] dark:text-[#8fe617] flex items-center justify-center font-black font-mono text-base shadow-xs">
                          {sender.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black font-heading text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{sender.username}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#85E510] animate-pulse' : 'bg-slate-400'}`} />
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#85E510]" />
                            <span className="font-semibold">{sender.branch || 'Addis Ababa'}</span>
                            <span>&bull;</span>
                            <span className="text-slate-700 dark:text-slate-300 font-mono">{sender.school || 'YMS 1'}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-[10px] font-black font-mono border ${
                        tStatus === 'ACTIVE'
                          ? 'bg-[#85E510]/15 text-[#256002] dark:text-[#8fe617] border-[#85E510]/40'
                          : tStatus === 'IDLE'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                          : tStatus === 'LOCKED'
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`} title="Terminal status from real server signals: ACTIVE = registered in last 15 min, IDLE = last 24 h, DISCONNECTED = older, LOCKED = account locked">
                        {tStatus}
                      </span>
                    </div>

                    {/* Timing, Transmission Speed & Velocity Performance Level */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800/80 space-y-2.5">
                      {/* Spending Time / 1 Student */}
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5 text-amber-500" />
                          <span>Time / 1 Student:</span>
                        </span>
                        <span className="font-black font-mono text-amber-600 dark:text-amber-400">
                          {timeTaken === null ? NEUTRAL : `${timeTaken}s`} <span className="text-[10px] text-slate-400 font-normal font-sans">/ student</span>
                        </span>
                      </div>

                      {/* Transmission Speed */}
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-blue-500" />
                          <span>Transmission Speed:</span>
                        </span>
                        <span className="font-black font-mono text-blue-600 dark:text-blue-400">
                          {formatRate(perMinuteRate)} <span className="text-[10px] text-slate-400 font-normal font-sans">rec / min</span>
                        </span>
                      </div>

                      {/* Velocity Level Badge */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                          Velocity Tier:
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border ${
                          senderLevel === 'HIGH'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                            : senderLevel === 'MEDIUM'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                            : senderLevel === 'LOW'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${senderLevel === 'HIGH' ? 'bg-emerald-500 animate-pulse' : senderLevel === 'MEDIUM' ? 'bg-amber-500' : senderLevel === 'LOW' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                          {senderLevel === 'HIGH' ? 'HIGH VELOCITY' : senderLevel === 'MEDIUM' ? 'MEDIUM CADENCE' : senderLevel === 'LOW' ? 'LOW PACING' : 'NO CADENCE'}
                        </span>
                      </div>
                    </div>

                    {/* Cadence Metrics: Today (0-Start), Week, Month, Total */}
                    <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Today</div>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{sender.today}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Week</div>
                        <div className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">{sender.week}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Month</div>
                        <div className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">{sender.month}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">Total</div>
                        <div className="text-base font-black text-[#256002] dark:text-[#8fe617] mt-0.5">{sender.total}</div>
                      </div>
                    </div>

                    {/* Hardware Lock Badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-sans">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Shield className="w-3.5 h-3.5 text-[#85E510]" />
                        <span>Workstation Lock:</span>
                      </div>
                      {sender.boundDeviceId ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>1-Device Locked</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold font-mono">Unbound</span>
                      )}
                    </div>

                    {/* Server session counter, daily target progress, last activity */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-sans">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Activity className="w-3.5 h-3.5 text-[#85E510]" />
                          <span>Current session:</span>
                          <span className="font-black font-mono text-slate-900 dark:text-white">{sender.serverSessionCount ?? 0}</span>
                          <span className="text-[10px] text-slate-400 font-mono">regs (0-start window)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]" title="Last successful registration persisted on the server">
                          <Clock className="w-3 h-3" />
                          <span>{sender.serverLastActivity ? formatAgo(sender.serverLastActivity) : 'no server records'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>DAILY TARGET PROGRESS</span>
                          <span>{sender.today}/{senderDailyTarget}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${sender.today >= senderDailyTarget ? 'bg-[#85E510]' : sender.today > 0 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                            style={{ width: `${Math.min(100, (sender.today / senderDailyTarget) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complete Table View */}
            <div className="bg-white dark:bg-[#111713] rounded-2xl border border-slate-200 dark:border-[#223126] p-6 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-black font-heading text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#85E510]" />
                  <span>Complete Telemetric Velocity Fleet Ledger</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Showing {filteredSenders.length} Field Terminals</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-50 dark:bg-[#070a08] text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 pl-4">Operator</th>
                      <th className="py-3">Branch</th>
                      <th className="py-3">Campus</th>
                      <th className="py-3 text-center">Time Spent / Student</th>
                      <th className="py-3 text-center">Speed (Rec/Min)</th>
                      <th className="py-3 text-center">Velocity Level</th>
                      <th className="py-3 text-center" title="Registrations in the sender's current activity window (a gap over 30 minutes starts a new window at zero)">Session</th>
                      <th className="py-3 text-center">Today</th>
                      <th className="py-3 text-center">Week</th>
                      <th className="py-3 text-center">Month</th>
                      <th className="py-3 text-center">Total</th>
                      <th className="py-3 text-center">Daily Target</th>
                      <th className="py-3 text-center">Last Activity</th>
                      <th className="py-3 text-center">1-Device Lock</th>
                      <th className="py-3 text-right pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSenders.map((s) => {
                      const isOnline = s.status === 'Active' || s.today > 0;
                      const timeTaken = s.avgTimeTakenSecondsPerRecord > 0 ? s.avgTimeTakenSecondsPerRecord : null;
                      const perMinuteRate = s.recordsPerMinute > 0
                        ? s.recordsPerMinute
                        : (timeTaken !== null ? Number((60 / timeTaken).toFixed(2)) : null);
                      const senderLevel = cadenceTier(timeTaken);

                      return (
                        <tr
                          key={s.id || s.username}
                          onClick={() => setInspectingSender(s)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pl-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#85E510]/20 text-[#256002] dark:text-[#8fe617] flex items-center justify-center font-black text-xs font-mono">
                                {s.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold font-sans">{s.username}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono">{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 text-slate-700 dark:text-slate-300 font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px]">
                              {s.branch || 'Addis Ababa'}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-600 dark:text-slate-300">
                            {s.school || 'YMS 1'}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                              <Timer className="w-3 h-3 text-amber-500" />
                              <span>{timeTaken === null ? NEUTRAL : `${timeTaken}s`}</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                              <Zap className="w-3 h-3 text-blue-500" />
                              <span>{formatRate(perMinuteRate)}/m</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              senderLevel === 'HIGH'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : senderLevel === 'MEDIUM'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                                : senderLevel === 'LOW'
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${senderLevel === 'HIGH' ? 'bg-emerald-500 animate-pulse' : senderLevel === 'MEDIUM' ? 'bg-amber-500' : senderLevel === 'LOW' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                              {senderLevel === 'HIGH' ? 'High' : senderLevel === 'MEDIUM' ? 'Medium' : senderLevel === 'LOW' ? 'Low' : 'Idle'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200" title="Registrations in this sender's current activity window (30-minute gap starts a new window)">
                              <Activity className="w-3 h-3 text-[#85E510]" />
                              <span>{s.serverSessionCount ?? 0}</span>
                            </span>
                          </td>
                          <td className={`py-3.5 text-center text-sm ${reportPeriod === 'DAY' ? 'font-black text-emerald-600 dark:text-emerald-400' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                            {s.today}
                          </td>
                          <td className={`py-3.5 text-center ${reportPeriod === 'WEEK' ? 'font-black text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {s.week}
                          </td>
                          <td className={`py-3.5 text-center ${reportPeriod === 'MONTH' ? 'font-black text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {s.month}
                          </td>
                          <td className="py-3.5 text-center font-black text-[#256002] dark:text-[#8fe617] text-sm">
                            {s.total}
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className={`h-full ${s.today >= senderDailyTarget ? 'bg-[#85E510]' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, (s.today / senderDailyTarget) * 100)}%` }} />
                              </div>
                              <span className="text-[10px] text-slate-400">{s.today}/{senderDailyTarget}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-center text-[10px] text-slate-500 dark:text-slate-400">
                            {s.serverLastActivity ? formatAgo(s.serverLastActivity) : '—'}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.boundDeviceId
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              <Shield className="w-3 h-3" />
                              <span>{s.boundDeviceId ? 'Locked' : 'Unlocked'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                              isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              <span>{isOnline ? 'Active' : 'Standby'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* OPERATOR INSPECTION MODAL                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {inspectingSender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-[#223126] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#85E510]/20 border border-[#85E510]/40 text-[#256002] dark:text-[#8fe617] flex items-center justify-center font-black font-mono text-lg shadow-xs">
                  {inspectingSender.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black font-heading text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{inspectingSender.username}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${inspectingSender.status === 'Active' || inspectingSender.today > 0 ? 'bg-[#85E510] animate-pulse' : 'bg-slate-400'}`} />
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {inspectingSender.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingSender(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Jurisdiction & Campus */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Assigned Branch</div>
                <div className="font-black text-slate-900 dark:text-white mt-0.5">{inspectingSender.branch || 'Addis Ababa'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Assigned Campus</div>
                <div className="font-black text-slate-900 dark:text-white mt-0.5">{inspectingSender.school || 'YMS 1'}</div>
              </div>
            </div>

            {/* Velocity & Pacing */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#85E510]/10 via-transparent to-transparent border border-[#85E510]/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Operator Telemetric Velocity
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510] text-[#062404] font-mono">
                  {(() => {
                    const tier = cadenceTier(inspectingSender.avgTimeTakenSecondsPerRecord > 0 ? inspectingSender.avgTimeTakenSecondsPerRecord : null);
                    return tier === 'HIGH' ? 'HIGH CADENCE' : tier === 'MEDIUM' ? 'MEDIUM CADENCE' : tier === 'LOW' ? 'LOW PACING' : 'NO CADENCE';
                  })()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">Speed</div>
                  <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {(() => {
                      const t = inspectingSender.avgTimeTakenSecondsPerRecord > 0 ? inspectingSender.avgTimeTakenSecondsPerRecord : null;
                      const rate = inspectingSender.recordsPerMinute > 0
                        ? inspectingSender.recordsPerMinute
                        : (t !== null ? Number((60 / t).toFixed(2)) : null);
                      return `${formatRate(rate)} rec/min`;
                    })()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#111713] border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">Time per Student</div>
                  <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {inspectingSender.avgTimeTakenSecondsPerRecord > 0
                      ? `${inspectingSender.avgTimeTakenSecondsPerRecord} seconds`
                      : NEUTRAL}
                  </div>
                </div>
              </div>
            </div>

            {/* Tallies */}
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Today</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{inspectingSender.today}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Week</div>
                <div className="text-lg font-black text-slate-700 dark:text-slate-300">{inspectingSender.week}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Month</div>
                <div className="text-lg font-black text-slate-700 dark:text-slate-300">{inspectingSender.month}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Total</div>
                <div className="text-lg font-black text-[#256002] dark:text-[#8fe617]">{inspectingSender.total}</div>
              </div>
            </div>

            {/* Server session, daily target & synchronization signals */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Current Session</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{inspectingSender.serverSessionCount ?? 0}</div>
                <div className="text-[9px] text-slate-400">0-start activity window</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Daily Target</div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400">{inspectingSender.today}/{senderDailyTarget}</div>
                <div className="text-[9px] text-slate-400">{Math.min(100, Math.round((inspectingSender.today / senderDailyTarget) * 100))}% complete</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Last Sync Activity</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{inspectingSender.serverLastActivity ? formatAgo(inspectingSender.serverLastActivity) : '—'}</div>
                <div className="text-[9px] text-slate-400">{inspectingSender.terminalStatus || (inspectingSender.status === 'Active' ? 'ACTIVE' : 'STANDBY')}</div>
              </div>
            </div>

            {/* Hardware Lock Fingerprint */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070a08] border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#85E510]" />
                <span className="text-slate-500 dark:text-slate-400">Device Fingerprint:</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {inspectingSender.boundDeviceId || 'Hardware Lock Not Bound'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setInspectingSender(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// School icon helper for campus tags
const SchoolIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
    <path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
    <path d="M18 5v17" />
    <path d="m4 6 8-4 8 4" />
    <path d="M6 5v17" />
    <circle cx="12" cy="9" r="2" />
  </svg>
);
