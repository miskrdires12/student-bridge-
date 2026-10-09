import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { UserRole } from '@/types';
import { getCurrentUser } from '@/lib/store';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Derive station from current path
  const getStationFromPath = (path: string): UserRole => {
    if (path.startsWith('/sender')) return 'SENDER';
    if (path.startsWith('/receiver')) return 'RECEIVER';
    if (path.startsWith('/admin')) return 'ADMIN';
    if (path.startsWith('/super-admin')) return 'SUPER_ADMIN';
    return 'SENDER';
  };

  const [currentStation, setCurrentStation] = useState<UserRole>(() => getStationFromPath(location.pathname));

  useEffect(() => {
    const station = getStationFromPath(location.pathname);
    setCurrentStation(station);
  }, [location.pathname]);

  const handleStationChange = (newStation: UserRole) => {
    setCurrentStation(newStation);
    if (newStation === 'SENDER') navigate('/sender/dashboard');
    else if (newStation === 'RECEIVER') navigate('/receiver/dashboard');
    else if (newStation === 'ADMIN') navigate('/admin/dashboard');
    else if (newStation === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#070908] text-[#f2f7f4] flex flex-col font-sans selection:bg-[#8fe617] selection:text-[#062404]">
      {/* Sticky Enterprise Header */}
      <Header
        currentStation={currentStation}
        onStationChange={handleStationChange}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      <div className="flex-1 flex">
        {/* Role-Specific Persistent Sidebar */}
        <Sidebar
          currentStation={currentStation}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#070908] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
