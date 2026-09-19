"use client";

// ============================================================================
// STUDENT BRIDGE — BULKER MULTI-CARD PAGE LAYOUT & CANVA DROP ENGINE
// 90% White, 10% Black Monochrome Print Shop Design
// Features:
// - Dynamic Paper Size & Geometry: A4, A3, Letter, Legal with live physical scaling
// - Live Orientation (Portrait / Landscape) toggle with dynamic aspect-ratio resizing
// - Live Card Geometry (Width, Height, Bleed, Crop Marks) reflected in preview
// - Drop Canva template file (.png, .jpg, .svg, .json) directly to wrap bulk cards
// - Multi-card presets: 8-Up (2×4), 4-Up (2×2), 10-Up (2×5), 1-Up (1×1)
// - Navigation: [← Back to Canva Designer] and [Next: Launch 8-Up Print Engine →]
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Grid,
  Eye,
  ArrowLeft,
  ArrowRight,
  Upload,
} from "lucide-react";
import { getStudentsAction } from "@/actions/students";

export type UnitType = "mm" | "cm" | "in";

interface PageSizePreset {
  name: string;
  widthMm: number;
  heightMm: number;
}

const PAGE_PRESETS: Record<string, PageSizePreset> = {
  A4: { name: "A4 Standard (210 × 297 mm)", widthMm: 210, heightMm: 297 },
  A3: { name: "A3 Large Format (297 × 420 mm)", widthMm: 297, heightMm: 420 },
  LETTER: { name: "US Letter (215.9 × 279.4 mm)", widthMm: 215.9, heightMm: 279.4 },
  LEGAL: { name: "US Legal (215.9 × 355.6 mm)", widthMm: 215.9, heightMm: 355.6 },
};

