"use client";

// ============================================================================
// STUDENT BRIDGE — SMARTPHONE STUDIO ID PHOTO CROPPER & EDITOR
//
// Phone-Calibrated Features:
// - Zero Auto-Crop: Opens at 100% full bounds of the image (no cut-offs)
// - Phone-Like Tiny Borders: 1px crisp white border, delicate white L-corners,
//   subtle edge tick marks, and fine rule-of-thirds grid
// - Viewport Stability: Fixed-height toolbar dock prevents container shifting
//   when switching tabs or toggling Enhance
// - Exact WYSIWYG 300 DPI Export: Offscreen canvas math matches the DOM preview
//   pixel-for-pixel
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Sun,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  UploadCloud,
} from "lucide-react";
import { convertBlobTo300Dpi } from "@/lib/jpeg-dpi";

export interface PhotoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  originalImageSrc: string;
  originalFile?: File | null;
  studentId?: string;
  fallbackImageSrc?: string;
  onSave: (editedBlob: Blob, originalBlob: Blob | null, metadata: PhotoMetadata) => void;
  onRetake?: () => void;
}

export interface PhotoMetadata {
  crop: { x: number; y: number; width: number; height: number };
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  exposure: number;
  saturation: number;
  sharpness: number;
  backgroundColor: string;
}

