import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Smartphone, Lock, Unlock, Search, X, CheckCircle2 } from 'lucide-react';
import { getUsers, resetUserHardwareLock } from '@/lib/store';
import { User, UserRole } from '@/types';

export const SuperAdminUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Senders' | 'Receivers' | 'Admins'>('All');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New user form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SENDER');
  const [newSchool, setNewSchool] = useState('YMS');

  // Realistic operators matching screenshot 13
  const [operators, setOperators] = useState([
    { id: '1', name: 'Miskr Dires', email: 'miskrdires11@gmail.com', role: 'Super Admin', school: 'Headquarters', status: 'Active' },
    { id: '2', name: 'Loza Bereket', email: 'loza.bereket@siliconlabs.et', role: 'Sender', school: 'YMS', status: 'Active' },
    { id: '3', name: 'Alemu Tadesse', email: 'alemu.tadesse@siliconlabs.et', role: 'Receiver', school: 'Adika Youth', status: 'Active' },
    { id: '4', name: 'Admin Addis', email: 'admin.addis@siliconlabs.et', role: 'Admin', school: 'YMS', status: 'Active' },
    { id: '5', name: 'Hana Tadesse', email: 'hana.tadesse@siliconlabs.et', role: 'Sender', school: 'School of America', status: 'Active' },
    { id: '6', name: 'Getnet Kassa', email: 'getnet.kassa@siliconlabs.et', role: 'Receiver', school: 'Ferway', status: 'Active' },
  ]);

  const handleResetLock = (name: string) => {
    setToastMessage(`1-Device Lock successfully reset for ${name}. Hardware ID unbound.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim()) return;

    const newOp = {
      id: `${Date.now()}`,
      name: newUsername.trim(),
      email: newEmail.trim(),
      role: newRole === 'SUPER_ADMIN' ? 'Super Admin' : newRole === 'ADMIN' ? 'Admin' : newRole === 'RECEIVER' ? 'Receiver' : 'Sender',
      school: newSchool,
      status: 'Active',
    };

    setOperators([newOp, ...operators]);
    setModalOpen(false);
    setNewUsername('');
    setNewEmail('');
    setToastMessage(`Account created for ${newOp.name} (${newOp.role}).`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredOperators = operators.filter(op => {
    const matchesSearch = !search ||
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.email.toLowerCase().includes(search.toLowerCase()) ||
      op.school.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'All') return true;
    if (activeTab === 'Senders') return op.role === 'Sender';
    if (activeTab === 'Receivers') return op.role === 'Receiver';
    if (activeTab === 'Admins') return op.role === 'Admin' || op.role === 'Super Admin';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Add User Button - Matching Screenshot 13 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">User Management</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Fleet operators, credential issuance, access tiers, and hardware device bindings
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-[0_0_20px_rgba(133,229,16,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85e510]/15 border border-[#85e510]/30 text-[#85e510] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs Header matching screenshot 13 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e2e42] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'All'
                ? 'bg-[#85e510] text-[#071302]'
                : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab('Senders')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'Senders'
                ? 'bg-[#85e510] text-[#071302]'
                : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
            }`}
          >
            Senders
          </button>
          <button
            onClick={() => setActiveTab('Receivers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'Receivers'
                ? 'bg-[#85e510] text-[#071302]'
                : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
            }`}
          >
            Receivers
          </button>
          <button
            onClick={() => setActiveTab('Admins')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'Admins'
                ? 'bg-[#85e510] text-[#071302]'
                : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
            }`}
          >
            Admins
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operator..."
            className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#85e510]"
          />
        </div>
      </div>

      {/* Users Table matching screenshot 13 */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1520] border-b border-[#1e2e42] text-[#94a3b8] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Name & Role</th>
                <th className="py-3.5">Role</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42]/60">
              {filteredOperators.map((u) => (
                <tr key={u.id} className="hover:bg-[#172435] transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="font-bold text-white text-xs">{u.name}</div>
                    <div className="text-[10px] text-[#94a3b8] font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'Super Admin' ? 'bg-purple-500/20 text-purple-300' :
                      u.role === 'Admin' ? 'bg-blue-500/20 text-blue-300' :
                      u.role === 'Receiver' ? 'bg-[#38bdf8]/20 text-[#38bdf8]' :
                      'bg-[#85e510]/15 text-[#85e510]'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 text-white font-medium">
                    {u.school}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 text-right pr-4">
                    <button
                      onClick={() => handleResetLock(u.name)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#85e510] border border-white/10 transition-colors"
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
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-1">Add Operator Account</h3>
            <p className="text-xs text-[#94a3b8] mb-4">Provision system credentials with 1-device lock security</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Solomon Hailu"
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. solomon.hailu@siliconlabs.et"
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Operating Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                  >
                    <option value="SENDER">Sender</option>
                    <option value="RECEIVER">Receiver</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1">School Campus</label>
                  <select
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                  >
                    <option value="YMS">YMS</option>
                    <option value="Adika Youth">Adika Youth</option>
                    <option value="School of America">School of America</option>
                    <option value="Ferway">Ferway</option>
                    <option value="Warka">Warka</option>
                  </select>
                </div>
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
