import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, UserPlus, Users, CheckSquare, BarChart2, UserCheck,
  Download, AlertTriangle, Activity, Database, Settings, RefreshCw,
  ShieldCheck, FileCheck, Layers, Smartphone, HardDrive, Shield, CreditCard
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
      case 'SENDER':
        return { title: 'SENDER WORKSTATION', subtitle: 'Biometric Capture & Transmission', color: 'bg-[#85E510]/15 text-[#366804] border-[#85E510]/30' };
      case 'RECEIVER':
        return { title: 'RECEIVER CONSOLE', subtitle: 'Directory, Review & Bulk Exports', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'ADMIN':
        return { title: 'ADMIN SUPERVISION', subtitle: 'Workforce & Task Governance', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'SUPER_ADMIN':
        return { title: 'SUPER ADMIN CONSOLE', subtitle: 'Central Authority & Diagnostics', color: 'bg-purple-50 text-purple-800 border-purple-200' };
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
          { to: '/receiver/id-production', label: 'ID Production', icon: CreditCard },
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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white border-r border-[#E2E8F0] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Station Identification Card */}
        <div className="p-4 border-b border-[#E2E8F0]">
          <div className={`px-3 py-1.5 rounded-xl border ${badge.color}`}>
            <div className="text-[11px] font-black tracking-wide uppercase">
              {badge.title}
            </div>
            <div className="text-[10px] opacity-80 font-medium mt-0.5">
              {badge.subtitle}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#85E510]/15 text-[#2E5803] font-bold border-l-4 border-[#85E510] shadow-sm'
                      : 'text-[#64748B] hover:text-[#202833] hover:bg-[#F4F7F5]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Station Status */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9]">
          <div className="flex items-center justify-between text-[11px] text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#85E510] animate-pulse" />
              <span className="font-semibold text-[#202833]">Edge Online</span>
            </div>
            <span className="font-mono text-[10px] text-[#64748B]">Cloudflare</span>
          </div>
        </div>
      </aside>
    </>
  );
};
