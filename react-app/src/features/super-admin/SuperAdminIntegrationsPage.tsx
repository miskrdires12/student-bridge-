import React, { useState, useEffect, useMemo } from 'react';
import { Activity, CheckCircle2, Server, ShieldCheck, Zap, Radio, Camera, School } from 'lucide-react';
import { StudentCoreRequest, Student } from '@/types';
import { getStudents, subscribeToStudentSync, getPhotoEncodeClass } from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, Chip, ToolbarButton, StatusPill } from '@/components/ui/PageKit';

export const SuperAdminIntegrationsPage: React.FC = () => {
  const [requests, setRequests] = useState<StudentCoreRequest[]>([]);
  const [tickerActive, setTickerActive] = useState(true);
  const [version, setVersion] = useState(0);

  // Every row here is a real record in this station's registry — no synthetic latency or success
  // counters are printed, because nothing measures them.
  useEffect(() => {
    const students = getStudents();
    const initialReqs: StudentCoreRequest[] = students.slice(0, 15).map((s) => {
      const isEnc = getPhotoEncodeClass(s) === 'Encoded';
      return {
        id: `REQ-${s.studentId.replace(/\D/g, '').slice(-4) || '0000'}`,
        school: s.school || 'Campus Hub',
        device: s.senderName ? `STATION-${s.senderName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}` : 'UNATTRIBUTED',
        studentId: s.studentId,
        type: isEnc ? 'BIOMETRIC_ENCODED' : 'IDENTITY_RECORD',
        timestamp: s.createdAt ? new Date(s.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
        authStatus: 'AUTHORIZED',
        syncStatus: 'RECORDED',
        latency: '—',
      };
    });
    setRequests(initialReqs);
  }, [version]);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    window.addEventListener('studentbridge_datachange', bump);
    return () => window.removeEventListener('studentbridge_datachange', bump);
  }, []);

  useEffect(() => {
    if (!tickerActive) return;

    const unsubscribe = subscribeToStudentSync((incoming: Student) => {
      const isEnc = getPhotoEncodeClass(incoming) === 'Encoded';
      const newReq: StudentCoreRequest = {
        id: `REQ-${incoming.studentId.replace(/\D/g, '').slice(-4) || 'LIVE'}`,
        school: incoming.school || 'Campus Hub',
        device: incoming.senderName ? `STATION-${incoming.senderName.replace(/\s+/g, '').toUpperCase().slice(0, 6)}` : 'UNATTRIBUTED',
        studentId: incoming.studentId,
        type: isEnc ? 'BIOMETRIC_ENCODED' : 'IDENTITY_RECORD',
        timestamp: 'Just now',
        authStatus: 'AUTHORIZED',
        syncStatus: 'RECORDED',
        latency: '—',
      };
      setRequests(prev => [newReq, ...prev.slice(0, 19)]);
    });

    return () => unsubscribe();
  }, [tickerActive]);

  const students = useMemo(() => getStudents(), [version]);
  const encoded = students.filter(s => getPhotoEncodeClass(s) === 'Encoded').length;
  const campuses = new Set(students.map(s => (s.school || '').trim()).filter(Boolean)).size;
  const stations = new Set(students.map(s => s.senderName).filter(Boolean)).size;

  return (
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={Zap}
        title="StudentCore Sync Pipeline"
        count={`${students.length.toLocaleString()} records`}
        live={tickerActive ? 'Ticker running' : false}
        subtitle="The registry records that this station has received from field senders, with the campus and terminal each came from."
        actions={
          <ToolbarButton icon={Radio} onClick={() => setTickerActive(v => !v)}>
            {tickerActive ? 'Pause ticker' : 'Resume ticker'}
          </ToolbarButton>
        }
      >
        <FactGrid cols={4}>
          <FactCard label="Registry Records" value={students.length.toLocaleString()} hint="held on this station" icon={Server} />
          <FactCard label="Portraits Encoded" value={encoded.toLocaleString()} hint="photo object on file" icon={Camera} />
          <FactCard label="Campuses" value={campuses.toLocaleString()} hint="sending stations" icon={School} />
          <FactCard label="Field Senders" value={stations.toLocaleString()} hint="attributed on the row" icon={Activity} />
        </FactGrid>
      </PageHero>

      <SectionCard
        title="Synchronization Feed"
        subtitle={tickerActive ? 'Live — new records appear as they land' : 'Paused'}
        icon={Activity}
        padded={false}
        actions={<Chip tone={tickerActive ? 'lime' : 'neutral'}>{requests.length} events</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3.5 pl-6">Reference</th>
                <th className="py-3.5">Campus Hub</th>
                <th className="py-3.5">Terminal Device</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">Record Type</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-6 text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {requests.map((r, i) => (
                <tr key={r.id + i} className="transition-colors hover:bg-[#F8FBF4]">
                  <td className="py-3 pl-6 font-mono text-[11px] text-[#7C8B70]">{r.id}</td>
                  <td className="py-3 font-semibold text-[#0B1118]">{r.school}</td>
                  <td className="py-3 font-mono text-[11px] text-[#7C8B70]">{r.device}</td>
                  <td className="py-3 font-mono font-bold text-[#0B1118]">{r.studentId}</td>
                  <td className="py-3">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <StatusPill tone="lime" dot="bg-[#6FBF0A]">
                      <CheckCircle2 className="h-3 w-3" />
                      {r.syncStatus}
                    </StatusPill>
                  </td>
                  <td className="py-3 pr-6 text-right font-mono text-[11px] text-[#5C6B51]">{r.timestamp}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs font-medium text-[#8A9680]">
                    The registry holds no record yet. New field submissions appear here as they arrive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-[#8A9680]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#6FBF0A]" />
        Status reflects what this station holds; the pipeline does not claim delivery to an external registry.
      </p>
    </PageShell>
  );
};
