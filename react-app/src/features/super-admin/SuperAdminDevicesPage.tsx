import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, ShieldAlert, CheckCircle2, RefreshCw, X, Plus, Search, Trash2, Key } from 'lucide-react';
import { getUsers, resetUserHardwareLock, setUserHardwareLock, addAuditLog, getCurrentUser } from '@/lib/store';
import { User } from '@/types';

export const SuperAdminDevicesPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleRevoke = (u: User) => {
    resetUserHardwareLock(u.id);
    setUsers([...getUsers()]);
    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Super Admin',
      station: 'Super Admin',
      action: 'Device Revoked',
      entity: u.username,
      details: `Revoked bound hardware terminal for ${u.email}. Session invalidated.`
    });
    setToastMessage(`Hardware terminal revoked for ${u.username}. They must re-bind upon next authorization.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAuthorizeNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail || !newDeviceId) return;

    const u = users.find(x => x.email === selectedUserEmail);
    if (u) {
      setUserHardwareLock(u.id, newDeviceId.trim());
      setUsers([...getUsers()]);
      addAuditLog({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: getCurrentUser()?.username || 'Super Admin',
        station: 'Super Admin',
        action: 'Device Authorized',
        entity: u.username,
        details: `Bound terminal ID ${newDeviceId} to operator account ${u.email}`
      });
      setToastMessage(`Terminal ${newDeviceId} explicitly authorized for ${u.username}.`);
      setModalOpen(false);
      setNewDeviceId('');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.boundDeviceId && u.boundDeviceId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">1-Device Hardware Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Authorize field terminals, bind operator accounts, revoke stolen or changed hardware, and invalidate sessions
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-[0_0_20px_rgba(133,229,16,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Authorize Device</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85e510]/15 border border-[#85e510]/30 text-[#85e510] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">Total Operator Accounts</span>
            <Shield className="w-4 h-4 text-[#85e510]" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-white">{users.length}</div>
          <div className="mt-1 text-[11px] text-[#85e510] font-semibold">Configurable RBAC fleet</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">Bound Terminals</span>
            <Smartphone className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-[#38bdf8]">
            {users.filter(u => u.boundDeviceId).length}
          </div>
          <div className="mt-1 text-[11px] text-[#94a3b8]">Actively bound to hardware</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">Policy Enforcement</span>
            <ShieldAlert className="w-4 h-4 text-[#85e510]" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-[#85e510]">STRICT</div>
          <div className="mt-1 text-[11px] text-[#85e510]">Server-Side Verification</div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1e2e42] flex items-center justify-between">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, or device ID..."
              className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#85e510]"
            />
          </div>
          <span className="text-xs text-[#94a3b8] font-mono">{filtered.length} Accounts Displayed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1520] border-b border-[#1e2e42] text-[#94a3b8] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Account / Email</th>
                <th className="py-3.5">Station Role</th>
                <th className="py-3.5">Bound Device ID</th>
                <th className="py-3.5">Device Binding Status</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42]/60">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-[#172435] transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="font-bold text-white text-xs">{u.username}</div>
                    <div className="text-[10px] text-[#94a3b8] font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                      u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' :
                      u.role === 'RECEIVER' ? 'bg-[#38bdf8]/20 text-[#38bdf8]' :
                      'bg-[#85e510]/15 text-[#85e510]'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[11px]">
                    {u.boundDeviceId ? (
                      <span className="text-white font-semibold flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#85e510]" />
                        <span>{u.boundDeviceId}</span>
                      </span>
                    ) : (
                      <span className="text-[#94a3b8] italic">Unbound (Binds on 1st login)</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    {u.boundDeviceId ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
                        Authorized
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Pending Binding
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-4">
                    {u.boundDeviceId ? (
                      <button
                        onClick={() => handleRevoke(u)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-[11px] font-semibold text-red-400 border border-red-500/30 transition-colors"
                      >
                        Revoke Device
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#94a3b8]">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorize Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-1">Authorize Device Terminal</h3>
            <p className="text-xs text-[#94a3b8] mb-4">Assign a specific hardware ID to an operator account</p>

            <form onSubmit={handleAuthorizeNew} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Target Account</label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                >
                  <option value="">Select Account...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.email}>
                      {u.username} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Terminal Hardware ID</label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="e.g. DEV-SILICON-A94F81"
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#85e510]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-lg shadow-[#85e510]/20"
                >
                  Authorize Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
