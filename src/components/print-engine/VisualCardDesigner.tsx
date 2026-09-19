"use client";

// ============================================================================
// STUDENT BRIDGE — COMPREHENSIVE VISUAL CARD DESIGNER & EPS/SVG STUDIO
// Allows operators to visually drag, position, and resize the photo, QR code,
// and text fields, import EPS/SVG vector files, edit vector source code directly,
// and preview with live student data.
// ============================================================================

import React, { useState, useRef } from "react";
import {
  Maximize2,
  Upload,
  Save,
  RotateCcw,
  Check,
  QrCode,
  Image as ImageIcon,
  FileCode,
  Layers,
  Code2,
  Sparkles,
  Move,
} from "lucide-react";
import type { CardFieldConfig, CardElementBox } from "@/types/print";
import { convertVectorTemplateToSvg } from "@/lib/eps-converter";
import { saveCardTemplateAction } from "@/actions/import";

// Default template field configuration matching CR80 standard (scaled for 340x214 canvas)
export const DEFAULT_FIELD_CONFIG: CardFieldConfig = {
  photo: { x: 14, y: 38, width: 72, height: 96, label: "Student Photo" },
  qr: { x: 254, y: 110, size: 60, label: "QR Code" },
  fullName: { x: 96, y: 44, fontSize: 13, color: "#000000", label: "Name" },
  studentId: { x: 96, y: 64, fontSize: 10, color: "#000000", label: "Student ID" },
  grade: { x: 96, y: 82, fontSize: 9, color: "#525252", label: "Grade" },
  rollNumber: { x: 190, y: 82, fontSize: 9, color: "#525252", label: "Roll Number" },
  phone: { x: 96, y: 100, fontSize: 8.5, color: "#525252", label: "Phone" },
  sex: { x: 96, y: 118, fontSize: 8.5, color: "#525252", label: "Gender" },
};

