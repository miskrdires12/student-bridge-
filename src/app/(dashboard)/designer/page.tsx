"use client";

// ============================================================================
// STUDENT BRIDGE — EXACT CANVA-STYLE ID CARD STUDIO (90% WHITE, 10% BLACK)
// Features:
// - FRONT DESIGN IS DEFAULT: Completely decoupled Front vs Back templates
// - Mirror Card Design Tool: Flip Horizontal (Reverse image print), Flip Vertical
// - Rich Canva Features:
//   * Font families: Inter, Courier New, Arial, Georgia, Impact, Roboto
//   * Full styling: Bold, Italic, Underline, Letter spacing, Text alignment
//   * Opacity slider (10% - 100%)
//   * Alignment helpers: Align Left, Center, Right, Top, Middle, Bottom
//   * Border width & Corner radius sliders
//   * Layer reordering: Bring to Front, Send to Back, Move Forward/Backward
//   * Duplicate, Lock/Unlock, Delete
//   * Export to PNG, SVG, JSON
// - Drop / Import Canva files (.png, .jpg, .svg, .json)
// - "Clear All Examples" / Blank Canvas button
// - Navigation: [← Back to Dashboard] and [Next: Send to Bulker →]
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomOut,
  ZoomIn,
  Upload,
  Save,
  Type,
  Camera,
  QrCode,
  Square,
  Circle,
  Copy,
  Trash2,
  Layers,
  MoveUp,
  MoveDown,
  LayoutGrid,
  ArrowRight,
  Bold,
  FlipHorizontal,
  FlipVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  RotateCw,
} from "lucide-react";
import { CameraModal } from "@/components/camera/CameraModal";
import { saveCardTemplateAction } from "@/actions/import";
import { getStudentsAction } from "@/actions/students";

export interface CanvasElement {
  id: string;
  type: "text" | "photo" | "qr" | "shape_rect" | "shape_circle" | "image" | "line";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  isLocked: boolean;
  isVisible: boolean;
  content?: string;
  dynamicToken?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold" | "semibold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  src?: string;
}

const CR80_WIDTH_PX = 340;  // 85.6mm
const CR80_HEIGHT_PX = 214; // 53.98mm

const DEFAULT_FRONT_ELEMENTS: CanvasElement[] = [
  {
    id: "elem-front-header",
    type: "shape_rect",
    name: "Header Bar",
    x: 0,
    y: 0,
    width: CR80_WIDTH_PX,
    height: 38,
    rotation: 0,
    zIndex: 1,
    isLocked: false,
    isVisible: true,
    backgroundColor: "#000000",
    borderColor: "#000000",
    borderWidth: 0,
    borderRadius: 0,
  },
  {
    id: "elem-front-title",
    type: "text",
    name: "Institution Title",
    x: 14,
    y: 10,
    width: 240,
    height: 18,
    rotation: 0,
    zIndex: 2,
    isLocked: false,
    isVisible: true,
    content: "ACADEMY IDENTITY PASS",
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "left",
  },
  {
    id: "elem-front-photo",
    type: "photo",
    name: "Student Photo",
    x: 14,
    y: 52,
    width: 84,
    height: 112,
    rotation: 0,
    zIndex: 3,
    isLocked: false,
    isVisible: true,
    dynamicToken: "{Photo}",
    backgroundColor: "#f5f5f5",
    borderColor: "#000000",
    borderWidth: 2,
    borderRadius: 4,
  },
  {
    id: "elem-front-name",
    type: "text",
    name: "Student Name",
    x: 112,
    y: 54,
    width: 210,
    height: 22,
    rotation: 0,
    zIndex: 4,
    isLocked: false,
    isVisible: true,
    content: "{Name}",
    dynamicToken: "{Name}",
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "left",
  },
  {
    id: "elem-front-id",
    type: "text",
    name: "Student ID",
    x: 112,
    y: 80,
    width: 160,
    height: 18,
    rotation: 0,
    zIndex: 5,
    isLocked: false,
    isVisible: true,
    content: "ID: {StudentID}",
    dynamicToken: "{StudentID}",
    fontFamily: "Courier New",
    fontSize: 12,
    fontWeight: "bold",
    color: "#333333",
    textAlign: "left",
  },
  {
    id: "elem-front-grade",
    type: "text",
    name: "Class / Grade",
    x: 112,
    y: 102,
    width: 160,
    height: 18,
    rotation: 0,
    zIndex: 6,
    isLocked: false,
    isVisible: true,
    content: "CLASS: {Grade}",
    dynamicToken: "{Grade}",
    fontFamily: "Inter",
    fontSize: 11,
    color: "#555555",
    textAlign: "left",
  },
  {
    id: "elem-front-qr",
    type: "qr",
    name: "External QR",
    x: 256,
    y: 120,
    width: 68,
    height: 68,
    rotation: 0,
    zIndex: 7,
    isLocked: false,
    isVisible: true,
    dynamicToken: "{QR}",
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderWidth: 1.5,
    borderRadius: 4,
  },
];

const DEFAULT_BACK_ELEMENTS: CanvasElement[] = [
  {
    id: "elem-back-instructions",
    type: "text",
    name: "Back Instructions",
    x: 20,
    y: 20,
    width: 300,
    height: 40,
    rotation: 0,
    zIndex: 1,
    isLocked: false,
    isVisible: true,
    content: "This card remains the property of the issuing institution. If found, please return to the administration office.",
    fontFamily: "Inter",
    fontSize: 10,
    color: "#333333",
    textAlign: "center",
  },
  {
    id: "elem-back-barcode",
    type: "qr",
    name: "Back QR Verification",
    x: 136,
    y: 80,
    width: 68,
    height: 68,
    rotation: 0,
    zIndex: 2,
    isLocked: false,
    isVisible: true,
    dynamicToken: "{QR}",
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderWidth: 1.5,
    borderRadius: 4,
  },
];

