import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, ShieldAlert, CheckCircle2, X, Plus, Search } from 'lucide-react';
import { getUsers, resetUserHardwareLock, setUserHardwareLock, addAuditLog, getCurrentUser } from '@/lib/store';
import { User } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, PrimaryButton, ToolbarButton, Chip } from '@/components/ui/PageKit';

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

  const bound = users.filter(u => Boolean(u.boundDeviceId)).length;

  return (
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={Smartphone}
        title="Device Management"
        count={`${bound} bound`}
        live="Root authority"
        subtitle="Authorize field terminals, bind operator accounts, revoke changed hardware and invalidate sessions. The lock is enforced on every login."
        actions={<PrimaryButton icon={Plus} onClick={() => setModalOpen(true)}>Authorize Device</PrimaryButton>}
      >
        <FactGrid cols={4}>
          <FactCard label="Operator Accounts" value={users.length.toLocaleString()} hint="with a role assignment" icon={Shield} />
          <FactCard label="Bound Terminals" value={bound.toLocaleString()} hint="locked to one device" icon={Smartphone} />
          <FactCard label="Pending Binding" value={(users.length - bound).toLocaleString()} hint="binds on first login" icon={ShieldAlert} />
          <FactCard label="Enforcement" value="Strict" hint="checked in the app shell" icon={Shield} />
        </FactGrid>
      </PageHero>

      {toastMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#CDEBB4] bg-[#EAF7DA] p-3.5 text-xs font-semibold text-[#2F5E04]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6FBF0A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SectionCard
        title="Operator Devices"
        subtitle="Search by user, email or device id"
        icon={Smartphone}
        padded={false}
        actions={<Chip tone="neutral">{filtered.length} shown</Chip>}
      >
        <div className="border-b border-[#EDF4E5] p-3.5">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A6B29B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, or device ID..."
              className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] py-2 pl-9 pr-4 text-xs text-[#0B1118] placeholder-[#A6B29B] focus:border-[#85E510] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3.5 pl-6">Account / Email</th>
                <th className="py-3.5">Station Role</th>
                <th className="py-3.5">Bound Device ID</th>
                <th className="py-3.5">Binding Status</th>
                <th className="py-3.5 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {filtered.map(u => (
                <tr key={u.id} className="transition-colors hover:bg-[#F8FBF4]">
                  <td className="py-3.5 pl-6">
                    <div className="text-xs font-bold text-[#0B1118]">{u.username}</div>
                    <div className="font-mono text-[10px] text-[#7C8B70]">{u.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      u.role === 'SUPER_ADMIN'
                        ? 'border-purple-200 bg-purple-50 text-purple-800'
                        : u.role === 'ADMIN'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : u.role === 'RECEIVER'
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04]'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[11px]">
                    {u.boundDeviceId ? (
                      <span className="flex items-center gap-1.5 font-bold text-[#0B1118]">
                        <Smartphone className="h-3.5 w-3.5 text-[#6FBF0A]" />
                        <span>{u.boundDeviceId}</span>
                      </span>
                    ) : (
                      <span className="italic text-[#A6B29B]">Unbound (binds on 1st login)</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    {u.boundDeviceId ? (
                      <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2.5 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                        Authorized
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Pending binding
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-6 text-right">
                    {u.boundDeviceId ? (
                      <button
                        onClick={() => handleRevoke(u)}
                        className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        Revoke Device
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#A6B29B]">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs font-medium text-[#8A9680]">
                    No account matches this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-[#E3EFD7] bg-white p-6 shadow-2xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 cursor-pointer text-[#A6B29B] hover:text-[#0B1118]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-lg font-black tracking-tight text-[#0B1118]">Authorize Terminal</h3>
            <p className="mb-4 text-xs text-[#7C8B70]">Assign a specific hardware ID to an operator account.</p>

            <form onSubmit={handleAuthorizeNew} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7C8B70]">Target account</label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-xs text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                >
                  <option value="">Select account...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.email}>
                      {u.username} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#7C8B70]">Terminal hardware ID</label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="e.g. DEV-SILICON-A94F81"
                  className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 font-mono text-xs text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <ToolbarButton onClick={() => setModalOpen(false)} className="border-transparent bg-transparent">
                  Cancel
                </ToolbarButton>
                <PrimaryButton type="submit">Authorize Terminal</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};
