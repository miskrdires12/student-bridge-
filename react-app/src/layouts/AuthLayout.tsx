import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070908] text-[#f2f7f4] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-[#8fe617] selection:text-[#062404]">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#8fe617]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#60a5fa]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Watermark / Header */}
      <div className="mb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-3 mb-2">
          <img
            src="/logo.png"
            alt="Silicon Labs Logo"
            className="w-12 h-12 object-contain drop-shadow-[0_2px_12px_rgba(143,230,23,0.5)]"
            onError={(e) => { (e.target as HTMLImageElement).src = '/brand-logo.png'; }}
          />
          <div className="text-left">
            <div className="font-heading font-black text-2xl tracking-tight text-white flex items-center gap-1.5">
              SILICON <span className="bg-[#8fe617] text-[#062404] text-xs font-black px-2 py-0.5 rounded tracking-wide">LABS</span>
            </div>
            <div className="text-xs font-semibold text-[#8fe617] tracking-wider uppercase">StudentBridge Platform</div>
          </div>
        </div>
        <p className="text-xs text-[#9eb2a6] font-medium tracking-wide">
          Enterprise Student Data Management & Edge Infrastructure
        </p>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-[#9eb2a6]/70 relative z-10">
        &copy; {new Date().getFullYear()} Silicon Labs Ethiopia &bull; StudentBridge v2.0 Cloudflare Edition
      </div>
    </div>
  );
};