type AspectRatioMode = "free" | "3:4" | "1:1";
type ActiveTab = "crop" | "rotate" | "enhance" | "light";
type DragHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move" | null;

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PhotoEditorModal: React.FC<PhotoEditorProps> = ({
  isOpen,
  onClose,
  originalImageSrc,
  originalFile,
  studentId,
  fallbackImageSrc,
  onSave,
  onRetake,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string>(originalImageSrc);
  const [loadingImage, setLoadingImage] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("crop");

  // Transform States
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [fineAngle, setFineAngle] = useState<number>(0); // -45 to +45
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("free");

  // Lighting & Detail Filters
  const [brightness, setBrightness] = useState<number>(0); // -50 to +50
  const [contrast, setContrast] = useState<number>(0); // -50 to +50
  const [saturation, setSaturation] = useState<number>(0); // -50 to +50
  const [isEnhanced, setIsEnhanced] = useState<boolean>(false);

  // Interactive Crop Box in Container Display Pixels
  const [cropBox, setCropBox] = useState<CropRect>({ x: 10, y: 10, width: 300, height: 400 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 480,
  });

  // Drag interaction state
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const dragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  /**
   * Calculates the exact rectangle of the image as rendered with CSS object-contain
   * inside the container element.
   */
  const getRenderedImageRect = useCallback(
    (cW: number, cH: number, img: HTMLImageElement) => {
      const naturalW = img.naturalWidth || img.width || cW;
      const naturalH = img.naturalHeight || img.height || cH;
      const imgAspect = naturalW / naturalH;
      const containerAspect = cW / cH;

      let rW: number;
      let rH: number;
      let rX: number;
      let rY: number;

      if (imgAspect > containerAspect) {
        rW = cW;
        rH = cW / imgAspect;
        rX = 0;
        rY = (cH - rH) / 2;
      } else {
        rH = cH;
        rW = cH * imgAspect;
        rX = (cW - rW) / 2;
        rY = 0;
      }

      return {
        width: Math.round(rW),
        height: Math.round(rH),
        x: Math.round(rX),
        y: Math.round(rY),
      };
    },
    []
  );

  /**
   * Resets crop box to 100% of the displayed image (ZERO auto-crop).
   */
  const resetToDefaultCrop = useCallback(
    (imgEl?: HTMLImageElement) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cW = Math.max(rect.width, 240);
      const cH = Math.max(rect.height, 320);
      setContainerSize({ width: cW, height: cH });

      const targetImg = imgEl || imageRef.current;
      if (targetImg) {
        // Encompass 100% of the image without any auto-crop cut-off
        const rRect = getRenderedImageRect(cW, cH, targetImg);
        setCropBox({
          x: Math.max(0, rRect.x),
          y: Math.max(0, rRect.y),
          width: Math.min(cW, rRect.width),
          height: Math.min(cH, rRect.height),
        });
      } else {
        setCropBox({
          x: 0,
          y: 0,
          width: cW,
          height: cH,
        });
      }

      setAspectRatio("free");
      setZoom(1);
      setRotation(0);
      setFineAngle(0);
      setIsFlippedH(false);
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setIsEnhanced(false);
    },
    [getRenderedImageRect]
  );

  // Initialize and load image reliably with blob URL, data URI sanitization, and multi-tier fallbacks
  useEffect(() => {
    if (!originalImageSrc && !originalFile) {
      setLoadingImage(false);
      return;
    }

    let isCancelled = false;
    setLoadingImage(true);
    setIsImageLoaded(false);
    setLoadError(false);

    const loadImageElement = (srcUrl: string) => {
      const img = new Image();
      // Only set crossOrigin if not a blob or data URI
      if (!srcUrl.startsWith("blob:") && !srcUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        if (isCancelled) return;
        imageRef.current = img;
        setResolvedSrc(srcUrl);
        setIsImageLoaded(true);
        setLoadingImage(false);
        setLoadError(false);
        resetToDefaultCrop(img);
      };
      img.onerror = () => {
        if (isCancelled) return;
        // If failed with anonymous crossOrigin, retry without crossOrigin
        if (img.crossOrigin) {
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            if (isCancelled) return;
            imageRef.current = fallbackImg;
            setResolvedSrc(srcUrl);
            setIsImageLoaded(true);
            setLoadingImage(false);
            setLoadError(false);
            resetToDefaultCrop(fallbackImg);
          };
          fallbackImg.onerror = () => {
            if (isCancelled) return;
            setIsImageLoaded(false);
            setLoadingImage(false);
            setLoadError(true);
          };
          fallbackImg.src = srcUrl;
        } else {
          setIsImageLoaded(false);
          setLoadingImage(false);
          setLoadError(true);
        }
      };
      img.src = srcUrl;
    };

    const startLoading = async () => {
      setLoadError(false);
      setLoadingImage(true);

      if (originalFile) {
        const fileBlobUrl = URL.createObjectURL(originalFile);
        loadImageElement(fileBlobUrl);
        return;
      }

      let cleanSrc = originalImageSrc;
      // Strip any corrupting query parameter from base64 data URIs
      if (cleanSrc.startsWith("data:")) {
        cleanSrc = cleanSrc.split("?")[0];
        loadImageElement(cleanSrc);
        return;
      }

      if (cleanSrc.startsWith("blob:")) {
        loadImageElement(cleanSrc);
        return;
      }

      // Step 1: Attempt direct same-origin/CORS blob fetch
      try {
        const res = await fetch(cleanSrc, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          if (!isCancelled && blob.size > 0) {
            const blobUrl = URL.createObjectURL(blob);
            loadImageElement(blobUrl);
            return;
          }
        }
      } catch {}

      // Step 2: Fallback to same-origin proxy /api/uploads?file=... to avoid canvas tainting
      try {
        const proxyRes = await fetch(`/api/uploads?file=${encodeURIComponent(cleanSrc)}`);
        if (proxyRes.ok) {
          const blob = await proxyRes.blob();
          if (!isCancelled && blob.size > 0) {
            const blobUrl = URL.createObjectURL(blob);
            loadImageElement(blobUrl);
            return;
          }
        }
      } catch {}

      // Step 3: Fallback to single photo download endpoint by studentId
      if (studentId) {
        try {
          const singleRes = await fetch(`/api/photos/download-single?id=${encodeURIComponent(studentId)}`);
          if (singleRes.ok) {
            const blob = await singleRes.blob();
            if (!isCancelled && blob.size > 0) {
              const blobUrl = URL.createObjectURL(blob);
              loadImageElement(blobUrl);
              return;
            }
          }
        } catch {}
      }

      // Step 4: Fallback to alternate fallbackImageSrc (e.g. previewPath or thumbnailPath)
      if (fallbackImageSrc && fallbackImageSrc !== cleanSrc) {
        try {
          if (fallbackImageSrc.startsWith("data:") || fallbackImageSrc.startsWith("blob:")) {
            loadImageElement(fallbackImageSrc);
            return;
          }
          const fbRes = await fetch(fallbackImageSrc);
          if (fbRes.ok) {
            const blob = await fbRes.blob();
            if (!isCancelled && blob.size > 0) {
              const blobUrl = URL.createObjectURL(blob);
              loadImageElement(blobUrl);
              return;
            }
          }
        } catch {}
      }

      // Step 5: Direct URL load fallback
      if (!isCancelled) {
        loadImageElement(cleanSrc);
      }
    };

    startLoading();

    return () => {
      isCancelled = true;
    };
  }, [originalImageSrc, originalFile, studentId, fallbackImageSrc, resetToDefaultCrop]);

  // Recalculate container bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && imageRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /**
   * Applies 3:4 Aspect Ratio on demand.
   */
  const handleApply34Ratio = () => {
    setAspectRatio("3:4");
    const cW = containerSize.width;
    const cH = containerSize.height;

    let targetH = cropBox.height;
    let targetW = Math.round(targetH * (3 / 4));

    if (targetW > cW) {
      targetW = cW;
      targetH = Math.round(targetW * (4 / 3));
    }
    if (targetH > cH) {
      targetH = cH;
      targetW = Math.round(targetH * (3 / 4));
    }

    const centerX = cropBox.x + cropBox.width / 2;
    const centerY = cropBox.y + cropBox.height / 2;

    let newX = Math.round(centerX - targetW / 2);
    let newY = Math.round(centerY - targetH / 2);

    if (newX < 0) newX = 0;
    if (newX + targetW > cW) newX = cW - targetW;
    if (newY < 0) newY = 0;
    if (newY + targetH > cH) newY = cH - targetH;

    setCropBox({
      x: newX,
      y: newY,
      width: targetW,
      height: targetH,
    });
  };

  /**
   * Applies 1:1 Aspect Ratio on demand.
   */
  const handleApply11Ratio = () => {
    setAspectRatio("1:1");
    const cW = containerSize.width;
    const cH = containerSize.height;

    const size = Math.min(cropBox.width, cropBox.height, cW, cH);
    const centerX = cropBox.x + cropBox.width / 2;
    const centerY = cropBox.y + cropBox.height / 2;

    let newX = Math.round(centerX - size / 2);
    let newY = Math.round(centerY - size / 2);

    if (newX < 0) newX = 0;
    if (newX + size > cW) newX = cW - size;
    if (newY < 0) newY = 0;
    if (newY + size > cH) newY = cH - size;

    setCropBox({
      x: newX,
      y: newY,
      width: Math.round(size),
      height: Math.round(size),
    });
  };

  /**
   * Free Crop mode.
   */
  const handleApplyFreeRatio = () => {
    setAspectRatio("free");
  };

  // 90° Clockwise Rotation
  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Toggle Auto-Enhance preset (pure color adjustment, zero container shift)
  const handleToggleAutoEnhance = () => {
    if (isEnhanced) {
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setIsEnhanced(false);
    } else {
      setBrightness(6);
      setContrast(10);
      setSaturation(5);
      setIsEnhanced(true);
    }
  };

  // --------------------------------------------------------------------------
  // POINTER EVENT HANDLERS (Sleek Phone-Like Cropping Interaction)
  // --------------------------------------------------------------------------
  const startDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInteracting(true);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const { handle, startX, startY, startCrop } = dragRef.current;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const cW = containerSize.width;
    const cH = containerSize.height;
    const minSize = 30;

    const newBox: CropRect = { ...startCrop };

    // Move whole crop box
    if (handle === "move") {
      newBox.x = Math.max(0, Math.min(cW - startCrop.width, startCrop.x + deltaX));
      newBox.y = Math.max(0, Math.min(cH - startCrop.height, startCrop.y + deltaY));
    }
    // Top edge only
    else if (handle === "n") {
      const newY = Math.max(0, Math.min(startCrop.y + startCrop.height - minSize, startCrop.y + deltaY));
      newBox.y = Math.round(newY);
      newBox.height = Math.round(startCrop.y + startCrop.height - newY);
    }
    // Bottom edge only
    else if (handle === "s") {
      newBox.height = Math.round(Math.max(minSize, Math.min(cH - startCrop.y, startCrop.height + deltaY)));
    }
    // Left edge only
    else if (handle === "w") {
      const newX = Math.max(0, Math.min(startCrop.x + startCrop.width - minSize, startCrop.x + deltaX));
      newBox.x = Math.round(newX);
      newBox.width = Math.round(startCrop.x + startCrop.width - newX);
    }
    // Right edge only
    else if (handle === "e") {
      newBox.width = Math.round(Math.max(minSize, Math.min(cW - startCrop.x, startCrop.width + deltaX)));
    }
    // Corner SE
    else if (handle === "se") {
      let newW = Math.max(minSize, Math.min(cW - startCrop.x, startCrop.width + deltaX));
      let newH = Math.max(minSize, Math.min(cH - startCrop.y, startCrop.height + deltaY));
      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH * (3 / 4);
        }
      } else if (aspectRatio === "1:1") {
        const s = Math.min(newW, newH);
        newW = s;
        newH = s;
      }
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    }
    // Corner SW
    else if (handle === "sw") {
      let newW = Math.max(minSize, startCrop.width - deltaX);
      let newX = startCrop.x + (startCrop.width - newW);
      if (newX < 0) {
        newW += newX;
        newX = 0;
      }
      let newH = Math.max(minSize, Math.min(cH - startCrop.y, startCrop.height + deltaY));
      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH * (3 / 4);
          newX = startCrop.x + (startCrop.width - newW);
        }
      } else if (aspectRatio === "1:1") {
        const s = Math.min(newW, newH);
        newW = s;
        newH = s;
        newX = startCrop.x + (startCrop.width - newW);
      }
      newBox.x = Math.round(newX);
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    }
    // Corner NE
    else if (handle === "ne") {
      let newW = Math.max(minSize, Math.min(cW - startCrop.x, startCrop.width + deltaX));
      let newH = startCrop.height - deltaY;
      let newY = startCrop.y + (startCrop.height - newH);
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }
      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        newY = startCrop.y + (startCrop.height - newH);
        if (newY < 0) {
          newH = startCrop.y + startCrop.height;
          newW = newH * (3 / 4);
          newY = 0;
        }
      } else if (aspectRatio === "1:1") {
        const s = Math.min(newW, newH);
        newW = s;
        newH = s;
        newY = startCrop.y + (startCrop.height - newH);
      } else {
        if (newH < minSize) {
          newY = startCrop.y + startCrop.height - minSize;
          newH = minSize;
        }
      }
      newBox.x = Math.round(newBox.x);
      newBox.y = Math.round(newY);
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    }
    // Corner NW
    else if (handle === "nw") {
      let newW = Math.max(minSize, startCrop.width - deltaX);
      let newX = startCrop.x + (startCrop.width - newW);
      if (newX < 0) {
        newW += newX;
        newX = 0;
      }
      let newH = startCrop.height - deltaY;
      let newY = startCrop.y + (startCrop.height - newH);
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }
      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        newY = startCrop.y + (startCrop.height - newH);
        if (newY < 0) {
          newH = startCrop.y + startCrop.height;
          newW = newH * (3 / 4);
          newX = startCrop.x + (startCrop.width - newW);
          newY = 0;
        }
      } else if (aspectRatio === "1:1") {
        const s = Math.min(newW, newH);
        newW = s;
        newH = s;
        newX = startCrop.x + (startCrop.width - newW);
        newY = startCrop.y + (startCrop.height - newH);
      } else {
        if (newH < minSize) {
          newY = startCrop.y + startCrop.height - minSize;
          newH = minSize;
        }
      }
      newBox.x = Math.round(newX);
      newBox.y = Math.round(newY);
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    }

    setCropBox(newBox);
  };

  const stopDrag = () => {
    setIsInteracting(false);
    dragRef.current = null;
  };

  // --------------------------------------------------------------------------
  // EXACT WYSIWYG EXPORT ENGINE (Ultra-Clear 300 DPI Output)
  // --------------------------------------------------------------------------
  const handleSave = async () => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    // Get live container dimensions to guarantee zero mismatch
    const cRect = container.getBoundingClientRect();
    const cW = cRect.width || containerSize.width;
    const cH = cRect.height || containerSize.height;

    // Determine target output resolution (optimized 3:4 portrait ID card 300 DPI bounds)
    let exportWidth = 900;
    let exportHeight = 1200;

    if (aspectRatio === "1:1") {
      exportWidth = 900;
      exportHeight = 900;
    } else if (aspectRatio === "free") {
      const cropRatio = cropBox.width / cropBox.height;
      if (cropRatio >= 1) {
        exportWidth = 1200;
        exportHeight = Math.max(300, Math.round(1200 / cropRatio));
      } else {
        exportHeight = 1200;
        exportWidth = Math.max(300, Math.round(1200 * cropRatio));
      }
    } else {
      exportWidth = 900;
      exportHeight = 1200;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // White backdrop
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Exact scale factor from DOM crop box to export canvas
    const scaleFactor = exportWidth / cropBox.width;

    ctx.save();
    // Shift canvas origin so that cropBox.x, cropBox.y starts at (0, 0)
    ctx.translate(-cropBox.x * scaleFactor, -cropBox.y * scaleFactor);

    // Apply color filters matching CSS exactly
    const b = 100 + brightness;
    const c = 100 + contrast;
    const s = 100 + saturation;
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

    // Center of container in screen coordinates
    const imgCenterX = cW / 2;
    const imgCenterY = cH / 2;

    ctx.translate(imgCenterX * scaleFactor, imgCenterY * scaleFactor);
    ctx.rotate(((rotation + fineAngle) * Math.PI) / 180);
    if (isFlippedH) ctx.scale(-1, 1);
    ctx.scale(zoom, zoom);

    // Compute rendered dimensions of object-contain image
    const rRect = getRenderedImageRect(cW, cH, img);
    const drawW = rRect.width;
    const drawH = rRect.height;

    ctx.drawImage(
      img,
      (-drawW / 2) * scaleFactor,
      (-drawH / 2) * scaleFactor,
      drawW * scaleFactor,
      drawH * scaleFactor
    );

    ctx.restore();

    const finalizeExport = async (blob: Blob) => {
      try {
        const blob300Dpi = await convertBlobTo300Dpi(blob);
        const originalBlob = originalFile
          ? new Blob([originalFile], { type: originalFile.type })
          : null;

        onSave(blob300Dpi, originalBlob, {
          crop: { ...cropBox },
          zoom,
          rotation,
          brightness,
          contrast,
          exposure: 0,
          saturation,
          sharpness: isEnhanced ? 15 : 0,
          backgroundColor: "#ffffff",
        });
        onClose();
      } catch (finalizeErr) {
        console.warn("Notice: Error converting DPI, saving raw blob:", finalizeErr);
        onSave(blob, null, {
          crop: { ...cropBox },
          zoom,
          rotation,
          brightness,
          contrast,
          exposure: 0,
          saturation,
          sharpness: 0,
          backgroundColor: "#ffffff",
        });
        onClose();
      }
    };

    try {
      exportCanvas.toBlob(
        async (blob) => {
          if (blob) {
            await finalizeExport(blob);
          } else {
            try {
              const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.88);
              const res = await fetch(dataUrl);
              const fallbackBlob = await res.blob();
              await finalizeExport(fallbackBlob);
            } catch (fallbackErr) {
              console.error("Canvas export failed:", fallbackErr);
            }
          }
        },
        "image/jpeg",
        0.88
      );
    } catch {
      try {
        const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.88);
        const res = await fetch(dataUrl);
        const fallbackBlob = await res.blob();
        await finalizeExport(fallbackBlob);
      } catch (err) {
        console.error("Critical canvas export error:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white select-none animate-in fade-in duration-150"
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {/* ────────────────────────────────────────────────────────────────────
          TOP STUDIO HEADER (Minimalist, Phone-Like)
         ──────────────────────────────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/10 bg-[#050505] shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </button>

        <div className="flex items-center gap-2 rounded-full bg-neutral-900/90 border border-neutral-800 px-3.5 py-1 text-[11px] font-mono tracking-wide text-neutral-200">
          <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          <span className="font-semibold text-white">PHOTO STUDIO</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-300 uppercase font-mono">
            {aspectRatio === "3:4" ? "3:4 Portrait" : aspectRatio === "1:1" ? "1:1 Square" : "Free Crop"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer shadow-md"
        >
          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Save</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          MAIN VIEWPORT & PHONE-LIKE CROP CANVAS
         ──────────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center p-3 sm:p-4 overflow-hidden bg-[#000000]">
        <div
          ref={containerRef}
          className="relative aspect-[3/4] h-full max-h-[66vh] w-auto max-w-[95vw] bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center shadow-2xl border border-neutral-900"
          style={{ touchAction: "none" }}
        >
          {/* Loading Indicator */}
          {loadingImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/80 z-20 text-white font-mono text-xs">
              <Loader2 className="h-7 w-7 animate-spin text-[#8fe617]" />
              <span className="text-[#a4b8ad]">Preparing high-res photo...</span>
            </div>
          )}

          {/* Underlying Transformed Image */}
          {isImageLoaded && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedSrc}
              alt="Photo for editing"
              draggable={false}
              className="h-full w-full object-contain pointer-events-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation + fineAngle}deg) scaleX(${
                  isFlippedH ? -1 : 1
                })`,
                filter: `brightness(${100 + brightness}%) contrast(${
                  100 + contrast
                }%) saturate(${100 + saturation}%)`,
                transformOrigin: "center center",
              }}
            />
          )}

          {/* Clean Failure / Recovery State */}
          {!loadingImage && (!isImageLoaded || loadError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 bg-neutral-950 z-20">
              <div className="h-12 w-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-mono font-bold text-white">Portrait Retrieval Notice</p>
                <p className="text-xs text-[#8a9e93] font-mono mt-1 max-w-xs">
                  The previous portrait binary is being updated or unavailable. Select a replacement image or retry loading.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8fe617] text-[#062404] text-xs font-mono font-bold hover:brightness-105 transition-all cursor-pointer">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Choose Photo File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const url = URL.createObjectURL(f);
                        const img = new Image();
                        img.onload = () => {
                          imageRef.current = img;
                          setResolvedSrc(url);
                          setIsImageLoaded(true);
                          setLoadingImage(false);
                          setLoadError(false);
                          resetToDefaultCrop(img);
                        };
                        img.src = url;
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Phone-Like Crop Box: 1px Crisp White Border & Delicate Corners */}
          {isImageLoaded && (
          <div
            className="absolute border border-white/90 pointer-events-auto select-none"
            style={{
              left: `${cropBox.x}px`,
              top: `${cropBox.y}px`,
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.72)",
            }}
          >
            {/* Center Draggable Area to Move/Pan Crop Box */}
            <div
              className="absolute inset-0 cursor-move flex items-center justify-center"
              onPointerDown={(e) => startDrag("move", e)}
            >
              {/* Subtle Rule-of-Thirds Grid */}
              <div
                className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
                  isInteracting || activeTab === "crop" ? "opacity-75" : "opacity-25"
                }`}
              >
                <div className="absolute top-1/3 left-0 right-0 border-b border-white/30 border-dashed" />
                <div className="absolute top-2/3 left-0 right-0 border-b border-white/30 border-dashed" />
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-white/30 border-dashed" />
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-white/30 border-dashed" />
              </div>
            </div>

            {/* Delicate Phone-Like White L-Corner Brackets */}
            {/* Top-Left Corner (NW) */}
            <div
              className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-white cursor-nwse-resize z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("nw", e)}
            >
              <div className="absolute -top-2 -left-2 w-8 h-8" />
            </div>

            {/* Top-Right Corner (NE) */}
            <div
              className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-white cursor-nesw-resize z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("ne", e)}
            >
              <div className="absolute -top-2 -right-2 w-8 h-8" />
            </div>

            {/* Bottom-Left Corner (SW) */}
            <div
              className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-white cursor-nesw-resize z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("sw", e)}
            >
              <div className="absolute -bottom-2 -left-2 w-8 h-8" />
            </div>

            {/* Bottom-Right Corner (SE) */}
            <div
              className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-white cursor-nwse-resize z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("se", e)}
            >
              <div className="absolute -bottom-2 -right-2 w-8 h-8" />
            </div>

            {/* Subtle Phone-Style Edge Tick Marks */}
            {/* Top Edge Tick */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-6 z-20 cursor-ns-resize touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("n", e)}
            >
              <div className="w-7 h-1 bg-white/90 rounded-full shadow-xs" />
            </div>

            {/* Bottom Edge Tick */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-6 z-20 cursor-ns-resize touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("s", e)}
            >
              <div className="w-7 h-1 bg-white/90 rounded-full shadow-xs" />
            </div>

            {/* Left Edge Tick */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-10 z-20 cursor-ew-resize touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("w", e)}
            >
              <div className="h-7 w-1 bg-white/90 rounded-full shadow-xs" />
            </div>

            {/* Right Edge Tick */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-10 z-20 cursor-ew-resize touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("e", e)}
            >
              <div className="h-7 w-1 bg-white/90 rounded-full shadow-xs" />
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          BOTTOM CONTROLS DOCK (STRICTLY FIXED HEIGHT: ZERO CONTAINER SHIFT)
         ──────────────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10 bg-[#080808] px-4 shrink-0 h-44 flex flex-col justify-between py-2.5">
        {/* FIXED-HEIGHT TAB CONTENT AREA */}
        <div className="h-24 flex items-center justify-center w-full max-w-md mx-auto">
          {/* TAB 1: CROP & PROPORTIONS */}
          {activeTab === "crop" && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyFreeRatio}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-mono transition-all cursor-pointer ${
                    aspectRatio === "free"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
                  }`}
                >
                  Free Crop
                </button>

                <button
                  type="button"
                  onClick={handleApply34Ratio}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-mono transition-all cursor-pointer ${
                    aspectRatio === "3:4"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
                  }`}
                >
                  3:4 Portrait
                </button>

                <button
                  type="button"
                  onClick={handleApply11Ratio}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-mono transition-all cursor-pointer ${
                    aspectRatio === "1:1"
                      ? "bg-white text-black font-bold shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
                  }`}
                >
                  1:1 Square
                </button>

                <button
                  type="button"
                  onClick={() => resetToDefaultCrop()}
                  className="rounded-full p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors ml-1 cursor-pointer"
                  title="Reset to 100% full view"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-3 px-3">
                <ZoomOut className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <ZoomIn className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span className="text-[11px] font-mono text-neutral-300 w-10 text-right font-medium">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: ROTATE & STRAIGHTEN */}
          {activeTab === "rotate" && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleRotate90}
                  className="flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 px-4 py-1.5 text-xs font-mono text-white transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5 text-white" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlippedH((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono transition-all active:scale-95 cursor-pointer ${
                    isFlippedH
                      ? "bg-white text-black font-bold"
                      : "bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800"
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span>Flip Horizontal</span>
                </button>
              </div>

              {/* Fine Straighten Angle Slider */}
              <div className="flex items-center gap-3 px-3">
                <span className="text-[10px] font-mono text-neutral-400 shrink-0">-45°</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={fineAngle}
                  onChange={(e) => setFineAngle(parseFloat(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-400 shrink-0">+45°</span>
                <button
                  type="button"
                  onClick={() => setFineAngle(0)}
                  className="text-[10px] font-mono text-white bg-neutral-800 px-2 py-0.5 rounded hover:bg-neutral-700 cursor-pointer"
                >
                  {fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle}°`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PORTRAIT AI ENHANCE */}
          {activeTab === "enhance" && (
            <div className="w-full flex flex-col items-center justify-center space-y-2 text-center">
              <button
                type="button"
                onClick={handleToggleAutoEnhance}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-mono font-bold transition-all shadow-md cursor-pointer ${
                  isEnhanced
                    ? "bg-white text-black ring-2 ring-white/50"
                    : "bg-neutral-900 border border-neutral-800 text-white hover:border-white"
                }`}
              >
                <Sparkles className={`h-4 w-4 ${isEnhanced ? "text-black" : "text-white"}`} />
                <span>{isEnhanced ? "Enhanced ✓ (Clarity & Skin Tone)" : "One-Tap Auto Enhance"}</span>
              </button>
              <p className="text-[11px] text-neutral-400 font-mono">
                Auto-tunes studio lighting, skin clarity & portrait sharpness
              </p>
            </div>
          )}

          {/* TAB 4: LIGHTING & ADJUSTMENTS */}
          {activeTab === "light" && (
            <div className="w-full space-y-1.5 px-2 text-xs">
              {/* Brightness */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 w-16">Bright</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-200 w-8 text-right font-bold">
                  {brightness > 0 ? `+${brightness}` : brightness}
                </span>
              </div>

              {/* Contrast */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 w-16">Contrast</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-200 w-8 text-right font-bold">
                  {contrast > 0 ? `+${contrast}` : contrast}
                </span>
              </div>

              {/* Saturation */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 w-16">Color</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-200 w-8 text-right font-bold">
                  {saturation > 0 ? `+${saturation}` : saturation}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Phone-Like Navigation Bar */}
        <div className="flex items-center justify-around border-t border-white/10 pt-2 w-full max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("crop")}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
              activeTab === "crop" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Crop className="h-4 w-4" />
            <span>Crop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rotate")}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
              activeTab === "rotate" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <RotateCw className="h-4 w-4" />
            <span>Rotate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("enhance")}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
              activeTab === "enhance" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Enhance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("light")}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
              activeTab === "light" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </button>

          {onRetake && (
            <button
              type="button"
              onClick={onRetake}
              className="flex flex-col items-center gap-1 py-1 text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditorModal;