export default function BulkerLayoutPage() {
  const router = useRouter();

  // Unit of Measurement
  const [unit, setUnit] = useState<UnitType>("mm");

  // Page geometry (stored in mm)
  const [pagePreset, setPagePreset] = useState<string>("A4");
  const [pageWidthMm, setPageWidthMm] = useState<number>(210);
  const [pageHeightMm, setPageHeightMm] = useState<number>(297);
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT");

  // Grid arrangement (Default 8 cards/page: 2 cols x 4 rows)
  const [columns, setColumns] = useState<number>(2);
  const [rows, setRows] = useState<number>(4);

  // Card Dimensions (Default CR80: 85.6mm x 53.98mm)
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6);
  const [cardHeightMm, setCardHeightMm] = useState<number>(53.98);

  // Finishing
  const [bleedMm, setBleedMm] = useState<number>(1.5);
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);

  // Canva Template State for Bulk cards
  const [canvaTemplateName, setCanvaTemplateName] = useState<string | null>(null);
  const [canvaTemplateBgUrl, setCanvaTemplateBgUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Sample students
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [sampleStudents, setSampleStudents] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStudentsAction({ pageSize: 10 }).then((res) => {
      if (res.students) {
        setSampleStudents(res.students);
      }
      if (res.pagination.totalCount !== undefined) {
        setTotalStudentsCount(res.pagination.totalCount);
      }
    });

    // Check if a template was forwarded from Canva Designer
    const activeTemplateStr =
      localStorage.getItem("sb_active_template") || localStorage.getItem("sb_canva_template");
    if (activeTemplateStr) {
      try {
        const parsed = JSON.parse(activeTemplateStr);
        setCanvaTemplateName(parsed.name || "Canva Studio Template");
        if (parsed.backgroundUrl) {
          setCanvaTemplateBgUrl(parsed.backgroundUrl);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Conversion Helpers
  const mmToUnit = (mm: number): number => {
    if (unit === "cm") return parseFloat((mm / 10).toFixed(2));
    if (unit === "in") return parseFloat((mm / 25.4).toFixed(3));
    return parseFloat(mm.toFixed(1));
  };

  const unitToMm = (val: number): number => {
    if (unit === "cm") return val * 10;
    if (unit === "in") return val * 25.4;
    return val;
  };

  const handleApplyPreset = (cols: number, r: number) => {
    setColumns(cols);
    setRows(r);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC PAPER SIZE & GEOMETRY HANDLER (FIXED)
  // ──────────────────────────────────────────────────────────────────────────
  const handlePagePresetChange = (presetKey: string) => {
    setPagePreset(presetKey);
    if (presetKey !== "CUSTOM") {
      const preset = PAGE_PRESETS[presetKey];
      if (orientation === "PORTRAIT") {
        setPageWidthMm(preset.widthMm);
        setPageHeightMm(preset.heightMm);
      } else {
        setPageWidthMm(preset.heightMm);
        setPageHeightMm(preset.widthMm);
      }
    }
  };

  const handleOrientationToggle = (newOrientation: "PORTRAIT" | "LANDSCAPE") => {
    if (newOrientation === orientation) return;
    setOrientation(newOrientation);
    // Swap width and height immediately
    const tempW = pageWidthMm;
    const tempH = pageHeightMm;
    setPageWidthMm(tempH);
    setPageHeightMm(tempW);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLE CANVA FILE DROP (PNG, JPG, SVG, JSON)
  // ──────────────────────────────────────────────────────────────────────────
  const processCanvaFile = (file: File) => {
    if (file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          setCanvaTemplateName(parsed.name || file.name);
          if (parsed.backgroundUrl) {
            setCanvaTemplateBgUrl(parsed.backgroundUrl);
          }
          localStorage.setItem("sb_active_template", JSON.stringify(parsed));
        } catch (err: any) {
          alert("Invalid Canva template JSON: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setCanvaTemplateName(file.name);
        setCanvaTemplateBgUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCanvaFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Calculations
  const cardsPerPage = columns * rows;
  const totalSheetsNeeded = Math.max(1, Math.ceil((totalStudentsCount || 8) / cardsPerPage));

  // Dynamic True-to-Scale Virtual Sheet Dimensions
  const containerMaxW = 460;
  const containerMaxH = 580;
  const sheetAspect = pageWidthMm / pageHeightMm;

  let sheetDisplayW: number;
  let sheetDisplayH: number;

  if (sheetAspect >= 1) {
    // Landscape Sheet
    sheetDisplayW = containerMaxW;
    sheetDisplayH = Math.round(containerMaxW / sheetAspect);
    if (sheetDisplayH > containerMaxH) {
      sheetDisplayH = containerMaxH;
      sheetDisplayW = Math.round(containerMaxH * sheetAspect);
    }
  } else {
    // Portrait Sheet
    sheetDisplayH = containerMaxH;
    sheetDisplayW = Math.round(containerMaxH * sheetAspect);
    if (sheetDisplayW > containerMaxW) {
      sheetDisplayW = containerMaxW;
      sheetDisplayH = Math.round(containerMaxW / sheetAspect);
    }
  }

  // Launch Print Engine
  const handleLaunchPrintEngine = () => {
    const params = new URLSearchParams({
      cols: String(columns),
      rows: String(rows),
      cardW: String(cardWidthMm),
      cardH: String(cardHeightMm),
      crop: showCropMarks ? "1" : "0",
      bleed: String(bleedMm),
    });
    router.push(`/print-engine?${params.toString()}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 bg-white text-black min-h-screen">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HEADER & NAVIGATION (90% WHITE, 10% BLACK)                                 */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/designer"
              className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-neutral-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Canva Designer</span>
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-mono text-black uppercase font-bold tracking-wider">
              BULKER PHYSICAL IMPOSITION
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-black flex items-center gap-2 mt-1">
            <Grid className="h-6 w-6 text-black stroke-[2.5]" />
            <span>Bulker Size & Page Layout Engine</span>
          </h1>
          <p className="text-xs text-neutral-600 mt-0.5">
            Configure physical paper size, orientation, multi-card imposition grid, bleed, and drop Canva template files
          </p>
        </div>

        {/* Action Controls & Units */}
        <div className="flex items-center gap-3">
          {/* Unit Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-neutral-100 p-1">
            {(["mm", "cm", "in"] as UnitType[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded px-3 py-1 text-xs font-mono uppercase transition-colors ${
                  unit === u
                    ? "bg-black text-white font-bold shadow-sm"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleLaunchPrintEngine}
            className="flex items-center gap-2 rounded-lg bg-black px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <span>Launch 8-Up Print Engine</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CANVA TEMPLATE BULK DROPZONE                                               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDragOver
            ? "border-black bg-neutral-100"
            : "border-neutral-300 bg-neutral-50 hover:border-black"
        }`}
      >
        <div className="flex items-center gap-3.5 text-left">
          <div className="h-10 w-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
            <Upload className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-black uppercase font-mono tracking-wide">
              {canvaTemplateName ? `Active Canva Template: ${canvaTemplateName}` : "Drop Canva File To Bulk"}
            </div>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              Drag & drop your Canva card export (.png, .jpg, .svg, .json) here to wrap all cards on the virtual sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canvaTemplateBgUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCanvaTemplateBgUrl(null);
                setCanvaTemplateName(null);
              }}
              className="px-3 py-1.5 rounded border border-neutral-300 bg-white text-xs text-neutral-700 hover:text-black font-mono"
            >
              Clear Template
            </button>
          )}
          <span className="px-3.5 py-1.5 rounded bg-black text-xs font-mono font-bold text-white shadow-sm">
            Browse File
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processCanvaFile(file);
          }}
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2-COLUMN LAYOUT: SETTINGS & DYNAMIC TRUE-TO-SCALE SHEET PREVIEW            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inspector: Multi-Card Grid, Paper Geometry, Dimensions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Cards Per Sheet Preset */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-black font-mono">
                1. Cards Per Sheet Preset
              </h2>
              <span className="text-[11px] font-mono text-black font-bold">
                {cardsPerPage} CARDS / SHEET
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "8-Up (2×4)", desc: "Production Standard", cols: 2, r: 4 },
                { label: "4-Up (2×2)", desc: "Quad Grid", cols: 2, r: 2 },
                { label: "10-Up (2×5)", desc: "Dense A4 Grid", cols: 2, r: 5 },
                { label: "1-Up (1×1)", desc: "Single Card", cols: 1, r: 1 },
                { label: "2-Up (1×2)", desc: "Dual Card", cols: 1, r: 2 },
                { label: "6-Up (2×3)", desc: "Compact", cols: 2, r: 3 },
              ].map((p) => {
                const isActive = columns === p.cols && rows === p.r;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p.cols, p.r)}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      isActive
                        ? "border-black bg-black text-white font-bold"
                        : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-black hover:bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div
                      className={`text-[9px] truncate ${
                        isActive ? "text-neutral-300" : "text-neutral-500"
                      }`}
                    >
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Cols / Rows Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-neutral-700 font-mono font-semibold mb-1">
                  Columns:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-700 font-mono font-semibold mb-1">
                  Rows:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Paper Size & Geometry (FULLY DYNAMIC) */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-black font-mono">
                2. Paper Size & Geometry
              </h2>
              <span className="text-[10px] font-mono text-neutral-500 font-semibold">
                {pageWidthMm} × {pageHeightMm} mm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-700 font-mono font-semibold mb-1">
                  Paper Preset:
                </label>
                <select
                  value={pagePreset}
                  onChange={(e) => handlePagePresetChange(e.target.value)}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                >
                  <option value="A4">A4 Standard (210 × 297 mm)</option>
                  <option value="A3">A3 Large Format (297 × 420 mm)</option>
                  <option value="LETTER">US Letter (8.5 × 11 in)</option>
                  <option value="LEGAL">US Legal (8.5 × 14 in)</option>
                  <option value="CUSTOM">Custom Dimensions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-700 font-mono font-semibold mb-1">
                  Orientation:
                </label>
                <div className="flex rounded border border-neutral-300 bg-neutral-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleOrientationToggle("PORTRAIT")}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      orientation === "PORTRAIT"
                        ? "bg-black text-white shadow-xs"
                        : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationToggle("LANDSCAPE")}
                    className={`flex-1 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      orientation === "LANDSCAPE"
                        ? "bg-black text-white shadow-xs"
                        : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Width & Height if Custom selected */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-neutral-700 font-mono mb-1">
                  Sheet Width ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={mmToUnit(pageWidthMm)}
                  onChange={(e) => {
                    setPagePreset("CUSTOM");
                    setPageWidthMm(unitToMm(parseFloat(e.target.value) || 210));
                  }}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-700 font-mono mb-1">
                  Sheet Height ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={mmToUnit(pageHeightMm)}
                  onChange={(e) => {
                    setPagePreset("CUSTOM");
                    setPageHeightMm(unitToMm(parseFloat(e.target.value) || 297));
                  }}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>
            </div>

            {/* Card Dimensions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <div>
                <label className="block text-xs text-neutral-700 font-mono mb-1">
                  Card Width ({unit}):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mmToUnit(cardWidthMm)}
                  onChange={(e) => setCardWidthMm(unitToMm(parseFloat(e.target.value) || 85.6))}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-700 font-mono mb-1">
                  Card Height ({unit}):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mmToUnit(cardHeightMm)}
                  onChange={(e) => setCardHeightMm(unitToMm(parseFloat(e.target.value) || 53.98))}
                  className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black focus:bg-white"
                />
              </div>
            </div>

            {/* Bleed & Crop Marks Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cropMarksCheck"
                  checked={showCropMarks}
                  onChange={(e) => setShowCropMarks(e.target.checked)}
                  className="accent-black h-4 w-4 rounded cursor-pointer"
                />
                <label htmlFor="cropMarksCheck" className="text-xs text-black font-mono font-medium cursor-pointer">
                  Render Cutting Crop Marks
                </label>
              </div>

              <div className="flex items-center gap-1 text-xs font-mono text-neutral-700">
                <span>Bleed:</span>
                <input
                  type="number"
                  step="0.5"
                  value={mmToUnit(bleedMm)}
                  onChange={(e) => setBleedMm(unitToMm(parseFloat(e.target.value) || 1.5))}
                  className="w-14 rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-xs text-black font-mono"
                />
                <span>{unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspector: DYNAMIC TRUE-TO-SCALE VIRTUAL SHEET PREVIEW (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-black" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-black font-mono">
                  True-to-Scale Virtual Sheet Simulation
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-600">
                <span className="font-bold text-black">{pagePreset}</span>
                <span>•</span>
                <span>{orientation}</span>
                <span>•</span>
                <span>{pageWidthMm} × {pageHeightMm} mm</span>
              </div>
            </div>

            {/* Virtual Scaled Sheet Stage (Dynamically Sized to Exact Aspect Ratio) */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className="flex items-center justify-center p-8 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 min-h-[520px] transition-all"
            >
              {/* Virtual Sheet Container with Dynamic Width & Height */}
              <div
                style={{
                  width: `${sheetDisplayW}px`,
                  height: `${sheetDisplayH}px`,
                  transition: "width 0.3s ease, height 0.3s ease",
                }}
                className="relative rounded border-2 border-neutral-300 bg-white shadow-xl p-3.5 flex flex-col justify-between"
              >
                {/* Sheet Physical Label */}
                <div className="flex items-center justify-between text-[7px] font-mono text-neutral-500 uppercase pb-1 border-b border-neutral-100">
                  <span>{pagePreset} ({pageWidthMm} × {pageHeightMm} mm)</span>
                  <span>{columns} × {rows} GRID ({cardsPerPage} CARDS)</span>
                </div>

                {/* Multi-Card Imposition Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    gap: "6px",
                  }}
                  className="h-full w-full py-1.5"
                >
                  {Array.from({ length: cardsPerPage }).map((_, idx) => (
                    <div
                      key={idx}
                      className="relative rounded border border-neutral-300 bg-white overflow-hidden flex flex-col justify-between p-1.5 shadow-xs transition-all hover:border-black"
                      style={{
                        backgroundImage: canvaTemplateBgUrl ? `url(${canvaTemplateBgUrl})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* Mini Card Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[6px] font-mono font-bold text-black bg-white/90 px-1 rounded border border-neutral-200">
                          ID CARD #{idx + 1}
                        </span>
                        <span className="text-[5px] font-mono text-neutral-600 bg-white/90 px-1 rounded">
                          {cardWidthMm}×{cardHeightMm}mm
                        </span>
                      </div>

                      {/* Mini Card Body */}
                      <div className="flex items-center gap-1.5 my-auto bg-white/80 p-1 rounded border border-neutral-100 backdrop-blur-xs">
                        <div className="h-6 w-5 rounded bg-neutral-200 border border-neutral-300 shrink-0 flex items-center justify-center text-[5px] text-neutral-700 font-mono font-bold">
                          {sampleStudents[idx]?.photoPath ? (
                            <img
                              src={sampleStudents[idx].photoPath}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            "Photo"
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-[7px] font-bold text-black truncate">
                            {sampleStudents[idx]?.fullName || `Student Slot #${idx + 1}`}
                          </div>
                          <div className="text-[5px] font-mono text-neutral-600">
                            {sampleStudents[idx]?.studentId || `STU-00${idx + 1}`}
                          </div>
                        </div>
                      </div>

                      {/* Guillotine Crop Marks */}
                      {showCropMarks && (
                        <>
                          <span className="absolute top-0 left-0 h-1.5 w-1.5 border-t-2 border-l-2 border-black" />
                          <span className="absolute top-0 right-0 h-1.5 w-1.5 border-t-2 border-r-2 border-black" />
                          <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b-2 border-l-2 border-black" />
                          <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b-2 border-r-2 border-black" />
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cutting Bleed Note */}
                <div className="text-[7px] font-mono text-neutral-500 text-center pt-1 border-t border-neutral-100">
                  {showCropMarks ? `Crop marks active • Bleed: ${bleedMm} mm` : "Crop marks disabled"}
                </div>
              </div>
            </div>

            {/* Production Sheet Mathematics */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs border-t border-neutral-100 font-mono">
              <div className="rounded bg-neutral-50 border border-neutral-200 p-2.5">
                <span className="text-neutral-500 block text-[10px]">Cards Per Sheet:</span>
                <strong className="text-sm font-bold text-black">{cardsPerPage}</strong>
              </div>

              <div className="rounded bg-neutral-50 border border-neutral-200 p-2.5">
                <span className="text-neutral-500 block text-[10px]">Total Production:</span>
                <strong className="text-sm font-bold text-black">
                  {totalStudentsCount > 0 ? totalStudentsCount.toLocaleString() : "Custom Batch"}
                </strong>
              </div>

              <div className="rounded bg-neutral-50 border border-neutral-200 p-2.5">
                <span className="text-neutral-500 block text-[10px]">Sheets Required:</span>
                <strong className="text-sm font-bold text-black">
                  {totalSheetsNeeded} Sheets
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
