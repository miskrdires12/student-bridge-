import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Calendar, User, School, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AdminTask {
  id: string;
  title: string;
  assignedTo: string;
  school: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  status: 'In Progress' | 'Pending' | 'Overdue' | 'Completed';
}

export const AdminTasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('Loza Bereket');
  const [school, setSchool] = useState('YMS');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [deadline, setDeadline] = useState('2026-10-18');

  const [tasks, setTasks] = useState<AdminTask[]>([
    { id: 'T-001', title: 'Review missing photos for Grade 9', assignedTo: 'Loza Bereket', school: 'YMS', priority: 'High', deadline: '2026-10-15', status: 'In Progress' },
    { id: 'T-002', title: 'Correct Ethiopian phone numbers', assignedTo: 'Alemu Tadesse', school: 'Adika Youth', priority: 'Medium', deadline: '2026-10-15', status: 'Pending' },
    { id: 'T-003', title: 'Verify school student IDs', assignedTo: 'Hana Tadesse', school: 'School of America', priority: 'High', deadline: '2026-10-16', status: 'Overdue' },
    { id: 'T-004', title: 'Data quality audit for Ferway', assignedTo: 'Getnet Kassa', school: 'Ferway', priority: 'Low', deadline: '2026-10-18', status: 'Completed' },
    { id: 'T-005', title: 'Photo verification batch 4', assignedTo: 'Dawit Alemu', school: 'Warka', priority: 'Medium', deadline: '2026-10-16', status: 'In Progress' },
  ]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: AdminTask = {
      id: `T-${tasks.length + 101}`,
      title: title.trim(),
      assignedTo,
      school,
      priority,
      deadline,
      status: 'Pending',
    };

    setTasks([newTask, ...tasks]);
    setModalOpen(false);
    setTitle('');
  };

  const handleStatusToggle = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
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
    <div className="space-y-6 pb-12">
      {/* Title & New Task Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">Task Management</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Assign correction orders, audit queues, and priority deadlines to field sender stations
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <button
          onClick={() => setActiveTab('All')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'All'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'text-[#64748B] hover:text-[#202833] bg-white border border-[#CBD5E1]'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('Pending')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'Pending'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'text-[#64748B] hover:text-[#202833] bg-white border border-[#CBD5E1]'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('In Progress')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'In Progress'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'text-[#64748B] hover:text-[#202833] bg-white border border-[#CBD5E1]'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setActiveTab('Completed')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'Completed'
              ? 'bg-[#85E510] text-[#062404] shadow-sm'
              : 'text-[#64748B] hover:text-[#202833] bg-white border border-[#CBD5E1]'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Task Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((t) => (
          <div key={t.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => handleStatusToggle(t.id)}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    t.status === 'Completed'
                      ? 'bg-[#85E510] border-[#85E510] text-[#062404]'
                      : 'border-[#CBD5E1] hover:border-[#85E510]'
                  }`}
                >
                  {t.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                </button>
                <div>
                  <h3 className={`text-sm font-bold text-[#202833] ${t.status === 'Completed' ? 'line-through text-[#94A3B8]' : ''}`}>
                    {t.title}
                  </h3>
                  <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                    <span>Task ID: {t.id}</span>
                    <span>&bull;</span>
                    <span className="font-semibold text-[#202833]">{t.school}</span>
                  </div>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                t.priority === 'High'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : t.priority === 'Medium'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {t.priority}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <div className="flex items-center gap-1.5 font-medium text-[#202833]">
                <User className="w-3.5 h-3.5 text-[#4D8A07]" />
                <span>{t.assignedTo}</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t.deadline}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-heading font-black text-base text-[#202833] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#4D8A07]" />
                <span>Assign New Operational Task</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#202833] font-bold mb-1">Task Title / Order Description</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Audit missing photographs for Grade 10B"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#202833] font-bold mb-1">Assigned Operator</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                  >
                    <option value="Loza Bereket">Loza Bereket</option>
                    <option value="Alemu Tadesse">Alemu Tadesse</option>
                    <option value="Hana Tadesse">Hana Tadesse</option>
                    <option value="Getnet Kassa">Getnet Kassa</option>
                    <option value="Dawit Alemu">Dawit Alemu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#202833] font-bold mb-1">School Campus</label>
                  <select
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                  >
                    <option value="YMS">YMS</option>
                    <option value="Adika Youth">Adika Youth</option>
                    <option value="School of America">School of America</option>
                    <option value="Ferway">Ferway</option>
                    <option value="Warka">Warka</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#202833] font-bold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#202833] font-bold mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm"
                >
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
