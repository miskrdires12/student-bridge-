"use client";

// ============================================================================
// STUDENT BRIDGE — 8-UP A4 PRINT ENGINE & DRAGGABLE PHYSICAL IMPOSITION
// 90% White, 10% Black Monochrome Print Shop Design
// Features:
// - Interactive A4 Sheet (210 × 297mm) 8-Up Physical Imposition
// - Pick & Drag from Queue Selection directly into ANY slot on the A4 Sheet
// - Free movement: Drag cards between slots on the sheet to swap/reorder positions
// - Move controls, slot swapping, slot clearing, and auto-fill
// - Vector PDF output generation
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  Printer,
  Sliders,
  FileText,
  Loader2,
  Download,
  AlertCircle,
  Eye,
  Layers,
  GripVertical,
  Trash2,
  Plus,
} from "lucide-react";
import { generateStudentPdfAction } from "@/actions/print";
import {
  VisualCardDesigner,
  DEFAULT_FIELD_CONFIG,
} from "@/components/print-engine/VisualCardDesigner";
import type { CardFieldConfig } from "@/types/print";
import { subscribeToCloudSync } from "@/lib/sync-client";

export interface StudentProjection {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  department?: string | null;
  school?: string | null;
  phone: string;
  sex: string;
  rollNumber?: string | null;
  photoPath?: string | null;
  qrCodeData?: string | null;
}

interface PrintEngineClientProps {
  students: StudentProjection[];
  totalCount?: number;
}

