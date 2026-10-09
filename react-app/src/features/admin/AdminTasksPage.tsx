import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, User, School, X } from 'lucide-react';
import { getTasks, addTask, getSchools, getUsers } from '@/lib/store';
import { Task } from '@/types';

export const AdminTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('Loza Bereket');
  const [school, setSchool] = useState('YMS');
  const [priority, setPriority] = useState<Task['priority']>('High');
  const [deadline, setDeadline] = useState('2026-10-20');

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const schools = getSchools();
  const senders = getUsers().filter(u => u.role === 'SENDER');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `T-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      assignedTo,
      school,
      priority,
      deadline,
      status: 'Pending',
    };

    addTask(newTask);
    setTasks([...getTasks()]);
    setModalOpen(false);
    setTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Field Task Management</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Assign capture schedules, retake quotas, and school batch directives to field operators
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(t => (
          <div key={t.id} className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[10px] text-[#9eb2a6] bg-white/5 px-2 py-0.5 rounded">{t.id}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  t.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                  t.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {t.priority} Priority
                </span>
              </div>

              <h3 className="font-heading font-bold text-white text-sm mb-2">{t.title}</h3>
              <div className="space-y-1.5 text-xs text-[#9eb2a6]">
                <div>Assignee: <span className="text-white font-medium">{t.assignedTo}</span></div>
                <div>Campus: <span className="text-white font-medium">{t.school}</span></div>
                <div>Deadline: <span className="text-white font-mono">{t.deadline}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1e2c22] flex items-center justify-between">
              <span className="text-xs font-bold text-[#8fe617]">{t.status}</span>
              <span className="text-[10px] text-[#9eb2a6]">Field Assigned</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#9eb2a6] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-4">Create Field Assignment</h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Task Title / Directive</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Photo retake batch for Grade 10"
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                />
              </div>

              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Assign to Sender</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                >
                  {senders.map(s => (
                    <option key={s.id} value={s.username}>{s.username} ({s.email})</option>
                  ))}
                  <option value="Loza Bereket">Loza Bereket (Default Field)</option>
                  <option value="Alemu Tadesse">Alemu Tadesse</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Target School</label>
                  <select
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#8fe617] text-[#062404] font-bold text-xs"
                >
                  Dispatch Field Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
