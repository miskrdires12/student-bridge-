import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Shield, Smartphone, Lock, Unlock, Search, X, CheckCircle2,
  UserPlus, RefreshCw, Trash2, Download, Building2, Radio, Activity,
  AlertTriangle, Clock, KeyRound, HardDrive
} from 'lucide-react';
import {
  getUsers, resetUserHardwareLock, setUserHardwareLock, addUser, updateUser, deleteUser,
  BRANCH_SCHOOL_MAP, DEFAULT_BRANCHES, getCurrentUser,
  getAllSendersMetrics, refreshFleetTelemetry, getFleetTelemetrySnapshot, SenderMetrics
} from '@/lib/store';
import { User, UserRole } from '@/types';
import {
  PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, PrimaryButton
} from '@/components/ui/PageKit';

type RoleTab = 'All' | 'Senders' | 'Receivers' | 'Admins' | 'Super Admin';

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

const roleChip = (role: UserRole): string => {
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'ADMIN': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'RECEIVER': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-[#EAF7DA] text-[#2F5E04] border-[#CDEBB4]';
  }
};

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const SuperAdminUsersPage: React.FC = () => {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<RoleTab>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SenderMetrics[]>([]);
  const [fleet, setFleet] = useState<{ active: number; today: number; total: number } | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SENDER');
  const [newBranch, setNewBranch] = useState('Addis Ababa');
  const [newSchool, setNewSchool] = useState('YMS');
  const [newPassword, setNewPassword] = useState('12345678');

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
      if (announce) notify('Fleet telemetry refreshed from the latest transmissions.');
    } catch (e) {
      if (announce) notify('Fleet telemetry is unreachable — showing the last known statuses.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    void syncFleet(false);
    const interval = setInterval(() => syncFleet(false), 30000);
    const handleUserChange = () => loadData();
    window.addEventListener('studentbridge_userchange', handleUserChange);
    window.addEventListener('studentbridge_datachange', handleUserChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('studentbridge_userchange', handleUserChange);
      window.removeEventListener('studentbridge_datachange', handleUserChange);
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

  const metricFor = (user: User): SenderMetrics | undefined => {
    for (const key of [user.username, user.email, user.id]) {
      const hit = metricsIndex.get(normalizeKey(key));
      if (hit) return hit;
    }
    return undefined;
  };

  const handleBranchChange = (branch: string) => {
    setNewBranch(branch);
    const schools = BRANCH_SCHOOL_MAP[branch] || [];
    setNewSchool(schools[0] || 'YMS');
  };

  const handleToggleLock = (user: User) => {
    if (user.boundDeviceId) {
      resetUserHardwareLock(user.id);
      resetUserHardwareLock(user.username);
      resetUserHardwareLock(user.email);
      notify(`Hardware lock cleared for "${user.username}". The terminal is unbound.`);
    } else {
      const generatedDeviceId = 'dev-terminal-' + Math.random().toString(36).substring(2, 9);
      setUserHardwareLock(user.id, generatedDeviceId);
      notify(`"${user.username}" is now locked to one hardware terminal.`);
    }
    loadData();
  };

  const handleRoleChange = (userId: string, targetRole: UserRole) => {
    updateUser(userId, { role: targetRole });
    loadData();
    notify(`Role updated to ${targetRole.replace('_', ' ')}.`);
  };

  const handleDeleteUser = () => {
    if (!deleteTarget) return;
    const userObj = deleteTarget;
    deleteUser(userObj.id);
    deleteUser(userObj.email);
    if (userObj.username) deleteUser(userObj.username);
    setDeleteTarget(null);
    loadData();
    notify(`Account "${userObj.username}" removed and its workstation unbound.`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanUsername = (newUsername.trim() || cleanEmail.split('@')[0]).toLowerCase();

    if (users.some(u => normalizeKey(u.username) === normalizeKey(cleanUsername) || normalizeKey(u.email) === cleanEmail)) {
      notify(`"${cleanUsername}" or "${cleanEmail}" already exists.`);
      return;
    }

    addUser({
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
      role: newRole,
      password: newPassword.trim() || '12345678',
      branch: newBranch,
      school: newSchool,
      boundDeviceId: null,
      boundDeviceInfo: null,
      workSessionCount: 0,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      createdAt: new Date().toISOString()
    } as any);

    loadData();
    setModalOpen(false);
    setNewUsername('');
    setNewEmail('');
    setNewPassword('12345678');
    notify(`Account provisioned for ${cleanUsername} (${newRole.replace('_', ' ')}).`);
  };

  const handleExportCSV = () => {
    const headers = ['Username', 'Email', 'Role', 'Branch', 'School', 'Bound Device', 'Active Today', 'Total Records', 'Status'];
    const rows = filteredUsers.map(u => {
      const m = metricFor(u);
      return [
        u.username,
        u.email,
        u.role,
        (u as any).branch || 'Addis Ababa',
        u.school || 'YMS',
        u.boundDeviceId || 'Unbound',
        m?.today ?? 0,
        m?.total ?? 0,
        m?.terminalStatus || 'NO_DATA'
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `siliconlabs_accounts_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term ||
      normalizeKey(u.username).includes(term) ||
      normalizeKey(u.email).includes(term);
    if (!matchesSearch) return false;
    if (activeTab === 'Senders' && u.role !== 'SENDER') return false;
    if (activeTab === 'Receivers' && u.role !== 'RECEIVER') return false;
    if (activeTab === 'Admins' && u.role !== 'ADMIN') return false;
    if (activeTab === 'Super Admin' && u.role !== 'SUPER_ADMIN') return false;
    if (branchFilter !== 'All') {
      const branch = (u as any).branch || 'Addis Ababa';
      if (branch !== branchFilter) return false;
    }
    return true;
  });

  const counts = {
    all: users.length,
    senders: users.filter(u => u.role === 'SENDER').length,
    receivers: users.filter(u => u.role === 'RECEIVER').length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    supers: users.filter(u => u.role === 'SUPER_ADMIN').length
  };
  const boundDevices = users.filter(u => Boolean(u.boundDeviceId)).length;
  const activeNow = fleet?.active ?? metrics.filter(m => m.terminalStatus === 'ACTIVE').length;
  const recordsToday = fleet?.today ?? metrics.reduce((acc, m) => acc + (m.today || 0), 0);
  const recordsTotal = fleet?.total ?? metrics.reduce((acc, m) => acc + (m.total || 0), 0);

  const facts = [
    { label: 'Authorized Accounts', value: counts.all.toLocaleString(), hint: `${counts.senders} sender · ${counts.receivers} receiver`, icon: Users },
    { label: 'Active Now', value: activeNow.toLocaleString(), hint: 'transmitting · last 15 min', icon: Radio },
    { label: 'Records Today', value: recordsToday.toLocaleString(), hint: 'since 00:00 (EAT)', icon: Activity },
    { label: 'Bound Devices', value: boundDevices.toLocaleString(), hint: '1-device hardware lock', icon: Smartphone },
    { label: 'Registry Records', value: recordsTotal.toLocaleString(), hint: 'lifetime, deduplicated', icon: HardDrive }
  ];

  const tabs: { key: RoleTab; label: string }[] = [
    { key: 'All', label: `All ${counts.all}` },
    { key: 'Senders', label: `Senders ${counts.senders}` },
    { key: 'Receivers', label: `Receivers ${counts.receivers}` },
    { key: 'Admins', label: `Admins ${counts.admins}` },
    { key: 'Super Admin', label: `Super Admin ${counts.supers}` }
  ];

  return (
    <PageShell>
      <PageHero
        icon={Shield}
        title="Provision Operators & RBAC"
        count={`${counts.all.toLocaleString()} accounts`}
        live="Live fleet"
        subtitle="Provision any station, switch a role instantly, bind terminals and read each operator's real transmission status — senders, receivers and administrators in one register."
        actions={
          <>
            <ToolbarButton onClick={() => void syncFleet(true)} disabled={isRefreshing}>
              <RefreshCw className={`h-3.5 w-3.5 text-[#5C6B51] ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </ToolbarButton>
            <ToolbarButton icon={Download} onClick={handleExportCSV}>Export CSV</ToolbarButton>
            <PrimaryButton icon={UserPlus} onClick={() => setModalOpen(true)}>Provision Account</PrimaryButton>
          </>
        }
      >
        <FactGrid cols={5}>
          {facts.map(fact => (
            <FactCard key={fact.label} label={fact.label} value={fact.value} hint={fact.hint} icon={fact.icon} />
          ))}
        </FactGrid>
      </PageHero>

      {/* Password policy strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CDEBB4] bg-[#F4FBEA] px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#2F5E04]">
          <KeyRound className="h-3.5 w-3.5 shrink-0 text-[#4D8A07]" />
          <span>
            Universal master password <code className="rounded bg-white px-1.5 py-0.5 font-mono font-black text-[#0B1118]">12345678</code> — every provisioned account signs in with it.
          </span>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#4D8A07]">Policy enforced</span>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#CDEBB4] bg-[#EAF7DA] px-4 py-3 text-xs font-bold text-[#2F5E04]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4D8A07]" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-auto text-[#4D8A07] hover:text-[#0B1118] cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E3EFD7] bg-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F6FAEF] p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
                  : 'text-[#5C6B51] hover:text-[#0B1118]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-2.5 py-2 text-[11px] font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
          >
            <option value="All">All branches</option>
            {DEFAULT_BRANCHES.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A9680]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username or email..."
              className="w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] py-2 pl-9 pr-3 text-xs font-semibold text-[#0B1118] placeholder-[#8A9680] focus:border-[#9EE617] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <SectionCard
        icon={Users}
        title="Account register"
        subtitle={`${filteredUsers.length.toLocaleString()} of ${users.length.toLocaleString()} accounts · every role in one register`}
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E3EFD7] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
                <th className="py-3 pl-5 pr-3">Account</th>
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
                    No account matches this filter.
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const metric = metricFor(user);
                const totalSent = metric?.total ?? 0;
                const statusLabel = metric?.terminalStatus === 'ACTIVE'
                  ? 'Active now'
                  : metric?.terminalStatus === 'LOCKED'
                  ? 'Locked'
                  : metric?.terminalStatus === 'IDLE'
                  ? 'Idle'
                  : totalSent > 0
                  ? 'Offline'
                  : user.role === 'SENDER'
                  ? 'Never transmitted'
                  : 'No station feed';
                const statusChip = metric?.terminalStatus === 'ACTIVE'
                  ? 'bg-[#EAF7DA] text-[#2F5E04] border-[#CDEBB4]'
                  : metric?.terminalStatus === 'IDLE'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : metric?.terminalStatus === 'LOCKED'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-[#F3F7EE] text-[#4B5B42] border-[#E3EFD7]';
                const statusDot = metric?.terminalStatus === 'ACTIVE'
                  ? 'bg-[#6FBF0A] animate-pulse'
                  : metric?.terminalStatus === 'IDLE'
                  ? 'bg-amber-400'
                  : metric?.terminalStatus === 'LOCKED'
                  ? 'bg-rose-500'
                  : 'bg-slate-300';
                const lastSeen = metric?.serverLastActivity || metric?.lastActive || user.lastLoginAt || null;
                const lastSeenMs = typeof lastSeen === 'number' ? lastSeen : Date.parse(String(lastSeen || ''));
                const lastSeenLabel = Number.isFinite(lastSeenMs)
                  ? `last sent ${relativeTime(lastSeenMs)}`
                  : totalSent > 0
                  ? 'last activity unavailable'
                  : user.role === 'SENDER'
                  ? 'no transmission yet'
                  : 'not a field station';
                const isSelf = Boolean(currentUser && (normalizeKey(user.id) === normalizeKey(currentUser.id) || normalizeKey(user.email) === normalizeKey(currentUser.email) || normalizeKey(user.username) === normalizeKey(currentUser.username)));
                const isPreset = user.id.startsWith('cmu') || user.id.startsWith('usr-admin-') || user.id.startsWith('usr-receiver-') || user.id.startsWith('usr-sender-');

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
                            {isSelf && <span className="rounded bg-[#85E510] px-1.5 py-0.5 text-[9px] font-black text-[#062404]">YOU</span>}
                            {isPreset && <span className="rounded bg-[#F3F7EE] px-1.5 py-0.5 text-[9px] font-bold text-[#7C8B70]">SYSTEM</span>}
                          </div>
                          <div className="truncate text-[10px] font-medium text-[#7C8B70]">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={isSelf}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase focus:outline-none disabled:opacity-70 cursor-pointer ${roleChip(user.role)}`}
                        title="Switch privileges instantly"
                      >
                        <option value="SENDER">SENDER</option>
                        <option value="RECEIVER">RECEIVER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                      </select>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 font-bold text-[#0B1118]">
                        <Building2 className="h-3 w-3 text-[#8A9680]" />
                        {(user as any).branch || 'Addis Ababa'}
                      </div>
                      <div className="text-[10px] font-medium text-[#7C8B70]">{user.school || 'Unassigned'}</div>
                    </td>

                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusChip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                        {statusLabel}
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
                      <div className="text-[10px] font-medium text-[#7C8B70]">{user.role === 'SENDER' ? 'records' : '—'}</div>
                    </td>

                    <td className="px-3 py-3">
                      {user.boundDeviceId ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-[#CDEBB4] bg-[#EAF7DA] px-1.5 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                            <Smartphone className="h-2.5 w-2.5" />
                            Locked
                          </span>
                          <span className="truncate text-[9px] font-semibold tabular-nums text-[#8A9680]" title={user.boundDeviceId}>
                            {user.boundDeviceId.substring(0, 14)}
                          </span>
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

                        {isSelf || user.email === 'miskrdires11@gmail.com' ? (
                          <span className="rounded-md bg-[#F3F7EE] px-2 py-1 text-[10px] font-bold text-[#8A9680]">Protected</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-transparent text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 cursor-pointer"
                            title={`Delete "${user.username}"`}
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
      {modalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0B1118]/40 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF3E8] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF7DA]">
                  <UserPlus className="h-4 w-4 text-[#3F7A06]" />
                </div>
                <h3 className="text-sm font-black text-[#0B1118]">Provision operator account</h3>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-[#8A9680] hover:bg-[#F3F7EE] hover:text-[#0B1118] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 px-5 py-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                Username
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. samuel"
                  className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                />
              </label>

              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                Institutional email
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="operator@gmail.com"
                  className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                  Role
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                  >
                    <option value="SENDER">Sender</option>
                    <option value="RECEIVER">Receiver</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </label>

                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                  Branch
                  <select
                    value={newBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                  >
                    {DEFAULT_BRANCHES.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                  School
                  <select
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-2.5 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                  >
                    {(BRANCH_SCHOOL_MAP[newBranch] || ['YMS']).map(school => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                  Password
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] px-3 py-2 text-xs font-bold tabular-nums text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#EEF3E8] pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-[#4B5B42] hover:bg-[#F3F7EE] cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-[#85E510] px-4 py-2 text-xs font-black text-[#062404] hover:bg-[#76CF0C] cursor-pointer">
                  Provision account
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
                  immediately and its terminal is unbound. Records already transmitted stay in the registry.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-[#E3EFD7] py-2 text-xs font-bold text-[#2B3A22] hover:bg-[#FBFDF7] cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteUser} className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-black text-white hover:bg-rose-700 cursor-pointer">
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
