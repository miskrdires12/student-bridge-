import React, { useState, useEffect } from 'react';
import {
  Users, Plus, CheckCircle2, Calendar, Zap, Search, X, ClipboardList,
  Activity, HardDrive, MapPin, AlertTriangle
} from 'lucide-react';
import { getTasks, addTask, updateTaskStatus, getUsers, getStudents } from '@/lib/store';
import { BRANCH_SCHOOL_MAP } from '@/lib/gradeUtils';
import { Task, User as UserType, Student } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, PrimaryButton, Chip } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

type OperatorRow = {
  user: UserType;
  campus: string;
  dailyCaptures: number;
  totalCaptures: number;
  activeTask?: string;
};

export const AdminTasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Directives'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [directiveTitle, setDirectiveTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [targetCampus, setTargetCampus] = useState('YMS');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [quotaTarget, setQuotaTarget] = useState('100');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [senders, setSenders] = useState<UserType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const registryVersion = useRegistryVersion();

  useEffect(() => {
    setTasks(getTasks());
    const allUsers = getUsers();
    const senderList = allUsers.filter(u => u.role === 'SENDER');
    setSenders(senderList);
    setStudents(getStudents());
    if (senderList.length > 0) {
      setAssignedTo(senderList[0].username);
    }
  }, [registryVersion]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Only counts the records this station actually holds. Shift clock, break time, velocity and
  // efficiency used to be generated from the row index here, which printed figures nobody measured.
  const operatorTelemetry: OperatorRow[] = senders.map(user => {
    const userStudents = students.filter(
      s => s.senderName?.toLowerCase() === user.username.toLowerCase() ||
           s.senderId === user.id
    );

    const assignedTask = tasks.find(
      t => t.assignedTo?.toLowerCase() === user.username.toLowerCase() && t.status !== 'Completed'
    );

    return {
      user,
      campus: user.school || user.branch || 'Unassigned',
      dailyCaptures: userStudents.filter(s => s.createdAt && s.createdAt.startsWith(todayStr)).length,
      totalCaptures: userStudents.length,
      activeTask: assignedTask ? assignedTask.title : undefined
    };
  });

  const filteredOperators = operatorTelemetry.filter(op => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      op.user.username.toLowerCase().includes(term) ||
      op.user.email.toLowerCase().includes(term) ||
      op.campus.toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return op.dailyCaptures > 0;
    return true;
  });

  const handleCreateDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveTitle.trim()) return;

    const newTask: Task = {
      id: `DIR-${Date.now().toString().slice(-4)}`,
      title: directiveTitle.trim(),
      assignedTo: assignedTo || (senders[0]?.username ?? 'operator'),
      school: targetCampus,
      priority,
      deadline,
      status: 'Pending',
    };

    addTask(newTask);
    setTasks([...getTasks()]);
    setModalOpen(false);
    setDirectiveTitle('');
  };

  const handleToggleTaskStatus = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const nextStatus = t.status === 'Completed' ? 'In Progress' : 'Completed';
    updateTaskStatus(id, nextStatus);
    setTasks([...getTasks()]);
  };

  const totalFleetDaily = operatorTelemetry.reduce((acc, o) => acc + o.dailyCaptures, 0);
  const totalFleetLifetime = operatorTelemetry.reduce((acc, o) => acc + o.totalCaptures, 0);
  const activeStationsCount = operatorTelemetry.filter(o => o.dailyCaptures > 0).length;
  const openDirectives = tasks.filter(t => t.status !== 'Completed').length;

  const tabs: { key: 'All' | 'Active' | 'Directives'; label: string; count: number }[] = [
    { key: 'All', label: 'All Operators', count: operatorTelemetry.length },
    { key: 'Active', label: 'Active Today', count: activeStationsCount },
    { key: 'Directives', label: 'Orders', count: tasks.length }
  ];

  return (
    <PageShell>
      <PageHero
        icon={ClipboardList}
        title="Operator Tasks"
        count={`${senders.length} operators`}
        live="Fleet"
        subtitle="Capture counts per operator, read from the records this station holds, plus the field directives assigned to each station."
        actions={<PrimaryButton icon={Plus} onClick={() => setModalOpen(true)}>Dispatch Directive</PrimaryButton>}
      >
        <FactGrid cols={4}>
          <FactCard label="Active Today" value={`${activeStationsCount} / ${senders.length}`} hint="sent at least one record" icon={Zap} />
          <FactCard label="Captures Today" value={totalFleetDaily.toLocaleString()} hint="since 00:00" icon={Activity} />
          <FactCard label="Lifetime Intake" value={totalFleetLifetime.toLocaleString()} hint="attributed records held" icon={HardDrive} />
          <FactCard label="Open Directives" value={openDirectives.toLocaleString()} hint={`${tasks.length} issued in total`} icon={ClipboardList} />
        </FactGrid>
      </PageHero>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit flex-wrap items-center gap-1.5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#85E510] text-[#062404] shadow-sm'
                  : 'border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A6B29B]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by operator or campus..."
            className="w-full rounded-xl border border-[#E3E9DD] bg-white py-1.5 pl-9 pr-3.5 text-xs font-medium text-[#0B1118] placeholder:text-[#A6B29B] focus:border-[#85E510] focus:outline-none"
          />
        </div>
      </div>

      {activeTab !== 'Directives' ? (
        <SectionCard
          title="Operator Output"
          subtitle="Today's and lifetime captures credited by sender name or id on the row"
          icon={Users}
          padded={false}
          actions={<Chip tone="neutral">{filteredOperators.length} shown</Chip>}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="whitespace-nowrap border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
                  <th className="min-w-[180px] px-4 py-3.5">Operator &amp; Station</th>
                  <th className="min-w-[130px] px-4 py-3.5">Assigned Campus</th>
                  <th className="min-w-[110px] px-4 py-3.5 text-right">Today Captures</th>
                  <th className="min-w-[110px] px-4 py-3.5 text-right">Total Sent</th>
                  <th className="min-w-[160px] px-4 py-3.5">Active Order</th>
                  <th className="px-4 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF4E5]">
                {filteredOperators.map((op) => (
                  <tr key={op.user.id || op.user.username} className="transition-colors hover:bg-[#F8FBF4]">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#CDEBB4] bg-[#EAF7DA] text-xs font-black text-[#2F5E04]">
                          {op.user.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-[#0B1118]">
                            <span>{op.user.username}</span>
                            <span className={`h-2 w-2 rounded-full ${op.dailyCaptures > 0 ? 'bg-[#6FBF0A]' : 'bg-slate-300'}`} />
                          </div>
                          <div className="font-mono text-[11px] text-[#A6B29B]">{op.user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0B1118]">
                        <MapPin className="h-3 w-3 text-[#6FBF0A]" />
                        {op.campus}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <span className="rounded-md bg-[#EAF7DA] px-2 py-0.5 font-mono font-black text-[#2F5E04]">
                        +{op.dailyCaptures}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <span className="font-mono font-bold text-[#5C6B51]">{op.totalCaptures.toLocaleString()}</span>
                    </td>

                    <td className="max-w-[180px] whitespace-nowrap px-4 py-3.5">
                      {op.activeTask ? (
                        <span className="block truncate text-[11px] font-medium text-[#0B1118]" title={op.activeTask}>
                          {op.activeTask}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-[#A6B29B]">Normal intake</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-center">
                      <button
                        onClick={() => {
                          setAssignedTo(op.user.username);
                          setTargetCampus(op.campus);
                          setModalOpen(true);
                        }}
                        className="cursor-pointer rounded-lg border border-[#E3E9DD] bg-white px-2.5 py-1 text-[11px] font-bold text-[#4B5B42] transition-colors hover:border-[#85E510] hover:bg-[#F3FBE8]"
                      >
                        Assign Task
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOperators.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs font-medium text-[#8A9680]">
                      No operator matches this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tasks.map((t) => (
            <SectionCard key={t.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleTaskStatus(t.id)}
                    className={`mt-0.5 grid h-5 w-5 cursor-pointer place-items-center rounded-lg border transition-colors ${
                      t.status === 'Completed'
                        ? 'border-[#85E510] bg-[#85E510] text-[#062404]'
                        : 'border-[#D8E3CC] hover:border-[#85E510]'
                    }`}
                  >
                    {t.status === 'Completed' && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <div>
                    <h3 className={`text-sm font-bold text-[#0B1118] ${t.status === 'Completed' ? 'text-[#A6B29B] line-through' : ''}`}>
                      {t.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#7C8B70]">
                      <span className="font-mono">{t.id}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-[#0B1118]">{t.school}</span>
                    </div>
                  </div>
                </div>

                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                  t.priority === 'High'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : t.priority === 'Medium'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-[#CDEBB4] bg-[#EAF7DA] text-[#2F5E04]'
                }`}>
                  {t.priority}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EDF4E5] pt-2 text-xs text-[#7C8B70]">
                <div className="flex items-center gap-1.5 font-semibold text-[#0B1118]">
                  <Users className="h-3.5 w-3.5 text-[#6FBF0A]" />
                  <span>Assigned to: {t.assignedTo}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-[#A6B29B]" />
                  <span>{t.deadline}</span>
                </div>
              </div>
            </SectionCard>
          ))}
          {tasks.length === 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-[#DBEDC9] bg-[#FBFDF7] px-4 py-8 text-xs font-medium text-[#8A9680] md:col-span-2">
              <AlertTriangle className="h-4 w-4 text-[#6FBF0A]" />
              No directive has been issued from this station yet.
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-[#E3EFD7] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EDF4E5] pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-[#0B1118]">
                  <Zap className="h-4 w-4 text-[#6FBF0A]" />
                  <span>Dispatch Field Directive</span>
                </h3>
                <p className="mt-0.5 text-xs text-[#7C8B70]">
                  Issue priority instructions, targets or alignment orders to station senders
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer rounded-xl p-1 text-[#A6B29B] hover:bg-[#F3FBE8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirective} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-[#0B1118]">Directive title / work order</label>
                <input
                  type="text"
                  required
                  value={directiveTitle}
                  onChange={(e) => setDirectiveTitle(e.target.value)}
                  placeholder="e.g. Audit Grade 9 biometric portrait alignment (3:4 ratio)"
                  className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3.5 py-2.5 text-xs font-semibold text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-[#0B1118]">Target operator</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                  >
                    {senders.map(u => (
                      <option key={u.id || u.username} value={u.username}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-[#0B1118]">School campus</label>
                  <select
                    value={targetCampus}
                    onChange={(e) => setTargetCampus(e.target.value)}
                    className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                  >
                    {Object.values(BRANCH_SCHOOL_MAP).flat().map(school => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-[#0B1118]">Priority level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                  >
                    <option value="High">High priority</option>
                    <option value="Medium">Medium priority</option>
                    <option value="Low">Normal priority</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-[#0B1118]">Completion deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 font-mono text-xs text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-[#0B1118]">Target student volume / goal</label>
                <input
                  type="number"
                  value={quotaTarget}
                  onChange={(e) => setQuotaTarget(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-xs font-semibold text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#EDF4E5] pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer px-4 py-2 text-xs font-bold text-[#7C8B70] hover:text-[#0B1118]"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit">Dispatch Directive</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};
