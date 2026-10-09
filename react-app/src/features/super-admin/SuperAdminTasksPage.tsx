import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getTasks } from '@/lib/store';
import { Task } from '@/types';

export const SuperAdminTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Global Field Directive Board</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Cross-station task queue monitoring and SLA progress
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          {tasks.length} Operational Directives
        </span>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Task ID & Title</th>
                <th className="py-3.5">Assigned Operator</th>
                <th className="py-3.5">School Campus</th>
                <th className="py-3.5">Priority</th>
                <th className="py-3.5">Deadline</th>
                <th className="py-3.5 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {tasks.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 pl-4">
                    <div className="font-bold text-white text-xs">{t.title}</div>
                    <div className="text-[10px] font-mono text-[#8fe617]">{t.id}</div>
                  </td>
                  <td className="py-3.5 text-white">{t.assignedTo}</td>
                  <td className="py-3.5 text-white">{t.school}</td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                      t.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-white">{t.deadline}</td>
                  <td className="py-3.5 text-right pr-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#8fe617]/15 text-[#8fe617] font-bold text-[10px]">
                      {t.status}
                    </span>
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
