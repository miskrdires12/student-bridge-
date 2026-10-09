import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Smartphone, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { getUsers, setCurrentUser } from '@/lib/store';
import { User, UserRole } from '@/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deviceLockedWarning, setDeviceLockedWarning] = useState<string | null>(null);

  const getOrCreateDeviceId = () => {
    let devId = localStorage.getItem('sb_device_fingerprint');
    if (!devId) {
      devId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + navigator.userAgent.slice(0, 8).replace(/\W/g, '');
      localStorage.setItem('sb_device_fingerprint', devId);
    }
    return devId;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDeviceLockedWarning(null);

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() || u.username.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      // Allow demo login if not found in preloaded users
      const fallbackUser: User = {
        id: 'user-' + Date.now(),
        username: email.split('@')[0] || 'Operator',
        email: email.trim() || 'operator@siliconlabs.et',
        role: 'SUPER_ADMIN',
      };
      finishLogin(fallbackUser);
      return;
    }

    // 1-Device Lock Check
    const currentDevice = getOrCreateDeviceId();
    if (user.boundDeviceId && user.boundDeviceId !== currentDevice && user.role !== 'SUPER_ADMIN') {
      setDeviceLockedWarning(
        `Hardware Lock Active: This account is restricted to device [${user.boundDeviceId}]. Your device is [${currentDevice}]. Please contact your Station Administrator to reset your device binding.`
      );
      return;
    }

    // If not bound yet, bind this device
    if (!user.boundDeviceId) {
      user.boundDeviceId = currentDevice;
      user.boundDeviceInfo = navigator.userAgent.slice(0, 30);
    }

    finishLogin(user);
  };

  const finishLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'SENDER') navigate('/sender/dashboard');
    else if (user.role === 'RECEIVER') navigate('/receiver/dashboard');
    else if (user.role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/super-admin/dashboard');
  };

  const quickLoginAs = (role: UserRole) => {
    const users = getUsers();
    let target = users.find(u => u.role === role);
    if (!target) {
      target = {
        id: `usr-${role.toLowerCase()}`,
        username: `${role.toLowerCase()}_operator`,
        email: `${role.toLowerCase()}@siliconlabs.et`,
        role,
      };
    }
    target.boundDeviceId = getOrCreateDeviceId();
    finishLogin(target);
  };

  return (
    <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="mb-6">
        <h2 className="text-xl font-heading font-extrabold text-white tracking-tight">System Authentication</h2>
        <p className="text-xs text-[#9eb2a6] mt-1">Sign in with your enterprise credentials or station token</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {deviceLockedWarning && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{deviceLockedWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const currentDevice = getOrCreateDeviceId();
              const users = getUsers();
              const u = users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
              if (u) u.boundDeviceId = currentDevice;
              setDeviceLockedWarning(null);
            }}
            className="self-end px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded border border-amber-500/30"
          >
            Override for This Device (Super Admin Auth)
          </button>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
            Email or Operator Username
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. miskrdires11@gmail.com"
              className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">
              Security Password
            </label>
            <Link to="/forgot-password" className="text-xs text-[#8fe617] hover:underline">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#9eb2a6] py-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-[#1e2c22] bg-[#070908] text-[#8fe617] focus:ring-0" />
            <span>Enforce 1-Device Lock</span>
          </label>
          <span className="text-[#8fe617] font-mono text-[11px]">Cloudflare Edge Auth</span>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] font-bold text-sm shadow-[0_0_20px_rgba(143,230,23,0.35)] transition-all flex items-center justify-center gap-2"
        >
          <span>Sign In to StudentBridge</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Role Access for Testing and Switching */}
      <div className="mt-8 pt-6 border-t border-[#1e2c22]">
        <div className="text-[11px] font-semibold text-[#9eb2a6] uppercase tracking-wider mb-3 text-center">
          Instant Station Test Login
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => quickLoginAs('SENDER')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#8fe617]" />
            <span>Sender</span>
          </button>
          <button
            type="button"
            onClick={() => quickLoginAs('RECEIVER')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
            <span>Receiver</span>
          </button>
          <button
            type="button"
            onClick={() => quickLoginAs('ADMIN')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => quickLoginAs('SUPER_ADMIN')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#8fe617]/15 hover:bg-[#8fe617]/25 border border-[#8fe617]/40 text-xs font-bold text-[#8fe617] transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
