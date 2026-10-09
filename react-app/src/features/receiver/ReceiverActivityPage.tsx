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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Receiver Activity Stream</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Audit trail of directory updates, field registrations, and bulk exports
          </p>
        </div>

        <button
          onClick={() => setLogs([...getAuditLogs()])}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#8fe617]" />
          <span>Refresh Feed</span>
        </button>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 divide-y divide-[#1e2c22]/60">
        {logs.map((log, idx) => (
          <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{log.action}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#8fe617] font-mono">
                    {log.entity}
                  </span>
                </div>
                <div className="text-xs text-[#9eb2a6] mt-0.5">{log.details}</div>
                <div className="text-[10px] text-[#9eb2a6]/70 mt-1 flex items-center gap-2 font-mono">
                  <span>User: {log.user}</span>
                  <span>&bull;</span>
                  <span>Station: {log.station}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#9eb2a6] shrink-0">
              {log.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
