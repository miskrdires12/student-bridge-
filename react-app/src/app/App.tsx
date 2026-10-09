import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// Auth Pages
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';

// Sender Pages
import { SenderDashboardPage } from '@/features/sender/SenderDashboardPage';
import { StudentRegistrationPage } from '@/features/sender/StudentRegistrationPage';
import { SenderStudentsPage } from '@/features/sender/SenderStudentsPage';
import { SenderTasksPage } from '@/features/sender/SenderTasksPage';
import { SenderPerformancePage } from '@/features/sender/SenderPerformancePage';
import { SenderProfilePage } from '@/features/sender/SenderProfilePage';

// Receiver Pages
import { ReceiverDashboardPage } from '@/features/receiver/ReceiverDashboardPage';
import { ReceiverStudentsPage } from '@/features/receiver/ReceiverStudentsPage';
import { ReceiverReviewPage } from '@/features/receiver/ReceiverReviewPage';
import { MistakeAnalyzerPage } from '@/features/receiver/MistakeAnalyzerPage';
import { ReceiverExportsPage } from '@/features/receiver/ReceiverExportsPage';
import { ReceiverActivityPage } from '@/features/receiver/ReceiverActivityPage';

// Admin Pages
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminTasksPage } from '@/features/admin/AdminTasksPage';
import { AdminSendersPage } from '@/features/admin/AdminSendersPage';
import { AdminReviewsPage } from '@/features/admin/AdminReviewsPage';
import { AdminPerformancePage } from '@/features/admin/AdminPerformancePage';
import { AdminReportsPage } from '@/features/admin/AdminReportsPage';

// Super Admin Pages
import { SuperAdminDashboardPage } from '@/features/super-admin/SuperAdminDashboardPage';
import { SuperAdminUsersPage } from '@/features/super-admin/SuperAdminUsersPage';
import { SuperAdminRolesPage } from '@/features/super-admin/SuperAdminRolesPage';
import { SuperAdminSchoolsPage } from '@/features/super-admin/SuperAdminSchoolsPage';
import { SuperAdminTasksPage } from '@/features/super-admin/SuperAdminTasksPage';
import { SuperAdminIntegrationsPage } from '@/features/super-admin/SuperAdminIntegrationsPage';
import { DatabaseControlPage } from '@/features/super-admin/DatabaseControlPage';
import { AuditLogsPage } from '@/features/super-admin/AuditLogsPage';
import { SuperAdminSettingsPage } from '@/features/super-admin/SuperAdminSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

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

          {/* Root Redirect to Sender Dashboard */}
          <Route path="/" element={<Navigate to="/sender/dashboard" replace />} />

          {/* Operational Stations under Unified AppLayout */}
          <Route element={<AppLayout />}>
            {/* 1. Sender Workspace */}
            <Route path="/sender/dashboard" element={<SenderDashboardPage />} />
            <Route path="/sender/register" element={<StudentRegistrationPage />} />
            <Route path="/sender/students" element={<SenderStudentsPage />} />
            <Route path="/sender/tasks" element={<SenderTasksPage />} />
            <Route path="/sender/performance" element={<SenderPerformancePage />} />
            <Route path="/sender/profile" element={<SenderProfilePage />} />

            {/* 2. Receiver Workspace */}
            <Route path="/receiver/dashboard" element={<ReceiverDashboardPage />} />
            <Route path="/receiver/students" element={<ReceiverStudentsPage />} />
            <Route path="/receiver/review" element={<ReceiverReviewPage />} />
            <Route path="/receiver/mistakes" element={<MistakeAnalyzerPage />} />
            <Route path="/receiver/exports" element={<ReceiverExportsPage />} />
            <Route path="/receiver/activity" element={<ReceiverActivityPage />} />

            {/* 3. Admin Workspace */}
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/tasks" element={<AdminTasksPage />} />
            <Route path="/admin/senders" element={<AdminSendersPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/performance" element={<AdminPerformancePage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />

            {/* 4. Super Admin Workspace */}
            <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
            <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
            <Route path="/super-admin/roles" element={<SuperAdminRolesPage />} />
            <Route path="/super-admin/schools" element={<SuperAdminSchoolsPage />} />
            <Route path="/super-admin/tasks" element={<SuperAdminTasksPage />} />
            <Route path="/super-admin/integrations" element={<SuperAdminIntegrationsPage />} />
            <Route path="/super-admin/database" element={<DatabaseControlPage />} />
            <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/super-admin/settings" element={<SuperAdminSettingsPage />} />
          </Route>

          {/* Catch-all Wildcard Route */}
          <Route path="*" element={<Navigate to="/sender/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
