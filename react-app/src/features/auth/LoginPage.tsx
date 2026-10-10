import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera, ArrowRight, Layers, Wifi, Mail, Lock, ShieldCheck,
  CheckCircle2, AlertCircle, Smartphone, User, Sparkles
} from 'lucide-react';
import {
  getUsers, setCurrentUser, getOrCreateDeviceId,
  setUserHardwareLock, resetUserHardwareLock, PRESET_OPERATORS
} from '@/lib/store';
import { User as UserType, UserRole } from '@/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deviceLockedWarning, setDeviceLockedWarning] = useState<string | null>(null);
  const [lockedUser, setLockedUser] = useState<UserType | null>(null);

  const deviceId = getOrCreateDeviceId();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDeviceLockedWarning(null);

    const term = email.trim().toLowerCase();
    const allUsers = getUsers();

    // Find user by email or username
    let user = allUsers.find(
      u => u.email.toLowerCase() === term || u.username.toLowerCase() === term
    );

    // If not found in users.json or presets, match standard aliases
    if (!user) {
      if (term.includes('sender')) {
        user = PRESET_OPERATORS.find(u => u.role === 'SENDER');
      } else if (term.includes('receiver')) {
        user = PRESET_OPERATORS.find(u => u.role === 'RECEIVER');
      } else if (term.includes('admin') && !term.includes('super')) {
        user = PRESET_OPERATORS.find(u => u.role === 'ADMIN');
      } else if (term.includes('super') || term.includes('miskr')) {
        user = PRESET_OPERATORS.find(u => u.role === 'SUPER_ADMIN');
      }
    }

    if (!user) {
      setError('Invalid operator credentials. Please check your email or username.');
      return;
    }

    // Check 1-Device Hardware Lock
    if (user.boundDeviceId && user.boundDeviceId !== deviceId && user.role !== 'SUPER_ADMIN') {
      setLockedUser(user);
      setDeviceLockedWarning(
        `Hardware Lock Enforced: Account "${user.username}" is bound to device [${user.boundDeviceId}]. Your current device is [${deviceId}]. Contact your Administrator or use the Override button below.`
      );
      return;
    }

    // If not locked yet, bind to current device
    if (!user.boundDeviceId) {
      setUserHardwareLock(user.id, deviceId);
      user.boundDeviceId = deviceId;
    }

    // Complete Login and redirect to role station
    finishLogin(user);
  };

  const finishLogin = (user: UserType) => {
    setCurrentUser(user);
    if (user.role === 'SENDER') navigate('/sender/register');
    else if (user.role === 'RECEIVER') navigate('/receiver/dashboard');
    else if (user.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user.role === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
  };

  const handleQuickLogin = (preset: typeof PRESET_OPERATORS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password || 'password123');

    // Bind this device
    setUserHardwareLock(preset.id, deviceId);
    const updated = { ...preset, boundDeviceId: deviceId };
    finishLogin(updated);
  };

  const handleOverrideDeviceLock = () => {
    if (lockedUser) {
      resetUserHardwareLock(lockedUser.id);
      setUserHardwareLock(lockedUser.id, deviceId);
      lockedUser.boundDeviceId = deviceId;
      setDeviceLockedWarning(null);
      finishLogin(lockedUser);
    }
  };

  return (
    <div className="bg-[#131e2b] border border-[#1e2e42] rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)] grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
      {/* Left Pane: Branding & Value Pillars (5 cols) */}
      <div className="lg:col-span-5 bg-gradient-to-br from-[#0c1622] via-[#0f241a] to-[#0a1a12] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1e2e42]">
        {/* Glow Curves */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#85e510]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#85e510]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-1">
            <img
              src="/logo.png"
              alt="Silicon Labs"
              className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(133,229,16,0.5)]"
              onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
            />
            <div className="font-heading font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>SILICON</span>
              <span className="bg-[#85e510] text-[#062404] text-[9px] font-black px-1.5 py-0.5 rounded">LABS</span>
            </div>
          </div>
          <div className="text-[11px] text-[#85e510] font-semibold tracking-wide ml-10">
            we build modernity
          </div>

          <div className="mt-10">
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">StudentBridge</h1>
            <p className="text-xs text-[#8fa2b7] font-semibold mt-1">
              Secure Student Data Management
            </p>
          </div>
        </div>

        {/* 4 Circular Pillars Matching Screenshot */}
        <div className="relative z-10 my-8 grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-[#85e510]/40 bg-[#85e510]/10 flex items-center justify-center text-[#85e510] mb-2 shadow-[0_0_15px_rgba(133,229,16,0.2)]">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-wider uppercase">Capture</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-[#85e510]/40 bg-[#85e510]/10 flex items-center justify-center text-[#85e510] mb-2 shadow-[0_0_15px_rgba(133,229,16,0.2)]">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-wider uppercase">Transfer</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-[#85e510]/40 bg-[#85e510]/10 flex items-center justify-center text-[#85e510] mb-2 shadow-[0_0_15px_rgba(133,229,16,0.2)]">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-wider uppercase">Manage</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-[#85e510]/40 bg-[#85e510]/10 flex items-center justify-center text-[#85e510] mb-2 shadow-[0_0_15px_rgba(133,229,16,0.2)]">
              <Wifi className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-white tracking-wider uppercase">Connect</span>
          </div>
        </div>

        {/* Left Footer Info */}
        <div className="relative z-10 text-[11px] text-[#8fa2b7] space-y-1">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#85e510]" />
            <span>1-Device Hardware Lock Policy Active</span>
          </div>
          <div>Authorized operators only &bull; Centralized audit trail</div>
        </div>
      </div>

      {/* Right Pane: Sign In Form (7 cols) */}
      <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-[#131e2b]">
        <div>
          {/* Top Emblem */}
          <div className="flex items-center gap-2 mb-4">
            <img
              src="/logo.png"
              alt="Emblem"
              className="w-7 h-7 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
            />
            <span className="font-heading font-black text-xs text-white tracking-wide">SILICON LABS</span>
          </div>

          <h2 className="text-2xl font-heading font-extrabold text-white tracking-tight">Welcome Back</h2>
          <p className="text-xs text-[#8fa2b7] mt-1">Sign in to your StudentBridge account</p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {deviceLockedWarning && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{deviceLockedWarning}</span>
              </div>
              <button
                type="button"
                onClick={handleOverrideDeviceLock}
                className="self-end px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold rounded-lg border border-amber-500/30 text-[11px]"
              >
                Reset & Bind to This Workstation
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8fa2b7]" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or username"
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#3f5267] focus:outline-none focus:border-[#85e510] focus:ring-1 focus:ring-[#85e510] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8fa2b7] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8fa2b7]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#3f5267] focus:outline-none focus:border-[#85e510] focus:ring-1 focus:ring-[#85e510] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#8fa2b7] pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#1e2e42] bg-[#0b1118] text-[#85e510] focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[#85e510] hover:underline font-semibold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#85e510] hover:bg-[#9bf028] text-[#062404] font-heading font-extrabold text-sm shadow-[0_0_25px_rgba(133,229,16,0.35)] transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
            </button>
          </form>
        </div>

        {/* Operating Role Quick Access (1-Click) */}
        <div className="mt-8 pt-6 border-t border-[#1e2e42]">
          <div className="text-[11px] font-semibold text-[#8fa2b7] uppercase tracking-wider mb-2.5 text-center">
            Sign In by Operating Role (Pre-Configured Credentials)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Sender */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[0])}
              className="p-2.5 rounded-xl bg-[#0b1118] hover:bg-white/[0.04] border border-[#1e2e42] hover:border-[#85e510]/50 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-[#85e510] font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#85e510]" />
                <span>Sender</span>
              </div>
              <div className="text-[10px] text-white font-bold truncate mt-0.5">miskrdires12</div>
              <div className="text-[9px] text-[#8fa2b7] font-mono truncate">sender123</div>
            </button>

            {/* Receiver */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[2])}
              className="p-2.5 rounded-xl bg-[#0b1118] hover:bg-white/[0.04] border border-[#1e2e42] hover:border-blue-400/50 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-blue-400 font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Receiver</span>
              </div>
              <div className="text-[10px] text-white font-bold truncate mt-0.5">yonatantesfa</div>
              <div className="text-[9px] text-[#8fa2b7] font-mono truncate">receiver123</div>
            </button>

            {/* Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[4])}
              className="p-2.5 rounded-xl bg-[#0b1118] hover:bg-white/[0.04] border border-[#1e2e42] hover:border-amber-400/50 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Admin</span>
              </div>
              <div className="text-[10px] text-white font-bold truncate mt-0.5">miskrdires1</div>
              <div className="text-[9px] text-[#8fa2b7] font-mono truncate">admin123</div>
            </button>

            {/* Super Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[6])}
              className="p-2.5 rounded-xl bg-[#0b1118] hover:bg-white/[0.04] border border-[#1e2e42] hover:border-purple-400/50 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-purple-400 font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Super Admin</span>
              </div>
              <div className="text-[10px] text-white font-bold truncate mt-0.5">miskrdires11</div>
              <div className="text-[9px] text-[#8fa2b7] font-mono truncate">admin123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
