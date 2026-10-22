import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { UserRole } from '@/types';
import { getCurrentUser, setCurrentUser, getOrCreateDeviceId } from '@/lib/store';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  const user = getCurrentUser();
  const deviceId = getOrCreateDeviceId();

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktopViewport(desktop);
      if (desktop) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleToggleSidebar = () => {
    if (!isDesktopViewport) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setDesktopSidebarOpen(prev => !prev);
    }
  };

  // If not logged in, redirect to login page immediately
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Workstation Device Lock Enforcement:
  if (user.boundDeviceId && user.boundDeviceId !== deviceId) {
    setCurrentUser(null);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Role Access Guard: Only guard super-admin routes for non-super admins
  if (location.pathname.startsWith('/super-admin') && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/receiver/students" replace />;
  }

  // Derive station from current path
  const getStationFromPath = (path: string): UserRole => {
    if (path.startsWith('/sender')) return 'SENDER';
    if (path.startsWith('/receiver')) return 'RECEIVER';
    if (path.startsWith('/admin')) return 'ADMIN';
    if (path.startsWith('/super-admin')) return 'SUPER_ADMIN';
    return user.role || 'SENDER';
  };

  const [currentStation, setCurrentStation] = useState<UserRole>(() => getStationFromPath(location.pathname));

  useEffect(() => {
    const station = getStationFromPath(location.pathname);
    setCurrentStation(station);
  }, [location.pathname]);

  const handleStationChange = (newStation: UserRole) => {
    setCurrentStation(newStation);
    if (newStation === 'SENDER') navigate('/sender/register');
    else if (newStation === 'RECEIVER') navigate('/receiver/dashboard');
    else if (newStation === 'ADMIN') navigate('/admin/dashboard');
    else if (newStation === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1118] text-[#0B1118] dark:text-[#F1F5F9] flex font-sans selection:bg-[#9EE617] selection:text-[#062404] w-full max-w-full transition-colors">
      {/* Role-Specific Persistent Sidebar */}
      <Sidebar
        currentStation={currentStation}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onClose={() => {
          setMobileSidebarOpen(false);
          setDesktopSidebarOpen(false);
        }}
        desktopOpen={desktopSidebarOpen}
      />

      {/* Main Content Area with Header */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen w-full max-w-full transition-colors ${desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <Header
          currentStation={currentStation}
          onStationChange={handleStationChange}
          onToggleMobileSidebar={handleToggleSidebar}
          isSidebarOpen={isDesktopViewport ? desktopSidebarOpen : mobileSidebarOpen}
        />

        <main className="flex-1 min-w-0 bg-[#F8FAFC] dark:bg-[#0B1118] p-3 sm:p-5 lg:p-6 overflow-y-auto overflow-x-hidden w-full max-w-full transition-colors">
          <div className="max-w-[1780px] mx-auto w-full overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
