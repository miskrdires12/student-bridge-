import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, UserPlus, Users, CheckSquare, BarChart2, UserCheck,
  Download, AlertTriangle, Activity, Database, Settings, RefreshCw,
  ShieldCheck, FileCheck, Layers, Smartphone, HardDrive, Shield
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
      case 'SENDER': return { title: 'SENDER WORKSTATION', color: '#85e510' };
      case 'RECEIVER': return { title: 'RECEIVER CONSOLE', color: '#60a5fa' };
      case 'ADMIN': return { title: 'ADMIN SUPERVISION', color: '#fbbf24' };
      case 'SUPER_ADMIN': return { title: 'SUPER ADMIN CONSOLE', color: '#a855f7' };
    }
  };

  const getNavItems = () => {
    switch (currentStation) {
      case 'SENDER':
        // Mandatory Specification: Sender must have exactly two navigation sections:
        // 1. Register Student. 2. Settings.
        return [
          { to: '/sender/register', label: 'Register Student', icon: UserPlus },
          { to: '/sender/settings', label: 'Settings', icon: Settings },
        ];
      case 'RECEIVER':
        return [
          { to: '/receiver/dashboard', label: 'Dashboard', icon: LayoutGrid },
          { to: '/receiver/students', label: 'Student Directory', icon: Users },
          { to: '/receiver/review', label: 'Review Queue', icon: ShieldCheck },
          { to: '/receiver/mistakes', label: 'Mistake Analyzer', icon: AlertTriangle },
          { to: '/receiver/exports', label: 'Bulk Operations & Exports', icon: Download },
          { to: '/receiver/database', label: 'Database Control Room', icon: Database },
          { to: '/receiver/settings', label: 'Settings', icon: Settings },
        ];
      case 'ADMIN':
        return [
          { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
          { to: '/admin/senders', label: 'Sender Management', icon: Users },
          { to: '/admin/tasks', label: 'Task Management', icon: CheckSquare },
          { to: '/admin/reviews', label: 'Quality Reviews', icon: ShieldCheck },
          { to: '/admin/performance', label: 'Performance Analytics', icon: BarChart2 },
          { to: '/admin/reports', label: 'Reports', icon: Layers },
          { to: '/admin/settings', label: 'Settings', icon: Settings },
        ];
      case 'SUPER_ADMIN':
        return [
          { to: '/super-admin/dashboard', label: 'Global Dashboard', icon: LayoutGrid },
          { to: '/super-admin/users', label: 'User & Role Management', icon: Users },
          { to: '/super-admin/devices', label: 'Device Management', icon: Smartphone },
          { to: '/super-admin/schools', label: 'School & Location Mgmt', icon: Layers },
          { to: '/super-admin/tasks', label: 'Task Oversight', icon: CheckSquare },
          { to: '/super-admin/reports', label: 'Global Reports & Analytics', icon: BarChart2 },
          { to: '/super-admin/integrations', label: 'StudentCore Integration', icon: RefreshCw },
          { to: '/super-admin/database', label: 'Database Control Room', icon: Database },
          { to: '/super-admin/storage', label: 'Storage & Photo Diagnostics', icon: HardDrive },
          { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: Activity },
          { to: '/super-admin/settings', label: 'System Settings', icon: Settings },
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
        className={`fixed lg:sticky top-16 left-0 z-40 w-60 h-[calc(100vh-4rem)] bg-[#101924] border-r border-[#1e2e42] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Station Header */}
        <div className="p-4 border-b border-[#1e2e42]/60">
          <div className="font-heading font-black text-sm text-[#f2f7f4]">
            SILICON <span className="bg-[#85e510] text-[#062404] text-[9px] font-black px-1.5 py-0.5 rounded">LABS</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#85e510]/10 text-[#85e510] text-[10px] font-black uppercase tracking-wider mt-1.5 border border-[#85e510]/20">
            <span>{badge.title}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                      ? 'bg-[#85e510] text-[#071302] shadow-[0_0_15px_rgba(133,229,16,0.35)]'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Workstation Footer Status */}
        <div className="p-3 border-t border-[#1e2e42]/60 text-[10px] text-[#94a3b8] bg-[#0d1520]/60">
          <div className="flex items-center justify-between font-mono">
            <span>Edge Station:</span>
            <span className="text-[#85e510] font-bold">ONLINE</span>
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5 truncate">
            {user?.email || 'Logged In'}
          </div>
        </div>
      </aside>
    </>
  );
};
