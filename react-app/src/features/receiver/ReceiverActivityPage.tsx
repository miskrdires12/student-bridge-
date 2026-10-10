import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, Shield, RefreshCw } from 'lucide-react';
import { getAuditLogs } from '@/lib/store';
import { AuditLog } from '@/types';

export const ReceiverActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    setLogs(getAuditLogs());
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Receiver Activity Stream</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit trail of directory updates, field registrations, and bulk exports
          </p>
        </div>

        <button
          onClick={() => setLogs([...getAuditLogs()])}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#CBD5E1] text-xs font-bold text-[#202833] flex items-center gap-1.5 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#85E510]" />
          <span>Refresh Feed</span>
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 divide-y divide-[#E2E8F0] shadow-sm">
        {logs.map((log, idx) => (
          <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#202833] flex items-center gap-2">
                  <span>{log.action}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30 font-mono font-bold">
                    {log.entity}
                  </span>
                </div>
                <div className="text-xs text-[#64748B] mt-0.5">{log.details}</div>
                <div className="text-[10px] text-[#94A3B8] mt-1 flex items-center gap-2 font-mono">
                  <span>User: <strong className="text-[#202833]">{log.user}</strong></span>
                  <span>&bull;</span>
                  <span>Station: {log.station}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#64748B] shrink-0">
              {log.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
