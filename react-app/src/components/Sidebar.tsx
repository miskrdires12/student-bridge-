import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Layers, Settings,
  UserPlus, LayoutGrid, CheckSquare, BarChart2,
  Smartphone, Activity, AlertTriangle, TrendingUp,
  LogOut, Database, X, Shield, HardDrive
} from 'lucide-react';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { UserRole } from '@/types';

interface SidebarProps {
  currentStation?: UserRole;
  onStationChange?: (station: UserRole) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onClose?: () => void;
  desktopOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  onClose,
  desktopOpen = true
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'MI';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.username || 'miskrdires11';
  const displayRole = user?.role === 'SUPER_ADMIN'
    ? 'Super Admin'
    : (user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Super Admin');

  // Role-specific navigation sections strictly matching system responsibilities
  const role = user?.role || 'SENDER';
  
  // Navigation structure matching official Admin Console layout
  const navSections = isSuperAdmin ? [
    {
      title: 'INSTITUTIONAL ADMINISTRATOR',
      showShield: true,
      items: [
        { to: '/admin/dashboard', label: 'Live Dashboard & Metrics', icon: LayoutGrid, iconColor: 'text-slate-500' },
        { to: '/super-admin/telemetric-velocity', label: 'Telemetric Velocity & Fleet', icon: Activity, iconColor: 'text-[#85E510]' },
        { to: '/receiver/students', label: 'Student Directory & Records', icon: Users, iconColor: 'text-slate-500' },
        { to: '/sender/register', label: 'Student Registration', icon: UserPlus, iconColor: 'text-slate-500' },
      ]
    },
    {
      title: '',
      showShield: false,
      items: [
        { to: '/super-admin/users', label: 'Provision Operators & RBAC', icon: Shield, iconColor: 'text-amber-500' },
        { to: '/admin/payroll', label: 'Sender Payroll Report', icon: TrendingUp, iconColor: 'text-[#4D8A07]' },
        { to: '/super-admin/database', label: 'Database & Audit Logs', icon: Database, iconColor: 'text-blue-500' },
        { to: '/super-admin/storage', label: 'Storage Capacity & Zero-Egress Command', icon: HardDrive, iconColor: 'text-cyan-500' },
        { to: '/super-admin/settings', label: 'Admin System Settings', icon: Settings, iconColor: 'text-emerald-500' },
      ]
    }
  ] : role === 'SENDER' ? [
    {
      title: 'FIELD OPERATIONS',
      showShield: false,
      items: [
        { to: '/sender/register', label: 'Student Registration', icon: UserPlus, iconColor: 'text-slate-500' },
      ]
    },
    {
      title: 'SETTINGS',
      showShield: false,
      items: [
        { to: '/sender/settings', label: 'Station Settings', icon: Settings, iconColor: 'text-slate-500' },
      ]
    }
  ] : role === 'RECEIVER' ? [
    {
      title: 'STUDENT REGISTRY',
      showShield: false,
      items: [
        { to: '/receiver/students', label: 'Student Directory & Records', icon: Users, iconColor: 'text-slate-500' },
        { to: '/receiver/telemetric-velocity', label: 'Telemetric Velocity & Fleet', icon: Activity, iconColor: 'text-[#85E510]' },
        { to: '/receiver/storage', label: 'Storage Capacity & Zero-Egress Command', icon: HardDrive, iconColor: 'text-cyan-500' },
        { to: '/receiver/database', label: 'Database & PostgreSQL Ledger', icon: Database, iconColor: 'text-blue-500' },
      ]
    },
    {
      title: 'SETTINGS',
      showShield: false,
      items: [
        { to: '/receiver/settings', label: 'Station Settings', icon: Settings, iconColor: 'text-slate-500' },
      ]
    }
  ] : [
    {
      title: 'COMMAND & CONTROL',
      showShield: true,
      items: [
        { to: '/admin/dashboard', label: 'Live Dashboard & Metrics', icon: LayoutGrid, iconColor: 'text-slate-500' },
        { to: '/admin/telemetric-velocity', label: 'Telemetric Velocity & Fleet', icon: Activity, iconColor: 'text-[#85E510]' },
        { to: '/admin/senders', label: 'Provision Operators & RBAC', icon: Shield, iconColor: 'text-amber-500' },
        { to: '/admin/payroll', label: 'Sender Payroll Report', icon: TrendingUp, iconColor: 'text-[#4D8A07]' },
        { to: '/admin/storage', label: 'Storage Capacity & Zero-Egress Command', icon: HardDrive, iconColor: 'text-cyan-500' },
        { to: '/admin/database', label: 'Database & PostgreSQL Ledger', icon: Database, iconColor: 'text-blue-500' },
        { to: '/admin/quality-control', label: 'Data Quality & Correction', icon: AlertTriangle, iconColor: 'text-rose-500' },
        { to: '/admin/tasks', label: 'Task Management', icon: CheckSquare, iconColor: 'text-slate-500' },
        { to: '/admin/settings', label: 'Admin System Settings', icon: Settings, iconColor: 'text-emerald-500' },
      ]
    }
  ];


  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-white dark:bg-[#141A22] border-r border-[#E2E8F0] dark:border-[#243041] flex flex-col transition-all duration-300 select-none ${
          desktopOpen ? 'lg:translate-x-0 lg:w-64' : 'lg:-translate-x-full lg:w-0 lg:overflow-hidden'
        } ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full w-64'}`}
      >
        {/* Brand Nav Header matching Reference Screenshot */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-[#243041] shrink-0 bg-white dark:bg-[#141A22]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#243041] shadow-xs flex items-center justify-center p-1.5 transition-transform hover:scale-105 shrink-0">
              <img
                src="/logo.png"
                alt="Silicon Labs"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/brand-logo.png';
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-heading font-black text-sm tracking-tight text-black dark:text-white">
                  SILICON
                </span>
                <span className="bg-[#9EE617] text-black text-[9px] font-black px-1.5 py-0.5 rounded leading-none shadow-xs">
                  LABS
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider leading-none mt-1">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          {/* Simple 'X' Close Button */}
          <button
            type="button"
            onClick={onClose || onCloseMobile}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white transition-all cursor-pointer shrink-0"
            title="Close navigation menu"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto overscroll-contain space-y-4 bg-white dark:bg-[#141A22] custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {section.showShield && <Shield className="w-3.5 h-3.5 text-[#85E510] stroke-[2.2]" />}
                  <span>{section.title}</span>
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isStudentsDirectory = item.to === '/receiver/students';
                const isActive = isStudentsDirectory
                  ? location.pathname.startsWith('/receiver/students') || location.pathname === '/receiver/dashboard' || location.pathname === '/receiver'
                  : location.pathname === item.to;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-[#85E510] text-black font-black shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-[#F8FAF9] dark:hover:bg-[#1E2633] font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black stroke-[2.5]' : item.iconColor || 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Profile & Sign Out Bar matching Reference Screenshot */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#243041] bg-white dark:bg-[#141A22] shrink-0 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-xs font-black text-black dark:text-white leading-tight truncate">
              {displayName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">
                ADMINISTRATOR
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Sign out of console"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
