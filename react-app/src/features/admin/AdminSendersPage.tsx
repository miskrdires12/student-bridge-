import React, { useState, useEffect } from 'react';
import { Users, Smartphone, Plus, CheckCircle2, Shield, Search, MoreHorizontal, UserPlus, X, RefreshCw } from 'lucide-react';
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

  // Senders list
  const [sendersList, setSendersList] = useState([
    { name: 'Loza Bereket', email: 'loza@example.com', school: 'YMS', status: 'Active', performance: 94, terminal: 'DEV-HW-01' },
    { name: 'Alemu Tadesse', email: 'alemu@example.com', school: 'Adika Youth', status: 'Active', performance: 91, terminal: 'DEV-HW-02' },
    { name: 'Hana Tadesse', email: 'hana@example.com', school: 'School of America', status: 'Active', performance: 88, terminal: 'DEV-HW-03' },
    { name: 'Getnet Kassa', email: 'getnet@example.com', school: 'Ferway', status: 'Suspended', performance: 62, terminal: 'DEV-HW-04' },
    { name: 'Dawit Alemu', email: 'dawit@example.com', school: 'Warka', status: 'Active', performance: 85, terminal: 'DEV-HW-05' },
    { name: 'miskrdires12', email: 'miskrdires12@gmail.com', school: 'YMS', status: 'Active', performance: 96, terminal: 'DEV-HW-12' },
  ]);

  const handleResetLock = (name: string) => {
    setToastMessage(`Hardware lock reset for operator ${name}. Bound terminal cleared.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setSendersList(prev => [
      ...prev,
      { name: inviteName.trim(), email: inviteEmail.trim(), school: inviteSchool, status: 'Active', performance: 100, terminal: 'Unassigned' }
    ]);
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
    <div className="space-y-6 pb-12">
      {/* Title & Invite Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">Sender Management</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Supervise field data collection operators, school allocations, accuracy rates, and terminal assignments
          </p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Sender Operator</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sender by name, email, school..."
            className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
          />
        </div>

        <div className="text-xs text-[#64748B]">
          Active Workforce: <strong className="text-[#202833]">{filtered.length} Field Senders</strong>
        </div>
      </div>

      {/* Senders Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Operator Name</th>
                <th className="py-3.5">Email Address</th>
                <th className="py-3.5">Assigned Campus</th>
                <th className="py-3.5">Account Status</th>
                <th className="py-3.5">Quality Score</th>
                <th className="py-3.5">Hardware Terminal</th>
                <th className="py-3.5 text-right pr-6">1-Device Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((s) => (
                <tr key={s.email} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3.5 pl-6 font-bold text-[#202833]">{s.name}</td>
                  <td className="py-3.5 font-mono text-[#64748B]">{s.email}</td>
                  <td className="py-3.5 font-semibold text-[#202833]">{s.school}</td>
                  <td className="py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      s.status === 'Active'
                        ? 'bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#85E510] h-full rounded-full"
                          style={{ width: `${s.performance}%` }}
                        />
                      </div>
                      <span className="font-bold text-[#202833]">{s.performance}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-[11px] text-[#64748B]">{s.terminal}</td>
                  <td className="py-3.5 text-right pr-6">
                    <button
                      type="button"
                      onClick={() => handleResetLock(s.name)}
                      className="px-2.5 py-1 rounded-lg bg-[#F8FAF9] hover:bg-amber-50 text-[#202833] hover:text-amber-800 border border-[#CBD5E1] text-[11px] font-bold transition-all"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#4D8A07]" />
                <span>Invite Sender Operator</span>
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#202833] font-bold mb-1">Operator Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Dawit Alemu"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Operator Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="operator@siliconlabs.et"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#202833] font-bold mb-1">Assigned School Campus</label>
                <select
                  value={inviteSchool}
                  onChange={(e) => setInviteSchool(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                >
                  <option value="YMS">YMS (Addis Ababa)</option>
                  <option value="Adika Youth">Adika Youth (Addis Ababa)</option>
                  <option value="School of America">School of America (Addis Ababa)</option>
                  <option value="Ferway">Ferway (Addis Ababa)</option>
                  <option value="Warka">Warka (Addis Ababa)</option>
                  <option value="Yacine">Yacine (Adama)</option>
                  <option value="Debebech">Debebech (Adama)</option>
                  <option value="High Tech">High Tech (Harar)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm"
                >
                  Dispatch Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
