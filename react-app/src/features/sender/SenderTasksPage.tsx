import React, { useState, useEffect } from 'react';
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import { getTasks, updateTaskStatus } from '@/lib/store';
import { Task } from '@/types';

export const SenderTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'Pending' | 'In Progress' | 'Completed'>('ALL');

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const handleStatusToggle = (task: Task) => {
    let nextStatus: Task['status'] = 'In Progress';
    if (task.status === 'Pending') nextStatus = 'In Progress';
    else if (task.status === 'In Progress') nextStatus = 'Completed';
    else nextStatus = 'Pending';

    updateTaskStatus(task.id, nextStatus);
    setTasks([...getTasks()]);
  };

  const filteredTasks = tasks.filter(t => filter === 'ALL' || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Assigned Field Tasks</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Operational batch assignments, photography schedules, and data verification queues
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'Pending', 'In Progress', 'Completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === status
                  ? 'bg-[#8fe617] text-[#062404] shadow-[0_0_15px_rgba(143,230,23,0.3)]'
                  : 'bg-white/5 hover:bg-white/10 text-[#9eb2a6]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 flex flex-col justify-between hover:border-[#8fe617]/30 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-[10px] text-[#9eb2a6] bg-white/5 px-2 py-0.5 rounded">
                  {task.id}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  task.priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  task.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}>
                  {task.priority} Priority
                </span>
              </div>

              <h3 className="font-heading font-bold text-white text-sm mb-2">{task.title}</h3>
              <p className="text-xs text-[#9eb2a6] mb-4">
                Assigned for school campus <span className="text-white font-medium">{task.school}</span>. Target completion before <span className="text-white font-medium">{task.deadline}</span>.
              </p>
            </div>

            <div className="pt-4 border-t border-[#1e2c22] flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                task.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' :
                task.status === 'In Progress' ? 'bg-[#8fe617]/15 text-[#8fe617]' :
                'bg-white/5 text-white/70'
              }`}>
                {task.status}
              </span>

              <button
                type="button"
                onClick={() => handleStatusToggle(task)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#8fe617] hover:text-[#062404] text-xs font-bold text-white transition-all"
              >
                {task.status === 'Completed' ? 'Reopen' : task.status === 'In Progress' ? 'Mark Done' : 'Start Task'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
