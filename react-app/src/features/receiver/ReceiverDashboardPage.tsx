import React from "react";
import { AdminDashboardPage } from "@/features/admin/AdminDashboardPage";

export const ReceiverDashboardPage: React.FC = () => (
  <AdminDashboardPage
    title="Receiver Dashboard"
    subtitle="Print-desk view of the same server snapshot the Fleet and Velocity screens read — registry, photo coverage and branch throughput always agree."
  />
);

export default ReceiverDashboardPage;
