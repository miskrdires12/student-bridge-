import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrintEngineClient } from "./client";

export default async function PrintEnginePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Server-side pagination: load first 500 active students for print preview.
  // Client-side pagination allows navigating through the full 20,000+ cohort.
  let students: any[] = [];
  let totalCount = 0;

  try {
    const results = await Promise.all([
      prisma.student.findMany({
        where: { status: "ACTIVE" },
        orderBy: { rollNumber: "asc" },
        take: 500, // Limit to first 500 for initial render
        select: {
          id: true,
          studentId: true,
          fullName: true,
          grade: true,
          department: true,
          school: true,
          phone: true,
          sex: true,
          rollNumber: true,
          photoPath: true,
          qrCodeData: true,
        },
      }),
      prisma.student.count({ where: { status: "ACTIVE" } }),
    ]);
    students = results[0];
    totalCount = results[1];
  } catch (err) {
    console.warn("[PrintEnginePage] Resilient fallback on student queries:", err);
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/bulker"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Bulker</span>
            </Link>
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              PRINT ENGINE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            8-Up A4 ID Card Imposition & Print Engine
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            High-performance vector PDF rendering engine with exact CR80 physical geometry (85.6mm × 53.98mm) and guillotine crop marks
          </p>
        </div>
      </div>

      <PrintEngineClient students={students} totalCount={totalCount} />
    </div>
  );
}
