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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Global Field Directive Board</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cross-station task queue monitoring and SLA progress
          </p>
        </div>

        <span className="text-xs font-mono text-[#366804] bg-[#85E510]/15 px-3 py-1 rounded-xl font-bold border border-[#85E510]/30">
          {tasks.length} Operational Directives
        </span>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Task ID & Title</th>
                <th className="py-3.5">Assigned Operator</th>
                <th className="py-3.5">School Campus</th>
                <th className="py-3.5">Priority</th>
                <th className="py-3.5">Deadline</th>
                <th className="py-3.5 text-right pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {tasks.map(t => (
                <tr key={t.id} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3.5 pl-6">
                    <div className="font-bold text-[#202833] text-xs">{t.title}</div>
                    <div className="text-[10px] font-mono text-[#0284C7] font-semibold">{t.id}</div>
                  </td>
                  <td className="py-3.5 text-[#202833] font-medium">{t.assignedTo}</td>
                  <td className="py-3.5 text-[#64748B]">{t.school}</td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      t.priority === 'High' ? 'bg-red-100 text-red-800 border-red-200' :
                      t.priority === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-[#64748B]">{t.deadline}</td>
                  <td className="py-3.5 text-right pr-6">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30 font-bold text-[10px]">
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
