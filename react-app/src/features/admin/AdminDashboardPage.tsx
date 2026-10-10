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
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Admin Operations Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase">
              Station Three &bull; Admin
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Regional workforce orchestration, task scheduling, and quality assurance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Create New Task</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Field Sender Fleet</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#202833]">{senders.length || 12}</span>
            <span className="text-xs text-[#366804] font-bold">Operators Active</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">1-Device hardware locked</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Field Tasks</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#202833]">{tasks.length}</span>
            <span className="text-xs text-amber-600 font-bold">In Flight</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">Distributed across 8 schools</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Registry Volume</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#202833]">{students.length.toLocaleString()}</span>
            <span className="text-xs text-sky-600 font-bold">Total Students</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">Cloudflare R2 synchronized</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Audit Pass Rate</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#366804]">99.4%</span>
            <span className="text-xs text-[#366804] font-bold">Exceeds SLA</span>
          </div>
          <div className="mt-2 text-xs text-[#64748B]">Quality compliance rate</div>
        </div>
      </div>

      {/* Senders Preview & Task Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">Field Sender Fleet Status</h2>
            <Link to="/admin/senders" className="text-xs text-[#4D8A07] hover:underline flex items-center gap-1 font-bold">
              <span>Manage Senders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#E2E8F0] mt-3">
            {senders.slice(0, 5).map(s => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#202833]">{s.username}</div>
                  <div className="text-[11px] text-[#64748B] font-mono">{s.email}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#85E510]/15 text-[#366804]">
                    Active
                  </span>
                  <div className="text-[10px] text-[#64748B] mt-0.5">{s.recordsSentSingle || 45} records</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">Recent Operational Tasks</h2>
            <Link to="/admin/tasks" className="text-xs text-[#4D8A07] hover:underline flex items-center gap-1 font-bold">
              <span>View All Tasks</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#E2E8F0] mt-3">
            {tasks.slice(0, 5).map(t => (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#202833]">{t.title}</div>
                  <div className="text-[11px] text-[#64748B]">Assigned to: {t.assignedTo} ({t.school})</div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  t.status === 'Completed'
                    ? 'bg-[#85E510]/15 text-[#366804]'
                    : t.status === 'Overdue'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
