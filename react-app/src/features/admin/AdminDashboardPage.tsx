import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CheckSquare, BarChart3, ShieldCheck, ArrowUpRight,
  TrendingUp, Layers, AlertTriangle, UserPlus
} from 'lucide-react';
import { getUsers, getStudents, getTasks } from '@/lib/store';
import { User, Student, Task } from '@/types';

export const AdminDashboardPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setUsers(getUsers());
    setStudents(getStudents());
    setTasks(getTasks());
  }, []);

  const senders = users.filter(u => u.role === 'SENDER');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Admin Operations Console</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
              Supervisor Mode
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Regional workforce orchestration, task scheduling, and quality assurance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Create New Task</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Field Sender Fleet</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{senders.length || 12}</span>
            <span className="text-xs text-[#8fe617] font-bold">Operators Active</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">1-Device hardware locked</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Active Field Tasks</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{tasks.length}</span>
            <span className="text-xs text-amber-400 font-bold">In Flight</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Distributed across 8 schools</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Registry Volume</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-white">{students.length.toLocaleString()}</span>
            <span className="text-xs text-blue-400 font-bold">Total Students</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Cloudflare R2 synchronized</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Audit Pass Rate</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#8fe617]">99.4%</span>
            <span className="text-xs text-[#8fe617] font-bold">Exceeds SLA</span>
          </div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Quality compliance rate</div>
        </div>
      </div>

      {/* Quick Links & Senders Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Field Sender Fleet Status</h2>
            <Link to="/admin/senders" className="text-xs text-[#8fe617] hover:underline flex items-center gap-1 font-semibold">
              <span>Manage Senders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1e2c22] mt-3">
            {senders.slice(0, 5).map(s => (
              <div key={s.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs">{s.username}</div>
                  <div className="text-[10px] text-[#9eb2a6] font-mono">{s.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8fe617]/15 text-[#8fe617]">
                    Active
                  </span>
                  <span className="text-[10px] font-mono text-[#9eb2a6]">
                    {s.boundDeviceId || 'Hardware Bound'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Supervisor Quick Actions</h2>
          </div>

          <div className="space-y-3 mt-4">
            <Link
              to="/admin/tasks"
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-[#8fe617]" />
                <span>Task Creator & Delegation Engine</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#9eb2a6]" />
            </Link>

            <Link
              to="/admin/senders"
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Reset Field Hardware Locks (1-Device)</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#9eb2a6]" />
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Executive Regional Reports</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#9eb2a6]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
