import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Inbox, Shield, Zap, Bell, LogOut, User as UserIcon } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#101924]/95 backdrop-blur-md border-b border-[#1e2e42] flex items-center justify-between px-4 sm:px-6 gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-[#8fa2b7] hover:text-white rounded-lg hover:bg-white/5"
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
            className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(133,229,16,0.4)]"
            onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
          />
          <div className="flex items-center gap-1.5 font-heading font-black text-base tracking-tight text-white">
            <span>SILICON</span>
            <span className="bg-[#85e510] text-[#062404] text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">LABS</span>
            <span className="text-xs font-extrabold text-[#85e510] ml-1">StudentBridge</span>
          </div>
        </a>
      </div>

      {/* Center Tagline */}
      <div className="hidden xl:flex items-center gap-2 text-xs font-semibold tracking-wider text-[#8fa2b7]">
        <span>One System</span>
        <span className="text-[#85e510]">&bull;</span>
        <span>Four Stations</span>
        <span className="text-[#85e510]">&bull;</span>
        <span>A Brighter Future</span>
      </div>

      {/* Station Switcher Pills + User Controls */}
      <div className="flex items-center gap-3">
        {/* Pills */}
        <div className="hidden sm:flex items-center bg-[#0b1118] border border-[#1e2e42] rounded-full p-1 gap-1">
          <button
            type="button"
            onClick={() => handleStationSwitch('SENDER')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStation === 'SENDER'
                ? 'bg-[#85e510] text-[#062404] shadow-[0_0_12px_rgba(133,229,16,0.45)]'
                : 'text-[#8fa2b7] hover:text-white hover:bg-white/5'
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
                ? 'bg-[#85e510] text-[#062404] shadow-[0_0_12px_rgba(133,229,16,0.45)]'
                : 'text-[#8fa2b7] hover:text-white hover:bg-white/5'
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
                ? 'bg-[#85e510] text-[#062404] shadow-[0_0_12px_rgba(133,229,16,0.45)]'
                : 'text-[#8fa2b7] hover:text-white hover:bg-white/5'
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
                ? 'bg-[#85e510] text-[#062404] shadow-[0_0_12px_rgba(133,229,16,0.45)]'
                : 'text-[#8fa2b7] hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Super Admin</span>
          </button>
        </div>

        {/* User Pill / Log Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1e2e42]">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#0b1118] border border-[#1e2e42]">
            <div className="w-6 h-6 rounded-full bg-[#85e510]/20 text-[#85e510] border border-[#85e510]/40 flex items-center justify-center text-[10px] font-black">
              {(user?.username || 'O')[0].toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[11px] font-bold text-white truncate max-w-[110px]">
                {user?.username || 'Operator'}
              </div>
              <div className="text-[9px] text-[#85e510] font-mono">
                {user?.role || 'SENDER'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-2 rounded-xl text-[#8fa2b7] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
