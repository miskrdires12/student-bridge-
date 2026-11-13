import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop, RotateCw, ZoomIn, ZoomOut, X, Check,
  Wand2, Sliders, RotateCcw, Sun, Contrast,
  Sparkles, Maximize2
} from 'lucide-react';

interface PhoneCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
  title?: string;
  studentId?: string;
}

export type AspectRatioMode = 'FREE' | '3:4' | '4:3';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragAction =
  | 'MOVE'
  | 'HANDLE_TL'
  | 'HANDLE_TR'
  | 'HANDLE_BL'
  | 'HANDLE_BR'
  | 'HANDLE_T'
  | 'HANDLE_B'
  | 'HANDLE_L'
  | 'HANDLE_R'
  | null;

export const PhoneCropModal: React.FC<PhoneCropModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  title = 'Professional Photo Studio',
  studentId
}) => {
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageUrl);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('FREE');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [isAutoEnhanced, setIsAutoEnhanced] = useState<boolean>(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showFineTune, setShowFineTune] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 800 });
  const imageDimensionsRef = useRef<{ width: number; height: number }>({ width: 600, height: 800 });
  const userHasInteractedRef = useRef<boolean>(false);

  // Viewport Container & Crop Box State
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 320, height: 420 });
  const containerSizeRef = useRef<{ width: number; height: number }>({ width: 320, height: 420 });
  const [cropBox, setCropBox] = useState<CropRect>({ x: 20, y: 20, width: 280, height: 373 });
  const cropBoxRef = useRef<CropRect>(cropBox);
  const aspectRatioRef = useRef<AspectRatioMode>(aspectRatio);
  const hasInitializedCropRef = useRef<boolean>(false);

  useEffect(() => {
    containerSizeRef.current = containerSize;
  }, [containerSize]);

  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  useEffect(() => {
    aspectRatioRef.current = aspectRatio;
  }, [aspectRatio]);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedCropRef.current = false;
      userHasInteractedRef.current = false;
    }
  }, [isOpen]);

  // Dragging State
  const [dragAction, setDragAction] = useState<DragAction>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startCrop: CropRect; startPan: { x: number; y: number } }>({
    clientX: 0,
    clientY: 0,
    startCrop: { x: 20, y: 20, width: 280, height: 373 },
    startPan: { x: 0, y: 0 }
  });

  // Calculate full photo crop covering 100% of the entire photo without cropping any edges
  const initFullPhotoCrop = useCallback((cWidth: number, cHeight: number) => {
    const nw = imageDimensionsRef.current.width || 600;
    const nh = imageDimensionsRef.current.height || 800;
    const scale = Math.min(cWidth / nw, cHeight / nh);
    const dispW = Math.max(50, Math.round(nw * scale));
    const dispH = Math.max(50, Math.round(nh * scale));
    const initX = Math.round((cWidth - dispW) / 2);
    const initY = Math.round((cHeight - dispH) / 2);

    const fullPhotoBox: CropRect = {
      x: initX,
      y: initY,
      width: dispW,
      height: dispH
    };
    cropBoxRef.current = fullPhotoBox;
    setCropBox(fullPhotoBox);
  }, []);

  // Zero-taint in-memory base64 conversion
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    let isMounted = true;
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setIsAutoEnhanced(false);
    setPan({ x: 0, y: 0 });
    setIsSaving(false);
    setAspectRatio('FREE');
    aspectRatioRef.current = 'FREE';
    hasInitializedCropRef.current = false;
    userHasInteractedRef.current = false;

    if (imageUrl.startsWith('data:')) {
      setCurrentImageSrc(imageUrl);
      const tempImg = new Image();
      tempImg.onload = () => {
        if (isMounted && tempImg.naturalWidth && tempImg.naturalHeight) {
          const nw = tempImg.naturalWidth;
          const nh = tempImg.naturalHeight;
          imageDimensionsRef.current = { width: nw, height: nh };
          setImageDimensions({ width: nw, height: nh });
          if (!userHasInteractedRef.current) {
            initFullPhotoCrop(containerSizeRef.current.width, containerSizeRef.current.height);
          }
        }
      };
      tempImg.src = imageUrl;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = img.naturalWidth || 600;
        const nh = img.naturalHeight || 800;
        imageDimensionsRef.current = { width: nw, height: nh };
        if (isMounted) setImageDimensions({ width: nw, height: nh });
        if (!userHasInteractedRef.current) {
          initFullPhotoCrop(containerSizeRef.current.width, containerSizeRef.current.height);
        }

        const c = document.createElement('canvas');
        c.width = nw;
        c.height = nh;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const safeDataUrl = c.toDataURL('image/jpeg', 0.95);
          if (isMounted) setCurrentImageSrc(safeDataUrl);
          return;
        }
      } catch (e) {}
      if (isMounted) setCurrentImageSrc(imageUrl);
    };
    img.onerror = () => {
      if (isMounted) setCurrentImageSrc(imageUrl);
    };

    const sep = imageUrl.includes('?') ? '&' : '?';
    img.src = `${imageUrl}${sep}_t=${Date.now()}`;

    return () => {
      isMounted = false;
    };
  }, [imageUrl, isOpen]);

  // Initialize or adapt crop box when aspect ratio changes (preserving user crop & center)
  const applyAspectRatio = useCallback((ratio: AspectRatioMode, cWidth: number, cHeight: number, prevCrop?: CropRect) => {
    let newW: number;
    let newH: number;
    let newX: number;
    let newY: number;

    const hasValidPrev = Boolean(prevCrop && prevCrop.width >= 40 && prevCrop.height >= 40);

    if (ratio === 'FREE') {
      if (hasValidPrev && prevCrop) {
        // PRESERVE user's exact crop dimensions and position when switching to FREE
        newW = Math.min(prevCrop.width, cWidth);
        newH = Math.min(prevCrop.height, cHeight);
        newX = prevCrop.x;
        newY = prevCrop.y;
      } else {
        // Full photo fit for FREE mode
        const nw = imageDimensionsRef.current.width || 600;
        const nh = imageDimensionsRef.current.height || 800;
        const scale = Math.min(cWidth / nw, cHeight / nh);
        newW = Math.max(50, Math.round(nw * scale));
        newH = Math.max(50, Math.round(nh * scale));
        newX = Math.round((cWidth - newW) / 2);
        newY = Math.round((cHeight - newH) / 2);
      }
    } else {
      // ratio is '3:4' or '4:3'
      const targetAspect = ratio === '3:4' ? 3 / 4 : 4 / 3;

      if (hasValidPrev && prevCrop) {
        // User has framed/selected their crop!
        // Fit target aspect ratio WITHIN or centered on the user's framed selection.
        const prevW = prevCrop.width;
        const prevH = prevCrop.height;
        const curAspect = prevW / prevH;

        if (curAspect > targetAspect) {
          // User selection is wider than target ratio (e.g. 3:4 portrait)
          // Keep selection height and adjust width to target ratio
          newH = prevH;
          newW = Math.round(newH * targetAspect);
        } else {
          // User selection is taller than target ratio
          // Keep selection width and adjust height to target ratio
          newW = prevW;
          newH = Math.round(newW / targetAspect);
          if (newH > cHeight) {
            newH = cHeight;
            newW = Math.round(newH * targetAspect);
          }
        }

        // Center on the user's existing crop box center
        const curCenterX = prevCrop.x + prevCrop.width / 2;
        const curCenterY = prevCrop.y + prevCrop.height / 2;

        newX = Math.round(curCenterX - newW / 2);
        newY = Math.round(curCenterY - newH / 2);
      } else {
        // Initial setup - fit target aspect ratio to container
        const maxW = Math.max(100, cWidth - 24);
        const maxH = Math.max(100, cHeight - 24);
        if (maxW / maxH > targetAspect) {
          newH = maxH;
          newW = Math.round(newH * targetAspect);
        } else {
          newW = maxW;
          newH = Math.round(newW / targetAspect);
        }
        newX = Math.round((cWidth - newW) / 2);
        newY = Math.round((cHeight - newH) / 2);
      }
    }

    // Boundary clamp: keep crop box completely within container
    newX = Math.max(0, Math.min(newX, cWidth - newW));
    newY = Math.max(0, Math.min(newY, cHeight - newH));

    const updatedBox: CropRect = {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH)
    };

    cropBoxRef.current = updatedBox;
    setCropBox(updatedBox);
  }, []);

  // Measure container and initialize crop box once when modal opens,
  // or adjust container on window resize WITHOUT resetting user crop.
  useEffect(() => {
    if (!isOpen) return;

    const measureAndInit = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.round(rect.width) || 320;
        const h = Math.round(rect.height) || 420;
        setContainerSize({ width: w, height: h });

        if (!hasInitializedCropRef.current) {
          hasInitializedCropRef.current = true;
          initFullPhotoCrop(w, h);
        }
      }
    };

    const timer = setTimeout(measureAndInit, 50);
    window.addEventListener('resize', measureAndInit);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureAndInit);
    };
  }, [isOpen, initFullPhotoCrop]);

  // Handle Aspect Ratio Tab Switching preserving crop box & center
  const handleSelectAspectRatio = (mode: AspectRatioMode) => {
    userHasInteractedRef.current = true;
    setAspectRatio(mode);
    aspectRatioRef.current = mode;
    applyAspectRatio(mode, containerSize.width, containerSize.height, cropBoxRef.current);
  };

  // Start drag handler
  const startDrag = (action: DragAction, clientX: number, clientY: number) => {
    userHasInteractedRef.current = true;
    setDragAction(action);
    dragStartRef.current = {
      clientX,
      clientY,
      startCrop: { ...cropBoxRef.current },
      startPan: { ...pan }
    };
  };

  // Drag Movement Handler
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragAction) return;

    const dx = clientX - dragStartRef.current.clientX;
    const dy = clientY - dragStartRef.current.clientY;
    const { startCrop } = dragStartRef.current;
    const minSize = 60;
    const cW = containerSize.width;
    const cH = containerSize.height;

    if (dragAction === 'MOVE') {
      let nextX = startCrop.x + dx;
      let nextY = startCrop.y + dy;
      nextX = Math.max(0, Math.min(nextX, cW - startCrop.width));
      nextY = Math.max(0, Math.min(nextY, cH - startCrop.height));
      const movedBox = {
        ...startCrop,
        x: Math.round(nextX),
        y: Math.round(nextY)
      };
      cropBoxRef.current = movedBox;
      setCropBox(movedBox);
      return;
    }

    let newX = startCrop.x;
    let newY = startCrop.y;
    let newW = startCrop.width;
    let newH = startCrop.height;

    // Corner / Edge Resizing
    if (dragAction === 'HANDLE_BR') {
      newW = Math.max(minSize, Math.min(startCrop.width + dx, cW - startCrop.x));
      if (aspectRatio === 'FREE') {
        newH = Math.max(minSize, Math.min(startCrop.height + dy, cH - startCrop.y));
      } else {
        const ratioVal = aspectRatio === '3:4' ? 4 / 3 : 3 / 4;
        newH = newW * ratioVal;
        if (newY + newH > cH) {
          newH = cH - newY;
          newW = newH / ratioVal;
        }
      }
    } else if (dragAction === 'HANDLE_TL') {
      const maxX = startCrop.x + startCrop.width - minSize;
      const maxY = startCrop.y + startCrop.height - minSize;
      newX = Math.min(maxX, Math.max(0, startCrop.x + dx));
      newW = startCrop.width - (newX - startCrop.x);

      if (aspectRatio === 'FREE') {
        newY = Math.min(maxY, Math.max(0, startCrop.y + dy));
        newH = startCrop.height - (newY - startCrop.y);
      } else {
        const ratioVal = aspectRatio === '3:4' ? 4 / 3 : 3 / 4;
        newH = newW * ratioVal;
        newY = startCrop.y + startCrop.height - newH;
        if (newY < 0) {
          newY = 0;
          newH = startCrop.y + startCrop.height;
          newW = newH / ratioVal;
          newX = startCrop.x + startCrop.width - newW;
        }
      }
    } else if (dragAction === 'HANDLE_TR') {
      newW = Math.max(minSize, Math.min(startCrop.width + dx, cW - startCrop.x));
      if (aspectRatio === 'FREE') {
        const maxY = startCrop.y + startCrop.height - minSize;
        newY = Math.min(maxY, Math.max(0, startCrop.y + dy));
        newH = startCrop.height - (newY - startCrop.y);
      } else {
        const ratioVal = aspectRatio === '3:4' ? 4 / 3 : 3 / 4;
        newH = newW * ratioVal;
        newY = startCrop.y + startCrop.height - newH;
        if (newY < 0) {
          newY = 0;
          newH = startCrop.y + startCrop.height;
          newW = newH / ratioVal;
        }
      }
    } else if (dragAction === 'HANDLE_BL') {
      const maxX = startCrop.x + startCrop.width - minSize;
      newX = Math.min(maxX, Math.max(0, startCrop.x + dx));
      newW = startCrop.width - (newX - startCrop.x);

      if (aspectRatio === 'FREE') {
        newH = Math.max(minSize, Math.min(startCrop.height + dy, cH - startCrop.y));
      } else {
        const ratioVal = aspectRatio === '3:4' ? 4 / 3 : 3 / 4;
        newH = newW * ratioVal;
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH / ratioVal;
          newX = startCrop.x + startCrop.width - newW;
        }
      }
    } else {
      // Direct Edge Handles (Active in FREE and Fixed Modes, Phone-Style)
      const isFixed = aspectRatio !== 'FREE';
      const ratioVal = aspectRatio === '3:4' ? 4 / 3 : 3 / 4;

      if (dragAction === 'HANDLE_R') {
        newW = Math.max(minSize, Math.min(startCrop.width + dx, cW - startCrop.x));
        if (isFixed) {
          newH = Math.max(minSize, newW * ratioVal);
          if (newH > cH) {
            newH = cH;
            newW = newH / ratioVal;
          }
          const centerY = startCrop.y + startCrop.height / 2;
          newY = Math.max(0, Math.min(centerY - newH / 2, cH - newH));
        }
      } else if (dragAction === 'HANDLE_L') {
        const maxX = startCrop.x + startCrop.width - minSize;
        newX = Math.min(maxX, Math.max(0, startCrop.x + dx));
        newW = startCrop.width - (newX - startCrop.x);
        if (isFixed) {
          newH = Math.max(minSize, newW * ratioVal);
          if (newH > cH) {
            newH = cH;
            newW = newH / ratioVal;
            newX = startCrop.x + startCrop.width - newW;
          }
          const centerY = startCrop.y + startCrop.height / 2;
          newY = Math.max(0, Math.min(centerY - newH / 2, cH - newH));
        }
      } else if (dragAction === 'HANDLE_B') {
        newH = Math.max(minSize, Math.min(startCrop.height + dy, cH - startCrop.y));
        if (isFixed) {
          newW = Math.max(minSize, newH / ratioVal);
          if (newW > cW) {
            newW = cW;
            newH = newW * ratioVal;
          }
          const centerX = startCrop.x + startCrop.width / 2;
          newX = Math.max(0, Math.min(centerX - newW / 2, cW - newW));
        }
      } else if (dragAction === 'HANDLE_T') {
        const maxY = startCrop.y + startCrop.height - minSize;
        newY = Math.min(maxY, Math.max(0, startCrop.y + dy));
        newH = startCrop.height - (newY - startCrop.y);
        if (isFixed) {
          newW = Math.max(minSize, newH / ratioVal);
          if (newW > cW) {
            newW = cW;
            newH = newW * ratioVal;
            newY = startCrop.y + startCrop.height - newH;
          }
          const centerX = startCrop.x + startCrop.width / 2;
          newX = Math.max(0, Math.min(centerX - newW / 2, cW - newW));
        }
      }
    }

    const updatedBox = {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH)
    };
    cropBoxRef.current = updatedBox;
    setCropBox(updatedBox);
  }, [dragAction, aspectRatio, containerSize]);

  // Window event listeners for drag tracking
  useEffect(() => {
    if (!dragAction) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      setDragAction(null);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      setDragAction(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragAction, handleDragMove]);

  // Auto-Enhance Preset (Toggleable with clear visual feedback)
  const handleAutoEnhance = () => {
    if (!isAutoEnhanced) {
      setBrightness(115);
      setContrast(118);
      setSaturation(110);
      setIsAutoEnhanced(true);
    } else {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setIsAutoEnhanced(false);
    }
  };

  // Reset to default calibration
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setIsAutoEnhanced(false);
    setAspectRatio('FREE');
    aspectRatioRef.current = 'FREE';
    userHasInteractedRef.current = false;
    initFullPhotoCrop(containerSize.width, containerSize.height);
  };

  // Canvas Exporter
  const handleSaveCrop = async () => {
    if (!currentImageSrc) return;
    setIsSaving(true);

    try {
      const activeCropBox = cropBoxRef.current || cropBox;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = currentImageSrc;
      });

      const exportCanvas = document.createElement('canvas');
      // Target Export Resolution
      let targetW = 600;
      let targetH = 800;

      if (aspectRatio === '4:3') {
        targetW = 800;
        targetH = 600;
      } else if (aspectRatio === 'FREE') {
        const factor = Math.max(600 / activeCropBox.width, 600 / activeCropBox.height);
        targetW = Math.round(activeCropBox.width * factor);
        targetH = Math.round(activeCropBox.height * factor);
      }

      exportCanvas.width = targetW;
      exportCanvas.height = targetH;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      // Color/Lighting Filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      // Scale factor from Viewport Crop Box to Image coordinates
      const cW = containerSize.width || 320;
      const cH = containerSize.height || 420;

      // Natural image aspect vs container
      const imgNaturalW = img.naturalWidth || 600;
      const imgNaturalH = img.naturalHeight || 800;

      // Base display scale of image inside container
      const scaleFit = Math.min(cW / imgNaturalW, cH / imgNaturalH);
      const displayW = imgNaturalW * scaleFit * zoom;
      const displayH = imgNaturalH * scaleFit * zoom;

      const imgDisplayX = (cW - displayW) / 2 + pan.x;
      const imgDisplayY = (cH - displayH) / 2 + pan.y;

      // Compute offset of crop box relative to image center
      const cropCenterX = activeCropBox.x + activeCropBox.width / 2;
      const cropCenterY = activeCropBox.y + activeCropBox.height / 2;

      ctx.save();
      // Move canvas origin to center of export
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Scale ratio from activeCropBox dimensions to export canvas
      const scaleX = targetW / activeCropBox.width;
      const scaleY = targetH / activeCropBox.height;

      // Image center relative to crop box center
      const imgRelX = (imgDisplayX + displayW / 2) - cropCenterX;
      const imgRelY = (imgDisplayY + displayH / 2) - cropCenterY;

      ctx.drawImage(
        img,
        imgRelX * scaleX - (displayW * scaleX) / 2,
        imgRelY * scaleY - (displayH * scaleY) / 2,
        displayW * scaleX,
        displayH * scaleY
      );

      ctx.restore();

      const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      onSave(croppedDataUrl);
      onClose();
    } catch (err: any) {
      console.error('Photo export error:', err);
      alert('Photo rendering failed: ' + (err?.message || 'Please retry.'));
    } finally {
      setIsSaving(false);
    }
  };

  const cW = containerSize.width || 320;
  const cH = containerSize.height || 420;
  const imgNatW = imageDimensions.width || 600;
  const imgNatH = imageDimensions.height || 800;
  const scaleFit = Math.min(cW / imgNatW, cH / imgNatH);
  const baseW = Math.max(50, Math.round(imgNatW * scaleFit));
  const baseH = Math.max(50, Math.round(imgNatH * scaleFit));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-x-hidden overflow-y-auto">
      <div className="bg-[#0B1118] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-x-hidden text-slate-100 max-h-[96vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0F1722]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#85E510] flex items-center justify-center border border-[#85E510]/30 shadow-sm">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#85E510]/20 text-[#85E510] border border-[#85E510]/40">
                  {aspectRatio === 'FREE' ? 'Full Photo (Free)' : aspectRatio === '3:4' ? '3:4 ID Standard' : '4:3 Landscape'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {studentId ? `Student ID: ${studentId}` : 'Interactive crop & rotation studio'}
              </p>
            </div>
          </div>

          {/* Top Controls: Auto-Enhance & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoEnhance}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isAutoEnhanced
                  ? 'bg-[#85E510] text-[#062404] border-[#85E510] shadow-[0_0_12px_rgba(133,229,16,0.4)]'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
              }`}
              title={isAutoEnhanced ? "Auto-Enhance Active (Click to Reset)" : "Auto-Enhance Lighting & Contrast"}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAutoEnhanced ? 'text-[#062404]' : 'text-amber-400'}`} />
              <span>{isAutoEnhanced ? 'Enhanced ✓' : 'Auto-Enhance'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aspect Ratio Selector Pills (1:1 and Lighting tab removed from top) */}
        <div className="px-5 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-hidden flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Aspect Ratio:</span>
            {(['FREE', '3:4', '4:3'] as AspectRatioMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleSelectAspectRatio(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  aspectRatio === mode
                    ? 'bg-[#85E510] text-[#062404] border-[#85E510] shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {mode === 'FREE' ? 'Full Photo (Free)' : mode === '3:4' ? '3:4 (ID)' : '4:3'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#85E510] animate-pulse" />
            <span>Biometric Framing Active</span>
          </div>
        </div>

        {/* Viewport & Controls */}
        <div className="p-4 flex flex-col items-center gap-3.5 overflow-y-auto">
          {/* Main Framing Viewport */}
          <div className="relative w-full flex justify-center">
            <div
              ref={containerRef}
              className="relative w-[300px] h-[390px] sm:w-[330px] sm:h-[420px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center select-none"
              style={{ touchAction: 'none' }}
            >
              {/* Scaled/Transformed Image fitted to viewport */}
              <img
                src={currentImageSrc}
                alt="Student preview"
                draggable={false}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  if (target.naturalWidth && target.naturalHeight) {
                    setImageDimensions({ width: target.naturalWidth, height: target.naturalHeight });
                  }
                }}
                className="transition-transform duration-75 select-none pointer-events-none"
                style={{
                  width: `${baseW}px`,
                  height: `${baseH}px`,
                  maxWidth: 'none',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                }}
              />

              {/* Interactive Resizable & Draggable Crop Box with Outer Backdrop Dimming */}
              <div
                className="absolute border-2 border-[#85E510] cursor-move select-none"
                style={{
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 15px rgba(133, 229, 16, 0.35)'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  startDrag('MOVE', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches.length === 1) {
                    startDrag('MOVE', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              >
                {/* Subtle Rule-of-Thirds Grid (No childish face circles!) */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* 4 Corner Drag Handles with phone-style touch targets */}
                <div
                  className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 group"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_TL', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_TL', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag top-left corner"
                >
                  <div className="w-4 h-4 bg-white border-2 border-[#85E510] rounded-sm shadow-md group-hover:scale-115 transition-transform" />
                </div>
                <div
                  className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 group"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_TR', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_TR', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag top-right corner"
                >
                  <div className="w-4 h-4 bg-white border-2 border-[#85E510] rounded-sm shadow-md group-hover:scale-115 transition-transform" />
                </div>
                <div
                  className="absolute -bottom-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 group"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_BL', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_BL', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag bottom-left corner"
                >
                  <div className="w-4 h-4 bg-white border-2 border-[#85E510] rounded-sm shadow-md group-hover:scale-115 transition-transform" />
                </div>
                <div
                  className="absolute -bottom-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 group"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_BR', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_BR', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag bottom-right corner"
                >
                  <div className="w-4 h-4 bg-white border-2 border-[#85E510] rounded-sm shadow-md group-hover:scale-115 transition-transform" />
                </div>

                {/* Smartphone-Style Side Grab Bars on All 4 Sides (Always Visible & Active) */}
                {/* Top Side Bar */}
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-16 h-7 flex items-center justify-center cursor-ns-resize group z-20"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_T', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_T', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag top edge"
                >
                  <div className="w-9 h-2 bg-white border border-[#85E510] rounded-full shadow-lg group-hover:scale-110 group-hover:bg-[#85E510] transition-transform" />
                </div>

                {/* Bottom Side Bar */}
                <div
                  className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-16 h-7 flex items-center justify-center cursor-ns-resize group z-20"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_B', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_B', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag bottom edge"
                >
                  <div className="w-9 h-2 bg-white border border-[#85E510] rounded-full shadow-lg group-hover:scale-110 group-hover:bg-[#85E510] transition-transform" />
                </div>

                {/* Left Side Bar */}
                <div
                  className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-16 flex items-center justify-center cursor-ew-resize group z-20"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_L', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_L', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag left edge"
                >
                  <div className="w-2 h-9 bg-white border border-[#85E510] rounded-full shadow-lg group-hover:scale-110 group-hover:bg-[#85E510] transition-transform" />
                </div>

                {/* Right Side Bar */}
                <div
                  className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-16 flex items-center justify-center cursor-ew-resize group z-20"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag('HANDLE_R', e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) startDrag('HANDLE_R', e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  title="Drag right edge"
                >
                  <div className="w-2 h-9 bg-white border border-[#85E510] rounded-full shadow-lg group-hover:scale-110 group-hover:bg-[#85E510] transition-transform" />
                </div>

                {/* Dimension Tooltip Badge */}
                <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white/90 border border-slate-700 pointer-events-none">
                  {cropBox.width} × {cropBox.height}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="w-full flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-[#85E510]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.0, Number((prev + 0.1).toFixed(1))))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#85E510]" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFineTune(prev => !prev)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                  showFineTune
                    ? 'bg-[#85E510] text-[#062404] border-[#85E510]'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Toggle fine-tune sliders"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Fine-Tune</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Reset All"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Fine-Tune Calibration Sliders */}
          {showFineTune && (
            <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Brightness: {brightness}%</span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(Number(e.target.value));
                    setIsAutoEnhanced(false);
                  }}
                  className="w-40 accent-[#85E510] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Contrast className="w-3.5 h-3.5 text-blue-400" />
                  <span>Contrast: {contrast}%</span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => {
                    setContrast(Number(e.target.value));
                    setIsAutoEnhanced(false);
                  }}
                  className="w-40 accent-[#85E510] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saturation: {saturation}%</span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={saturation}
                  onChange={(e) => {
                    setSaturation(Number(e.target.value));
                    setIsAutoEnhanced(false);
                  }}
                  className="w-40 accent-[#85E510] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-[#0F1722] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isSaving}
            className="py-2.5 px-6 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSaving ? 'Processing Export...' : 'Apply & Save Crop'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
