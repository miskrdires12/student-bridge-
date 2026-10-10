import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4F7F5] text-[#202833] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-[#85E510] selection:text-[#062404]">
      {/* Subtle brand ambient accents */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#85E510]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#202833]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10 my-auto">
        <Outlet />
      </div>

      <footer className="mt-8 text-center text-xs text-[#64748B] relative z-10 flex items-center justify-center gap-1.5 font-medium">
        <span>Developed by</span>
        <span className="text-[#202833] font-black tracking-wide flex items-center gap-1">
          SILICON <span className="bg-[#85E510] text-[#062404] text-[9px] font-black px-1 py-0.2 rounded">LABS</span>
        </span>
        <span>&bull; StudentBridge Enterprise v2.0 &bull; Cloudflare Edge</span>
      </footer>
    </div>
  );
};
