import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// Auth Pages
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';

// Sender Pages (Strictly Register Student and Settings)
import { StudentRegistrationPage } from '@/features/sender/StudentRegistrationPage';
import { SenderSettingsPage } from '@/features/sender/SenderSettingsPage';

// Receiver Pages
import { ReceiverDashboardPage } from '@/features/receiver/ReceiverDashboardPage';
import { ReceiverStudentsPage } from '@/features/receiver/ReceiverStudentsPage';
import { ReceiverReviewPage } from '@/features/receiver/ReceiverReviewPage';
import { ReceiverIdProductionPage } from '@/features/receiver/ReceiverIdProductionPage';
import { MistakeAnalyzerPage } from '@/features/receiver/MistakeAnalyzerPage';
import { ReceiverExportsPage } from '@/features/receiver/ReceiverExportsPage';
import { ReceiverDatabasePage } from '@/features/receiver/ReceiverDatabasePage';
import { ReceiverSettingsPage } from '@/features/receiver/ReceiverSettingsPage';
import { ReceiverActivityPage } from '@/features/receiver/ReceiverActivityPage';

// Admin Pages
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminTasksPage } from '@/features/admin/AdminTasksPage';
import { AdminSendersPage } from '@/features/admin/AdminSendersPage';
import { AdminReviewsPage } from '@/features/admin/AdminReviewsPage';
import { AdminPerformancePage } from '@/features/admin/AdminPerformancePage';
import { AdminReportsPage } from '@/features/admin/AdminReportsPage';
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage';

// Super Admin Pages
import { SuperAdminDashboardPage } from '@/features/super-admin/SuperAdminDashboardPage';
import { SuperAdminUsersPage } from '@/features/super-admin/SuperAdminUsersPage';
import { SuperAdminDevicesPage } from '@/features/super-admin/SuperAdminDevicesPage';
import { SuperAdminSchoolsPage } from '@/features/super-admin/SuperAdminSchoolsPage';
import { SuperAdminTasksPage } from '@/features/super-admin/SuperAdminTasksPage';
import { SuperAdminReportsPage } from '@/features/super-admin/SuperAdminReportsPage';
import { SuperAdminIntegrationsPage } from '@/features/super-admin/SuperAdminIntegrationsPage';
import { DatabaseControlPage } from '@/features/super-admin/DatabaseControlPage';
import { SuperAdminStoragePage } from '@/features/super-admin/SuperAdminStoragePage';
import { AuditLogsPage } from '@/features/super-admin/AuditLogsPage';
import { SuperAdminSettingsPage } from '@/features/super-admin/SuperAdminSettingsPage';

import { getCurrentUser } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const RootRedirect: React.FC = () => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SENDER') return <Navigate to="/sender/register" replace />;
  if (user.role === 'RECEIVER') return <Navigate to="/receiver/dashboard" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/super-admin/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Authentication Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Root Redirect to Login if not authenticated, or to Role Station */}
          <Route path="/" element={<RootRedirect />} />

          {/* Operational Stations under Unified AppLayout */}
          <Route element={<AppLayout />}>
            {/* 1. Sender Workspace (Strictly Register Student and Settings) */}
            <Route path="/sender/register" element={<StudentRegistrationPage />} />
            <Route path="/sender/settings" element={<SenderSettingsPage />} />
            <Route path="/sender/*" element={<Navigate to="/sender/register" replace />} />

            {/* 2. Receiver Workspace */}
            <Route path="/receiver/dashboard" element={<ReceiverDashboardPage />} />
            <Route path="/receiver/students" element={<ReceiverStudentsPage />} />
            <Route path="/receiver/review" element={<ReceiverReviewPage />} />
            <Route path="/receiver/id-production" element={<ReceiverIdProductionPage />} />
            <Route path="/receiver/mistakes" element={<MistakeAnalyzerPage />} />
            <Route path="/receiver/exports" element={<ReceiverExportsPage />} />
            <Route path="/receiver/database" element={<ReceiverDatabasePage />} />
            <Route path="/receiver/settings" element={<ReceiverSettingsPage />} />
            <Route path="/receiver/activity" element={<ReceiverActivityPage />} />
            <Route path="/receiver/*" element={<Navigate to="/receiver/dashboard" replace />} />

            {/* 3. Admin Workspace */}
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/senders" element={<AdminSendersPage />} />
            <Route path="/admin/tasks" element={<AdminTasksPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/performance" element={<AdminPerformancePage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

            {/* 4. Super Admin Workspace */}
            <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
            <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
            <Route path="/super-admin/devices" element={<SuperAdminDevicesPage />} />
            <Route path="/super-admin/schools" element={<SuperAdminSchoolsPage />} />
            <Route path="/super-admin/tasks" element={<SuperAdminTasksPage />} />
            <Route path="/super-admin/reports" element={<SuperAdminReportsPage />} />
            <Route path="/super-admin/integrations" element={<SuperAdminIntegrationsPage />} />
            <Route path="/super-admin/database" element={<DatabaseControlPage />} />
            <Route path="/super-admin/storage" element={<SuperAdminStoragePage />} />
            <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/super-admin/settings" element={<SuperAdminSettingsPage />} />
            <Route path="/super-admin/*" element={<Navigate to="/super-admin/dashboard" replace />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
