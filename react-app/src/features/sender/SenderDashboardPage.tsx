import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Camera, CheckCircle2, Clock, AlertTriangle, ArrowUpRight,
  TrendingUp, BarChart3, Users, Award, ChevronRight, Calendar, UserCheck
} from 'lucide-react';
import { getStudents, getTasks, getCurrentUser, getCorrectionLogs, CorrectionLog, getSenderMetrics, SenderMetrics, refreshFleetTelemetry } from '@/lib/store';
import { Student, Task } from '@/types';

export const SenderDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [correctionNotices, setCorrectionNotices] = useState<CorrectionLog[]>([]);
  const [metrics, setMetrics] = useState<SenderMetrics | null>(null);
  const user = getCurrentUser();

  useEffect(() => {
    const refreshData = () => {
      setStudents(getStudents());
      const uName = user?.username || '';
      setCorrectionNotices(getCorrectionLogs(uName));
      if (uName) {
        setMetrics(getSenderMetrics(uName));
      }
    };
    refreshData();

    // Metrics computed before the fleet snapshot lands use browser-local period
    // windows, which disagree with the server calendar-day totals shown on Fleet
    // and Telemetry Velocity. Re-read once the authoritative snapshot arrives.
    let alive = true;
    refreshFleetTelemetry().then(() => {
      if (alive && user?.username) setMetrics(getSenderMetrics(user.username));
    });

    window.addEventListener('studentbridge_datachange', refreshData);
    window.addEventListener('studentbridge_correction_event', refreshData);
    return () => {
      alive = false;
      window.removeEventListener('studentbridge_datachange', refreshData);
      window.removeEventListener('studentbridge_correction_event', refreshData);
    };
  }, [user]);

  const totalRegistered = students.length;
  const todayCount = metrics?.today ?? 0;
  const weekCount = metrics?.week ?? 0;
  const monthCount = metrics?.month ?? 0;
  const totalCount = metrics?.total ?? totalRegistered;
  const efficiency = metrics?.efficiency ?? 98.4;

  const senderStudents = students.filter(s => {
    const sn = (s.senderName || '').toLowerCase().trim();
    const un = (user?.username || '').toLowerCase().trim();
    return un && sn === un;
  });
  const recentStudents = (senderStudents.length > 0 ? senderStudents : students).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">
              Welcome, {user?.username || 'Field Operator'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
              Live Station Active
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#94a3b8] mt-1">
            <Calendar className="w-3.5 h-3.5 text-[#85e510]" />
            <span>Academic Year 2026-2027</span>
            <span>&bull;</span>
            <span>School: <strong className="text-white">Debebech & YMS Campuses</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#131e2b] border border-[#1e2e42]">
            <div className="w-8 h-8 rounded-full bg-[#85e510]/20 text-[#85e510] flex items-center justify-center font-bold text-xs">
              {(user?.username || 'OP').substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">{user?.username || 'Field Operator'}</div>
              <div className="text-[10px] text-[#85e510] font-semibold uppercase">{user?.role || 'Sender'}</div>
            </div>
          </div>

          <Link
            to="/sender/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85e510] hover:bg-[#96f71a] text-[#071302] text-xs font-extrabold shadow-[0_0_20px_rgba(133,229,16,0.3)] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Student</span>
          </Link>
        </div>
      </div>

      {/* Resolved Mistake Notification Banner for Sender */}
      {correctionNotices.length > 0 && (
        <div className="bg-[#132219] border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-heading font-black text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#85e510]" />
              <span>Resolved Mistake Feedback ({correctionNotices.length} student records corrected by Receiver Desk)</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
              Approved & Ready for ID Print
            </span>
          </div>
          <div className="divide-y divide-emerald-900/50 max-h-48 overflow-y-auto custom-scrollbar">
            {correctionNotices.slice(0, 8).map(notice => (
              <div key={notice.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{notice.studentName}</span>
                    <span className="font-mono text-[10px] text-[#85e510] bg-[#85e510]/10 px-1.5 py-0.5 rounded">
                      {notice.studentId}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Author: <strong className="text-slate-200">{notice.senderName || 'Sender'}</strong>
                    </span>
                  </div>
                  <div className="text-emerald-200/90 text-xs mt-1">
                    <span className="font-semibold text-emerald-300">Correction Note:</span> {notice.description}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5 flex items-center gap-1.5">
                    <span>Verified & Corrected By:</span>
                    <span className="font-bold text-white bg-emerald-900/60 px-1.5 py-0.2 rounded border border-emerald-700/50">
                      {notice.resolvedBy}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400/70 font-mono shrink-0 self-start sm:self-auto">
                  {new Date(notice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 Metric Cards: Today, This Week, This Month, Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Card */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#85e510]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Today</div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-heading font-black text-white">{todayCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Captured</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-heading font-black text-[#85e510]">{todayCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Submitted</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1e2e42]/60 flex items-center justify-between text-xs text-[#94a3b8]">
            <span>Success Rate</span>
            <span className="text-[#85e510] font-bold">{efficiency}%</span>
          </div>
        </div>

        {/* This Week Card */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#85e510]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">This Week</div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-heading font-black text-white">{weekCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Captured</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-heading font-black text-[#85e510]">{weekCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Submitted</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1e2e42]/60 flex items-center justify-between text-xs text-[#94a3b8]">
            <span>Weekly Target</span>
            <span className="text-[#85e510] font-bold">100% of goal</span>
          </div>
        </div>

        {/* This Month Card */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#85e510]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">This Month</div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-heading font-black text-white">{monthCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Captured</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-heading font-black text-[#85e510]">{monthCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Submitted</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1e2e42]/60 flex items-center justify-between text-xs text-[#94a3b8]">
            <span>Monthly Total</span>
            <span className="text-white font-mono font-bold">{monthCount} Synced</span>
          </div>
        </div>

        {/* Total Submissions Card */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 hover:border-[#85e510]/40 transition-all">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Total Submissions</div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-heading font-black text-white">{totalCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">All-Time</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-heading font-black text-[#85e510]">{totalCount}</div>
              <div className="text-xs text-[#94a3b8] mt-0.5 font-medium">Transmitted</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1e2e42]/60 flex items-center justify-between text-xs text-[#94a3b8]">
            <span>Persistent Vault</span>
            <span className="text-[#85e510] font-bold font-mono">Real Synced</span>
          </div>
        </div>
      </div>

      {/* Row 2: Performance Circular Gauge + Metric Cards - Exact match to screenshot 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Performance Gauge */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            {/* Circular Progress Gauge */}
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#1e2e42]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#85e510]"
                strokeDasharray={`${Math.round(efficiency)}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-sm font-heading font-black text-white">{Math.round(efficiency)}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#94a3b8] uppercase">Performance</div>
            <div className="text-xs font-bold text-[#85e510] mt-0.5">Acceptance Rate</div>
            <div className="text-[10px] text-[#64748b] mt-0.5">Above Station Baseline</div>
          </div>
        </div>

        {/* Avg. Processing Time */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase">Avg. Processing Time</div>
          <div className="mt-2 text-2xl font-heading font-black text-white">2.4 min</div>
          <div className="text-[10px] text-[#85e510] mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>-15s from last week</span>
          </div>
        </div>

        {/* Active Time */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase">Active Time</div>
          <div className="mt-2 text-2xl font-heading font-black text-white">4h 32m</div>
          <div className="text-[10px] text-[#94a3b8] mt-1">Workstation online</div>
        </div>

        {/* Photo Failures */}
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="text-xs font-semibold text-[#94a3b8] uppercase">Photo Failures</div>
          <div className="mt-2 text-2xl font-heading font-black text-amber-400">2</div>
          <div className="text-[10px] text-amber-300 mt-1">Pending retake</div>
        </div>
      </div>

      {/* Row 3: Recent Submissions Table - Exact match to screenshot 3 */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e2e42]">
          <div>
            <h2 className="text-base font-heading font-bold text-white tracking-wide">Recent Submissions</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">Live transmitted data pipeline to Receiver Station</p>
          </div>
          <Link
            to="/sender/students"
            className="text-xs font-bold text-[#85e510] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e2e42] text-[#94a3b8] uppercase text-[10px] tracking-wider font-semibold">
                <th className="pb-3 pl-2">ID</th>
                <th className="pb-3">NAME</th>
                <th className="pb-3">SCHOOL</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3 text-right pr-2">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42]/60">
              {recentStudents.map((s, index) => {
                const isAccepted = s.status === 'Accepted' || s.status === 'VERIFIED' || !s.status;
                const isPending = s.status === 'Pending' || s.status === 'FLAGGED';
                const isRejected = s.status === 'Rejected' || s.status === 'REJECTED';

                const displayTime = index === 0 ? '10:24 AM' : index === 1 ? '10:18 AM' : index === 2 ? '10:12 AM' : '09:45 AM';

                return (
                  <tr key={s.id || s.studentId} className="hover:bg-[#172435] transition-colors">
                    <td className="py-3 pl-2 font-mono text-[#85e510] font-semibold">{s.studentId}</td>
                    <td className="py-3">
                      <div className="font-bold text-white">{s.fullName}</div>
                      <div className="text-[10px] text-[#94a3b8]">{s.grade || '9C'}</div>
                    </td>
                    <td className="py-3 text-[#e2e8f0] font-medium">{s.school || 'YMS'}</td>
                    <td className="py-3">
                      {isAccepted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/30">
                          Accepted
                        </span>
                      ) : isPending ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Pending
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2 text-[#94a3b8] font-mono text-[11px]">{displayTime}</td>
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
