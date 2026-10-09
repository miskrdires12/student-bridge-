import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Inbox, Shield, Zap, Sun, Bell, LogOut } from 'lucide-react';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { UserRole } from '@/types';

interface HeaderProps {
  currentStation: UserRole;
  onStationChange: (station: UserRole) => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentStation, onStationChange, onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const handleStationSwitch = (station: UserRole) => {
    onStationChange(station);
    if (station === 'SENDER') navigate('/sender/dashboard');
    else if (station === 'RECEIVER') navigate('/receiver/dashboard');
    else if (station === 'ADMIN') navigate('/admin/dashboard');
    else if (station === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#0d1410]/95 backdrop-blur-md border-b border-[#1e2c22] flex items-center justify-between px-4 sm:px-6 gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-[#9eb2a6] hover:text-white rounded-lg hover:bg-white/5"
          aria-label="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <a href="/" className="flex items-center gap-2.5 text-inherit no-underline">
          <img
            src="/logo.png"
            alt="Silicon Labs Emblem"
            className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(133,229,16,0.4)]"
            onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
          />
          <div className="flex items-center gap-1.5 font-heading font-black text-lg tracking-tight">
            <span>SILICON</span>
            <span className="bg-[#8fe617] text-[#062404] text-[10px] font-black px-1.5 py-0.5 rounded tracking-wide">LABS</span>
            <span className="text-sm font-extrabold text-[#8fe617] ml-1">StudentBridge</span>
          </div>
        </a>
      </div>

      {/* Center Tagline */}
      <div className="hidden xl:flex items-center gap-2 text-xs font-semibold tracking-wider text-[#9eb2a6]">
        <span>One System</span>
        <span className="text-[#8fe617]">•</span>
        <span>Four Stations</span>
        <span className="text-[#8fe617]">•</span>
        <span>A Brighter Future</span>
      </div>

      {/* Station Switcher Pills + User Controls */}
      <div className="flex items-center gap-3">
        {/* Pills */}
        <div className="hidden sm:flex items-center bg-white/[0.04] border border-white/[0.08] rounded-full p-1 gap-1">
          <button
            type="button"
            onClick={() => handleStationSwitch('SENDER')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStation === 'SENDER'
                ? 'bg-[#8fe617] text-[#062404] shadow-[0_0_14px_rgba(143,230,23,0.45)]'
                : 'text-[#9eb2a6] hover:text-white hover:bg-white/5'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>Sender</span>
          </button>

          <button
            type="button"
            onClick={() => handleStationSwitch('RECEIVER')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStation === 'RECEIVER'
                ? 'bg-[#8fe617] text-[#062404] shadow-[0_0_14px_rgba(143,230,23,0.45)]'
                : 'text-[#9eb2a6] hover:text-white hover:bg-white/5'
            }`}
          >
            <Inbox className="w-3 h-3" />
            <span>Receiver</span>
          </button>

          <button
            type="button"
            onClick={() => handleStationSwitch('ADMIN')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStation === 'ADMIN'
                ? 'bg-[#8fe617] text-[#062404] shadow-[0_0_14px_rgba(143,230,23,0.45)]'
                : 'text-[#9eb2a6] hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleStationSwitch('SUPER_ADMIN')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStation === 'SUPER_ADMIN'
                ? 'bg-[#8fe617] text-[#062404] shadow-[0_0_14px_rgba(143,230,23,0.45)]'
                : 'text-[#9eb2a6] hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Super Admin</span>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-[#1e2c22] text-[#8fe617] hover:bg-white/10 transition"
          title="Toggle Theme"
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => navigate('/super-admin/audit-logs')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-[#1e2c22] text-[#9eb2a6] hover:text-white hover:bg-white/10 transition"
          title="Audit Logs"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar Badge */}
        <div className="w-9 h-9 rounded-full bg-[#161e19] border border-[#8fe617] flex items-center justify-center font-black text-sm text-[#8fe617]">
          {(user?.username || 'M')[0].toUpperCase()}
        </div>

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/10 transition"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
