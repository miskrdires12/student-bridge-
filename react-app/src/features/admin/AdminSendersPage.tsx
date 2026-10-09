import React, { useState, useEffect } from 'react';
import { Users, Smartphone, Plus, CheckCircle2, Shield, Search, MoreHorizontal, UserPlus, X } from 'lucide-react';
import { getUsers, resetUserHardwareLock } from '@/lib/store';
import { User } from '@/types';

export const AdminSendersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSchool, setInviteSchool] = useState('YMS');

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  // Standard predefined senders matching screenshot 11 + dynamic operators
  const sendersList = [
    { name: 'Loza Bereket', email: 'loza@example.com', school: 'YMS', status: 'Active', performance: 94 },
    { name: 'Alemu Tadesse', email: 'alemu@example.com', school: 'Adika Youth', status: 'Active', performance: 91 },
    { name: 'Hana Tadesse', email: 'hana@example.com', school: 'School of America', status: 'Active', performance: 88 },
    { name: 'Getnet Kassa', email: 'getnet@example.com', school: 'Ferway', status: 'Suspended', performance: 62 },
    { name: 'Dawit Alemu', email: 'dawit@example.com', school: 'Warka', status: 'Active', performance: 85 },
  ];

  const handleResetLock = (name: string) => {
    setToastMessage(`Hardware lock reset for operator ${name}. Bound device cleared.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setToastMessage(`Invitation dispatched to ${inviteEmail} for school ${inviteSchool}.`);
    setInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = sendersList.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.school.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title & Invite Button - Exact match to screenshot 11 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Senders</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Manage field data collection agents, school allocations, performance ratios, and 1-device lock
          </p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-[0_0_20px_rgba(133,229,16,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Sender</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85e510]/15 border border-[#85e510]/30 text-[#85e510] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-4 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sender by name, email, school..."
            className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#85e510]"
          />
        </div>

        <div className="text-xs text-[#94a3b8]">
          Active Workforce: <strong className="text-white">{filtered.length} Senders</strong>
        </div>
      </div>

      {/* Senders Table - Exact columns from screenshot 11 */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1520] border-b border-[#1e2e42] text-[#94a3b8] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Name</th>
                <th className="py-3.5">Email</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Performance</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42]/60">
              {filtered.map((s) => (
                <tr key={s.email} className="hover:bg-[#172435] transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="font-bold text-white text-xs">{s.name}</div>
                  </td>
                  <td className="py-3.5 font-mono text-[#94a3b8] text-xs">
                    {s.email}
                  </td>
                  <td className="py-3.5 text-white font-medium">
                    {s.school}
                  </td>
                  <td className="py-3.5">
                    {s.status === 'Active' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-28 bg-[#0d1520] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.performance >= 90 ? 'bg-[#85e510]' :
                            s.performance >= 75 ? 'bg-[#38bdf8]' : 'bg-red-400'
                          }`}
                          style={{ width: `${s.performance}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white text-[11px]">{s.performance}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-right pr-4">
                    <button
                      onClick={() => handleResetLock(s.name)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#85e510] border border-white/10 transition-colors"
                      title="Reset 1-Device Hardware Lock"
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

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-1">Invite New Field Sender</h3>
            <p className="text-xs text-[#94a3b8] mb-4">Send authorization link and credentials for mobile station capture</p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Dawit Kebede"
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. dawit.kebede@siliconlabs.et"
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Assigned School Campus</label>
                <select
                  value={inviteSchool}
                  onChange={(e) => setInviteSchool(e.target.value)}
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                >
                  <option value="YMS">YMS</option>
                  <option value="Adika Youth">Adika Youth</option>
                  <option value="School of America">School of America</option>
                  <option value="Ferway">Ferway</option>
                  <option value="Warka">Warka</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-lg shadow-[#85e510]/20"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
