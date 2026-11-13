import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Search, UserPlus, X, RefreshCw, Trash2,
  Lock, Unlock, AlertTriangle, CheckCircle2, Smartphone,
  RotateCcw, Download, Users, Radio, HardDrive, Activity, Clock
} from 'lucide-react';
import {
  getUsers, resetUserHardwareLock, setUserHardwareLock, getAllSendersMetrics,
  addUser, deleteUser, BRANCH_SCHOOL_MAP, initStore, getCurrentUser,
  refreshFleetTelemetry, getFleetTelemetrySnapshot, SenderMetrics
} from '@/lib/store';
import { User as UserType } from '@/types';
import {
  PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, PrimaryButton
} from '@/components/ui/PageKit';

type AdminRole = 'SENDER' | 'RECEIVER' | 'ADMIN';

const normalizeKey = (value?: string | null): string => String(value || '').toLowerCase().trim();

const relativeTime = (value?: number | string | null): string => {
  if (!value) return '—';
  const at = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(at)) return '—';
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const statusFor = (user: UserType, metric: SenderMetrics | undefined) => {
  const terminal = metric?.terminalStatus;
  const offline = { label: 'Offline', dot: 'bg-slate-300', chip: 'bg-[#F3F7EE] text-[#4B5B42] border-[#E3EFD7]' };
  if (terminal === 'ACTIVE') return { label: 'Active now', dot: 'bg-[#6FBF0A] animate-pulse', chip: 'bg-[#EAF7DA] text-[#2F5E04] border-[#CDEBB4]' };
  if (terminal === 'LOCKED') return { label: 'Locked', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' };
  // The fleet reports DISCONNECTED for every registered sender that is not currently connected,
  // including accounts that never sent a single record — "Offline" would imply they had.
  const hasOutput = (metric?.total ?? 0) > 0 || (metric?.serverSessionCount ?? 0) > 0;
  if (!hasOutput) {
    if (user.boundDeviceId) return { label: 'Standby', dot: 'bg-slate-300', chip: 'bg-[#F3F7EE] text-[#4B5B42] border-[#E3EFD7]' };
    return { label: 'Never transmitted', dot: 'bg-slate-300', chip: 'bg-[#F3F7EE] text-[#4B5B42] border-[#E3EFD7]' };
  }
  if (terminal === 'IDLE') return { label: 'Idle', dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-800 border-amber-200' };
  return offline;
};

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const AdminSendersPage: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [metrics, setMetrics] = useState<SenderMetrics[]>([]);
  const [fleet, setFleet] = useState<{ active: number; recentlyActive: number; today: number; total: number } | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SENDER' | 'RECEIVER' | 'ADMIN'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentUser = getCurrentUser();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('12345678');
  const [inviteRole, setInviteRole] = useState<AdminRole>('SENDER');
  const [inviteCampus, setInviteCampus] = useState('YMS');
  const [deleteTarget, setDeleteTarget] = useState<UserType | null>(null);

  const notify = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = () => {
    setUsers([...getUsers()]);
    setMetrics(getAllSendersMetrics());
    const snap = getFleetTelemetrySnapshot();
    if (snap) {
      setFleet({
        active: snap.totals.activeSenders,
        recentlyActive: snap.totals.recentlyActiveSenders,
        today: snap.totals.todayTotal,
        total: snap.totals.totalRecords ?? 0
      });
    }
  };

  const syncFleet = async (announce: boolean) => {
    setIsRefreshing(true);
    try {
      await refreshFleetTelemetry();
      loadData();
      if (announce) notify('Fleet telemetry refreshed — statuses read from the latest transmissions.');
    } catch (e) {
      if (announce) setErrorMessage('Could not reach the fleet telemetry endpoint.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    initStore().then(() => loadData()).catch(() => {});
    void syncFleet(false);
    const interval = setInterval(() => syncFleet(false), 30000);
    const handleSync = () => loadData();
    window.addEventListener('studentbridge_datachange', handleSync);
    window.addEventListener('studentbridge_userchange', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('studentbridge_datachange', handleSync);
      window.removeEventListener('studentbridge_userchange', handleSync);
    };
  }, []);

  const metricsIndex = useMemo(() => {
    const map = new Map<string, SenderMetrics>();
    metrics.forEach(m => {
      [m.username, m.email, m.id].forEach(key => {
        const k = normalizeKey(key);
        if (k && !map.has(k)) map.set(k, m);
      });
    });
    return map;
  }, [metrics]);

  const metricFor = (user: UserType): SenderMetrics | undefined => {
    for (const key of [user.username, user.email, user.id]) {
      const hit = metricsIndex.get(normalizeKey(key));
      if (hit) return hit;
    }
    return undefined;
  };

  const handleToggleLock = (user: UserType) => {
    if (user.boundDeviceId) {
      resetUserHardwareLock(user.id);
      resetUserHardwareLock(user.username);
      resetUserHardwareLock(user.email);
      notify(`Hardware lock cleared for "${user.username}". The workstation is unbound.`);
    } else {
      const generatedDeviceId = 'dev-terminal-' + Math.random().toString(36).substring(2, 9);
      setUserHardwareLock(user.id, generatedDeviceId);
      notify(`"${user.username}" is now locked to one hardware terminal.`);
    }
    loadData();
  };

  const handleDeleteOperator = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    deleteUser(deleteTarget.username);
    deleteUser(deleteTarget.email);
    notify(`Operator "${deleteTarget.username}" permanently removed.`);
    setDeleteTarget(null);
    loadData();
  };

  const handleProvisionOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setErrorMessage('Enter a username and an institutional email.');
      return;
    }
    const cleanUsername = inviteName.trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (users.some(u => normalizeKey(u.username) === cleanUsername || normalizeKey(u.email) === cleanEmail)) {
      setErrorMessage(`"${cleanUsername}" or "${cleanEmail}" is already provisioned.`);
      return;
    }

    addUser({
      id: `usr-${cleanUsername}-${Date.now().toString(36)}`,
      username: cleanUsername,
      email: cleanEmail,
      password: invitePassword.trim() || '12345678',
      role: inviteRole,
      boundDeviceId: null,
      school: inviteCampus,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      workSessionCount: 0,
      totalWorkMinutes: 0
    });
    notify(`Operator "${cleanUsername}" provisioned with ${inviteRole} privileges.`);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('12345678');
    setInviteRole('SENDER');
    setInviteCampus('YMS');
    loadData();
  };

  const handleRoleChange = (user: UserType, newRole: AdminRole) => {
    if (user.role === newRole) return;
    addUser({ ...user, role: newRole } as any);
    notify(`"${user.username}" is now ${newRole}.`);
    loadData();
  };

  const handleExportCsv = () => {
    const header = ['Username', 'Email', 'Role', 'Station', 'Bound Device', 'Active Today', 'Total Records', 'Terminal Status'];
    const rows = filteredUsers.map(u => {
      const m = metricFor(u);
      return [
        u.username,
        u.email,
        u.role,
        `${(u as any).branch || ''} ${u.school || ''}`.trim(),
        u.boundDeviceId || 'Unbound',
        m?.today ?? 0,
        m?.total ?? 0,
        statusFor(u, m).label
      ];
    });
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `siliconlabs_operators_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users
    .filter(u => {
      const term = search.trim().toLowerCase();
      const matchesSearch = !term ||
        normalizeKey(u.username).includes(term) ||
        normalizeKey(u.email).includes(term) ||
        normalizeKey(u.school).includes(term) ||
        normalizeKey((u as any).branch).includes(term);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      const am = metricFor(a);
      const bm = metricFor(b);
      return (bm?.total || 0) - (am?.total || 0) || a.username.localeCompare(b.username);
    });

  const allSchools = Object.values(BRANCH_SCHOOL_MAP).flat();

  const totalCount = users.length;
  const boundDevicesCount = users.filter(u => Boolean(u.boundDeviceId)).length;
  const adminCount = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const senderCount = users.filter(u => u.role === 'SENDER').length;
  const activeNow = fleet?.active ?? metrics.filter(m => m.terminalStatus === 'ACTIVE').length;
  const recordsToday = fleet?.today ?? metrics.reduce((acc, m) => acc + (m.today || 0), 0);
  const recordsTotal = fleet?.total ?? metrics.reduce((acc, m) => acc + (m.total || 0), 0);

  const facts = [
    { label: 'Total Operators', value: totalCount.toLocaleString(), hint: `${senderCount} sender · ${adminCount} admin`, icon: Users },
    { label: 'Active Now', value: activeNow.toLocaleString(), hint: 'transmitting · last 15 min', icon: Radio },
    { label: 'Records Today', value: recordsToday.toLocaleString(), hint: 'since 00:00 (EAT)', icon: Activity },
    { label: 'Records Transmitted', value: recordsTotal.toLocaleString(), hint: 'lifetime, deduplicated', icon: HardDrive },
    { label: 'Bound Devices', value: boundDevicesCount.toLocaleString(), hint: '1-device hardware lock', icon: Smartphone }
  ];

  return (
    <PageShell>
      <PageHero
        icon={Shield}
        title="Provision Operators & RBAC"
        count={`${totalCount.toLocaleString()} accounts`}
        live="Live fleet"
        subtitle="Create operator credentials, switch role privileges instantly, bind a station to one hardware terminal and read each account's real transmission status."
        actions={
          <>
            <ToolbarButton onClick={() => void syncFleet(true)} disabled={isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 text-[#5C6B51] ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </ToolbarButton>
            <ToolbarButton icon={Download} onClick={handleExportCsv}>Export CSV</ToolbarButton>
            <PrimaryButton icon={UserPlus} onClick={() => setInviteModalOpen(true)}>Provision Operator</PrimaryButton>
          </>
        }
      >
        <FactGrid cols={5}>
          {facts.map(fact => (
            <FactCard key={fact.label} label={fact.label} value={fact.value} hint={fact.hint} icon={fact.icon} />
          ))}
        </FactGrid>
      </PageHero>

      {toastMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#CDEBB4] bg-[#EAF7DA] px-4 py-3 text-xs font-bold text-[#2F5E04]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4D8A07]" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-auto text-[#4D8A07] hover:text-[#0B1118] cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="ml-auto text-rose-500 hover:text-rose-800 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E3EFD7] bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-[#F6FAEF] p-1">
          {([
            ['ALL', `All ${users.length}`],
            ['SENDER', `Senders ${senderCount}`],
            ['RECEIVER', `Receivers ${users.filter(u => u.role === 'RECEIVER').length}`],
            ['ADMIN', `Admins ${adminCount}`]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRoleFilter(value)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                roleFilter === value
                  ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
                  : 'text-[#5C6B51] hover:text-[#0B1118]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A9680]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, email, station..."
            className="w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] py-2 pl-9 pr-3 text-xs font-semibold text-[#0B1118] placeholder-[#8A9680] focus:border-[#9EE617] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9680] hover:text-[#0B1118] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <SectionCard
        icon={Users}
        title="Operator register"
        subtitle={`${filteredUsers.length.toLocaleString()} of ${users.length.toLocaleString()} accounts · ranked by lifetime output`}
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E3EFD7] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
                <th className="py-3 pl-5 pr-3">Operator</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Station</th>
                <th className="px-3 py-3">Live Status</th>
                <th className="px-3 py-3 text-right">Output (today / total)</th>
                <th className="px-3 py-3">Terminal</th>
                <th className="py-3 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2E9]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-xs font-semibold text-[#7C8B70]">
                    No operator matches this filter.
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const metric = metricFor(user);
                const status = statusFor(user, metric);
                const isSelf = Boolean(currentUser && (normalizeKey(user.username) === normalizeKey(currentUser.username) || normalizeKey(user.email) === normalizeKey(currentUser.email)));
                const isProtected = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
                const lastSeen = metric?.serverLastActivity || metric?.lastActive || user.lastLoginAt || null;
                const lastSeenMs = typeof lastSeen === 'number' ? lastSeen : Date.parse(String(lastSeen || ''));
                const lastSeenLabel = Number.isFinite(lastSeenMs)
                  ? `last sent ${relativeTime(lastSeenMs)}`
                  : (metric?.total ?? 0) > 0
                  ? 'last activity unavailable'
                  : 'no transmission yet';

                return (
                  <tr key={user.id || user.email} className="transition-colors hover:bg-[#F8FBF4]">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EAF7DA] text-[11px] font-black text-[#2F5E04]">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-black text-[#0B1118]">{user.username}</span>
                            {isSelf && (
                              <span className="rounded bg-[#85E510] px-1.5 py-0.5 text-[9px] font-black text-[#062404]">YOU</span>
                            )}
                          </div>
                          <div className="truncate text-[10px] font-medium text-[#7C8B70]">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as AdminRole)}
                        disabled={user.role === 'SUPER_ADMIN'}
                        className="rounded-lg border border-[#CDEBB4] bg-[#F4FBEA] px-2 py-1 text-[10px] font-black uppercase text-[#2F5E04] focus:border-[#85E510] focus:outline-none disabled:opacity-60 cursor-pointer"
                        title="Switch privileges instantly"
                      >
                        <option value="SENDER">SENDER</option>
                        <option value="RECEIVER">RECEIVER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-bold text-[#0B1118]">{(user as any).branch || 'Addis Ababa'}</div>
                      <div className="text-[10px] font-medium text-[#7C8B70]">{user.school || 'Unassigned'}</div>
                    </td>

                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#7C8B70]">
                        <Clock className="h-2.5 w-2.5" />
                        {lastSeenLabel}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="text-[11px] font-black tabular-nums text-[#0B1118]">
                        {(metric?.today ?? 0).toLocaleString()}
                        <span className="text-[#8A9680]"> / </span>
                        {(metric?.total ?? 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] font-medium text-[#7C8B70]">records</div>
                    </td>

                    <td className="px-3 py-3">
                      {user.boundDeviceId ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-[#CDEBB4] bg-[#EAF7DA] px-1.5 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                            <Smartphone className="h-2.5 w-2.5" />
                            Locked
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              resetUserHardwareLock(user.id);
                              resetUserHardwareLock(user.username);
                              resetUserHardwareLock(user.email);
                              notify(`Hardware lock cleared for "${user.username}". The workstation is unbound.`);
                              loadData();
                            }}
                            className="inline-flex w-fit items-center gap-1 text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                            title="Unbind the workstation"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            Unbind
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#E3EFD7] bg-[#FBFDF7] px-1.5 py-0.5 text-[10px] font-semibold text-[#7C8B70]">
                          <Smartphone className="h-2.5 w-2.5" />
                          Unbound
                        </span>
                      )}
                    </td>

                    <td className="py-3 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleLock(user)}
                          className={`grid h-7 w-7 place-items-center rounded-lg border transition-colors cursor-pointer ${
                            user.boundDeviceId
                              ? 'border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04] hover:bg-[#DFF3C8]'
                              : 'border-[#E3EFD7] bg-white text-[#7C8B70] hover:border-amber-300 hover:text-amber-600'
                          }`}
                          title={user.boundDeviceId ? 'Unlock this workstation' : 'Lock to one hardware terminal'}
                        >
                          {user.boundDeviceId ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>

                        {isProtected || isSelf ? (
                          <span className="rounded-md bg-[#F3F7EE] px-2 py-1 text-[10px] font-bold text-[#8A9680]">Protected</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-transparent text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 cursor-pointer"
                            title="Delete operator"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Provision modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0B1118]/40 backdrop-blur-sm p-4" onClick={() => setInviteModalOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF3E8] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF7DA]">
                  <UserPlus className="h-4 w-4 text-[#3F7A06]" />
                </div>
                <h3 className="text-sm font-black text-[#0B1118]">Provision operator account</h3>
              </div>
              <button type="button" onClick={() => setInviteModalOpen(false)} className="rounded-lg p-1 text-[#8A9680] hover:bg-[#F3F7EE] hover:text-[#0B1118] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionOperator} className="space-y-3 px-5 py-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                Username
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. yohannes"
                  className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                />
              </label>

              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                Institutional email
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="operator@gmail.com"
                  className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                  Role
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                    className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                  >
                    <option value="SENDER">Sender</option>
                    <option value="RECEIVER">Receiver</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>

                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                  Password
                  <input
                    type="text"
                    required
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-bold tabular-nums text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                  />
                </label>
              </div>

              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                Assigned school
                <select
                  value={inviteCampus}
                  onChange={(e) => setInviteCampus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-2.5 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                >
                  {allSchools.map(school => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-[#EEF3E8] pt-3">
                <button type="button" onClick={() => setInviteModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#4B5B42] hover:bg-[#F3F7EE] cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-[#85E510] px-4 py-2 text-xs font-black text-[#062404] hover:bg-[#76CF0C] cursor-pointer">
                  Provision operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0B1118]/40 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3 px-5 py-5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0B1118]">Delete operator account?</h3>
                <p className="mt-1 text-xs font-medium text-[#7C8B70]">
                  <strong className="text-[#0B1118]">{deleteTarget.username}</strong> ({deleteTarget.email}) loses access
                  immediately. Records this operator already transmitted stay in the registry.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-[#E3EFD7] py-2 text-xs font-bold text-[#2B3A22] hover:bg-[#FBFDF7] cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteOperator} className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-black text-white hover:bg-rose-700 cursor-pointer">
                  Delete operator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