export const PrintEngineClient: React.FC<PrintEngineClientProps> = ({ students, totalCount }) => {
  const [activeTab, setActiveTab] = useState<"imposition" | "designer">("imposition");
  const [displayStudents, setDisplayStudents] = useState<StudentProjection[]>(students);
  const [selectedQueueCard, setSelectedQueueCard] = useState<StudentProjection | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(students.map((s) => s.id))
  );

  // 8 Physical Imposition Slots on the A4 Sheet
  const [impositionSlots, setImpositionSlots] = useState<(StudentProjection | null)[]>(
    Array.from({ length: 8 }).map((_, idx) => students[idx] || null)
  );
  const [draggedStudent, setDraggedStudent] = useState<StudentProjection | null>(null);
  const [draggedFromSlotIndex, setDraggedFromSlotIndex] = useState<number | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [organizationName, setOrganizationName] = useState("STUDENT BRIDGE");
  const [customConfig, setCustomConfig] = useState<CardFieldConfig>(DEFAULT_FIELD_CONFIG);
  const [templateSvg, setTemplateSvg] = useState<string | null>(null);
  const [cardBgColor, setCardBgColor] = useState<string>("#FFFFFF");
  const [cardBorderColor, setCardBorderColor] = useState<string>("#000000");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize with authoritative cloud sync bus
  useEffect(() => {
    const loadStudents = async () => {
      const map = new Map<string, StudentProjection>();
      students.forEach((s) => map.set(s.studentId, s));

      try {
        const res = await fetch("/api/students/sync");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.students)) {
            data.students.forEach((s: any) => map.set(s.studentId, s));
          }
        }
      } catch {}

      const merged = Array.from(map.values());
      setDisplayStudents(merged);
      setSelectedIds(new Set(merged.map((s) => s.id)));
      setImpositionSlots((prev) => {
        if (prev.some(Boolean)) return prev;
        return Array.from({ length: 8 }).map((_, idx) => merged[idx] || null);
      });
    };

    loadStudents();
  }, [students]);

  // Real-time Cloud Sync Listener
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync((newStudent) => {
      setDisplayStudents((prev) => {
        const map = new Map<string, StudentProjection>();
        prev.forEach((s) => map.set(s.studentId, s));
        map.set(newStudent.studentId, newStudent);
        return Array.from(map.values());
      });
    });
    return () => unsubscribe();
  }, []);

  const selectedCount = selectedIds.size;
  const cardsPerPage = 8;
  const calculatedPages = Math.max(1, Math.ceil(selectedCount / cardsPerPage));

  const sampleStudent = students[0]
    ? {
        studentId: students[0].studentId,
        fullName: students[0].fullName,
        grade: students[0].grade,
        rollNumber: students[0].rollNumber || students[0].studentId,
        phone: students[0].phone,
        sex: students[0].sex,
        photoPath: students[0].photoPath,
      }
    : undefined;

  // ──────────────────────────────────────────────────────────────────────────
  // DRAG & DROP IMPOSITION HANDLERS (FAIL-SAFE JSON TRANSFER)
  // ──────────────────────────────────────────────────────────────────────────
  const handleQueueDragStart = (e: React.DragEvent, student: StudentProjection) => {
    setDraggedStudent(student);
    setDraggedFromSlotIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(student));
  };

  const handleSlotDragStart = (e: React.DragEvent, slotIdx: number) => {
    const student = impositionSlots[slotIdx];
    if (!student) return;
    setDraggedStudent(student);
    setDraggedFromSlotIndex(slotIdx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(student));
  };

  const handleSlotDragOver = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredSlotIndex !== slotIdx) {
      setHoveredSlotIndex(slotIdx);
    }
  };

  const handleSlotDrop = (targetSlotIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    setHoveredSlotIndex(null);

    let studentToPlace: StudentProjection | null = draggedStudent;
    if (!studentToPlace) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) studentToPlace = JSON.parse(raw);
      } catch {}
    }

    if (!studentToPlace) return;

    setImpositionSlots((prev) => {
      const next = [...prev];
      if (draggedFromSlotIndex !== null) {
        // Swap or move from another slot on the A4 sheet
        const existingAtTarget = next[targetSlotIdx];
        next[targetSlotIdx] = studentToPlace!;
        next[draggedFromSlotIndex] = existingAtTarget;
      } else {
        // Drop from Queue Selection
        next[targetSlotIdx] = studentToPlace!;
        setSelectedIds((s) => new Set(s).add(studentToPlace!.id));
      }
      return next;
    });

    setDraggedStudent(null);
    setDraggedFromSlotIndex(null);
  };

  // Tap-to-Place (Click card in queue, then click any slot to place/swap)
  const handleSlotClick = (slotIdx: number) => {
    if (selectedQueueCard) {
      setImpositionSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = selectedQueueCard;
        return next;
      });
      setSelectedIds((s) => new Set(s).add(selectedQueueCard.id));
      setSelectedQueueCard(null);
    }
  };

  const handleQueueCardClick = (student: StudentProjection) => {
    if (selectedQueueCard?.id === student.id) {
      setSelectedQueueCard(null);
    } else {
      setSelectedQueueCard(student);
    }
  };

  const handleClearSlot = (slotIdx: number) => {
    setImpositionSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  };

  const handleAutoFillSlots = () => {
    setImpositionSlots((prev) => {
      const next = [...prev];
      let stuIdx = 0;
      for (let i = 0; i < 8; i++) {
        if (!next[i] && stuIdx < displayStudents.length) {
          next[i] = displayStudents[stuIdx];
          stuIdx++;
        }
      }
      return next;
    });
  };

  const handleClearAllSlots = () => {
    setImpositionSlots(Array(8).fill(null));
  };

  const handleToggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(displayStudents.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Generate Vector PDF
  const handleGeneratePdf = async () => {
    // If slots are occupied, prioritize slots
    const activeSlotStudents = impositionSlots.filter(Boolean) as StudentProjection[];
    const idsToPrint =
      activeSlotStudents.length > 0
        ? activeSlotStudents.map((s) => s.id)
        : Array.from(selectedIds);

    if (idsToPrint.length === 0) {
      setErrorMessage("Please place at least one student onto the A4 sheet or select from queue.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await generateStudentPdfAction(idsToPrint, {
        includeCutMarks: includeCropMarks,
        organizationName,
        fieldConfig: customConfig,
        cardBackgroundColor: cardBgColor,
        cardBorderColor: cardBorderColor,
        templateSvg: templateSvg || undefined,
      });

      if (!res.success || !res.pdfBase64) {
        setErrorMessage(res.error ?? "Failed to generate ID PDF");
      } else {
        const binaryString = atob(res.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setGeneratedPdfUrl(url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF generation failed";
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 bg-transparent text-[#080808] dark:text-[#f2f7f4] min-h-screen">
      {/* View Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-[#dce7e1] dark:border-[#223126] pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("imposition")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === "imposition"
              ? "bg-[#8fe617] text-[#062404] shadow-[0_0_15px_rgba(143,230,23,0.3)]"
              : "border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] hover:border-[#8fe617]"
          }`}
        >
          <Printer className="h-4 w-4" />
          <span>8-Up A4 Imposition & PDF Generation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("designer")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === "designer"
              ? "bg-[#8fe617] text-[#062404] shadow-[0_0_15px_rgba(143,230,23,0.3)]"
              : "border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] hover:border-[#8fe617]"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Interactive Visual Template Designer</span>
        </button>
      </div>

      {/* TAB 1: VISUAL DESIGNER */}
      {activeTab === "designer" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 text-xs text-[#080808] dark:text-[#f2f7f4] flex items-center justify-between font-mono">
            <span>
              <strong className="text-[#8fe617]">Visual Layout Customizer:</strong> Move and resize photo, QR, and text coordinates for the print engine.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("imposition")}
              className="font-bold text-[#8fe617] hover:underline text-xs cursor-pointer"
            >
              Return to 8-Up Print Queue →
            </button>
          </div>

          <VisualCardDesigner
            initialConfig={customConfig}
            onConfigChange={(newCfg) => setCustomConfig(newCfg)}
            onTemplateChange={(svg, bg, border) => {
              setTemplateSvg(svg);
              setCardBgColor(bg);
              setCardBorderColor(border);
            }}
            sampleStudent={sampleStudent}
          />
        </div>
      )}

      {/* TAB 2: 8-UP A4 IMPOSITION WITH DRAG & DROP */}
      {activeTab === "imposition" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Interactive A4 Imposition Sheet */}
          <div className="lg:col-span-2 space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-800 dark:text-red-300 font-mono">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Imposition Metric Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-xs text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <span className="text-neutral-500 dark:text-[#8a9e93] uppercase text-[10px] font-bold">
                  Card Standard
                </span>
                <p className="font-bold text-[#080808] dark:text-[#f2f7f4] mt-0.5">CR80 (85.6 × 54mm)</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <span className="text-neutral-500 dark:text-[#8a9e93] uppercase text-[10px] font-bold">
                  Sheet Format
                </span>
                <p className="font-bold text-[#080808] dark:text-[#f2f7f4] mt-0.5">ISO A4 (210 × 297mm)</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <span className="text-neutral-500 dark:text-[#8a9e93] uppercase text-[10px] font-bold">
                  Sheet Density
                </span>
                <p className="font-bold text-[#8fe617] mt-0.5">
                  {impositionSlots.filter(Boolean).length} / 8 Placed
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                <span className="text-neutral-500 dark:text-[#8a9e93] uppercase text-[10px] font-bold">
                  Est. Sheet Run
                </span>
                <p className="font-bold text-[#080808] dark:text-[#f2f7f4] mt-0.5">
                  {calculatedPages} {calculatedPages === 1 ? "sheet" : "sheets"} ({(totalCount ?? students.length).toLocaleString()} cards)
                </p>
              </div>
            </div>

            {/* Visual A4 Sheet Simulation Canvas with Interactive Drag & Drop Slots */}
            <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-extrabold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-pulse" />
                    A4 SHEET (210 × 297mm) — 8-UP PHYSICAL IMPOSITION
                  </h2>
                  <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-0.5 font-mono">
                    Drag any student card from the Queue to a slot, or drag cards between slots to rearrange positions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFillSlots}
                    className="px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] transition-all cursor-pointer shadow-xs"
                  >
                    Auto-Fill 8 Slots
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllSlots}
                    className="px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/25 text-red-600 dark:text-red-400 hover:bg-red-100 transition-all cursor-pointer shadow-xs"
                  >
                    Clear Sheet
                  </button>
                </div>
              </div>

              {/* Scaled A4 Sheet representation */}
              <div className="mx-auto aspect-[210/297] max-w-md rounded-2xl border-2 border-dashed border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] p-4 shadow-xl relative flex flex-col justify-between">
                <div className="text-[9px] font-mono text-[#6b7771] dark:text-[#8a9e93] font-bold text-center">
                  A4 SHEET (210 × 297mm) — 8-UP PHYSICAL IMPOSITION
                </div>

                {/* 2 × 4 Card Grid Drop Zones */}
                <div className="grid grid-cols-2 grid-rows-4 gap-2.5 h-full my-2">
                  {impositionSlots.map((student, idx) => {
                    const isOccupied = !!student;
                    const isHovered = hoveredSlotIndex === idx;

                    return (
                      <div
                        key={idx}
                        draggable={isOccupied}
                        onDragStart={(e) => handleSlotDragStart(e, idx)}
                        onDragOver={(e) => handleSlotDragOver(e, idx)}
                        onDragLeave={() => setHoveredSlotIndex(null)}
                        onDrop={(e) => handleSlotDrop(idx, e)}
                        onClick={() => handleSlotClick(idx)}
                        className={`rounded-xl border text-[8px] p-2.5 flex flex-col justify-between transition-all relative select-none cursor-pointer ${
                          selectedQueueCard
                            ? "border-[#8fe617] ring-2 ring-[#8fe617] bg-[#8fe617]/10 animate-pulse"
                            : isHovered
                            ? "border-[#8fe617] ring-4 ring-[#8fe617]/25 bg-[#8fe617]/10 scale-[1.02]"
                            : isOccupied
                            ? "border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] shadow-xs cursor-grab active:cursor-grabbing hover:border-[#8fe617]"
                            : "border-dashed border-[#dce7e1] dark:border-[#223126] bg-white/60 dark:bg-[#111613]/40 text-[#6b7771] dark:text-[#8a9e93] hover:border-[#8fe617]"
                        }`}
                      >
                        {/* Slot Header */}
                        <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-1">
                          <span className="font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1">
                            {isOccupied && <GripVertical className="h-3 w-3 text-neutral-400" />}
                            SLOT #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[7px] font-mono text-[#6b7771] dark:text-[#8a9e93]">85.6mm</span>
                            {isOccupied && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearSlot(idx);
                                }}
                                className="h-3.5 w-3.5 text-neutral-400 hover:text-red-500 ml-1 transition-colors"
                                title="Remove from slot"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Content or Empty Dropzone */}
                        {isOccupied && student ? (
                          <div className="flex gap-2 items-center my-auto py-1">
                            <div className="h-8 w-6 shrink-0 rounded bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] flex items-center justify-center text-[7px] font-mono overflow-hidden">
                              {student.photoPath ? (
                                <img
                                  src={student.photoPath}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                "ID"
                              )}
                            </div>
                            <div className="min-w-0 truncate">
                              <div className="font-bold truncate text-[9px] text-[#080808] dark:text-[#f2f7f4]">
                                {student.fullName}
                              </div>
                              <div className="font-mono text-[7px] text-[#6b7771] dark:text-[#8a9e93]">
                                {student.studentId} • {student.grade}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-[#6b7771] dark:text-[#8a9e93] text-[8px] font-mono py-3">
                            <span className="font-bold">Drop Card Here</span>
                            <span className="text-[7px] opacity-75">(From Queue)</span>
                          </div>
                        )}

                        {/* Slot Footer & Crop Marks */}
                        <div className="flex items-center justify-between text-[7px] text-[#6b7771] dark:text-[#8a9e93] border-t border-[#eef5f1] dark:border-[#1c261e] pt-0.5 font-mono">
                          <span>CR80</span>
                          <span>54.0mm</span>
                        </div>

                        {/* Guillotine Crop Marks */}
                        {includeCropMarks && (
                          <>
                            <span className="absolute top-0 left-0 h-1.5 w-1.5 border-t border-l border-[#8fe617]" />
                            <span className="absolute top-0 right-0 h-1.5 w-1.5 border-t border-r border-[#8fe617]" />
                            <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-[#8fe617]" />
                            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-[#8fe617]" />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[8px] font-mono text-[#6b7771] dark:text-[#8a9e93] text-center">
                  Drag cards to swap slots • Precision corner crop marks rendered for trimming
                </div>
              </div>
            </div>

            {/* Generated PDF Download Banner */}
            {generatedPdfUrl && (
              <div className="rounded-2xl border border-[#8fe617] bg-[#8fe617]/10 p-5 shadow-lg flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8fe617] text-[#062404] font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-[#080808] dark:text-[#f2f7f4]">
                      8-Up A4 Print Sheet Ready
                    </h3>
                    <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">
                      Vector PDF ready with {impositionSlots.filter(Boolean).length || selectedCount} cards
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <a
                    href={generatedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617]"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </a>

                  <a
                    href={generatedPdfUrl}
                    download={`student-id-cards-8up-${Date.now()}.pdf`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#8fe617] px-4 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_15px_rgba(143,230,23,0.35)]"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Parameters & Draggable Student Queue Selector */}
          <div className="space-y-6">
            {/* Parameters Box */}
            <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#080808] dark:text-[#f2f7f4] font-extrabold">
                <Sliders className="h-4 w-4 text-[#8fe617]" />
                <span>Imposition Parameters</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-[#6b7771] dark:text-[#8a9e93] font-bold mb-1">Organization Header</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3">
                  <div>
                    <div className="font-bold text-[#080808] dark:text-[#f2f7f4]">Guillotine Cutting Marks</div>
                    <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                      Corner crop marks for physical trimming
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCropMarks}
                    onChange={(e) => setIncludeCropMarks(e.target.checked)}
                    className="rounded border-[#dce7e1] dark:border-[#223126] accent-[#8fe617] h-4 w-4 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#8fe617] py-3 px-4 text-xs font-mono font-black text-[#062404] uppercase tracking-wider hover:bg-[#7ecc10] shadow-[0_0_15px_rgba(143,230,23,0.35)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#062404]" />
                    <span>Rendering Vector PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>Generate A4 PDF ({impositionSlots.filter(Boolean).length || selectedCount})</span>
                  </>
                )}
              </button>
            </div>

            {/* Draggable Queue Selection (500/500) */}
            <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 space-y-3 shadow-sm font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase text-[#080808] dark:text-[#f2f7f4] font-extrabold">
                    Queue Selection ({selectedCount}/{displayStudents.length})
                  </span>
                  <p className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Drag card or tap to select, then tap any A4 sheet slot
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[#8fe617] hover:underline font-bold cursor-pointer"
                  >
                    All
                  </button>
                  <span className="text-[#6b7771] dark:text-[#8a9e93]">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[#6b7771] dark:text-[#8a9e93] hover:underline cursor-pointer"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Mobile / Tap Selection Banner */}
              {selectedQueueCard && (
                <div className="p-2.5 rounded-xl border-2 border-[#8fe617] bg-[#8fe617]/10 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-ping" />
                    <span className="text-[#080808] dark:text-[#f2f7f4] truncate">
                      Selected: <strong className="text-[#8fe617]">{selectedQueueCard.fullName}</strong> — Tap any slot on sheet
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedQueueCard(null)}
                    className="text-[11px] underline hover:text-red-500 shrink-0 ml-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Student draggable list */}
              <div className="max-h-96 overflow-y-auto space-y-1.5 divide-y divide-[#f0f5f2] dark:divide-[#162019] text-xs pr-1">
                {displayStudents.length === 0 ? (
                  <div className="text-center py-6 text-[#6b7771] dark:text-[#8a9e93] text-xs">
                    No student records in queue. Import students or enroll via sender.
                  </div>
                ) : (
                  displayStudents.map((s) => {
                    const checked = selectedIds.has(s.id);
                    const isPlaced = impositionSlots.some((slot) => slot?.id === s.id);
                    const isSelectedForTap = selectedQueueCard?.id === s.id;

                    return (
                      <div
                        key={s.id}
                        draggable={true}
                        onDragStart={(e) => handleQueueDragStart(e, s)}
                        onClick={() => handleQueueCardClick(s)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                          isSelectedForTap
                            ? "bg-[#8fe617]/15 border-2 border-[#8fe617] shadow-sm"
                            : isPlaced
                            ? "bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]"
                            : "hover:bg-[#f7faf9] dark:hover:bg-[#161d19] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleStudent(s.id)}
                            className="rounded h-3.5 w-3.5 accent-[#8fe617] cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <GripVertical className="h-4 w-4 text-neutral-400 shrink-0" />
                          <div className="h-6 w-6 rounded-lg bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126] flex items-center justify-center shrink-0 text-[8px] font-mono overflow-hidden">
                            {s.photoPath ? (
                              <img
                                src={s.photoPath}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "ID"
                            )}
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="font-bold text-[#080808] dark:text-[#f2f7f4] truncate">{s.fullName}</div>
                            <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                              {s.studentId} • {s.grade}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPlaced && (
                            <span className="text-[9px] font-bold text-[#062404] bg-[#8fe617] px-1.5 py-0.5 rounded-md">
                              ON SHEET
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const emptyIdx = impositionSlots.findIndex((slot) => slot === null);
                              if (emptyIdx !== -1) {
                                setImpositionSlots((prev) => {
                                  const next = [...prev];
                                  next[emptyIdx] = s;
                                  return next;
                                });
                              } else {
                                alert("All 8 slots on this sheet are occupied. Drag this card directly over any slot to swap or replace it.");
                              }
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19] hover:border-[#8fe617] text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                            title="Place into next available sheet slot"
                          >
                            <Plus className="h-3 w-3 text-[#8fe617]" />
                            <span>Slot</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
