import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b1118] text-[#f2f7f4] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#85e510] selection:text-[#062404]">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#85e510]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#60a5fa]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10">
        <Outlet />
      </div>

      <div className="mt-8 text-center text-xs text-[#8fa2b7]/60 relative z-10 flex items-center justify-center gap-1.5 font-medium">
        <span>Powered by</span>
        <span className="text-[#85e510] font-black tracking-wide">SILICON LABS</span>
        <span>&bull; StudentBridge Enterprise v2.0</span>
      </div>
    </div>
  );
};
