import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Smartphone, Lock, Unlock, Search, X, CheckCircle2, UserPlus, RefreshCw, KeyRound } from 'lucide-react';
import { getUsers, resetUserHardwareLock } from '@/lib/store';
import { User, UserRole } from '@/types';

export const SuperAdminUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Senders' | 'Receivers' | 'Admins' | 'Super Admin'>('All');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New user form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SENDER');
  const [newSchool, setNewSchool] = useState('YMS');

  const loadData = () => {
    setUsers([...getUsers()]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetLock = (userId: string, username: string) => {
    resetUserHardwareLock(userId);
    loadData();
    setToastMessage(`1-Device Lock successfully reset for ${username}. Hardware terminal unbound.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      user.role = newRole;
      loadData();
      setToastMessage(`Updated role of ${user.username} to ${newRole}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
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
      boundDeviceInfo: null,
      workSessionCount: 0,
      recordsSentSingle: 0,
      recordsEncoded: 0,
      createdAt: new Date().toISOString()
    };

    const all = getUsers();
    all.unshift(newUser);
    loadData();

    setModalOpen(false);
    setNewUsername('');
    setNewEmail('');
    setToastMessage(`Account provisioned for ${newUser.username} (${newUser.role}).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'All') return true;
    if (activeTab === 'Senders') return u.role === 'SENDER';
    if (activeTab === 'Receivers') return u.role === 'RECEIVER';
    if (activeTab === 'Admins') return u.role === 'ADMIN';
    if (activeTab === 'Super Admin') return u.role === 'SUPER_ADMIN';
    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RECEIVER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SENDER':
        return 'bg-[#85E510]/20 text-[#366804] border-[#85E510]/40';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              User & Role Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase font-mono">
              {users.length} Authorized Accounts
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Centralized operator account provisioning, role assignments, station tiers, and hardware device lock controls
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Account</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Tabs & Search Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Senders', 'Receivers', 'Admins', 'Super Admin'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
                  : 'text-[#64748B] hover:text-[#202833] bg-[#F8FAF9] border border-[#CBD5E1]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operator username or email..."
            className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Operator Username</th>
                <th className="py-3.5">Email Address</th>
                <th className="py-3.5">Assigned Station</th>
                <th className="py-3.5">Hardware Terminal ID</th>
                <th className="py-3.5">Role Assignment</th>
                <th className="py-3.5 text-right pr-6">Device Lock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredUsers.map((u) => {
                const hasDevice = !!u.boundDeviceId;
                return (
                  <tr key={u.id || u.email} className="hover:bg-[#F8FAF9] transition-colors">
                    {/* Username */}
                    <td className="py-3.5 pl-6 font-bold text-[#202833] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#F4F7F5] border border-[#CBD5E1] flex items-center justify-center font-bold text-[#64748B] text-[11px]">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 font-mono text-[#64748B]">{u.email}</td>

                    {/* Assigned Station Badge */}
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Terminal ID */}
                    <td className="py-3.5 font-mono text-[11px]">
                      {hasDevice ? (
                        <span className="text-[#366804] bg-[#85E510]/15 px-2 py-0.5 rounded border border-[#85E510]/30 font-bold">
                          {u.boundDeviceId?.substring(0, 14)}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] italic">Unbound Terminal</span>
                      )}
                    </td>

                    {/* Change Role Selector */}
                    <td className="py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#202833] focus:border-[#85E510]"
                      >
                        <option value="SENDER">SENDER</option>
                        <option value="RECEIVER">RECEIVER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                      </select>
                    </td>

                    {/* Device Lock Action */}
                    <td className="py-3.5 text-right pr-6">
                      {hasDevice ? (
                        <button
                          type="button"
                          onClick={() => handleResetLock(u.id, u.username)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-all inline-flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Reset Lock</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">Unlocked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#4D8A07]" />
                <span>Provision Operator Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#202833] font-bold mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. operator_adama"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="operator@siliconlabs.et"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Station Role Assignment</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#202833]"
                >
                  <option value="SENDER">Sender Station</option>
                  <option value="RECEIVER">Receiver Station</option>
                  <option value="ADMIN">Admin Station</option>
                  <option value="SUPER_ADMIN">Super Admin Station</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] text-[11px] text-[#64748B] leading-relaxed">
                <Shield className="w-3.5 h-3.5 text-[#4D8A07] inline mr-1" />
                Account will be initialized with 1-Device hardware binding policy active. Initial login binds terminal identifier.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
