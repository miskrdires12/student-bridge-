import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, User, School, X, CheckCircle2 } from 'lucide-react';

interface AdminTask {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  status: 'In Progress' | 'Pending' | 'Overdue' | 'Completed';
}

export const AdminTasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('Loza Bereket');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [deadline, setDeadline] = useState('2025-10-15');

  // Predefined initial tasks matching screenshot 12
  const [tasks, setTasks] = useState<AdminTask[]>([
    { id: 'T-1', title: 'Review missing photos', assignedTo: 'Loza Bereket', priority: 'High', deadline: '2025-10-15', status: 'In Progress' },
    { id: 'T-2', title: 'Correct phone numbers', assignedTo: 'Alemu Tadesse', priority: 'Medium', deadline: '2025-10-15', status: 'Pending' },
    { id: 'T-3', title: 'Verify school data', assignedTo: 'Hana Tadesse', priority: 'High', deadline: '2025-10-16', status: 'Overdue' },
    { id: 'T-4', title: 'Data quality check', assignedTo: 'Getnet Kassa', priority: 'Low', deadline: '2025-10-18', status: 'Completed' },
    { id: 'T-5', title: 'Photo validation batch 4', assignedTo: 'Dawit Alemu', priority: 'Medium', deadline: '2025-10-16', status: 'In Progress' },
  ]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: AdminTask = {
      id: `T-${tasks.length + 1}`,
      title: title.trim(),
      assignedTo,
      priority,
      deadline,
      status: 'Pending',
    };

    setTasks([newTask, ...tasks]);
    setModalOpen(false);
    setTitle('');
  };

  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress' || t.status === 'Overdue').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return t.status === 'Pending';
    if (activeTab === 'In Progress') return t.status === 'In Progress' || t.status === 'Overdue';
    if (activeTab === 'Completed') return t.status === 'Completed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & New Task Button - Matching Screenshot 12 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Task Management</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Assign correction orders, audit queues, and priority deadlines to field sender stations
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-[0_0_20px_rgba(133,229,16,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs Header matching screenshot 12 */}
      <div className="flex items-center gap-2 border-b border-[#1e2e42] pb-3">
        <button
          onClick={() => setActiveTab('All')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'All'
              ? 'bg-[#85e510] text-[#071302]'
              : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('Pending')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'Pending'
              ? 'bg-[#85e510] text-[#071302]'
              : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('In Progress')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'In Progress'
              ? 'bg-[#85e510] text-[#071302]'
              : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setActiveTab('Completed')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'Completed'
              ? 'bg-[#85e510] text-[#071302]'
              : 'text-[#94a3b8] hover:text-white bg-[#131e2b]'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Table matching screenshot 12 */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1520] border-b border-[#1e2e42] text-[#94a3b8] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4">Title</th>
                <th className="py-3.5">Assigned To</th>
                <th className="py-3.5">Priority</th>
                <th className="py-3.5">Deadline</th>
                <th className="py-3.5 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42]/60">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-[#172435] transition-colors">
                  <td className="py-3.5 pl-4">
                    <div className="font-bold text-white text-xs">{t.title}</div>
                  </td>
                  <td className="py-3.5 text-white font-medium">
                    {t.assignedTo}
                  </td>
                  <td className="py-3.5">
                    {t.priority === 'High' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        High
                      </span>
                    ) : t.priority === 'Medium' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Medium
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 font-mono text-[#94a3b8]">
                    {t.deadline}
                  </td>
                  <td className="py-3.5 text-right pr-4">
                    {t.status === 'In Progress' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                        In Progress
                      </span>
                    ) : t.status === 'Pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Pending
                      </span>
                    ) : t.status === 'Overdue' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        Overdue
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
                        Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-1">Create Field Directive Task</h3>
            <p className="text-xs text-[#94a3b8] mb-4">Assign work order to a specific field sender operator</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Audit student ID duplication in Grade 9"
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Assign Operator</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                >
                  <option value="Loza Bereket">Loza Bereket (Sender)</option>
                  <option value="Alemu Tadesse">Alemu Tadesse (Sender)</option>
                  <option value="Hana Tadesse">Hana Tadesse (Sender)</option>
                  <option value="Getnet Kassa">Getnet Kassa (Sender)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#0d1520] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-lg shadow-[#85e510]/20"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
