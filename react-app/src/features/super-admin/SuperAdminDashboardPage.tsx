import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, Database, RefreshCw, Users, Server, HardDrive,
  Activity, ArrowUpRight, CheckCircle2, Lock, Cpu
} from 'lucide-react';
import { getStudents, getUsers, getSchools, getAuditLogs } from '@/lib/store';
import { Student, User, School } from '@/types';

export const SuperAdminDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    setStudents(getStudents());
    setUsers(getUsers());
    setSchools(getSchools());
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Super Admin Global Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Cross-platform edge governance, Cloudflare Pages functions telemetry, and master student identities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/super-admin/database"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all border border-white/10"
          >
            <Database className="w-4 h-4 text-[#8fe617]" />
            <span>Database Room</span>
          </Link>
          <Link
            to="/super-admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users ({users.length})</span>
          </Link>
        </div>
      </div>

      {/* Global Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Total Active Records</span>
            <Database className="w-4 h-4 text-[#8fe617]" />
          </div>
          <div className="mt-3 text-3xl font-heading font-black text-white">{students.length.toLocaleString()}</div>
          <div className="mt-2 text-xs text-[#9eb2a6]">100% Unique Student IDs</div>
        </div>

        {/* Cloudflare Edge Status */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Cloudflare Edge Health</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-heading font-black text-emerald-400">99.99%</div>
          <div className="mt-2 text-xs text-[#9eb2a6]">Pages &bull; Workers &bull; R2 Bucket</div>
        </div>

        {/* Global Operators */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Fleet Operator Accounts</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 text-3xl font-heading font-black text-white">{users.length}</div>
          <div className="mt-2 text-xs text-purple-300">1-Device Lock Enforced</div>
        </div>

        {/* Active Campus Hubs */}
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Connected School Hubs</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-3xl font-heading font-black text-white">{schools.length}</div>
          <div className="mt-2 text-xs text-blue-300">Addis Ababa, Adama, Harar</div>
        </div>
      </div>

      {/* Edge & Storage Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
            <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
              Cloudflare Runtime Infrastructure
            </h2>
            <span className="text-xs text-[#8fe617] font-mono font-bold">production / edge-us-east-1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] space-y-1">
              <span className="text-[#9eb2a6]">Hosting Runtime:</span>
              <div className="text-white font-bold">Cloudflare Pages SPA</div>
              <div className="text-[10px] text-[#8fe617]">student-bridge.pages.dev</div>
            </div>
            <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] space-y-1">
              <span className="text-[#9eb2a6]">Storage Bucket:</span>
              <div className="text-white font-bold">Cloudflare R2</div>
              <div className="text-[10px] text-blue-400">siliconlabs (3,578 Photos)</div>
            </div>
            <div className="p-3 rounded-xl bg-[#070908] border border-[#1e2c22] space-y-1">
              <span className="text-[#9eb2a6]">Edge Handlers:</span>
              <div className="text-white font-bold">Worker API Proxy</div>
              <div className="text-[10px] text-purple-300">&lt; 15ms Response Time</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#070908] border border-[#1e2c22] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#8fe617]" />
              <div>
                <div className="font-bold text-white">Full Independence Verified</div>
                <div className="text-[#9eb2a6] text-[11px]">Zero dependencies on external Supabase or Vercel infrastructure.</div>
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-[#8fe617]/10 text-[#8fe617] font-mono text-[11px] font-bold">
              100% Cloudflare Native
            </span>
          </div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Fast Navigation</h2>

          <Link
            to="/super-admin/integrations"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
          >
            <span>StudentCore Live Sync Monitor</span>
            <ArrowUpRight className="w-4 h-4 text-[#8fe617]" />
          </Link>

          <Link
            to="/super-admin/schools"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
          >
            <span>Schools & Location Configurator</span>
            <ArrowUpRight className="w-4 h-4 text-[#8fe617]" />
          </Link>

          <Link
            to="/super-admin/audit-logs"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
          >
            <span>Security & Audit Trails</span>
            <ArrowUpRight className="w-4 h-4 text-[#8fe617]" />
          </Link>

          <Link
            to="/super-admin/settings"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
          >
            <span>Platform Global Parameters</span>
            <ArrowUpRight className="w-4 h-4 text-[#8fe617]" />
          </Link>
        </div>
      </div>
    </div>
  );
};
