"use client";

// ============================================================================
// STUDENT BRIDGE — HIGH-RES WEBRTC CAMERA CAPTURE STUDIO
// - Ultra-Pure High-Resolution 300 DPI JFIF Metadata Injection
// - Instant One-Tap Capture & Auto-Attach with Flash Animation
// - Multi-tier hardware fallback: exact deviceId -> ideal constraints -> generic video:true
// - Device enumeration (front/rear, USB, webcam)
// - Preserves full frame for precision on-demand 3:4 and free-edge studio cropping
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Sparkles,
  Zap,
  Crop,
} from "lucide-react";
import { convertBlobTo300Dpi } from "@/lib/jpeg-dpi";

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  onEditPhoto?: (file: File, previewUrl: string) => void;
  initialFacingMode?: "user" | "environment";
  maxDimensions?: { width: number; height: number };
  compressionQuality?: number; // Default 0.96
}

type CameraState = "idle" | "requesting" | "streaming" | "captured" | "error";

interface VideoDevice {
  deviceId: string;
  label: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onEditPhoto,
  initialFacingMode = "user",
  maxDimensions = { width: 900, height: 1200 },
  compressionQuality = 0.88,
}) => {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(initialFacingMode);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isEnhancerActive, setIsEnhancerActive] = useState<boolean>(true);

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(10, Math.max(0.6, parseFloat(newZoom.toFixed(1))));
    setZoom(clamped);
    try {
      const stream = streamRef.current;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track && "getCapabilities" in track) {
          const caps = (track as any).getCapabilities();
          if (caps && "zoom" in caps) {
            (track as any).applyConstraints({ advanced: [{ zoom: clamped }] }).catch(() => {});
          }
        }
      }
    } catch {}
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const targetZoom = Math.min(10, Math.max(0.6, parseFloat((touchStartZoomRef.current * factor).toFixed(1))));
      handleZoomChange(targetZoom);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    const targetZoom = Math.min(10, Math.max(0.6, parseFloat((zoom + delta).toFixed(1))));
    handleZoomChange(targetZoom);
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Safely stops and cleans up all active camera hardware tracks.
   */
  const stopMediaTracks = useCallback(() => {
    setIsFlashlightOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore cleanup errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Toggles flashlight mode:
   * 1. Applies hardware torch constraint via WebRTC if supported (e.g. mobile rear cams, USB cams)
   * 2. Synchronously toggles high-intensity screen studio fill-light ring (for laptops, front cams)
   */
  const handleToggleFlashlight = async () => {
    const nextState = !isFlashlightOn;
    setIsFlashlightOn(nextState);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities: any = track.getCapabilities?.() || {};
          if ("torch" in capabilities) {
            await track.applyConstraints({
              advanced: [{ torch: nextState } as any],
            });
          }
        } catch (err) {
          console.warn("Hardware torch not supported or error applying:", err);
        }
      }
    }
  };


  /**
   * Enumerate available video devices
   */
  const loadDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      setDevices(videoInputs);
    } catch {
      // Ignore enumeration errors
    }
  }, []);

  /**
   * Starts the WebRTC video stream with multi-level resilient fallback.
   */
  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setErrorMessage(
        "Camera access is not supported by this browser or page is not served over a secure origin."
      );
      return;
    }

    stopMediaTracks();
    setCameraState("requesting");
    setErrorMessage(null);

    // Attempt 1: Device ID or ideal high-res 4:3/16:9 constraints
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1440, min: 960 },
            }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1440, min: 960 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("streaming");
      loadDevices();
      return;
    } catch (err1) {
      console.warn("Attempt 1 with high-res constraints failed, trying generic fallback:", err1);
    }

    // Attempt 2: Generic { video: true } fallback
    try {
      const fallbackConstraints: MediaStreamConstraints = {
        video: true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("streaming");
      loadDevices();
    } catch (err2: any) {
      console.error("Camera access completely failed:", err2);
      setCameraState("error");
      if (err2 instanceof DOMException) {
        if (err2.name === "NotAllowedError" || err2.name === "PermissionDeniedError") {
          setErrorMessage(
            "Camera permission was denied. Please allow camera access in browser permissions or use the upload fallback below."
          );
        } else if (err2.name === "NotFoundError" || err2.name === "DevicesNotFoundError") {
          setErrorMessage(
            "No camera hardware detected. You can upload a photo file or generate a test ID portrait below."
          );
        } else if (err2.name === "NotReadableError" || err2.name === "TrackStartError") {
          setErrorMessage(
            "Camera is currently locked by another application. Close other camera apps and retry, or upload a photo."
          );
        } else {
          setErrorMessage(`Camera error (${err2.name}): ${err2.message}`);
        }
      } else {
        setErrorMessage("Unable to initialize video hardware. Use file upload or test capture below.");
      }
    }
  }, [facingMode, selectedDeviceId, stopMediaTracks, loadDevices]);

  // Handle open/close transitions
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setCapturedBlob(null);
      startCamera();
    } else {
      stopMediaTracks();
      setCameraState("idle");
    }

    return () => {
      stopMediaTracks();
    };
  }, [isOpen, startCamera, stopMediaTracks]);

  /**
   * Toggle between front and rear cameras
   */
  const handleToggleCamera = () => {
    setSelectedDeviceId("");
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  /**
   * Switch selected camera device
   */
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
  };

  /**
   * Captures the current video frame at ultra-pure high-resolution with 300 DPI JFIF metadata.
   * Full frame is preserved so user can crop/slide sides freely or apply 3:4 on demand.
   * When autoConfirm is true, immediately attaches photo to student form like auto-snap!
   */
  const handleCaptureFrame = (autoConfirm: boolean = true) => {
    const video = videoRef.current;
    if (!video || cameraState !== "streaming") {
      return;
    }

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    if (!videoW || !videoH) {
      return;
    }

    // High-speed shutter flash trigger
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    // Full unconstrained frame preserved (scaled to standard portrait ID card bounds)
    let destW = videoW;
    let destH = videoH;
    const maxW = maxDimensions.width || 900;
    const maxH = maxDimensions.height || 1200;
    if (destW > maxW || destH > maxH) {
      const scale = Math.min(maxW / destW, maxH / destH);
      destW = Math.round(destW * scale);
      destH = Math.round(destH * scale);
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = destW;
    canvas.height = destH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply mirror if front-facing user camera
    if (facingMode === "user") {
      ctx.translate(destW, 0);
      ctx.scale(-1, 1);
    }

    // Apply digital zoom cropping if zoom > 1.0
    let sx = 0;
    let sy = 0;
    let sw = videoW;
    let sh = videoH;
    if (zoom > 1.0) {
      sw = videoW / zoom;
      sh = videoH / zoom;
      sx = (videoW - sw) / 2;
      sy = (videoH - sh) / 2;
    }

    // AI Studio Photo Remaster / Enhancer: auto lighting & crisp portrait curve
    if (isEnhancerActive) {
      ctx.filter = "contrast(106%) brightness(102%) saturate(106%)";
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);

    canvas.toBlob(
      async (rawBlob) => {
        if (!rawBlob) return;

        // Auto 300 DPI Resolution Injection
        const blob300Dpi = await convertBlobTo300Dpi(rawBlob);
        const dataUrl = URL.createObjectURL(blob300Dpi);

        if (autoConfirm) {
          const fileName = `student-photo-300dpi-${Date.now()}.jpg`;
          const file = new File([blob300Dpi], fileName, { type: "image/jpeg" });
          onCapture(file, dataUrl);
          stopMediaTracks();
          setCapturedBlob(null);
          setCapturedPreview(null);
          onClose();
        } else {
          setCapturedBlob(blob300Dpi);
          setCapturedPreview(dataUrl);
          setCameraState("captured");
          stopMediaTracks();
        }
      },
      "image/jpeg",
      compressionQuality
    );
  };

  /**
   * Fallback 1: Process an uploaded image file into strict 3:4 ID bounds with 300 DPI
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const targetAspect = 3 / 4;
      const currentAspect = img.width / img.height;
      let sW = img.width;
      let sH = img.height;
      let sX = 0;
      let sY = 0;

      if (currentAspect > targetAspect) {
        sH = img.height;
        sW = Math.round(img.height * targetAspect);
        sX = Math.round((img.width - sW) / 2);
      } else {
        sW = img.width;
        sH = Math.round(img.width / targetAspect);
        sY = Math.round((img.height - sH) / 2);
      }

      const dW = maxDimensions.width || 900;
      const dH = maxDimensions.height || 1200;

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = dW;
      canvas.height = dH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, sX, sY, sW, sH, 0, 0, dW, dH);
      canvas.toBlob(
        async (rawBlob) => {
          if (!rawBlob) return;
          const blob300Dpi = await convertBlobTo300Dpi(rawBlob);
          const dataUrl = URL.createObjectURL(blob300Dpi);
          setCapturedBlob(blob300Dpi);
          setCapturedPreview(dataUrl);
          setCameraState("captured");
          stopMediaTracks();
        },
        "image/jpeg",
        compressionQuality
      );
    };
    img.src = objectUrl;
  };

  /**
   * Fallback 2: Generate crisp 3:4 ID portrait test silhouette at 300 DPI
   */
  const handleGenerateTestSnapshot = () => {
    const width = 900;
    const height = 1200;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Neutral studio background
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, width, height);

    // Subtle studio gradient
    const grad = ctx.createRadialGradient(
      width / 2,
      height * 0.4,
      70,
      width / 2,
      height * 0.4,
      width * 0.8
    );
    grad.addColorStop(0, "#2c2c2c");
    grad.addColorStop(1, "#121212");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Shoulder silhouette
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.92, width * 0.42, height * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head silhouette
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.44, width * 0.22, height * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner detail (ID silhouette)
    ctx.fillStyle = "#1e1e1e";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.fillText("STUDENT PHOTO", width / 2, height * 0.45);
    ctx.font = "18px monospace";
    ctx.fillText("3:4 ID SPEC • 300 DPI AUTO", width / 2, height * 0.49);

    canvas.toBlob(
      async (rawBlob) => {
        if (!rawBlob) return;
        const blob300Dpi = await convertBlobTo300Dpi(rawBlob);
        const dataUrl = URL.createObjectURL(blob300Dpi);
        setCapturedBlob(blob300Dpi);
        setCapturedPreview(dataUrl);
        setCameraState("captured");
        stopMediaTracks();
      },
      "image/jpeg",
      0.90
    );
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedBlob || !capturedPreview) return;
    const fileName = `student-photo-300dpi-${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: "image/jpeg" });
    const finalUrl = capturedPreview;
    onCapture(file, finalUrl);
    stopMediaTracks();
    setCapturedBlob(null);
    setCapturedPreview(null);
    onClose();
  };

  const handleOpenCropEditor = () => {
    if (!capturedBlob || !capturedPreview) return;
    const fileName = `student-photo-300dpi-${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: "image/jpeg" });
    const previewUrl = capturedPreview;
    stopMediaTracks();
    setCapturedBlob(null);
    setCapturedPreview(null);
    onClose();
    if (onEditPhoto) {
      onEditPhoto(file, previewUrl);
    }
  };

  const handleClose = () => {
    stopMediaTracks();
    setCapturedPreview(null);
    setCapturedBlob(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#161c18] shadow-2xl text-[#080808] dark:text-[#f2f7f4]">
        {/* Flash Effect on Capture */}
        {isFlashing && (
          <div className="pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-200" />
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#26332b] px-5 py-3.5 bg-white dark:bg-[#161c18]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#080808] dark:bg-[#0d120f] border border-neutral-800 dark:border-[#26332b] text-[#8fe617] shadow-xs">
              <Camera className="h-4 w-4 stroke-[2.5]" />
            </div>
            <h2 id="camera-modal-title" className="text-xs font-mono font-bold tracking-wider uppercase text-[#080808] dark:text-[#f2f7f4]">
              Camera Studio
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {cameraState === "streaming" && (
              <button
                type="button"
                onClick={handleToggleFlashlight}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  isFlashlightOn
                    ? "bg-amber-400/20 border border-amber-400 text-black font-bold shadow-xs"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
                title="Toggle Flashlight / Studio Illumination"
              >
                <Zap className={`h-3.5 w-3.5 ${isFlashlightOn ? "fill-amber-400 text-amber-500 animate-pulse" : "text-neutral-500"}`} />
                <span className="text-[11px]">{isFlashlightOn ? "Flash ON" : "Flash"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Camera Selector Bar (If multiple devices available) */}
        {devices.length > 1 && cameraState !== "captured" && (
          <div className="flex items-center justify-between px-5 py-2 bg-neutral-50 dark:bg-[#161c18] border-b border-neutral-200 dark:border-[#26332b] text-xs">
            <span className="text-neutral-600 dark:text-[#a4b8ad] font-mono text-[11px]">Webcam Device:</span>
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="rounded-lg border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-2.5 py-1 text-xs text-black dark:text-[#f2f7f4] font-mono focus:outline-none focus:border-[#8fe617]"
            >
              <option value="" className="bg-white dark:bg-[#161c18] text-black dark:text-[#f2f7f4]">Default High-Res Camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId} className="bg-white dark:bg-[#161c18] text-black dark:text-[#f2f7f4]">
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewport Area */}
        <div
          className="relative aspect-[3/4] max-h-[460px] w-full bg-black flex items-center justify-center overflow-hidden select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              transform: `${facingMode === "user" ? "scaleX(-1) " : ""}scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              cameraState === "streaming" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Captured Review Preview */}
          {cameraState === "captured" && capturedPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedPreview}
              alt="Captured student preview"
              className="h-full w-full object-cover"
            />
          )}

          {/* Framing Overlay (Active during streaming) */}
          {cameraState === "streaming" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {/* Portrait Centering Guide */}
              <div className="relative aspect-[3/4] h-[78%] max-h-[460px] border-2 border-[#8fe617] shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] rounded-xs">
                {/* Corner bracket highlight marks */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#8fe617]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#8fe617]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#8fe617]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#8fe617]" />

                {/* Center alignment crosshairs */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-0.5 bg-[#8fe617]/70" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#8fe617]/70" />

                {/* Upper third eye level guide line */}
                <div className="absolute top-[38%] left-3 right-3 border-b border-dashed border-[#8fe617]/60 flex justify-between px-1">
                  <span className="text-[9px] font-mono text-[#8fe617] -mt-3.5 select-none uppercase tracking-wider font-semibold">Eye Level</span>
                  <span className="text-[9px] font-mono text-[#8fe617] -mt-3.5 select-none font-bold">PORTRAIT</span>
                </div>

                {/* Chin level guide */}
                <div className="absolute bottom-[22%] left-6 right-6 border-b border-dotted border-[#8fe617]/40 flex justify-center">
                  <span className="text-[8px] font-mono text-white/70 -mt-3 select-none uppercase tracking-wider">Chin Alignment</span>
                </div>
              </div>

              {/* Top Control Badges: Ultra HD + Flash + Samsung AI Studio Enhancer */}
              <div className="absolute top-4 flex items-center gap-2 pointer-events-auto">
                <div className="rounded-full border border-neutral-800 bg-black/85 backdrop-blur-xs px-3 py-1 text-[10px] font-mono text-white flex items-center gap-1.5 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-pulse" />
                  <span className="text-white font-semibold">ULTRA HD</span>
                  <span className="text-[#8fe617] font-bold">• 300 DPI</span>
                </div>

                {/* Samsung AI Studio Enhancer Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEnhancerActive(!isEnhancerActive)}
                  className={`rounded-full px-3 py-1 text-[10px] font-mono font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    isEnhancerActive
                      ? "bg-[#8fe617] text-[#062404] shadow-[0_0_14px_rgba(143,230,23,0.5)] border border-[#8fe617]"
                      : "bg-black/85 text-neutral-400 border border-neutral-800 hover:text-white"
                  }`}
                  title="AI Studio Enhancer: Auto-optimizes portrait lighting, skin detail, and contrast"
                >
                  <Sparkles className={`h-3 w-3 ${isEnhancerActive ? "text-[#062404]" : "text-neutral-400"}`} />
                  <span>AI ENHANCER {isEnhancerActive ? "ON" : "OFF"}</span>
                </button>

                {isFlashlightOn && (
                  <div className="rounded-full border border-amber-400/90 bg-amber-400/25 backdrop-blur-xs px-2.5 py-1 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 shadow-lg animate-pulse">
                    <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span>FLASH ON</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flashlight Studio Fill-Light / Ring Light (High-intensity illumination on subject's face) */}
          {isFlashlightOn && cameraState === "streaming" && (
            <div className="pointer-events-none absolute inset-0 z-20 ring-8 ring-white ring-inset shadow-[inset_0_0_90px_30px_rgba(255,255,255,0.75)] transition-all duration-200" />
          )}

          {/* Samsung Ultra Multi-Lens Zoom Dock (0.6x, 1x, 2x, 3x, 5x, 10x + Smooth Dial) */}
          {cameraState === "streaming" && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 bg-black/80 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/20 text-white shadow-2xl pointer-events-auto max-w-[92vw]">
              {/* Samsung Ultra Circular Lens Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[0.6, 1, 2, 3, 5, 10].map((level) => {
                  const isActive = Math.abs(zoom - level) < 0.25;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleZoomChange(level)}
                      className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-black transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#8fe617] text-[#062404] ring-2 ring-[#8fe617] shadow-[0_0_12px_rgba(143,230,23,0.6)] scale-110"
                          : "bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-white/10"
                      }`}
                      title={`Zoom ${level}x`}
                    >
                      {level === 0.6 ? ".6" : `${level}`}
                    </button>
                  );
                })}
              </div>

              {/* Samsung Smooth Zoom Fine-Tuning Dial */}
              <div className="flex items-center gap-2 w-full pt-0.5">
                <span className="text-[9px] font-mono font-bold text-[#8fe617] min-w-[28px]">
                  {zoom.toFixed(1)}x
                </span>
                <input
                  type="range"
                  min="0.6"
                  max="10"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-36 sm:w-48 h-1 accent-[#8fe617] cursor-pointer"
                  aria-label="Samsung Ultra Zoom Dial"
                />
              </div>
            </div>
          )}

          {/* Requesting / Loading State */}
          {cameraState === "requesting" && (
            <div className="flex flex-col items-center gap-3 text-center p-6">
              <RefreshCw className="h-8 w-8 animate-spin text-white" />
              <p className="text-xs text-neutral-400 font-mono">Initializing high-res webcam...</p>
            </div>
          )}

          {/* Error Display State & Fallback Actions */}
          {cameraState === "error" && (
            <div className="flex flex-col items-center gap-3 text-center p-6 max-w-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-white">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Camera Unavailable
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{errorMessage}</p>

              {/* Immediate Fallback Options */}
              <div className="flex flex-col gap-2 w-full mt-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center justify-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-mono text-white hover:bg-neutral-800 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Hardware Camera
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8fe617] px-3 py-2 text-xs font-mono font-bold text-[#062404] hover:brightness-105 transition-all"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo (Auto 3:4 & 300 DPI)
                </button>

                <button
                  type="button"
                  onClick={handleGenerateTestSnapshot}
                  className="inline-flex items-center justify-center gap-2 rounded border border-neutral-800 bg-black px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate 3:4 Test Portrait (300 DPI)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input & Canvas */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 dark:border-[#26332b] bg-neutral-50 dark:bg-[#161c18] px-5 py-3.5">
          {cameraState === "captured" ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-4 py-2 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#232d27] transition-all animated-icon-btn cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retake</span>
              </button>

              <div className="flex items-center gap-2">
                {onEditPhoto && (
                  <button
                    type="button"
                    onClick={handleOpenCropEditor}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-3.5 py-2 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#232d27] transition-all animated-icon-btn shadow-xs cursor-pointer"
                    title="Open studio to crop, zoom, and adjust"
                  >
                    <Crop className="h-3.5 w-3.5 text-[#6b7771] dark:text-[#a4b8ad]" />
                    <span>Crop & Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8fe617] px-5 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_16px_rgba(143,230,23,0.35)] transition-all animated-btn active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Use This Photo</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={cameraState !== "streaming"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-3 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#232d27] transition-all animated-icon-btn disabled:opacity-40 cursor-pointer"
                  title="Switch Front/Rear"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{facingMode === "user" ? "Front" : "Rear"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFlashlight}
                  disabled={cameraState !== "streaming"}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-mono transition-all animated-icon-btn disabled:opacity-40 cursor-pointer ${
                    isFlashlightOn
                      ? "border-amber-400 bg-amber-400/20 text-[#080808] dark:text-white font-bold shadow-xs ring-1 ring-amber-400"
                      : "border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#232d27]"
                  }`}
                  title="Toggle Flashlight (Hardware Torch + Screen Fill-Light)"
                >
                  <Zap className={`h-3.5 w-3.5 ${isFlashlightOn ? "fill-amber-400 text-amber-500 animate-pulse" : "text-[#6b7771] dark:text-[#a4b8ad]"}`} />
                  <span className="hidden sm:inline">{isFlashlightOn ? "Flash ON" : "Flash"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-3 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#232d27] transition-all animated-icon-btn disabled:opacity-40 cursor-pointer"
                  title="Upload image file"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </div>

              {/* Central Capture Actions: Primary Snap + Snap & Review */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCaptureFrame(true)}
                  disabled={cameraState !== "streaming"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8fe617] px-5 py-2.5 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] active:scale-95 transition-all shadow-[0_0_18px_rgba(143,230,23,0.4)] animated-btn disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  title="Instant Snap and direct attach to student record"
                >
                  <Camera className="h-4 w-4 stroke-[2.5]" />
                  <span>Snap Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCaptureFrame(false)}
                  disabled={cameraState !== "streaming"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-3 py-2 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#232d27] active:scale-95 transition-all animated-icon-btn disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  title="Snap and review/crop before attaching"
                >
                  <span className="hidden sm:inline">Snap & Review</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-2.5 py-2 text-xs font-mono text-[#6b7771] dark:text-[#a4b8ad] hover:text-[#080808] dark:hover:text-[#f2f7f4] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