// Built-in professional vector templates (90% White, 10% Black Monochromatic)
const VECTOR_PRESETS: Array<{
  name: string;
  bgColor: string;
  borderColor: string;
  svg: string;
}> = [
  {
    name: "Minimalist Monochrome (Default)",
    bgColor: "#FFFFFF",
    borderColor: "#000000",
    svg: `<svg viewBox="0 0 340 214" width="340" height="214" xmlns="http://www.w3.org/2000/svg">
  <rect width="340" height="214" rx="10" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <rect x="0" y="0" width="340" height="34" rx="10" fill="#000000"/>
  <line x1="0" y1="34" x2="340" y2="34" stroke="#000000" stroke-width="1.5"/>
  <circle cx="318" cy="17" r="4" fill="#FFFFFF"/>
  <path d="M 0 190 L 340 190" stroke="#E5E7EB" stroke-width="1"/>
  <rect x="0" y="194" width="340" height="20" fill="#F9FAFB"/>
  <text x="14" y="21" fill="#FFFFFF" font-family="monospace" font-size="10" font-weight="bold">STUDENT BRIDGE</text>
  <text x="220" y="21" fill="#D1D5DB" font-family="sans-serif" font-size="7" font-weight="bold">OFFICIAL ID</text>
  <text x="14" y="207" fill="#6B7280" font-family="monospace" font-size="6">CR80 VERIFIED • 8-UP PHYSICAL IMPOSITION</text>
</svg>`,
  },
  {
    name: "Executive Bordered White",
    bgColor: "#FFFFFF",
    borderColor: "#262626",
    svg: `<svg viewBox="0 0 340 214" width="340" height="214" xmlns="http://www.w3.org/2000/svg">
  <rect width="340" height="214" rx="10" fill="#FFFFFF" stroke="#262626" stroke-width="2"/>
  <line x1="14" y1="34" x2="326" y2="34" stroke="#000000" stroke-width="1.5"/>
  <text x="14" y="24" fill="#000000" font-family="sans-serif" font-size="11" font-weight="bold">ACADEMIC CREDENTIAL</text>
  <line x1="94" y1="38" x2="94" y2="185" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="14" y="206" fill="#737373" font-family="sans-serif" font-size="6">ACCREDITED INSTITUTIONAL IDENTIFICATION</text>
</svg>`,
  },
  {
    name: "Modern Minimal Line",
    bgColor: "#FFFFFF",
    borderColor: "#000000",
    svg: `<svg viewBox="0 0 340 214" width="340" height="214" xmlns="http://www.w3.org/2000/svg">
  <rect width="340" height="214" rx="10" fill="#FFFFFF" stroke="#000000" stroke-width="1"/>
  <rect x="14" y="14" width="312" height="186" rx="6" fill="none" stroke="#E5E7EB" stroke-width="1"/>
  <text x="24" y="28" fill="#000000" font-family="sans-serif" font-size="9" font-weight="bold">INSTITUTE IDENTIFICATION</text>
  <text x="24" y="206" fill="#737373" font-family="sans-serif" font-size="6">CR80 SECURE PASS</text>
</svg>`,
  },
  {
    name: "Deep Inverted Monochrome",
    bgColor: "#000000",
    borderColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 340 214" width="340" height="214" xmlns="http://www.w3.org/2000/svg">
  <rect width="340" height="214" rx="10" fill="#000000" stroke="#FFFFFF" stroke-width="2"/>
  <rect x="0" y="0" width="340" height="34" rx="10" fill="#171717"/>
  <line x1="0" y1="34" x2="340" y2="34" stroke="#FFFFFF" stroke-width="1.5"/>
  <text x="14" y="21" fill="#FFFFFF" font-family="monospace" font-size="10" font-weight="bold">STUDENT BRIDGE</text>
  <text x="14" y="206" fill="#A3A3A3" font-family="monospace" font-size="6">CR80 PHOTO ID SPECIFICATION</text>
</svg>`,
  },
];

interface VisualCardDesignerProps {
  initialConfig?: CardFieldConfig;
  onConfigChange?: (config: CardFieldConfig) => void;
  onTemplateChange?: (svg: string, bgColor: string, borderColor: string) => void;
  sampleStudent?: {
    studentId: string;
    fullName: string;
    grade: string;
    rollNumber: string;
    phone: string;
    sex: string;
    photoPath?: string | null;
  };
}

export const VisualCardDesigner: React.FC<VisualCardDesignerProps> = ({
  initialConfig = DEFAULT_FIELD_CONFIG,
  onConfigChange,
  onTemplateChange,
  sampleStudent = {
    studentId: "SB-2026-0001",
    fullName: "ALEXANDRIA VANCE",
    grade: "Grade 12-A",
    rollNumber: "R-101",
    phone: "+1 (555) 234-5678",
    sex: "Female",
    photoPath: null,
  },
}) => {
  const [config, setConfig] = useState<CardFieldConfig>(initialConfig);
  const [activeElement, setActiveElement] = useState<keyof CardFieldConfig>("photo");
  const [templateSvg, setTemplateSvg] = useState<string>(VECTOR_PRESETS[0].svg);
  const [cardBgColor, setCardBgColor] = useState<string>(VECTOR_PRESETS[0].bgColor);
  const [cardBorderColor, setCardBorderColor] = useState<string>(VECTOR_PRESETS[0].borderColor);
  const [vectorOpacity, setVectorOpacity] = useState<number>(100);
  const [templateName, setTemplateName] = useState("Custom Enterprise Layout");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Direct Vector Code Editor state
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editableSvgCode, setEditableSvgCode] = useState<string>(VECTOR_PRESETS[0].svg);
  const [codeEditorError, setCodeEditorError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingPhotoRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, elemX: 0, elemY: 0, startW: 0, startH: 0 });

  // Standard CR80 canvas aspect: 340px width × 214px height
  const CANVAS_WIDTH = 340;
  const CANVAS_HEIGHT = 214;

  const updateElement = (
    elementKey: keyof CardFieldConfig,
    patch: Partial<CardElementBox>
  ) => {
    const updated = {
      ...config,
      [elementKey]: {
        ...config[elementKey],
        ...patch,
      },
    };
    setConfig(updated);
    onConfigChange?.(updated);
  };

  /**
   * Handles dragging elements on the canvas
   */
  const handleMouseDown = (
    e: React.MouseEvent,
    elementKey: keyof CardFieldConfig
  ) => {
    e.stopPropagation();
    setActiveElement(elementKey);
    isDraggingRef.current = true;

    const currentElem = config[elementKey];
    if (!currentElem) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elemX: currentElem.x,
      elemY: currentElem.y,
      startW: currentElem.width ?? 72,
      startH: currentElem.height ?? 96,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;

      const newX = Math.max(0, Math.min(CANVAS_WIDTH - 20, Math.round(dragStartRef.current.elemX + dx)));
      const newY = Math.max(0, Math.min(CANVAS_HEIGHT - 20, Math.round(dragStartRef.current.elemY + dy)));

      updateElement(elementKey, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * Handles interactive bottom-right corner dragging to resize the Photo
   */
  const handlePhotoResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizingPhotoRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elemX: config.photo.x,
      elemY: config.photo.y,
      startW: config.photo.width ?? 72,
      startH: config.photo.height ?? 96,
    };

    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (!isResizingPhotoRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;

      const newW = Math.max(30, Math.min(180, Math.round(dragStartRef.current.startW + dx)));
      const newH = Math.max(40, Math.min(180, Math.round(dragStartRef.current.startH + dy)));

      updateElement("photo", { width: newW, height: newH });
    };

    const handleResizeUp = () => {
      isResizingPhotoRef.current = false;
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeUp);
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeUp);
  };

  /**
   * Imports an EPS or SVG file, converts vector paths, and loads it into the canvas and editor.
   */
  const handleVectorImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportNotice(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (!content) return;

      const result = convertVectorTemplateToSvg(content.toString());
      if (result.success && result.svgContent) {
        setTemplateSvg(result.svgContent);
        setEditableSvgCode(result.svgContent);
        setTemplateName(`Imported: ${file.name.replace(/\.[^/.]+$/, "")}`);
        setImportNotice(`Successfully converted & loaded ${result.format.toUpperCase()} (${file.name})!`);
        onTemplateChange?.(result.svgContent, cardBgColor, cardBorderColor);
      } else {
        setImportNotice(`Error parsing ${file.name}: ${result.error}`);
      }
    };

    reader.readAsText(file);
  };

  /**
   * Applies changes made directly inside the raw SVG/Vector code editor
   */
  const handleApplySvgCode = () => {
    try {
      if (!editableSvgCode.includes("<svg")) {
        throw new Error("Invalid SVG: Code must include an <svg> root element.");
      }
      setTemplateSvg(editableSvgCode);
      setCodeEditorError(null);
      setImportNotice("Applied custom vector code updates!");
      onTemplateChange?.(editableSvgCode, cardBgColor, cardBorderColor);
    } catch (err: unknown) {
      setCodeEditorError(err instanceof Error ? err.message : "Failed to parse SVG markup.");
    }
  };

  /**
   * Loads a built-in vector template preset
   */
  const handleSelectPreset = (preset: typeof VECTOR_PRESETS[0]) => {
    setTemplateSvg(preset.svg);
    setEditableSvgCode(preset.svg);
    setCardBgColor(preset.bgColor);
    setCardBorderColor(preset.borderColor);
    setTemplateName(preset.name);
    setImportNotice(`Loaded preset: ${preset.name}`);
    onTemplateChange?.(preset.svg, preset.bgColor, preset.borderColor);
  };

  /**
   * Saves layout and vector template to Prisma database
   */
  const handleSaveTemplate = async () => {
    setSaveSuccess(false);
    await saveCardTemplateAction({
      name: templateName,
      svgContent: templateSvg,
      fieldConfig: config,
      isDefault: true,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleReset = () => {
    setConfig(DEFAULT_FIELD_CONFIG);
    onConfigChange?.(DEFAULT_FIELD_CONFIG);
  };

  const activeBox = config[activeElement];

  return (
    <div className="space-y-6">
      {/* Top Banner: Presets & File Importer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-card">
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-xs font-mono text-foreground font-bold uppercase">Vector Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            {VECTOR_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  templateName === p.name
                    ? "bg-accent text-black font-bold shadow-glow-sm"
                    : "border border-border bg-surface-secondary text-foreground-muted hover:text-foreground"
                }`}
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* EPS / SVG File Upload & Code Editor Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              showCodeEditor
                ? "border-accent bg-accent/10 text-accent font-bold"
                : "border-border bg-surface-secondary text-foreground-muted hover:text-foreground"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>{showCodeEditor ? "Hide Vector Code" : "Edit Vector SVG Code"}</span>
          </button>

          <label className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-black hover:bg-accent-hover shadow-glow-sm cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>Import .EPS / .SVG</span>
            <input
              type="file"
              accept=".eps,.svg,.ai"
              className="hidden"
              onChange={handleVectorImport}
            />
          </label>
        </div>
      </div>

      {/* Direct Vector / SVG Source Code Editor Panel (Collapsible) */}
      {showCodeEditor && (
        <div className="rounded-xl border border-accent/40 bg-surface p-4 space-y-3 shadow-glow-sm">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-accent font-bold uppercase">
              <FileCode className="h-4 w-4" />
              <span>Direct Vector & EPS Markup Editor</span>
            </div>
            <span className="text-[10px] text-foreground-muted font-mono">
              Directly modify SVG XML paths, fills, strokes, or labels
            </span>
          </div>

          {codeEditorError && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
              {codeEditorError}
            </div>
          )}

          <textarea
            value={editableSvgCode}
            onChange={(e) => setEditableSvgCode(e.target.value)}
            rows={7}
            className="w-full rounded-lg border border-border bg-surface-secondary p-3 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
            placeholder="<svg viewBox='0 0 340 214'>...</svg>"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-foreground-subtle">
              CR80 Canvas ViewBox: 0 0 340 214
            </span>
            <button
              type="button"
              onClick={handleApplySvgCode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-black hover:bg-accent-hover shadow-glow-sm"
            >
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Apply Vector Changes</span>
            </button>
          </div>
        </div>
      )}

      {importNotice && (
        <div className="rounded-lg border border-accent/40 bg-accent-dim p-3 text-xs text-accent font-mono flex items-center justify-between">
          <span>{importNotice}</span>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="text-foreground-muted hover:text-foreground text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Designer Grid: Canvas (7 cols) + Property Controls (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-xl border border-border bg-surface p-6 shadow-card">
        {/* Left Column: Interactive Movable Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-accent font-bold uppercase">
              <Layers className="h-4 w-4" />
              <span>Live CR80 Card Canvas (85.6mm × 53.98mm)</span>
            </div>
            <span className="text-[10px] font-mono text-foreground-muted">
              Click element to select • Drag to move • Pull corner to resize photo
            </span>
          </div>

          {/* Interactive Card Canvas Wrapper */}
          <div className="flex justify-center p-6 bg-surface-secondary rounded-xl border border-border overflow-hidden">
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: cardBgColor,
                borderColor: cardBorderColor,
              }}
              className="relative rounded-xl border-2 shadow-2xl overflow-hidden select-none transition-colors"
            >
              {/* 1. Vector Template Background (EPS / SVG converted markup) */}
              {templateSvg && (
                <div
                  style={{ opacity: vectorOpacity / 100 }}
                  className="pointer-events-none absolute inset-0 transition-opacity"
                  dangerouslySetInnerHTML={{ __html: templateSvg }}
                />
              )}

              {/* 2. MOVABLE & RESIZABLE STUDENT PHOTO */}
              {config.photo && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "photo")}
                  style={{
                    left: config.photo.x,
                    top: config.photo.y,
                    width: config.photo.width ?? 72,
                    height: config.photo.height ?? 96,
                  }}
                  className={`absolute cursor-move rounded border-2 overflow-hidden flex items-center justify-center select-none transition-shadow ${
                    activeElement === "photo"
                      ? "border-accent shadow-glow ring-2 ring-accent/50 z-30"
                      : "border-border bg-surface-secondary/90 z-20 hover:border-accent/60"
                  }`}
                >
                  {sampleStudent.photoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sampleStudent.photoPath}
                      alt="Student"
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-center p-1 pointer-events-none">
                      <ImageIcon className="h-5 w-5 text-accent" />
                      <span className="text-[8px] font-bold text-foreground">PHOTO</span>
                      <span className="text-[6px] text-foreground-muted font-mono">
                        {config.photo.width}×{config.photo.height}
                      </span>
                    </div>
                  )}

                  {/* Corner Resize Pull Handle */}
                  <div
                    onMouseDown={handlePhotoResizeDown}
                    title="Drag corner to resize Photo"
                    className="absolute bottom-0 right-0 h-4 w-4 bg-accent cursor-se-resize flex items-center justify-center z-40 rounded-tl-sm hover:scale-110 transition-transform"
                  >
                    <Maximize2 className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>
              )}

              {/* 3. MOVABLE & RESIZABLE QR CODE */}
              {config.qr && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "qr")}
                  style={{
                    left: config.qr.x,
                    top: config.qr.y,
                    width: config.qr.size ?? 60,
                    height: config.qr.size ?? 60,
                  }}
                  className={`absolute cursor-move rounded border bg-white p-1 flex flex-col items-center justify-center select-none transition-shadow ${
                    activeElement === "qr"
                      ? "border-accent ring-2 ring-accent shadow-glow z-30"
                      : "border-border z-20 hover:border-accent/60"
                  }`}
                >
                  <QrCode className="h-full w-full text-black pointer-events-none" />
                  <div className="absolute -bottom-3 text-[5px] font-mono text-accent whitespace-nowrap pointer-events-none">
                    SCAN VERIFY
                  </div>
                </div>
              )}

              {/* 4. MOVABLE FULL LEGAL NAME */}
              {config.fullName && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "fullName")}
                  style={{
                    left: config.fullName.x,
                    top: config.fullName.y,
                    fontSize: config.fullName.fontSize ?? 13,
                    color: config.fullName.color ?? "#FFFFFF",
                  }}
                  className={`absolute cursor-move font-bold tracking-tight whitespace-nowrap px-1 rounded select-none ${
                    activeElement === "fullName"
                      ? "bg-accent/20 outline-1 outline-dashed outline-accent z-30 ring-1 ring-accent"
                      : "z-20 hover:bg-surface-secondary/50"
                  }`}
                >
                  {sampleStudent.fullName}
                </div>
              )}

              {/* 5. MOVABLE STUDENT ID */}
              {config.studentId && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "studentId")}
                  style={{
                    left: config.studentId.x,
                    top: config.studentId.y,
                    fontSize: config.studentId.fontSize ?? 10,
                    color: config.studentId.color ?? "#000000",
                  }}
                  className={`absolute cursor-move font-mono font-bold whitespace-nowrap px-1 rounded select-none ${
                    activeElement === "studentId"
                      ? "bg-accent/20 outline-1 outline-dashed outline-accent z-30 ring-1 ring-accent"
                      : "z-20 hover:bg-surface-secondary/50"
                  }`}
                >
                  ID: {sampleStudent.studentId}
                </div>
              )}

              {/* 6. MOVABLE GRADE / BATCH */}
              {config.grade && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "grade")}
                  style={{
                    left: config.grade.x,
                    top: config.grade.y,
                    fontSize: config.grade.fontSize ?? 9,
                    color: config.grade.color ?? "#9CA3AF",
                  }}
                  className={`absolute cursor-move whitespace-nowrap px-1 rounded select-none ${
                    activeElement === "grade"
                      ? "bg-accent/20 outline-1 outline-dashed outline-accent z-30 ring-1 ring-accent"
                      : "z-20 hover:bg-surface-secondary/50"
                  }`}
                >
                  Grade: {sampleStudent.grade}
                </div>
              )}

              {/* 7. MOVABLE PHONE */}
              {config.phone && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "phone")}
                  style={{
                    left: config.phone.x,
                    top: config.phone.y,
                    fontSize: config.phone.fontSize ?? 8.5,
                    color: config.phone.color ?? "#9CA3AF",
                  }}
                  className={`absolute cursor-move whitespace-nowrap px-1 rounded select-none ${
                    activeElement === "phone"
                      ? "bg-accent/20 outline-1 outline-dashed outline-accent z-30 ring-1 ring-accent"
                      : "z-20 hover:bg-surface-secondary/50"
                  }`}
                >
                  Tel: {sampleStudent.phone}
                </div>
              )}

              {/* 8. MOVABLE GENDER */}
              {config.sex && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "sex")}
                  style={{
                    left: config.sex.x,
                    top: config.sex.y,
                    fontSize: config.sex.fontSize ?? 8.5,
                    color: config.sex.color ?? "#9CA3AF",
                  }}
                  className={`absolute cursor-move whitespace-nowrap px-1 rounded select-none ${
                    activeElement === "sex"
                      ? "bg-accent/20 outline-1 outline-dashed outline-accent z-30 ring-1 ring-accent"
                      : "z-20 hover:bg-surface-secondary/50"
                  }`}
                >
                  Sex: {sampleStudent.sex}
                </div>
              )}

              {/* 9. MOVABLE ROLL NUMBER */}
              {config.rollNumber && (
                <div
                  onMouseDown={(e) => handleMouseDown(e, "rollNumber")}
                  style={{
                    left: config.rollNumber.x,
                    top: config.rollNumber.y,
                    fontSize: config.rollNumber.fontSize ?? 9,
                    color: config.rollNumber.color ?? "#FFFFFF",
                  }}
                  className={`absolute cursor-move font-mono whitespace-nowrap px-1 rounded select-none ${
                    activeElement === "rollNumber"
                      ? "bg-accent/20 outline-1 outline-dashed outline-accent z-30 ring-1 ring-accent"
                      : "z-20 hover:bg-surface-secondary/50"
                  }`}
                >
                  Roll: {sampleStudent.rollNumber}
                </div>
              )}
            </div>
          </div>

          {/* Quick Color Tuner Toolbar */}
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-secondary p-3 text-xs">
            <div>
              <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                Card Background
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={cardBgColor}
                  onChange={(e) => {
                    setCardBgColor(e.target.value);
                    onTemplateChange?.(templateSvg, e.target.value, cardBorderColor);
                  }}
                  className="h-6 w-7 rounded cursor-pointer border border-border bg-transparent p-0"
                />
                <input
                  type="text"
                  value={cardBgColor}
                  onChange={(e) => {
                    setCardBgColor(e.target.value);
                    onTemplateChange?.(templateSvg, e.target.value, cardBorderColor);
                  }}
                  className="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                Border & Accent
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={cardBorderColor}
                  onChange={(e) => {
                    setCardBorderColor(e.target.value);
                    onTemplateChange?.(templateSvg, cardBgColor, e.target.value);
                  }}
                  className="h-6 w-7 rounded cursor-pointer border border-border bg-transparent p-0"
                />
                <input
                  type="text"
                  value={cardBorderColor}
                  onChange={(e) => {
                    setCardBorderColor(e.target.value);
                    onTemplateChange?.(templateSvg, cardBgColor, e.target.value);
                  }}
                  className="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                Vector Opacity ({vectorOpacity}%)
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={vectorOpacity}
                onChange={(e) => setVectorOpacity(parseInt(e.target.value))}
                className="w-full accent-accent cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Element Position & Size Controllers */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-accent font-bold uppercase">
              <Move className="h-4 w-4" />
              <span>Element Geometry & Sizing Controls</span>
            </div>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Select an element to edit coordinates, width, height, and typography
            </p>
          </div>

          {/* Element Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-surface-secondary p-1 text-[11px] font-mono">
            {(
              [
                "photo",
                "qr",
                "fullName",
                "studentId",
                "grade",
                "phone",
                "sex",
                "rollNumber",
              ] as Array<keyof CardFieldConfig>
            ).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveElement(key)}
                className={`rounded py-1 px-1.5 capitalize text-center truncate transition-colors ${
                  activeElement === key
                    ? "bg-accent text-black font-bold shadow-glow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Dynamic Controls for Selected Element */}
          {activeBox && (
            <div className="rounded-xl border border-border bg-surface-secondary p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="font-bold text-foreground font-mono uppercase text-[11px]">
                  Editing: {activeElement}
                </span>
                <span className="text-[10px] text-accent font-mono">
                  X: {activeBox.x}px • Y: {activeBox.y}px
                </span>
              </div>

              {/* Position Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                    Horizontal X (px)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={CANVAS_WIDTH}
                    value={activeBox.x}
                    onChange={(e) =>
                      updateElement(activeElement, { x: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-border bg-surface px-2.5 py-1 text-xs text-foreground font-mono focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                    Vertical Y (px)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={CANVAS_HEIGHT}
                    value={activeBox.y}
                    onChange={(e) =>
                      updateElement(activeElement, { y: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-border bg-surface px-2.5 py-1 text-xs text-foreground font-mono focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Specific: Width & Height Controls */}
              {activeElement === "photo" && (
                <div className="space-y-2 pt-1 border-t border-border/40">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                        Photo Width ({activeBox.width ?? 72}px)
                      </label>
                      <input
                        type="range"
                        min={30}
                        max={160}
                        value={activeBox.width ?? 72}
                        onChange={(e) =>
                          updateElement("photo", { width: parseInt(e.target.value) || 72 })
                        }
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                        Photo Height ({activeBox.height ?? 96}px)
                      </label>
                      <input
                        type="range"
                        min={40}
                        max={180}
                        value={activeBox.height ?? 96}
                        onChange={(e) =>
                          updateElement("photo", { height: parseInt(e.target.value) || 96 })
                        }
                        className="w-full accent-accent cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-foreground-muted font-mono">
                    💡 Tip: You can also drag the bottom-right green corner of the photo directly on the canvas!
                  </p>
                </div>
              )}

              {/* QR Specific: Size Control */}
              {activeElement === "qr" && (
                <div className="pt-1 border-t border-border/40">
                  <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                    QR Code Size ({activeBox.size ?? 60}px)
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={120}
                    value={activeBox.size ?? 60}
                    onChange={(e) =>
                      updateElement("qr", { size: parseInt(e.target.value) || 60 })
                    }
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>
              )}

              {/* Text Specific: Font Size & Color Control */}
              {activeElement !== "photo" && activeElement !== "qr" && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                  <div>
                    <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                      Font Size (pt)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={26}
                      value={activeBox.fontSize ?? 10}
                      onChange={(e) =>
                        updateElement(activeElement, {
                          fontSize: parseInt(e.target.value) || 10,
                        })
                      }
                      className="w-full rounded border border-border bg-surface px-2.5 py-1 text-xs text-foreground font-mono focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                      Text Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={activeBox.color ?? "#FFFFFF"}
                        onChange={(e) =>
                          updateElement(activeElement, { color: e.target.value })
                        }
                        className="h-6 w-7 rounded cursor-pointer border border-border bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={activeBox.color ?? "#FFFFFF"}
                        onChange={(e) =>
                          updateElement(activeElement, { color: e.target.value })
                        }
                        className="w-full rounded border border-border bg-surface px-2 py-0.5 text-xs text-foreground font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Template Save & Reset Actions */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-foreground-muted text-[10px] mb-1 font-mono uppercase">
                Template Preset Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground-muted hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Elements</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTemplate}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent py-2 text-xs font-bold text-black hover:bg-accent-hover shadow-glow-sm transition-all"
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-4 w-4 stroke-[2.5]" />
                    <span>Preset Saved to Database!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Card Layout Preset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
