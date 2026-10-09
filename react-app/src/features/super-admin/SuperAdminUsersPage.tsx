import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Smartphone, Lock, Unlock, Search, X, CheckCircle2 } from 'lucide-react';
import { getUsers, resetUserHardwareLock } from '@/lib/store';
import { User, UserRole } from '@/types';

export const SuperAdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New user form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SENDER');

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleResetLock = (u: User) => {
    resetUserHardwareLock(u.id);
    setUsers([...getUsers()]);
    setToastMessage(`Hardware lock successfully unlocked for user ${u.username}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim()) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: newUsername.trim(),
      email: newEmail.trim(),
      role: newRole,
      boundDeviceId: null,
    };

    const allUsers = getUsers();
    allUsers.unshift(newUser);
    setUsers([...allUsers]);
    setModalOpen(false);
    setNewUsername('');
    setNewEmail('');
    setToastMessage(`Operator ${newUser.username} registered with role ${newUser.role}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = users.filter(u =>
    !search ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Enterprise User & RBAC Management</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Role definitions, operator accounts, security policies, and 1-device lock management
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Operator Account</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/30 text-[#8fe617] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-4 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by operator username or email..."
            className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617]"
          />
        </div>

        <span className="text-xs font-mono text-[#8fe617]">{filtered.length} Users Total</span>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Account & Email</th>
                <th className="py-3.5">Assigned Role</th>
                <th className="py-3.5">1-Device Lock Hardware ID</th>
                <th className="py-3.5">Hardware Binding Status</th>
                <th className="py-3.5 text-right pr-4">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="font-bold text-white text-xs">{u.username}</div>
                    <div className="text-[10px] text-[#9eb2a6] font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      u.role === 'RECEIVER' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-white text-[11px]">
                    {u.boundDeviceId ? (
                      <span className="flex items-center gap-1.5 text-white">
                        <Smartphone className="w-3.5 h-3.5 text-[#8fe617]" />
                        <span>{u.boundDeviceId}</span>
                      </span>
                    ) : (
                      <span className="text-[#9eb2a6] italic">Unbound</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    {u.boundDeviceId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                        <Lock className="w-3 h-3" />
                        <span>Locked to 1 Device</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold text-[10px]">
                        <Unlock className="w-3 h-3" />
                        <span>Open for First Binding</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right pr-4">
                    <button
                      type="button"
                      onClick={() => handleResetLock(u)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 font-bold text-xs transition-all border border-amber-500/20"
                    >
                      Reset Lock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#9eb2a6] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-4">Register New System Operator</h3>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. loza_field"
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                />
              </div>

              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. loza.bereket@siliconlabs.et"
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                />
              </div>

              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Operational Station Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                >
                  <option value="SENDER">SENDER (Field Registration & Biometrics)</option>
                  <option value="RECEIVER">RECEIVER (Central Directory & Mistake Analyzer)</option>
                  <option value="ADMIN">ADMIN (Workforce Supervision & Tasks)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN (Global Governance & Root Control)</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#8fe617] text-[#062404] font-bold text-xs"
                >
                  Provision User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
