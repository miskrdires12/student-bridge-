import React, { useState } from 'react';
import { Activity, RefreshCw, Shield, Clock, User } from 'lucide-react';
import { getAuditLogs } from '@/lib/store';
import { AuditLog } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, EmptyState } from '@/components/ui/PageKit';

export const ReceiverActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => getAuditLogs());

  const todayKey = new Date().toISOString().substring(0, 10);
  const todayCount = logs.filter(l => String(l.timestamp || '').includes(todayKey)).length;
  const stations = new Set(logs.map(l => l.station).filter(Boolean)).size;
  const operators = new Set(logs.map(l => l.user).filter(Boolean)).size;

  return (
    <PageShell className="mx-auto max-w-5xl">
      <PageHero
        icon={Activity}
        title="Receiver Activity"
        count={`${logs.length} events`}
        live="Audit feed"
        subtitle="Audit trail of directory updates, field registrations and bulk exports recorded on this station."
        actions={<ToolbarButton icon={RefreshCw} onClick={() => setLogs([...getAuditLogs()])}>Refresh Feed</ToolbarButton>}
      >
        <FactGrid cols={4}>
          <FactCard label="Events" value={logs.length.toLocaleString()} hint="in the local trail" icon={Activity} />
          <FactCard label="Today" value={todayCount.toLocaleString()} hint="logged since 00:00" icon={Clock} />
          <FactCard label="Operators" value={operators.toLocaleString()} hint="distinct accounts" icon={User} />
          <FactCard label="Stations" value={stations.toLocaleString()} hint="distinct terminals" icon={Shield} />
        </FactGrid>
      </PageHero>

      <SectionCard title="Activity Feed" subtitle="Newest entries first" icon={Activity} padded={false}>
        {logs.length === 0 ? (
          <div className="p-3.5">
            <EmptyState icon={Activity} title="No activity recorded yet" hint="Actions taken on this station will appear here." />
          </div>
        ) : (
          <div className="divide-y divide-[#EDF4E5]">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#CDEBB4] bg-[#EAF7DA] text-[#3F7A06]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1118]">
                      <span>{log.action}</span>
                      <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 font-mono text-[10px] font-bold text-[#2F5E04]">
                        {log.entity}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[#5C6B51]">{log.details}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-[#8A9680]">
                      <span>User: <strong className="text-[#0B1118]">{log.user}</strong></span>
                      <span>&bull;</span>
                      <span>Station: {log.station}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 font-mono text-[11px] text-[#7C8B70]">{log.timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
};
