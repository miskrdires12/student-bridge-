import React, { useState, useEffect } from 'react';
import { Activity, Shield, Clock, RefreshCw, Filter, Search } from 'lucide-react';
import { getAuditLogs } from '@/lib/store';
import { AuditLog } from '@/types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLogs(getAuditLogs());
  }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Security & Governance Audit Trail</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Cryptographically sealed operational audit logs recording all station logins, updates, and exports
          </p>
        </div>

        <button
          onClick={() => setLogs([...getAuditLogs()])}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#8fe617]" />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-4">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617]"
          />
        </div>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Timestamp</th>
                <th className="py-3.5">Operator</th>
                <th className="py-3.5">Station</th>
                <th className="py-3.5">Action Event</th>
                <th className="py-3.5">Entity</th>
                <th className="py-3.5 pr-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {filtered.map((log, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-3 pl-4 font-mono text-[11px] text-[#9eb2a6] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 font-semibold text-white whitespace-nowrap">{log.user}</td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-[#8fe617]">
                      {log.station}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-white whitespace-nowrap">{log.action}</td>
                  <td className="py-3 font-mono text-[#8fe617] whitespace-nowrap">{log.entity}</td>
                  <td className="py-3 text-[#9eb2a6] pr-4">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
