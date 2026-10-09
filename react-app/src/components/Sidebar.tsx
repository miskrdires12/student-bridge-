import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, UserPlus, Users, CheckSquare, BarChart2, UserCheck,
  Download, AlertTriangle, Activity, Database, Settings, RefreshCw,
  ShieldCheck, FileCheck, Layers
} from 'lucide-react';
import { UserRole } from '@/types';
import { getCurrentUser } from '@/lib/store';

interface SidebarProps {
  currentStation: UserRole;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentStation, mobileOpen, onCloseMobile }) => {
  const user = getCurrentUser();

  const getStationBadge = () => {
    switch (currentStation) {
      case 'SENDER': return { title: 'SENDER WORKSTATION', color: '#8fe617' };
      case 'RECEIVER': return { title: 'RECEIVER CONSOLE', color: '#60a5fa' };
      case 'ADMIN': return { title: 'ADMIN SUPERVISION', color: '#fbbf24' };
      case 'SUPER_ADMIN': return { title: 'SUPER ADMIN CONSOLE', color: '#a855f7' };
    }
  };

  const getNavItems = () => {
    switch (currentStation) {
      case 'SENDER':
        return [
          { to: '/sender/dashboard', label: 'Dashboard', icon: LayoutGrid },
          { to: '/sender/register', label: 'New Student', icon: UserPlus },
          { to: '/sender/students', label: 'My Submissions', icon: FileCheck },
          { to: '/sender/tasks', label: 'Tasks', icon: CheckSquare },
          { to: '/sender/performance', label: 'Performance', icon: BarChart2 },
          { to: '/sender/profile', label: 'Profile & Device', icon: UserCheck },
        ];
      case 'RECEIVER':
        return [
          { to: '/receiver/dashboard', label: 'Dashboard', icon: LayoutGrid },
          { to: '/receiver/students', label: 'Student Directory', icon: Users },
          { to: '/receiver/review', label: 'Review & Verify', icon: ShieldCheck },
          { to: '/receiver/mistakes', label: 'Mistake Analyzer', icon: AlertTriangle },
          { to: '/receiver/exports', label: 'Export Center', icon: Download },
          { to: '/receiver/activity', label: 'Activity Feed', icon: Activity },
        ];
      case 'ADMIN':
        return [
          { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
          { to: '/admin/senders', label: 'Senders Workforce', icon: Users },
          { to: '/admin/tasks', label: 'Task Management', icon: CheckSquare },
          { to: '/admin/reviews', label: 'Quality Reviews', icon: ShieldCheck },
          { to: '/admin/performance', label: 'Performance KPIs', icon: BarChart2 },
          { to: '/admin/reports', label: 'Reports', icon: Layers },
        ];
      case 'SUPER_ADMIN':
        return [
          { to: '/super-admin/dashboard', label: 'Global Analytics', icon: LayoutGrid },
          { to: '/super-admin/users', label: 'User Management', icon: Users },
          { to: '/super-admin/roles', label: 'RBAC & Hardware Locks', icon: ShieldCheck },
          { to: '/super-admin/schools', label: 'Schools & Locations', icon: Layers },
          { to: '/super-admin/tasks', label: 'Global Tasks', icon: CheckSquare },
          { to: '/super-admin/integrations', label: 'StudentCore Sync', icon: RefreshCw },
          { to: '/super-admin/database', label: 'Database Control Room', icon: Database },
          { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: Activity },
          { to: '/super-admin/settings', label: 'Super Settings', icon: Settings },
        ];
    }
  };

  const badge = getStationBadge();
  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 left-0 z-40 w-60 h-[calc(100vh-4rem)] bg-[#0d1410] border-r border-[#1e2c22] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Station Header */}
        <div className="p-4 border-b border-white/[0.05]">
          <div className="font-heading font-black text-sm text-[#f2f7f4]">
            SILICON <span className="bg-[#8fe617] text-[#062404] text-[9px] font-black px-1.5 py-0.5 rounded">LABS</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#8fe617]/10 text-[#8fe617] text-[10px] font-black uppercase tracking-wider mt-1.5 border border-[#8fe617]/20">
            <span>{badge.title}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#8fe617] text-[#062404] shadow-[0_0_14px_rgba(143,230,23,0.35)]'
                      : 'text-[#9eb2a6] hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Profile Card at bottom */}
        <div className="p-3 border-t border-white/[0.05] bg-[#090e0b] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1b2820] border border-[#8fe617] flex items-center justify-center font-black text-xs text-[#8fe617]">
            {(user?.username || 'M')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#f2f7f4] truncate">{user?.username || 'Operator'}</div>
            <div className="text-[10px] font-semibold text-[#8fe617] truncate">{user?.role || 'SUPER_ADMIN'}</div>
          </div>
        </div>
      </aside>
    </>
  );
};
