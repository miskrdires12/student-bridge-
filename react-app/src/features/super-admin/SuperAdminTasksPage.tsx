import React, { useState, useEffect } from 'react';
import { CheckSquare, Users, Clock, AlertTriangle, GraduationCap, School } from 'lucide-react';
import { getTasks } from '@/lib/store';
import { Task } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, Chip } from '@/components/ui/PageKit';

export const SuperAdminTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const highPriority = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;
  const schools = new Set(tasks.map(t => t.school).filter(Boolean)).size;

  return (
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={CheckSquare}
        title="Global Directive Board"
        count={`${tasks.length} directives`}
        live="Cross-station"
        subtitle="Every field directive issued from this platform, with its owner, campus, priority and deadline."
      >
        <FactGrid cols={4}>
          <FactCard label="Directives" value={tasks.length.toLocaleString()} hint="issued in total" icon={CheckSquare} />
          <FactCard label="Completed" value={completed.toLocaleString()} hint={`${tasks.length - completed} still open`} icon={Clock} />
          <FactCard label="High Priority" value={highPriority.toLocaleString()} hint="open and urgent" icon={AlertTriangle} />
          <FactCard label="Campuses" value={schools.toLocaleString()} hint="touched by directives" icon={School} />
        </FactGrid>
      </PageHero>

      <SectionCard
        title="Directive Queue"
        subtitle="Assigned operators and SLA progress"
        icon={CheckSquare}
        padded={false}
        actions={<Chip tone="neutral">{tasks.length} rows</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
              <tr>
                <th className="py-3.5 pl-6">Task ID &amp; Title</th>
                <th className="py-3.5">Assigned Operator</th>
                <th className="py-3.5">School Campus</th>
                <th className="py-3.5">Priority</th>
                <th className="py-3.5">Deadline</th>
                <th className="py-3.5 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF4E5]">
              {tasks.map(t => (
                <tr key={t.id} className="transition-colors hover:bg-[#F8FBF4]">
                  <td className="py-3.5 pl-6">
                    <div className="text-xs font-bold text-[#0B1118]">{t.title}</div>
                    <div className="font-mono text-[10px] font-semibold text-[#3F7A06]">{t.id}</div>
                  </td>
                  <td className="py-3.5 font-medium text-[#0B1118]">{t.assignedTo}</td>
                  <td className="py-3.5 text-[#5C6B51]">{t.school}</td>
                  <td className="py-3.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      t.priority === 'High'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : t.priority === 'Medium'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04]'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[#5C6B51]">{t.deadline}</td>
                  <td className="py-3.5 pr-6 text-right">
                    <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2.5 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs font-medium text-[#8A9680]">
                    No directive has been issued from this platform yet.
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
