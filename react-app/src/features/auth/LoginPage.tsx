import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera, ArrowRight, Layers, Wifi, Mail, Lock, ShieldCheck,
  CheckCircle2, AlertCircle, Smartphone, User, Sparkles, Eye, EyeOff,
  Send, Inbox, Shield, Zap
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
      setError('Invalid account credentials. Please verify your email and password.');
      return;
    }

    // Check 1-Device Hardware Lock Policy
    if (user.boundDeviceId && user.boundDeviceId !== deviceId && user.role !== 'SUPER_ADMIN') {
      setLockedUser(user);
      setDeviceLockedWarning(
        `1-Device Policy Active: Account "${user.username}" is bound to terminal [${user.boundDeviceId}]. Current terminal is [${deviceId}]. Contact Super Admin or override below.`
      );
      return;
    }

    // If not locked yet, bind to current device
    if (!user.boundDeviceId) {
      setUserHardwareLock(user.id, deviceId);
      user.boundDeviceId = deviceId;
    }

    // Complete Login and redirect to authorized role station
    finishLogin(user);
  };

  const finishLogin = (user: UserType) => {
    setCurrentUser(user);
    if (user.role === 'SENDER') navigate('/sender/register');
    else if (user.role === 'RECEIVER') navigate('/receiver/dashboard');
    else if (user.role === 'ADMIN') navigate('/admin/dashboard');
    else if (user.role === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
    else navigate('/sender/register');
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
    <div className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
      {/* Left Panel: School Background Overlay + Silicon Labs Branding (5 cols) */}
      <div className="lg:col-span-5 bg-gradient-to-br from-[#161D26] via-[#202833] to-[#121A22] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Photographic Background Overlay */}
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop')"
          }}
        />
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#85E510]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#85E510]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <img
              src="/logo.png"
              alt="Silicon Labs"
              className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(133,229,16,0.4)]"
              onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
            />
            <div className="font-heading font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>SILICON</span>
              <span className="bg-[#85E510] text-[#062404] text-[9px] font-black px-1.5 py-0.5 rounded">LABS</span>
            </div>
          </div>
          <div className="text-[11px] text-[#85E510] font-semibold tracking-wide ml-10">
            we build modernity
          </div>

          <div className="mt-8">
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">StudentBridge</h1>
            <p className="text-sm font-semibold text-[#85E510] mt-1">
              Secure. Connected. Empowering Education.
            </p>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              Unified enterprise system for high-velocity student registration, biometric photo transfer, and comprehensive school record administration across all campuses.
            </p>
          </div>
        </div>

        {/* Small Visual Indicators for the 4 Stations */}
        <div className="relative z-10 my-8 space-y-2.5">
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#94A3B8] mb-1">
            Authoritative Stations
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-[#85E510]/20 flex items-center justify-center text-[#85E510]">
                <Send className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-none">Sender</div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">Registration & Photo</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Inbox className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-none">Receiver</div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">Directory & Exports</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-none">Admin</div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">Tasks & Performance</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-none">Super Admin</div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5">Global System Control</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="relative z-10 text-[11px] text-[#94A3B8] flex items-center gap-2 pt-2 border-t border-white/10">
          <ShieldCheck className="w-4 h-4 text-[#85E510] shrink-0" />
          <span>Server-side authorization on every protected API</span>
        </div>
      </div>

      {/* Right Panel: Clean White Sign-In Form (7 cols) */}
      <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white text-[#202833]">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Emblem"
                className="w-7 h-7 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
              />
              <span className="font-heading font-black text-xs text-[#202833] tracking-wider">SILICON LABS</span>
            </div>
            <span className="text-[11px] font-semibold text-[#64748B] bg-[#F4F7F5] px-2.5 py-1 rounded-full border border-[#E2E8F0]">
              Terminal: {deviceId.substring(0, 14)}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#202833] tracking-tight">Welcome Back</h2>
          <p className="text-xs text-[#64748B] mt-1">Please enter your authorized credentials to enter your station</p>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {deviceLockedWarning && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed">{deviceLockedWarning}</span>
              </div>
              <button
                type="button"
                onClick={handleOverrideDeviceLock}
                className="self-end px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-all shadow-sm"
              >
                Reset & Authorize This Device
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#202833] mb-1.5">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@siliconlabs.et"
                  className="w-full bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510] focus:ring-2 focus:ring-[#85E510]/30 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202833] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510] focus:ring-2 focus:ring-[#85E510]/30 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#202833] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                />
                <span className="font-medium text-[#202833]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[#4D8A07] hover:underline font-bold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-heading font-black text-sm shadow-[0_4px_15px_rgba(133,229,16,0.4)] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Sign In to Station</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Account Security Message */}
          <div className="mt-4 text-[11px] text-[#64748B] flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4D8A07]" />
            <span>Protected by 1-Device Policy and centralized audit logging</span>
          </div>
        </div>

        {/* Operating Role Quick Access (Pre-Configured Accounts) */}
        <div className="mt-8 pt-5 border-t border-[#E2E8F0]">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2.5 text-center">
            Authorized Station Accounts (1-Click Selection)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Sender */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[0])}
              className="p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#E2E8F0] hover:border-[#85E510] text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-[#4D8A07] font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#85E510]" />
                <span>Sender</span>
              </div>
              <div className="text-[11px] text-[#202833] font-bold truncate mt-0.5">miskrdires12</div>
              <div className="text-[10px] text-[#64748B] font-mono truncate">sender123</div>
            </button>

            {/* Receiver */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[2])}
              className="p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#E2E8F0] hover:border-blue-500 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-blue-600 font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Receiver</span>
              </div>
              <div className="text-[11px] text-[#202833] font-bold truncate mt-0.5">yonatantesfa</div>
              <div className="text-[10px] text-[#64748B] font-mono truncate">receiver123</div>
            </button>

            {/* Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[4])}
              className="p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#E2E8F0] hover:border-amber-500 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-amber-600 font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Admin</span>
              </div>
              <div className="text-[11px] text-[#202833] font-bold truncate mt-0.5">miskrdires1</div>
              <div className="text-[10px] text-[#64748B] font-mono truncate">admin123</div>
            </button>

            {/* Super Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin(PRESET_OPERATORS[6])}
              className="p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#E2E8F0] hover:border-purple-500 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-purple-600 font-black text-[11px] uppercase">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Super Admin</span>
              </div>
              <div className="text-[11px] text-[#202833] font-bold truncate mt-0.5">miskrdires11</div>
              <div className="text-[10px] text-[#64748B] font-mono truncate">admin123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
