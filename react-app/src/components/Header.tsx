import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Inbox, Shield, Zap, Bell, LogOut, User as UserIcon, Lock, Smartphone } from 'lucide-react';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId } from '@/lib/store';
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
  const deviceId = getOrCreateDeviceId();

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  // Determine which stations this user can switch to
  const canAccessStation = (target: UserRole): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true; // Super Admin can inspect all 4 stations
    if (user.role === target) return true;
    if (user.role === 'ADMIN' && target === 'SENDER') return true; // Admin can inspect sender workflow
    return false;
  };

  const handleStationSwitch = (station: UserRole) => {
    if (!canAccessStation(station)) return;
    onStationChange(station);
    if (station === 'SENDER') navigate('/sender/register');
    else if (station === 'RECEIVER') navigate('/receiver/dashboard');
    else if (station === 'ADMIN') navigate('/admin/dashboard');
    else if (station === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
  };

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'SENDER':
        return 'bg-[#85E510]/20 text-[#366804] border-[#85E510]/40';
      case 'RECEIVER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ADMIN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-6 gap-4 shadow-sm">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-[#64748B] hover:text-[#202833] rounded-lg hover:bg-black/5"
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
            className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(133,229,16,0.3)]"
            onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
          />
          <div className="flex items-center gap-1.5 font-heading font-black text-base tracking-tight text-[#202833]">
            <span>SILICON</span>
            <span className="bg-[#85E510] text-[#062404] text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">LABS</span>
            <span className="text-xs font-extrabold text-[#4D8A07] ml-1">StudentBridge</span>
          </div>
        </a>
      </div>

      {/* Station Switcher Pills (Role-Guarded) */}
      <div className="hidden md:flex items-center bg-[#F4F7F5] border border-[#E2E8F0] rounded-full p-1 gap-1">
        {/* Sender Pill */}
        <button
          type="button"
          disabled={!canAccessStation('SENDER')}
          onClick={() => handleStationSwitch('SENDER')}
          title={!canAccessStation('SENDER') ? 'Unauthorized Station' : 'Sender Station'}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            currentStation === 'SENDER'
              ? 'bg-[#85E510] text-[#062404] shadow-[0_2px_10px_rgba(133,229,16,0.4)]'
              : canAccessStation('SENDER')
              ? 'text-[#64748B] hover:text-[#202833] hover:bg-white'
              : 'text-[#94A3B8] opacity-50 cursor-not-allowed'
          }`}
        >
          <Send className="w-3 h-3" />
          <span>Sender</span>
          {!canAccessStation('SENDER') && <Lock className="w-2.5 h-2.5 text-[#94A3B8]" />}
        </button>

        {/* Receiver Pill */}
        <button
          type="button"
          disabled={!canAccessStation('RECEIVER')}
          onClick={() => handleStationSwitch('RECEIVER')}
          title={!canAccessStation('RECEIVER') ? 'Unauthorized Station' : 'Receiver Station'}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            currentStation === 'RECEIVER'
              ? 'bg-[#85E510] text-[#062404] shadow-[0_2px_10px_rgba(133,229,16,0.4)]'
              : canAccessStation('RECEIVER')
              ? 'text-[#64748B] hover:text-[#202833] hover:bg-white'
              : 'text-[#94A3B8] opacity-50 cursor-not-allowed'
          }`}
        >
          <Inbox className="w-3 h-3" />
          <span>Receiver</span>
          {!canAccessStation('RECEIVER') && <Lock className="w-2.5 h-2.5 text-[#94A3B8]" />}
        </button>

        {/* Admin Pill */}
        <button
          type="button"
          disabled={!canAccessStation('ADMIN')}
          onClick={() => handleStationSwitch('ADMIN')}
          title={!canAccessStation('ADMIN') ? 'Unauthorized Station' : 'Admin Station'}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            currentStation === 'ADMIN'
              ? 'bg-[#85E510] text-[#062404] shadow-[0_2px_10px_rgba(133,229,16,0.4)]'
              : canAccessStation('ADMIN')
              ? 'text-[#64748B] hover:text-[#202833] hover:bg-white'
              : 'text-[#94A3B8] opacity-50 cursor-not-allowed'
          }`}
        >
          <Shield className="w-3 h-3" />
          <span>Admin</span>
          {!canAccessStation('ADMIN') && <Lock className="w-2.5 h-2.5 text-[#94A3B8]" />}
        </button>

        {/* Super Admin Pill */}
        <button
          type="button"
          disabled={!canAccessStation('SUPER_ADMIN')}
          onClick={() => handleStationSwitch('SUPER_ADMIN')}
          title={!canAccessStation('SUPER_ADMIN') ? 'Unauthorized Station' : 'Super Admin Station'}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            currentStation === 'SUPER_ADMIN'
              ? 'bg-[#85E510] text-[#062404] shadow-[0_2px_10px_rgba(133,229,16,0.4)]'
              : canAccessStation('SUPER_ADMIN')
              ? 'text-[#64748B] hover:text-[#202833] hover:bg-white'
              : 'text-[#94A3B8] opacity-50 cursor-not-allowed'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>Super Admin</span>
          {!canAccessStation('SUPER_ADMIN') && <Lock className="w-2.5 h-2.5 text-[#94A3B8]" />}
        </button>
      </div>

      {/* Operator Status & Logout */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-[#202833] leading-none">
                {user.username}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono mt-0.5">
                {user.email}
              </span>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(user.role)}`}>
              {user.role}
            </span>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 text-[#64748B] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-all flex items-center gap-1 text-xs font-bold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-xl bg-[#85E510] text-[#062404] font-bold text-xs"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
