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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Security & Governance Audit Trail</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cryptographically logged operational audit trail recording station logins, record updates, and photo exports
          </p>
        </div>

        <button
          onClick={() => setLogs([...getAuditLogs()])}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#CBD5E1] text-xs font-bold text-[#202833] flex items-center gap-1.5 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#85E510]" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by user, action, details..."
            className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-4 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Timestamp</th>
                <th className="py-3.5">Operator</th>
                <th className="py-3.5">Station</th>
                <th className="py-3.5">Action Event</th>
                <th className="py-3.5">Entity</th>
                <th className="py-3.5 pr-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((log, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3 pl-6 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 font-bold text-[#202833] whitespace-nowrap">{log.user}</td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                      {log.station}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-[#202833] whitespace-nowrap">{log.action}</td>
                  <td className="py-3 font-mono text-[#0284C7] font-semibold whitespace-nowrap">{log.entity}</td>
                  <td className="py-3 text-[#64748B] pr-6">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
