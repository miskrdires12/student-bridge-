import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Users, CheckCircle2, Zap, ShieldCheck, MapPin, HardDrive } from 'lucide-react';
import { getUsers, getStudents } from '@/lib/store';
import { User, Student } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, Chip } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const AdminPerformancePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const registryVersion = useRegistryVersion();

  useEffect(() => {
    setUsers(getUsers());
    setStudents(getStudents());
  }, [registryVersion]);

  const senders = users.filter(u => u.role === 'SENDER');

  const senderMetrics = useMemo(() => {
    return senders.map((sender) => {
      const sName = sender.username.toLowerCase();
      const registeredStudents = students.filter(
        st => (st.senderName && st.senderName.toLowerCase() === sName) ||
              (st.senderId && st.senderId.toLowerCase() === sender.id.toLowerCase())
      );

      return {
        ...sender,
        registeredCount: registeredStudents.length,
        campus: sender.school || 'YMS'
      };
    }).sort((a, b) => b.registeredCount - a.registeredCount);
  }, [senders, students]);

  const topOperator = senderMetrics[0];
  // Every record this station holds is either attributed to a sender or it is not, and the two
  // numbers have to add up to the registry count.
  const attributedCount = senderMetrics.reduce((acc, s) => acc + s.registeredCount, 0);
  const unattributedCount = Math.max(0, students.length - attributedCount);

  return (
    <PageShell>
      <PageHero
        icon={BarChart3}
        title="Workforce Performance"
        count={`${senders.length} field senders`}
        live="Station registry"
        subtitle="Registration counts per operator, read from the records this station holds. For the figures a salary is paid from, use the Sender Payroll Report, which reads the row store directly."
      >
        <FactGrid cols={4}>
          <FactCard label="Field Senders" value={senderMetrics.length.toLocaleString()} hint="accounts on station" icon={Users} />
          <FactCard
            label="Top Operator"
            value={topOperator ? topOperator.username : '—'}
            hint={topOperator ? `${topOperator.registeredCount.toLocaleString()} registered · ${topOperator.campus}` : 'no records attributed'}
            icon={Award}
          />
          <FactCard label="Records Held" value={students.length.toLocaleString()} hint="institutional registry" icon={HardDrive} />
          <FactCard
            label="Attributed"
            value={attributedCount.toLocaleString()}
            hint={`${unattributedCount.toLocaleString()} carry no sender name`}
            icon={Zap}
          />
        </FactGrid>
      </PageHero>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SectionCard className="p-0" padded={false}>
          <div className="p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
              <Award className="h-3.5 w-3.5 text-[#6FBF0A]" />
              Top Field Operator
            </span>
            <div className="mt-2 text-xl font-black tracking-tight text-[#0B1118]">
              {topOperator ? topOperator.username : 'Field Operator'}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#2F5E04]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#6FBF0A]" />
              <span>{(topOperator?.registeredCount || 0).toLocaleString()} registered · {topOperator?.campus || '—'}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-0" padded={false}>
          <div className="p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
              <TrendingUp className="h-3.5 w-3.5 text-[#6FBF0A]" />
              Total Ingested Volume
            </span>
            <div className="mt-2 text-xl font-black tracking-tight text-[#0B1118]">
              {students.length.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[#5C6B51]">Authoritative institutional registry</div>
          </div>
        </SectionCard>

        <SectionCard className="p-0" padded={false}>
          <div className="p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">
              <Zap className="h-3.5 w-3.5 text-[#6FBF0A]" />
              Attribution of Records Held
            </span>
            <div className="mt-2 text-xl font-black tracking-tight text-[#2F5E04]">
              {attributedCount.toLocaleString()} by sender
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[#7C8B70]">
              {unattributedCount.toLocaleString()} carry no sender name · adds to {students.length.toLocaleString()}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Operator Output Metrics"
        subtitle="Per-operator registration counts, read from this station's records"
        icon={Users}
        padded={false}
        actions={<Chip tone="neutral">{senderMetrics.length} monitored</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3 pl-4">Operator Name &amp; School</th>
                <th className="py-3">Email Address</th>
                <th className="py-3 text-center">Registered Students</th>
                <th className="py-3 pr-4 text-right">Campus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {senderMetrics.map((s, idx) => (
                <tr key={s.id} className="transition-colors hover:bg-[#F8FBF4]">
                  <td className="py-3 pl-4 font-bold text-[#0B1118]">
                    <div className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#EAF7DA] text-[10px] font-bold text-[#2F5E04]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[#0B1118]">{s.username}</div>
                        <div className="flex items-center gap-1 text-[10px] font-normal text-[#7C8B70]">
                          <MapPin className="h-2.5 w-2.5 text-[#6FBF0A]" />
                          <span>{s.campus}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[#5C6B51]">{s.email}</td>
                  <td className="py-3 text-center font-mono text-sm font-black text-[#0B1118]">
                    {s.registeredCount.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-[11px] font-bold text-[#5C6B51]">
                    {s.campus}
                  </td>
                </tr>
              ))}
              {senderMetrics.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs font-medium text-[#8A9680]">
                    No sender account is provisioned on this station yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-[#8A9680]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#6FBF0A]" />
        Counts come from the records held on this station, credited by sender name or sender id on the row.
      </p>
    </PageShell>
  );
};
