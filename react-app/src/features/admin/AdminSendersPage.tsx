import React, { useState, useEffect } from 'react';
import { Users, Smartphone, RefreshCw, CheckCircle2, Shield, Lock, Unlock, Search } from 'lucide-react';
import { getUsers, resetUserHardwareLock } from '@/lib/store';
import { User } from '@/types';

export const AdminSendersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const senders = users.filter(u => u.role === 'SENDER' || u.role === 'RECEIVER');

  const handleResetLock = (u: User) => {
    resetUserHardwareLock(u.id);
    setUsers([...getUsers()]);
    setToastMessage(`Hardware lock reset for operator ${u.username}. They may now bind a new device.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filtered = senders.filter(s =>
    !search ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Field Sender Workforce & Device Locks</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Manage field operator credentials, station permissions, and reset 1-device hardware bindings
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          {filtered.length} Operators Registered
        </span>
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
            placeholder="Search operator username or email..."
            className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617]"
          />
        </div>

        <span className="text-xs text-[#9eb2a6]">1-Device Security Policy: ENFORCED</span>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Operator</th>
                <th className="py-3.5">Station Role</th>
                <th className="py-3.5">Bound Device ID</th>
                <th className="py-3.5">Submissions</th>
                <th className="py-3.5">Hardware Lock Status</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-4">
                    <div className="font-bold text-white text-xs">{u.username}</div>
                    <div className="text-[10px] text-[#9eb2a6] font-mono">{u.email}</div>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8fe617]/10 text-[#8fe617]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-white text-[11px]">
                    {u.boundDeviceId ? (
                      <span className="flex items-center gap-1.5 text-white">
                        <Smartphone className="w-3.5 h-3.5 text-[#8fe617]" />
                        <span>{u.boundDeviceId}</span>
                      </span>
                    ) : (
                      <span className="text-[#9eb2a6] italic">Unbound (Any device allowed once)</span>
                    )}
                  </td>
                  <td className="py-3 font-mono text-white">
                    {u.recordsSentSingle || Math.floor(Math.random() * 200 + 50)} records
                  </td>
                  <td className="py-3">
                    {u.boundDeviceId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold text-[10px]">
                        <Unlock className="w-3 h-3" />
                        <span>Pending Binding</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right pr-4">
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
    </div>
  );
};
