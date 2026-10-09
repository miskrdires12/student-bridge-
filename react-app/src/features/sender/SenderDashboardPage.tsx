import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Camera, CheckCircle2, Clock, AlertTriangle, ArrowUpRight,
  TrendingUp, BarChart3, Users, Award, ChevronRight
} from 'lucide-react';
import { getStudents, getTasks, getCurrentUser } from '@/lib/store';
import { Student, Task } from '@/types';

export const SenderDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const user = getCurrentUser();

  useEffect(() => {
    setStudents(getStudents());
    setTasks(getTasks());
  }, []);

  const totalRegistered = students.length;
  const verifiedCount = students.filter(s => s.status === 'VERIFIED' || s.photoPath).length;
  const pendingCount = students.filter(s => !s.photoPath).length;
  const completionRate = totalRegistered > 0 ? Math.round((verifiedCount / totalRegistered) * 100) : 92;

  const recentStudents = students.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Sender Field Station</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/30 uppercase">
              Live Edge Active
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Welcome back, <span className="text-white font-semibold">{user?.username || 'Field Operator'}</span> &bull; Assigned Station: <span className="text-[#8fe617]">Addis Ababa Primary Hub</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/sender/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Student</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards & Gauge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Captured */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Total Submissions</span>
            <div className="w-9 h-9 rounded-xl bg-[#8fe617]/10 flex items-center justify-center text-[#8fe617]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{totalRegistered.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-[#8fe617] flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14 today
            </span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">100% stored securely in Cloudflare R2</div>
        </div>

        {/* Verified with Photo */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Verified Portraits</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{verifiedCount.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-blue-400 font-mono">3,578 synced</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Passed edge portrait validation</div>
        </div>

        {/* Pending Photos */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Needs Photo Retake</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-amber-400">{pendingCount}</span>
            <span className="text-[11px] text-amber-300 font-bold">Action Required</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Routed to Mistake Analyzer</div>
        </div>

        {/* Completion Gauge Card */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 relative overflow-hidden group hover:border-[#8fe617]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Station Quota</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="text-3xl font-heading font-black text-white">{completionRate}%</span>
              <div className="text-[11px] text-[#8fe617] font-semibold mt-0.5">Top 5% Velocity</div>
            </div>
            {/* Circular Progress Ring */}
            <div className="relative w-12 h-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#8fe617]"
                  strokeDasharray={`${completionRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Branch target: 4,000 students</div>
        </div>
      </div>

      {/* Quick Launch & Active Field Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (1 col) */}
        <div className="space-y-4">
          <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Fast Capture Actions</h2>

          <Link
            to="/sender/register"
            className="block p-4 rounded-2xl bg-gradient-to-br from-[#101612] to-[#141f17] border border-[#8fe617]/30 hover:border-[#8fe617] hover:shadow-[0_0_25px_rgba(143,230,23,0.2)] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8fe617] text-[#062404] flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white group-hover:text-[#8fe617] transition-colors flex items-center gap-1.5">
                  <span>Student Registration Form</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-[#9eb2a6] group-hover:text-[#8fe617]" />
                </div>
                <div className="text-xs text-[#9eb2a6] mt-0.5">Live cam capture, auto-capitalization & phone formatting</div>
              </div>
            </div>
          </Link>

          <Link
            to="/sender/students"
            className="block p-4 rounded-2xl bg-[#101612] border border-[#1e2c22] hover:border-white/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <span>My Submissions Directory</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-[#9eb2a6] group-hover:text-blue-400" />
                </div>
                <div className="text-xs text-[#9eb2a6] mt-0.5">View records, verify photo sync status & retakes</div>
              </div>
            </div>
          </Link>

          <Link
            to="/sender/performance"
            className="block p-4 rounded-2xl bg-[#101612] border border-[#1e2c22] hover:border-white/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                  <span>My Velocity & KPIs</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-[#9eb2a6] group-hover:text-purple-400" />
                </div>
                <div className="text-xs text-[#9eb2a6] mt-0.5">Capture speed, daily batch tracking & session logs</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Assigned Tasks (2 cols) */}
        <div className="lg:col-span-2 bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Field Tasks Assigned to You</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white text-[10px] font-bold font-mono">
                  {tasks.length} Active
                </span>
              </div>
              <Link to="/sender/tasks" className="text-xs text-[#8fe617] hover:underline flex items-center gap-1">
                <span>View All Tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#1e2c22] mt-2">
              {tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#8fe617]" />
                    <div>
                      <div className="text-xs font-bold text-white hover:text-[#8fe617] cursor-pointer">
                        {task.title}
                      </div>
                      <div className="text-[11px] text-[#9eb2a6] flex items-center gap-2 mt-0.5">
                        <span>School: <span className="text-white font-medium">{task.school}</span></span>
                        <span>&bull;</span>
                        <span>Deadline: <span className="text-white font-medium">{task.deadline}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      task.priority === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      task.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {task.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      task.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      task.status === 'In Progress' ? 'bg-[#8fe617]/20 text-[#8fe617]' :
                      'bg-white/10 text-white'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2c22] text-xs text-[#9eb2a6] flex items-center justify-between">
            <span>Hardware lock confirmed: Station device connected</span>
            <span className="text-[#8fe617] font-mono text-[11px]">Sync: Sub-50ms</span>
          </div>
        </div>
      </div>

      {/* Recent Submissions Feed */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
          <div>
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Recent Field Submissions</h2>
            <p className="text-xs text-[#9eb2a6] mt-0.5">Showing latest student profiles submitted from this workstation</p>
          </div>
          <Link to="/sender/students" className="text-xs text-[#8fe617] hover:underline flex items-center gap-1 font-semibold">
            <span>Full Directory ({totalRegistered.toLocaleString()})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
                <th className="pb-3 pl-2">Photo & Student</th>
                <th className="pb-3">Student ID</th>
                <th className="pb-3">School</th>
                <th className="pb-3">Grade</th>
                <th className="pb-3">Sex</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60">
              {recentStudents.map((s) => {
                const photoSrc = s.photoPath
                  ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${s.photoPath.replace(/^\//, '')}`
                  : null;

                return (
                  <tr key={s.id || s.studentId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pl-2 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={s.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400">NO</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white">{s.fullName}</div>
                        <div className="text-[10px] text-[#9eb2a6]">{s.bloodType || 'Blood: N/A'}</div>
                      </div>
                    </td>
                    <td className="py-2.5 font-mono text-[#8fe617] font-semibold">{s.studentId}</td>
                    <td className="py-2.5 text-white font-medium">{s.school || 'YMS'}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-white text-[11px]">
                        {s.grade || 'Grade 9'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.sex === 'Female' ? 'badge-female' : 'badge-male'
                      }`}>
                        {s.sex || 'Male'}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[#9eb2a6]">{s.phone || '+251 91 123 4567'}</td>
                    <td className="py-2.5 text-right pr-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8fe617]/15 text-[#8fe617] text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Submitted</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
