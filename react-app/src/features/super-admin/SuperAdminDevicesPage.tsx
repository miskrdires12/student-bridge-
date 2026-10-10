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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">1-Device Hardware Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Authorize field terminals, bind operator accounts, revoke stolen or changed hardware, and invalidate sessions
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Authorize Device</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Total Operator Accounts</span>
            <Shield className="w-4 h-4 text-[#85E510]" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-[#202833]">{users.length}</div>
          <div className="mt-1 text-[11px] text-[#366804] font-semibold">Configurable RBAC fleet</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Bound Terminals</span>
            <Smartphone className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-[#0284C7]">
            {users.filter(u => u.boundDeviceId).length}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">Actively bound to hardware</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Policy Enforcement</span>
            <ShieldAlert className="w-4 h-4 text-[#85E510]" />
          </div>
          <div className="mt-2 text-3xl font-heading font-black text-[#2E7D32]">STRICT</div>
          <div className="mt-1 text-[11px] text-[#366804] font-semibold">Server-Side Verification Active</div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, or device ID..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
            />
          </div>
          <span className="text-xs text-[#64748B] font-mono font-medium">{filtered.length} Accounts Displayed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Account / Email</th>
                <th className="py-3.5">Station Role</th>
                <th className="py-3.5">Bound Device ID</th>
                <th className="py-3.5">Device Binding Status</th>
                <th className="py-3.5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3.5 pl-6">
                    <div className="font-bold text-[#202833] text-xs">{u.username}</div>
                    <div className="text-[10px] text-[#64748B] font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                      u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      u.role === 'RECEIVER' ? 'bg-sky-100 text-sky-800 border-sky-200' :
                      'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[11px]">
                    {u.boundDeviceId ? (
                      <span className="text-[#202833] font-bold flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#85E510]" />
                        <span>{u.boundDeviceId}</span>
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] italic">Unbound (Binds on 1st login)</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    {u.boundDeviceId ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                        Authorized
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Pending Binding
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-6">
                    {u.boundDeviceId ? (
                      <button
                        onClick={() => handleRevoke(u)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[11px] font-bold text-red-700 border border-red-200 transition-colors"
                      >
                        Revoke Device
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8]">&mdash;</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-[#202833]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-[#202833] mb-1">Authorize Device Terminal</h3>
            <p className="text-xs text-[#64748B] mb-4">Assign a specific hardware ID to an operator account</p>

            <form onSubmit={handleAuthorizeNew} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-1">Target Account</label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] focus:outline-none focus:border-[#85E510]"
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
                <label className="text-xs font-bold text-[#64748B] block mb-1">Terminal Hardware ID</label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="e.g. DEV-SILICON-A94F81"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono focus:outline-none focus:border-[#85E510]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-xs font-bold text-[#64748B] hover:text-[#202833]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm"
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
