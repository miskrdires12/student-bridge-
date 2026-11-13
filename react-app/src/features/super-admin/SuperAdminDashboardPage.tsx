import React from "react";
import { AdminDashboardPage } from "@/features/admin/AdminDashboardPage";

export const SuperAdminDashboardPage: React.FC = () => (
  <AdminDashboardPage
    title="Super Admin Dashboard"
    subtitle="Full-network view of the server snapshot — counters, chart and branch table all reconcile to the same registry of record."
  />
);

export default SuperAdminDashboardPage;
