import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SettingsClient } from "./client";

export const metadata = {
  title: "Station & Production Settings | SILICON LABS",
  description: "Workstation preferences for Sender intake, Receiver production, and Admin maintenance",
};

export default async function SettingsPage() {
  const session = await getSession();

  // If unauthenticated, redirect to login
  if (!session) {
    redirect("/login");
  }

  return <SettingsClient userRole={session.role} username={session.username} />;
}