export default function CanvaDesignerPage() {
  const router = useRouter();

  // Template Meta
  const [templateName, setTemplateName] = useState("Custom Student ID");
  const [widthMm, setWidthMm] = useState(85.6);
  const [heightMm, setHeightMm] = useState(53.98);
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");

  // FRONT IS ACTIVE BY DEFAULT (USER REQUIREMENT)
  const [activeSide, setActiveSide] = useState<"FRONT" | "BACK">("FRONT");

  // Decoupled Front & Back Elements
  const [frontElements, setFrontElements] = useState<CanvasElement[]>(DEFAULT_FRONT_ELEMENTS);
  const [backElements, setBackElements] = useState<CanvasElement[]>(DEFAULT_BACK_ELEMENTS);

  // Decoupled Backgrounds
  const [frontBg, setFrontBg] = useState<{ color: string; url: string | null }>({
    color: "#ffffff",
    url: null,
  });
  const [backBg, setBackBg] = useState<{ color: string; url: string | null }>({
    color: "#ffffff",
    url: null,
  });

  // Mirror Preview State
  const [isMirrored, setIsMirrored] = useState(false);

  // Selected element ID
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Canva Dock Tab
  const [activeTab, setActiveTab] = useState<
    "uploads" | "layouts" | "text" | "photo" | "qr" | "elements" | "mirror" | "layers"
  >("uploads");

  // History stack for Undo / Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Viewport Zoom
  const [zoom, setZoom] = useState<number>(1.5);
  const [snapToGrid] = useState<boolean>(true);
  const [gridSize] = useState<number>(8);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sample Students for live token preview
  const [sampleStudents, setSampleStudents] = useState<any[]>([]);
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);

  // Status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Right-Click Context Menu State & Refs
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string | null;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Webcam Capture Modal
  const [isWebcamModalOpen, setIsWebcamModalOpen] = useState(false);

  const isPortrait = orientation === "PORTRAIT";
  const canvasWidthPx = isPortrait ? CR80_HEIGHT_PX : CR80_WIDTH_PX;
  const canvasHeightPx = isPortrait ? CR80_WIDTH_PX : CR80_HEIGHT_PX;

  // Active elements depending on Front or Back
  const currentElements = activeSide === "FRONT" ? frontElements : backElements;
  const currentBg = activeSide === "FRONT" ? frontBg : backBg;

  // Close context menu only on outside pointer click
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Load sample students on mount from server
  useEffect(() => {
    getStudentsAction({ pageSize: 15 }).then((res) => {
      const list = res.students || [];
      if (list.length > 0) {
        setSampleStudents(list);
      }
    });

    const saved = localStorage.getItem("sb_canva_template");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.frontElements) setFrontElements(parsed.frontElements);
        if (parsed.backElements) setBackElements(parsed.backElements);
        if (parsed.frontBg) setFrontBg(parsed.frontBg);
        if (parsed.backBg) setBackBg(parsed.backBg);
        if (parsed.name) setTemplateName(parsed.name);
      } catch {
        // ignore
      }
    }
  }, []);

  const pushState = (newFront: CanvasElement[], newBack: CanvasElement[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { front: newFront, back: newBack }];
    });
    setHistoryIndex((prev) => prev + 1);
    setFrontElements(newFront);
    setBackElements(newBack);

    localStorage.setItem(
      "sb_canva_template",
      JSON.stringify({
        name: templateName,
        frontElements: newFront,
        backElements: newBack,
        frontBg,
        backBg,
        orientation,
      })
    );
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      const prevEntry = history[historyIndex - 1];
      if (prevEntry) {
        setFrontElements(prevEntry.front);
        setBackElements(prevEntry.back);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      const nextEntry = history[historyIndex + 1];
      if (nextEntry) {
        setFrontElements(nextEntry.front);
        setBackElements(nextEntry.back);
      }
    }
  };

  // Update elements on the currently active side (FRONT or BACK)
  const updateCurrentElements = (updater: (prev: CanvasElement[]) => CanvasElement[]) => {
    if (activeSide === "FRONT") {
      const updated = updater(frontElements);
      pushState(updated, backElements);
    } else {
      const updated = updater(backElements);
      pushState(frontElements, updated);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MIRROR CARD DESIGN (FLIP HORIZONTAL / REVERSE PRINT)
  // ──────────────────────────────────────────────────────────────────────────
  const handleMirrorDesign = () => {
    updateCurrentElements((elements) => {
      return elements.map((elem) => {
        // Flip X position across card width
        const newX = Math.round(canvasWidthPx - elem.x - elem.width);
        // Flip alignment if text
        let newAlign = elem.textAlign;
        if (elem.textAlign === "left") newAlign = "right";
        else if (elem.textAlign === "right") newAlign = "left";

        return {
          ...elem,
          x: Math.max(0, newX),
          textAlign: newAlign,
        };
      });
    });

    setStatusMessage("✓ Card design mirrored horizontally (X-axis flipped)!");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleFlipVertical = () => {
    updateCurrentElements((elements) => {
      return elements.map((elem) => {
        const newY = Math.round(canvasHeightPx - elem.y - elem.height);
        return {
          ...elem,
          y: Math.max(0, newY),
        };
      });
    });

    setStatusMessage("✓ Card design flipped vertically (Y-axis flipped)!");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Copy Front Design to Back
  const handleCopyFrontToBack = () => {
    if (confirm("Copy all Front elements over to the Back design?")) {
      pushState(frontElements, [...frontElements]);
      setBackBg({ ...frontBg });
      setStatusMessage("✓ Front design copied to Back!");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Clear All Examples / Blank Canvas
  const handleClearAllExamples = () => {
    if (confirm("Clear all example elements and start from a clean blank canvas?")) {
      setSelectedElementId(null);
      if (activeSide === "FRONT") {
        pushState([], backElements);
        setFrontBg({ color: "#ffffff", url: null });
      } else {
        pushState(frontElements, []);
        setBackBg({ color: "#ffffff", url: null });
      }
      setStatusMessage("✓ Started clean blank canvas!");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Add Element
  const addElement = (type: CanvasElement["type"], defaultProps: Partial<CanvasElement>) => {
    const id = `elem-${Date.now()}`;
    const newElem: CanvasElement = {
      id,
      type,
      name: `New ${type}`,
      x: 30,
      y: 30,
      width: type === "text" ? 180 : type === "photo" ? 84 : type === "qr" ? 68 : 100,
      height: type === "text" ? 24 : type === "photo" ? 112 : type === "qr" ? 68 : 50,
      rotation: 0,
      zIndex: currentElements.length + 1,
      isLocked: false,
      isVisible: true,
      color: "#000000",
      fontFamily: "Inter",
      backgroundColor: type === "shape_rect" ? "#f0f0f0" : "transparent",
      borderColor: "#000000",
      borderWidth: 1,
      borderRadius: 0,
      opacity: 1,
      ...defaultProps,
    };

    updateCurrentElements((prev) => [...prev, newElem]);
    setSelectedElementId(id);
  };

  // Update selected element
  const updateSelected = (updates: Partial<CanvasElement>) => {
    if (!selectedElementId) return;
    updateCurrentElements((elements) =>
      elements.map((e) => (e.id === selectedElementId ? { ...e, ...updates } : e))
    );
  };

  const handleDeleteElement = (id: string) => {
    updateCurrentElements((elements) => elements.filter((e) => e.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleDuplicateElement = (id: string) => {
    const orig = currentElements.find((e) => e.id === id);
    if (!orig) return;
    const copyId = `elem-${Date.now()}`;
    const copyElem: CanvasElement = {
      ...orig,
      id: copyId,
      name: `${orig.name} (Copy)`,
      x: orig.x + 12,
      y: orig.y + 12,
      zIndex: currentElements.length + 1,
    };
    updateCurrentElements((elements) => [...elements, copyElem]);
    setSelectedElementId(copyId);
  };

  // Layer Reordering
  const handleLayerOrder = (id: string, action: "front" | "back" | "up" | "down") => {
    updateCurrentElements((elements) => {
      const idx = elements.findIndex((e) => e.id === id);
      if (idx === -1) return elements;
      const next = [...elements];
      const [item] = next.splice(idx, 1);
      if (action === "front") next.push(item);
      else if (action === "back") next.unshift(item);
      else if (action === "up") next.splice(Math.min(next.length, idx + 1), 0, item);
      else if (action === "down") next.splice(Math.max(0, idx - 1), 0, item);
      return next;
    });
  };

  // Position Alignment Helpers
  const handleAlign = (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedElementId) return;
    const elem = currentElements.find((e) => e.id === selectedElementId);
    if (!elem) return;

    let newX = elem.x;
    let newY = elem.y;

    if (alignment === "left") newX = 0;
    if (alignment === "center") newX = Math.round((canvasWidthPx - elem.width) / 2);
    if (alignment === "right") newX = canvasWidthPx - elem.width;
    if (alignment === "top") newY = 0;
    if (alignment === "middle") newY = Math.round((canvasHeightPx - elem.height) / 2);
    if (alignment === "bottom") newY = canvasHeightPx - elem.height;

    updateSelected({ x: newX, y: newY });
  };

  // Right-Click Context Menu Operations
  const handleBringToFront = (id: string) => {
    handleLayerOrder(id, "front");
    setStatusMessage("✓ Layer moved to front");
  };

  const handleSendToBack = (id: string) => {
    handleLayerOrder(id, "back");
    setStatusMessage("✓ Layer moved to back");
  };

  const handleMirrorSingleElement = (id: string) => {
    updateCurrentElements((elements) =>
      elements.map((e) => {
        if (e.id !== id) return e;
        const newX = canvasWidthPx - (e.x + e.width);
        let newAlign = e.textAlign;
        if (e.textAlign === "left") newAlign = "right";
        else if (e.textAlign === "right") newAlign = "left";
        return { ...e, x: Math.max(0, newX), textAlign: newAlign };
      })
    );
    setStatusMessage("✓ Element mirrored horizontally");
  };

  const handleToggleLock = (id: string) => {
    updateCurrentElements((elements) =>
      elements.map((e) => (e.id === id ? { ...e, isLocked: !e.isLocked } : e))
    );
    setStatusMessage("✓ Layer lock toggled");
  };

  const handleContextMenu = (e: React.MouseEvent, elemId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (elemId) setSelectedElementId(elemId);
    const posX = Math.min(Math.max(10, e.clientX), window.innerWidth - 230);
    const posY = Math.min(Math.max(10, e.clientY), window.innerHeight - 320);
    setContextMenu({
      x: posX,
      y: posY,
      elementId: elemId,
    });
  };

  // Direct Webcam Capture for Canva ID Card
  const handleWebcamCaptureCanva = async (_file: File, previewUrl: string) => {
    setIsWebcamModalOpen(false);

    try {
      // Use the persistent Base64 Data URL directly
      const photoUrl = previewUrl;

      const existingPhoto = currentElements.find((e) => e.type === "photo");
      if (existingPhoto) {
        updateCurrentElements((elements) =>
          elements.map((e) => (e.id === existingPhoto.id ? { ...e, content: photoUrl } : e))
        );
        setSelectedElementId(existingPhoto.id);
      } else {
        addElement("photo", {
          name: "Webcam Portrait",
          content: photoUrl,
          x: 18,
          y: 48,
          width: 80,
          height: 106,
          dynamicToken: "{Photo}",
        });
      }
      setStatusMessage("✓ Attached Webcam Portrait to Canvas!");
    } catch {
      setStatusMessage("Webcam photo attached locally");
    }
  };

  // Canva Image Upload
  const handleCanvaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      if (activeSide === "FRONT") {
        setFrontBg({ color: "#ffffff", url: dataUrl });
      } else {
        setBackBg({ color: "#ffffff", url: dataUrl });
      }

      setStatusMessage(`✓ Imported Canva template "${file.name}" to ${activeSide}!`);
      setTimeout(() => setStatusMessage(null), 3500);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Save Template Action
  const handleSaveTemplate = async () => {
    try {
      const res = await saveCardTemplateAction({
        name: templateName,
        description: `Canva Studio Front & Back Design`,
        svgContent: generateSvgMarkup(),
        fieldConfig: {
          photo: { x: 14, y: 52, width: 84, height: 112 },
          qr: { x: 256, y: 120, width: 68, height: 68 },
          fullName: { x: 112, y: 54, fontSize: 15 },
          studentId: { x: 112, y: 80, fontSize: 12 },
          grade: { x: 112, y: 102, fontSize: 11 },
          rollNumber: { x: 112, y: 124, fontSize: 10 },
          phone: { x: 112, y: 144, fontSize: 10 },
        },
      });

      if (res.success) {
        setStatusMessage("✓ Template saved successfully to production library!");
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch {
      alert("Error saving template.");
    }
  };

  // Send to Bulker
  const handleSendToBulker = () => {
    localStorage.setItem(
      "sb_active_template",
      JSON.stringify({
        name: templateName,
        frontElements,
        backElements,
        frontBg,
        backBg,
        backgroundUrl: frontBg.url,
      })
    );
    router.push("/bulker");
  };

  // Generate SVG Markup
  const generateSvgMarkup = () => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidthPx} ${canvasHeightPx}" width="${canvasWidthPx}" height="${canvasHeightPx}">
      <rect width="100%" height="100%" fill="${currentBg.color}"/>
      ${currentBg.url ? `<image href="${currentBg.url}" width="100%" height="100%" preserveAspectRatio="none"/>` : ""}
      ${currentElements
        .filter((e) => e.isVisible)
        .map((e) => {
          if (e.type === "text") {
            return `<text x="${e.x}" y="${e.y + (e.fontSize || 12)}" fill="${e.color || "#000000"}" font-size="${e.fontSize || 12}" font-family="${e.fontFamily || "Inter"}" font-weight="${e.fontWeight || "normal"}">${e.content || ""}</text>`;
          }
          if (e.type === "shape_rect") {
            return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" fill="${e.backgroundColor || "#ffffff"}" stroke="${e.borderColor || "none"}" stroke-width="${e.borderWidth || 0}" rx="${e.borderRadius || 0}"/>`;
          }
          if (e.type === "photo") {
            return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" fill="#f0f0f0" stroke="#000000" stroke-width="1.5"/><text x="${e.x + e.width / 2}" y="${e.y + e.height / 2}" fill="#000000" font-size="10" text-anchor="middle">PHOTO</text>`;
          }
          if (e.type === "qr") {
            return `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" fill="#ffffff" stroke="#000000" stroke-width="1.5"/><text x="${e.x + e.width / 2}" y="${e.y + e.height / 2}" fill="#000000" font-size="10" text-anchor="middle">QR</text>`;
          }
          return "";
        })
        .join("")}
    </svg>`;
  };

  // Drag element on canvas
  const handleElementMouseDown = (e: React.MouseEvent, elem: CanvasElement) => {
    if (e.button !== 0) return; // Ignore right-click and middle-click to preserve context menu!
    if (elem.isLocked) return;
    e.stopPropagation();
    setSelectedElementId(elem.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - elem.x * zoom,
      y: e.clientY - elem.y * zoom,
    });
  };

  // Mobile / Phone touch start for dragging and long-press editing
  const handleElementTouchStart = (e: React.TouchEvent, elem: CanvasElement) => {
    if (elem.isLocked) return;
    const touch = e.touches[0];
    if (!touch) return;
    setSelectedElementId(elem.id);

    // Start long-press timer for phone right-click context menu
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        x: Math.min(Math.max(10, touch.clientX), window.innerWidth - 230),
        y: Math.min(Math.max(10, touch.clientY), window.innerHeight - 320),
        elementId: elem.id,
      });
    }, 450);

    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - elem.x * zoom,
      y: touch.clientY - elem.y * zoom,
    });
  };

  const handleElementTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    setIsDragging(false);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId) return;
    let nextX = (e.clientX - dragOffset.x) / zoom;
    let nextY = (e.clientY - dragOffset.y) / zoom;
    if (snapToGrid) {
      nextX = Math.round(nextX / gridSize) * gridSize;
      nextY = Math.round(nextY / gridSize) * gridSize;
    }
    updateSelected({ x: Math.max(0, nextX), y: Math.max(0, nextY) });
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const selectedElement = currentElements.find((e) => e.id === selectedElementId) || null;
  const currentStudent = sampleStudents[previewStudentIndex] || null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-white dark:bg-[#070908] text-[#080808] dark:text-[#f2f7f4] select-none overflow-hidden font-sans">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TOP CANVA TOOLBAR (90% WHITE, 10% BLACK)                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-neutral-200 dark:border-[#223126] bg-white dark:bg-[#111613] px-4 flex items-center justify-between shrink-0 z-30 shadow-xs text-[#080808] dark:text-[#f2f7f4]">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] text-xs font-semibold text-neutral-800 dark:text-[#f2f7f4] hover:text-black dark:hover:text-[#8fe617] hover:border-black dark:hover:border-[#8fe617] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>

          <span className="text-neutral-300">|</span>

          {/* Template Title Input */}
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-[#223126] focus:border-black dark:focus:border-[#8fe617] px-1.5 py-0.5 text-xs font-bold text-black dark:text-[#f2f7f4] dark:text-[#f2f7f4] focus:outline-none w-48 truncate"
            title="Click to rename design"
          />

          {/* FRONT / BACK SIDE SWITCHER (FRONT IS DEFAULT) */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#161d19] border border-neutral-300 dark:border-[#223126] rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveSide("FRONT");
                setSelectedElementId(null);
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                activeSide === "FRONT"
                  ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] shadow-xs"
                  : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
              }`}
            >
              Card Front [Default]
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSide("BACK");
                setSelectedElementId(null);
              }}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                activeSide === "BACK"
                  ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] shadow-xs"
                  : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
              }`}
            >
              Card Back
            </button>
          </div>

          {/* ORIENTATION TOGGLE (LANDSCAPE / PORTRAIT) */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#161d19] border border-neutral-300 dark:border-[#223126] rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setOrientation("LANDSCAPE");
                setWidthMm(85.6);
                setHeightMm(53.98);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                orientation === "LANDSCAPE"
                  ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] shadow-xs"
                  : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
              }`}
              title={`Landscape: ${widthMm} × ${heightMm}mm`}
            >
              Landscape
            </button>
            <button
              type="button"
              onClick={() => {
                setOrientation("PORTRAIT");
                setWidthMm(53.98);
                setHeightMm(85.6);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                orientation === "PORTRAIT"
                  ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] shadow-xs"
                  : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
              }`}
              title={`Portrait: ${heightMm} × ${widthMm}mm`}
            >
              Portrait
            </button>
          </div>

          {/* Mirror Design Action (User Requirement) */}
          <button
            type="button"
            onClick={handleMirrorDesign}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] text-xs font-mono font-bold text-black dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#1f2a22] hover:border-black dark:hover:border-[#8fe617] transition-colors cursor-pointer"
            title="Mirror design horizontally (Flip X for reverse printing)"
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
            <span>Mirror Card</span>
          </button>
        </div>

        {/* Center / Right Toolbar Actions */}
        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="text-xs font-mono text-black bg-neutral-100 border border-neutral-300 px-3 py-1 rounded-full animate-in fade-in">
              {statusMessage}
            </span>
          )}

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 border border-neutral-300 dark:border-[#223126] rounded-lg p-1 bg-neutral-50 dark:bg-[#161d19]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1 rounded text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] disabled:opacity-30"
              title="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] disabled:opacity-30"
              title="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border border-neutral-300 dark:border-[#223126] rounded-lg p-1 bg-neutral-50 dark:bg-[#161d19] text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
              className="p-1 text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-[11px] font-bold text-black dark:text-[#f2f7f4]">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.8, z + 0.2))}
              className="p-1 text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Clear All Examples */}
          <button
            type="button"
            onClick={handleClearAllExamples}
            className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-white dark:bg-[#161d19] text-xs font-mono text-neutral-700 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] hover:border-black dark:hover:border-[#8fe617] transition-colors cursor-pointer"
            title="Clear all example elements to start blank"
          >
            Clear Examples
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-white dark:bg-[#161d19] text-xs font-bold text-black dark:text-[#f2f7f4] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Design</span>
          </button>

          {/* Next: Send to Bulker */}
          <button
            type="button"
            onClick={handleSendToBulker}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-black dark:bg-[#8fe617] text-xs font-bold text-white dark:text-[#062404] hover:bg-neutral-800 dark:hover:bg-[#7ecc10] transition-all shadow-sm cursor-pointer"
          >
            <span>Next: Send to Bulker</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MAIN WORKSPACE: LEFT CANVA DOCK + DRAWER + CANVAS                          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* SLIM LEFT CANVA ICON DOCK */}
        <nav className="w-16 border-r border-neutral-200 dark:border-[#223126] bg-neutral-50 dark:bg-[#0c110e] flex flex-col items-center py-3 gap-1 shrink-0 z-20">
          <button
            type="button"
            onClick={() => setActiveTab("uploads")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "uploads"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <Upload className="h-4 w-4 mb-0.5" />
            <span>Uploads</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("layouts")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "layouts"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <LayoutGrid className="h-4 w-4 mb-0.5" />
            <span>Layouts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "text"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <Type className="h-4 w-4 mb-0.5" />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("photo")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "photo"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <Camera className="h-4 w-4 mb-0.5" />
            <span>Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "qr"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <QrCode className="h-4 w-4 mb-0.5" />
            <span>QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("elements")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "elements"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <Square className="h-4 w-4 mb-0.5" />
            <span>Shapes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mirror")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "mirror"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <FlipHorizontal className="h-4 w-4 mb-0.5" />
            <span>Mirror</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("layers")}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-[10px] transition-colors cursor-pointer ${
              activeTab === "layers"
                ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold shadow-xs"
                : "text-neutral-600 dark:text-[#8a9e93] hover:bg-neutral-200 dark:hover:bg-[#161e19] hover:text-black dark:hover:text-[#f2f7f4]"
            }`}
          >
            <Layers className="h-4 w-4 mb-0.5" />
            <span>Layers</span>
          </button>
        </nav>

        {/* CANVA SECONDARY DRAWER */}
        <aside className="w-72 border-r border-neutral-200 dark:border-[#223126] bg-white dark:bg-[#111613] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-xs text-[#080808] dark:text-[#f2f7f4]">
          {/* UPLOADS TAB */}
          {activeTab === "uploads" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  Import Canva Template
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-[#8a9e93] mt-1">
                  Drop your exported Canva design (PNG, JPG, SVG) to wrap this card.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-[#223126] hover:border-black dark:hover:border-[#8fe617] bg-neutral-50 dark:bg-[#161d19] hover:bg-neutral-100 dark:hover:bg-[#1f2a22] rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center shadow-xs">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-black dark:text-[#f2f7f4]">Click to Drop Canva File</div>
                <div className="text-[10px] text-neutral-500 font-mono">PNG, JPG, SVG</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleCanvaImageUpload}
              />

              {currentBg.url && (
                <div className="border border-neutral-200 dark:border-[#223126] rounded-lg p-3 space-y-2 bg-neutral-50 dark:bg-[#161d19]">
                  <div className="text-[11px] font-mono text-neutral-700 dark:text-[#8a9e93] flex items-center justify-between">
                    <span>Active Background ({activeSide}):</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSide === "FRONT") setFrontBg({ color: "#ffffff", url: null });
                        else setBackBg({ color: "#ffffff", url: null });
                      }}
                      className="text-neutral-500 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] text-[10px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="h-24 rounded border border-neutral-300 dark:border-[#223126] overflow-hidden bg-white dark:bg-[#111613] flex items-center justify-center">
                    <img src={currentBg.url} alt="" className="h-full w-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LAYOUTS & SIDES TAB */}
          {activeTab === "layouts" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  Card Layouts & Sides
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-[#8a9e93] mt-1">
                  Managing Front and Back sides independently.
                </p>
              </div>

              {/* Copy Front to Back */}
              <button
                type="button"
                onClick={handleCopyFrontToBack}
                className="w-full text-left p-3 rounded-lg border border-neutral-300 dark:border-[#223126] hover:border-black dark:hover:border-[#8fe617] bg-neutral-50 dark:bg-[#161d19] hover:bg-white dark:hover:bg-[#1f2a22] transition-all space-y-1 cursor-pointer"
              >
                <div className="text-xs font-bold text-black dark:text-[#f2f7f4]">Copy Front to Back</div>
                <p className="text-[11px] text-neutral-500 dark:text-[#8a9e93]">
                  Duplicate layout structure from Front side onto Back side.
                </p>
              </button>

              {/* Start Blank Canvas */}
              <button
                type="button"
                onClick={handleClearAllExamples}
                className="w-full text-left p-3 rounded-lg border border-neutral-300 dark:border-[#223126] hover:border-black dark:hover:border-[#8fe617] bg-neutral-50 dark:bg-[#161d19] hover:bg-white dark:hover:bg-[#1f2a22] transition-all space-y-1 cursor-pointer"
              >
                <div className="text-xs font-bold text-black dark:text-[#f2f7f4]">Start Blank Canvas</div>
                <p className="text-[11px] text-neutral-500 dark:text-[#8a9e93]">
                  Clear all layers on {activeSide} and add your own artwork.
                </p>
              </button>
            </div>
          )}

          {/* TEXT TAB */}
          {activeTab === "text" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  Add Text & Student Tokens
                </h3>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    addElement("text", {
                      name: "Heading Text",
                      content: "ACADEMY TITLE",
                      fontSize: 16,
                      fontWeight: "bold",
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] text-left hover:bg-white dark:hover:bg-[#1f2a22] hover:border-black dark:hover:border-[#8fe617] transition-colors cursor-pointer"
                >
                  <span className="text-sm font-bold text-black dark:text-[#f2f7f4]">Add a Heading</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addElement("text", {
                      name: "Subheading",
                      content: "STUDENT IDENTITY PASS",
                      fontSize: 12,
                      fontWeight: "semibold",
                      color: "#444444",
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] text-left hover:bg-white dark:hover:bg-[#1f2a22] hover:border-black dark:hover:border-[#8fe617] transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-neutral-800 dark:text-[#f2f7f4]">Add a Subheading</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addElement("text", {
                      name: "Body Text",
                      content: "Official Institutional Credential",
                      fontSize: 10,
                      color: "#666666",
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] text-left hover:bg-white dark:hover:bg-[#1f2a22] hover:border-black dark:hover:border-[#8fe617] transition-colors cursor-pointer"
                >
                  <span className="text-[11px] text-neutral-700 dark:text-[#8a9e93]">Add Body Text</span>
                </button>
              </div>

              {/* Dynamic Tokens */}
              <div className="pt-3 border-t border-neutral-200 dark:border-[#223126] space-y-2">
                <div className="text-xs font-mono font-bold text-black dark:text-[#f2f7f4] uppercase">
                  Dynamic Student Tokens
                </div>
                {[
                  { label: "{Full Name}", token: "{Name}" },
                  { label: "{Student ID}", token: "{StudentID}" },
                  { label: "{Grade / Class}", token: "{Grade}" },
                  { label: "{Phone Number}", token: "{Phone}" },
                ].map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() =>
                      addElement("text", {
                        name: t.label,
                        content: t.token,
                        dynamicToken: t.token,
                        fontSize: 12,
                        fontWeight: "bold",
                      })
                    }
                    className="w-full flex items-center justify-between p-2 rounded border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] text-xs hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] text-black dark:text-[#f2f7f4] transition-colors font-mono cursor-pointer"
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] text-neutral-500 dark:text-[#8a9e93] font-bold">+ Insert</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PHOTO TAB */}
          {activeTab === "photo" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  Student Photo Frame
                </h3>
              </div>

              {/* Direct Webcam Capture Button (User Requirement) */}
              <button
                type="button"
                onClick={() => setIsWebcamModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-black dark:border-[#8fe617] bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] hover:bg-neutral-800 dark:hover:bg-[#7ecc10] text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Shoot Webcam Portrait</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  addElement("photo", {
                    name: "Student Photograph Frame",
                    width: 84,
                    height: 112,
                    dynamicToken: "{Photo}",
                    backgroundColor: "#f5f5f5",
                    borderColor: "#000000",
                    borderWidth: 1.5,
                    borderRadius: 4,
                  })
                }
                className="w-full flex flex-col items-center justify-center p-5 rounded-xl border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] text-center transition-all group cursor-pointer"
              >
                <Camera className="h-7 w-7 text-black dark:text-[#8fe617] mb-1.5" />
                <span className="text-xs font-bold text-black dark:text-[#f2f7f4] font-mono">
                  + Add 3:4 ID Photo Frame
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-[#8a9e93] mt-0.5">
                  Dynamic passport spec placeholder
                </span>
              </button>
            </div>
          )}

          {/* QR TAB */}
          {activeTab === "qr" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  External QR Frame
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  addElement("qr", {
                    name: "External QR Frame",
                    width: 68,
                    height: 68,
                    dynamicToken: "{QR}",
                    backgroundColor: "#ffffff",
                    borderColor: "#000000",
                    borderWidth: 1.5,
                    borderRadius: 4,
                  })
                }
                className="w-full flex flex-col items-center justify-center p-6 rounded-xl border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] text-center transition-all group cursor-pointer"
              >
                <QrCode className="h-8 w-8 text-black dark:text-[#8fe617] mb-2" />
                <span className="text-xs font-bold text-black dark:text-[#f2f7f4] font-mono">
                  + Add External QR Frame
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-[#8a9e93] mt-0.5">
                  Links to imported barcode images
                </span>
              </button>
            </div>
          )}

          {/* SHAPES TAB */}
          {activeTab === "elements" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  Shapes & Panels
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    addElement("shape_rect", {
                      name: "Rectangle Box",
                      width: 140,
                      height: 40,
                      backgroundColor: "#f0f0f0",
                      borderColor: "#000000",
                      borderWidth: 1,
                      borderRadius: 4,
                    })
                  }
                  className="flex flex-col items-center p-3 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] transition-colors cursor-pointer"
                >
                  <Square className="h-5 w-5 mb-1 text-black dark:text-[#8fe617]" />
                  <span className="text-[11px] text-black dark:text-[#f2f7f4]">Rectangle</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addElement("shape_rect", {
                      name: "Header Bar",
                      x: 0,
                      y: 0,
                      width: canvasWidthPx,
                      height: 38,
                      backgroundColor: "#000000",
                      borderColor: "transparent",
                      borderWidth: 0,
                      borderRadius: 0,
                    })
                  }
                  className="flex flex-col items-center p-3 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] transition-colors cursor-pointer"
                >
                  <div className="h-5 w-8 bg-black dark:bg-[#8fe617] rounded-xs mb-1" />
                  <span className="text-[11px] text-black dark:text-[#f2f7f4]">Header Bar</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addElement("shape_circle", {
                      name: "Circle Badge",
                      width: 50,
                      height: 50,
                      backgroundColor: "#f5f5f5",
                      borderColor: "#000000",
                      borderWidth: 1.5,
                      borderRadius: 50,
                    })
                  }
                  className="flex flex-col items-center p-3 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] transition-colors cursor-pointer"
                >
                  <Circle className="h-5 w-5 mb-1 text-black dark:text-[#8fe617]" />
                  <span className="text-[11px] text-black dark:text-[#f2f7f4]">Circle Badge</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addElement("shape_rect", {
                      name: "Divider Line",
                      width: 200,
                      height: 2,
                      backgroundColor: "#000000",
                      borderColor: "transparent",
                    })
                  }
                  className="flex flex-col items-center p-3 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] transition-colors cursor-pointer"
                >
                  <div className="h-0.5 w-8 bg-black dark:bg-[#8fe617] my-2.5" />
                  <span className="text-[11px] text-black dark:text-[#f2f7f4]">Divider Line</span>
                </button>
              </div>
            </div>
          )}

          {/* MIRROR TOOL TAB (USER REQUIREMENT) */}
          {activeTab === "mirror" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                  Mirror & Reverse Print
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-[#8a9e93] mt-1">
                  Mirror your card design for reverse-image transfer, transparent PVC, or back printing.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleMirrorDesign}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] transition-all text-xs font-bold text-black dark:text-[#f2f7f4] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FlipHorizontal className="h-4 w-4 text-black dark:text-[#8fe617]" />
                    <span>Flip Horizontal (X-Axis)</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-[#8a9e93]">Mirror</span>
                </button>

                <button
                  type="button"
                  onClick={handleFlipVertical}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#161d19] hover:border-black dark:hover:border-[#8fe617] hover:bg-white dark:hover:bg-[#1f2a22] transition-all text-xs font-bold text-black dark:text-[#f2f7f4] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FlipVertical className="h-4 w-4 text-black dark:text-[#8fe617]" />
                    <span>Flip Vertical (Y-Axis)</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-[#8a9e93]">Invert</span>
                </button>

                <div className="pt-2 border-t border-neutral-200 dark:border-[#223126]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-700 dark:text-[#8a9e93]">Live Mirror Preview:</span>
                    <input
                      type="checkbox"
                      checked={isMirrored}
                      onChange={(e) => setIsMirrored(e.target.checked)}
                      className="accent-black dark:accent-[#8fe617] h-4 w-4 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYERS TAB */}
          {activeTab === "layers" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider uppercase text-black dark:text-[#f2f7f4] font-mono">
                {activeSide} Layers ({currentElements.length})
              </h3>

              <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
                {currentElements
                  .slice()
                  .reverse()
                  .map((elem) => (
                    <div
                      key={elem.id}
                      onClick={() => setSelectedElementId(elem.id)}
                      className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-colors ${
                        selectedElementId === elem.id
                          ? "border-black dark:border-[#8fe617] bg-neutral-100 dark:bg-[#1f2a22] text-black dark:text-[#f2f7f4] font-semibold"
                          : "border-neutral-200 dark:border-[#223126] bg-white dark:bg-[#161d19] text-neutral-700 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
                      }`}
                    >
                      <div className="truncate pr-2">{elem.name}</div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleLayerOrder(elem.id, "up")}
                          className="p-1 text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#8fe617]"
                          title="Move Up"
                        >
                          <MoveUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLayerOrder(elem.id, "down")}
                          className="p-1 text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#8fe617]"
                          title="Move Down"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteElement(elem.id)}
                          className="p-1 text-neutral-600 dark:text-[#8a9e93] hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>

        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* CENTER INTERACTIVE WORKSPACE CANVAS (90% WHITE)                            */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        <main
          className="flex-1 bg-neutral-100 dark:bg-[#070908] relative overflow-auto flex flex-col items-center justify-center p-4 sm:p-8 transition-colors"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onTouchMove={(e) => {
            if (!isDragging || !selectedElementId) return;
            const touch = e.touches[0];
            if (!touch) return;
            let nextX = (touch.clientX - dragOffset.x) / zoom;
            let nextY = (touch.clientY - dragOffset.y) / zoom;
            if (snapToGrid) {
              nextX = Math.round(nextX / gridSize) * gridSize;
              nextY = Math.round(nextY / gridSize) * gridSize;
            }
            updateSelected({ x: Math.max(0, nextX), y: Math.max(0, nextY) });
          }}
          onTouchEnd={handleCanvasMouseUp}
          onClick={() => setSelectedElementId(null)}
        >
          {/* FLOATING CONTEXTUAL TOOLBAR FOR SELECTED ELEMENT */}
          {selectedElement && (
            <div
              className="absolute top-4 z-20 flex items-center gap-2 bg-white dark:bg-[#111613] border border-neutral-300 dark:border-[#223126] rounded-xl px-3 py-2 shadow-lg text-xs max-w-[95vw] overflow-x-auto text-[#080808] dark:text-[#f2f7f4]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-mono text-[11px] font-bold text-black dark:text-[#f2f7f4] pr-2 border-r border-neutral-200 dark:border-[#223126]">
                {selectedElement.name}
              </span>

              {/* Text specific controls */}
              {selectedElement.type === "text" && (
                <>
                  {/* Font Family Dropdown */}
                  <select
                    value={selectedElement.fontFamily || "Inter"}
                    onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                    className="rounded border border-neutral-300 dark:border-[#223126] bg-neutral-50 dark:bg-[#070908] px-2 py-1 text-xs text-black dark:text-[#f2f7f4] font-mono focus:outline-none"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Impact">Impact</option>
                  </select>

                  {/* Font Size */}
                  <div className="flex items-center border border-neutral-300 dark:border-[#223126] rounded bg-neutral-50 dark:bg-[#070908]">
                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({
                          fontSize: Math.max(8, (selectedElement.fontSize || 12) - 1),
                        })
                      }
                      className="px-1.5 py-0.5 text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-[11px] px-1 font-bold text-black dark:text-[#f2f7f4]">
                      {selectedElement.fontSize || 12}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({
                          fontSize: Math.min(48, (selectedElement.fontSize || 12) + 1),
                        })
                      }
                      className="px-1.5 py-0.5 text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Bold */}
                  <button
                    type="button"
                    onClick={() =>
                      updateSelected({
                        fontWeight:
                          selectedElement.fontWeight === "bold" ? "normal" : "bold",
                      })
                    }
                    className={`p-1.5 rounded border transition-colors cursor-pointer ${
                      selectedElement.fontWeight === "bold"
                        ? "border-black dark:border-[#8fe617] bg-black dark:bg-[#8fe617] text-white dark:text-[#062404] font-bold"
                        : "border-neutral-300 dark:border-[#223126] text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
                    }`}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>

                  {/* Align */}
                  <div className="flex items-center border border-neutral-300 dark:border-[#223126] rounded">
                    <button
                      type="button"
                      onClick={() => updateSelected({ textAlign: "left" })}
                      className={`p-1 cursor-pointer ${
                        selectedElement.textAlign === "left"
                          ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404]"
                          : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
                      }`}
                    >
                      <AlignLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelected({ textAlign: "center" })}
                      className={`p-1 cursor-pointer ${
                        selectedElement.textAlign === "center"
                          ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404]"
                          : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
                      }`}
                    >
                      <AlignCenter className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelected({ textAlign: "right" })}
                      className={`p-1 cursor-pointer ${
                        selectedElement.textAlign === "right"
                          ? "bg-black dark:bg-[#8fe617] text-white dark:text-[#062404]"
                          : "text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4]"
                      }`}
                    >
                      <AlignRight className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}

              {/* Align to Card Center/Middle */}
              <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-[#223126] pl-2">
                <button
                  type="button"
                  onClick={() => handleAlign("center")}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-neutral-200 dark:border-[#223126] hover:bg-neutral-100 dark:hover:bg-[#1f2a22] text-neutral-700 dark:text-[#f2f7f4] cursor-pointer"
                  title="Center Horizontally on Card"
                >
                  H-Center
                </button>
                <button
                  type="button"
                  onClick={() => handleAlign("middle")}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-neutral-200 dark:border-[#223126] hover:bg-neutral-100 dark:hover:bg-[#1f2a22] text-neutral-700 dark:text-[#f2f7f4] cursor-pointer"
                  title="Center Vertically on Card"
                >
                  V-Center
                </button>
              </div>

              {/* Opacity Slider */}
              <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-[#223126] pl-2">
                <span className="text-[10px] font-mono text-neutral-500 dark:text-[#8a9e93]">Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={selectedElement.opacity ?? 1}
                  onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })}
                  className="w-16 accent-black dark:accent-[#8fe617] cursor-pointer"
                />
              </div>

              {/* Rotate Stepper */}
              <button
                type="button"
                onClick={() => updateSelected({ rotation: ((selectedElement.rotation || 0) + 90) % 360 })}
                className="p-1 rounded text-neutral-700 dark:text-[#f2f7f4] hover:text-black dark:hover:text-[#8fe617] flex items-center gap-1 text-[10px] font-mono border-l border-neutral-200 dark:border-[#223126] pl-2 cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="h-3 w-3" />
                <span>{selectedElement.rotation || 0}°</span>
              </button>

              {/* Lock / Unlock Toggle */}
              <button
                type="button"
                onClick={() => handleToggleLock(selectedElement.id)}
                className="p-1.5 rounded text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] cursor-pointer"
                title={selectedElement.isLocked ? "Unlock element" : "Lock element"}
              >
                {selectedElement.isLocked ? (
                  <Lock className="h-3.5 w-3.5 text-black dark:text-[#8fe617]" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => handleDuplicateElement(selectedElement.id)}
                className="p-1.5 rounded text-neutral-600 dark:text-[#8a9e93] hover:text-black dark:hover:text-[#f2f7f4] cursor-pointer"
                title="Duplicate (Ctrl+D)"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="p-1.5 rounded text-neutral-600 dark:text-[#8a9e93] hover:text-red-600 cursor-pointer"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* CR80 Physical Card Canvas Surface */}
          <div
            id="canva-card-canvas"
            className="relative shadow-2xl transition-all border-2 border-neutral-300 rounded-lg overflow-hidden"
            style={{
              width: `${canvasWidthPx * zoom}px`,
              height: `${canvasHeightPx * zoom}px`,
              backgroundColor: currentBg.color,
              backgroundImage: currentBg.url ? `url(${currentBg.url})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: isMirrored ? "scaleX(-1)" : "none",
              transformOrigin: "center center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu(null);
            }}
            onContextMenu={(e) => handleContextMenu(e, null)}
          >
            {/* Elements Layer */}
            {currentElements
              .filter((elem) => elem.isVisible)
              .map((elem) => {
                const isSelected = selectedElementId === elem.id;

                let displayContent = elem.content || "";
                if (elem.dynamicToken && currentStudent) {
                  if (elem.dynamicToken === "{Name}") displayContent = currentStudent.fullName;
                  if (elem.dynamicToken === "{StudentID}") displayContent = currentStudent.studentId;
                  if (elem.dynamicToken === "{Grade}") displayContent = currentStudent.grade;
                  if (elem.dynamicToken === "{Phone}") displayContent = currentStudent.phone;
                }

                return (
                  <div
                    key={elem.id}
                    onMouseDown={(e) => handleElementMouseDown(e, elem)}
                    onTouchStart={(e) => handleElementTouchStart(e, elem)}
                    onTouchEnd={handleElementTouchEnd}
                    onContextMenu={(e) => handleContextMenu(e, elem.id)}
                    className={`absolute select-none cursor-move transition-shadow ${
                      isSelected
                        ? "ring-2 ring-black z-50 shadow-lg"
                        : "hover:ring-1 hover:ring-neutral-400"
                    }`}
                    style={{
                      left: `${elem.x * zoom}px`,
                      top: `${elem.y * zoom}px`,
                      width: `${elem.width * zoom}px`,
                      height: `${elem.height * zoom}px`,
                      zIndex: elem.zIndex,
                      opacity: elem.opacity ?? 1,
                      transform: elem.rotation ? `rotate(${elem.rotation}deg)` : "none",
                      backgroundColor: elem.backgroundColor || "transparent",
                      border: elem.borderWidth
                        ? `${elem.borderWidth * zoom}px solid ${elem.borderColor || "#000000"}`
                        : "none",
                      borderRadius: elem.borderRadius ? `${elem.borderRadius * zoom}px` : "0px",
                    }}
                  >
                    {/* Floating One-Tap Edit Button on Selection (for Phone & Desktop) */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, elem.id);
                        }}
                        className="absolute -top-7 left-0 z-[60] flex items-center gap-1 rounded bg-black text-white px-2 py-0.5 text-[10px] font-mono shadow-md hover:bg-neutral-800 transition-colors pointer-events-auto"
                        title="Edit Element Actions"
                      >
                        <span>Edit</span>
                        <span>⋮</span>
                      </button>
                    )}
                    {/* Render Types */}
                    {elem.type === "text" && (
                      <div
                        className="w-full h-full flex items-center overflow-hidden"
                        style={{
                          color: elem.color || "#000000",
                          fontFamily: elem.fontFamily || "Inter",
                          fontSize: `${(elem.fontSize || 12) * zoom}px`,
                          fontWeight: elem.fontWeight || "normal",
                          textAlign: elem.textAlign || "left",
                        }}
                      >
                        {displayContent}
                      </div>
                    )}

                    {elem.type === "photo" && (
                      <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center overflow-hidden">
                        {currentStudent?.photoPath ? (
                          <img
                            src={currentStudent.photoPath}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-1">
                            <Camera className="h-5 w-5 text-neutral-500 mb-1" />
                            <span className="text-[9px] font-mono text-neutral-600 font-bold">
                              {elem.dynamicToken || "PHOTO"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {elem.type === "qr" && (
                      <div className="w-full h-full bg-white flex flex-col items-center justify-center overflow-hidden p-1">
                        {currentStudent?.qrCodeData ? (
                          <img
                            src={`/api/qr?data=${encodeURIComponent(currentStudent.qrCodeData)}`}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center">
                            <QrCode className="h-6 w-6 text-black mb-0.5" />
                            <span className="text-[8px] font-mono text-black font-bold">
                              {elem.dynamicToken || "QR"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {elem.type === "shape_rect" && <div className="w-full h-full" />}
                  </div>
                );
              })}
          </div>

          {/* Student Live Preview Switcher */}
          {sampleStudents.length > 0 && (
            <div className="mt-6 flex items-center gap-3 bg-white dark:bg-[#111613] border border-neutral-300 dark:border-[#223126] rounded-xl px-4 py-2 text-xs font-mono text-neutral-600 dark:text-[#8a9e93] shadow-sm">
              <span className="text-black dark:text-[#f2f7f4] font-bold">DATA PREVIEW:</span>
              <button
                type="button"
                onClick={() =>
                  setPreviewStudentIndex((prev) => (prev > 0 ? prev - 1 : sampleStudents.length - 1))
                }
                className="px-2 py-1 rounded bg-neutral-100 text-black hover:bg-neutral-200"
              >
                ◀ Prev
              </button>
              <span className="text-black font-semibold">
                {currentStudent?.fullName || "Student"} ({previewStudentIndex + 1} of{" "}
                {sampleStudents.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setPreviewStudentIndex((prev) => (prev < sampleStudents.length - 1 ? prev + 1 : 0))
                }
                className="px-2 py-1 rounded bg-neutral-100 text-black hover:bg-neutral-200"
              >
                Next ▶
              </button>
            </div>
          )}
        </main>
      </div>

      {/* CANVA RIGHT-CLICK CONTEXT MENU (USER REQUIREMENT) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] w-52 rounded-xl border-2 border-black dark:border-[#8fe617] bg-white dark:bg-[#111613] shadow-2xl py-1.5 text-xs text-black dark:text-[#f2f7f4] animate-in fade-in zoom-in-95 duration-100 font-mono select-none"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.elementId ? (
            <>
              <div className="px-3 py-1 text-[10px] text-neutral-400 dark:text-[#8a9e93] uppercase tracking-wider border-b border-neutral-100 dark:border-[#223126] font-bold">
                Element Actions
              </div>
              <button
                type="button"
                onClick={() => {
                  handleDuplicateElement(contextMenu.elementId!);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5 text-[#8fe617]" /> Duplicate
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-[#8a9e93]">Ctrl+D</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleBringToFront(contextMenu.elementId!);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <MoveUp className="h-3.5 w-3.5" /> Bring to Front
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSendToBack(contextMenu.elementId!);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <MoveDown className="h-3.5 w-3.5" /> Send to Back
              </button>
              <button
                type="button"
                onClick={() => {
                  handleMirrorSingleElement(contextMenu.elementId!);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <FlipHorizontal className="h-3.5 w-3.5 text-[#8fe617]" /> Mirror Horizontally
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAlign("center");
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <span>Align H-Center</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAlign("middle");
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <span>Align V-Center</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleLock(contextMenu.elementId!);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                {currentElements.find((e) => e.id === contextMenu.elementId)?.isLocked ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Unlock Layer
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-[#8fe617]" /> Lock Layer
                  </>
                )}
              </button>
              <div className="border-t border-neutral-100 dark:border-[#223126] my-1" />
              <button
                type="button"
                onClick={() => {
                  handleDeleteElement(contextMenu.elementId!);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </span>
                <span className="text-[10px]">Del</span>
              </button>
            </>
          ) : (
            <>
              <div className="px-3 py-1 text-[10px] text-neutral-400 dark:text-[#8a9e93] uppercase tracking-wider border-b border-neutral-100 dark:border-[#223126] font-bold">
                Canvas Options
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWebcamModalOpen(true);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5 text-[#8fe617]" /> Shoot Webcam Portrait
              </button>
              <button
                type="button"
                onClick={() => {
                  handleMirrorDesign();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <FlipHorizontal className="h-3.5 w-3.5 text-[#8fe617]" /> Mirror Full Card
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClearAllExamples();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-[#1f2a22] transition-colors text-left text-neutral-900 dark:text-[#f2f7f4] cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" /> Clear All (Blank Canvas)
              </button>
            </>
          )}
        </div>
      )}

      {/* WebRTC Camera Modal in Canva (User Requirement) */}
      <CameraModal
        isOpen={isWebcamModalOpen}
        onClose={() => setIsWebcamModalOpen(false)}
        onCapture={handleWebcamCaptureCanva}
      />
    </div>
  );
}
