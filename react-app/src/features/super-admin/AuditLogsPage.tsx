import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Search, User, Building2, Activity, FileText } from 'lucide-react';
import { getAuditLogs } from '@/lib/store';
import { AuditLog } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, Chip } from '@/components/ui/PageKit';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => getAuditLogs());
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l =>
    !search ||
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  const operators = new Set(logs.map(l => l.user).filter(Boolean)).size;
  const stations = new Set(logs.map(l => l.station).filter(Boolean)).size;
  const entities = new Set(logs.map(l => l.entity).filter(Boolean)).size;

  return (
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={ShieldCheck}
        title="Audit Trail"
        count={`${logs.length} entries`}
        live="Governance"
        subtitle="Operational audit trail recording station logins, record updates and photo exports. Every entry is written locally when the action happens."
        actions={<ToolbarButton icon={RefreshCw} onClick={() => setLogs([...getAuditLogs()])}>Refresh Trail</ToolbarButton>}
      >
        <FactGrid cols={4}>
          <FactCard label="Entries" value={logs.length.toLocaleString()} hint="recorded events" icon={FileText} />
          <FactCard label="Operators" value={operators.toLocaleString()} hint="distinct accounts" icon={User} />
          <FactCard label="Stations" value={stations.toLocaleString()} hint="distinct terminals" icon={Building2} />
          <FactCard label="Entities" value={entities.toLocaleString()} hint="record types touched" icon={Activity} />
        </FactGrid>
      </PageHero>

      <SectionCard padded>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A6B29B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action or details..."
            className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] py-2 pl-9 pr-4 text-xs text-[#0B1118] placeholder-[#A6B29B] focus:border-[#85E510] focus:outline-none"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Event Log"
        subtitle="Newest entries first"
        icon={ShieldCheck}
        padded={false}
        actions={<Chip tone="neutral">{filtered.length} shown</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3.5 pl-6">Timestamp</th>
                <th className="py-3.5">Operator</th>
                <th className="py-3.5">Station</th>
                <th className="py-3.5">Action</th>
                <th className="py-3.5">Entity</th>
                <th className="py-3.5 pr-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {filtered.map((log, idx) => (
                <tr key={idx} className="transition-colors hover:bg-[#F8FBF4]">
                  <td className="whitespace-nowrap py-3 pl-6 font-mono text-[11px] text-[#7C8B70]">{log.timestamp}</td>
                  <td className="whitespace-nowrap py-3 font-bold text-[#0B1118]">{log.user}</td>
                  <td className="whitespace-nowrap py-3">
                    <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                      {log.station}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 font-semibold text-[#0B1118]">{log.action}</td>
                  <td className="whitespace-nowrap py-3 font-mono font-semibold text-[#3F7A06]">{log.entity}</td>
                  <td className="py-3 pr-6 text-[#5C6B51]">{log.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs font-medium text-[#8A9680]">
                    No audit entry matches this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageShell>
  );
};
