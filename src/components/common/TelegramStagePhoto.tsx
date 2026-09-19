"use client";

// ============================================================================
// STUDENT BRIDGE — TELEGRAM-STYLE 3-STAGE PROGRESSIVE PHOTO THUMBNAIL
//
// 3 Stage Rule (Telegram Standard):
// Stage 1 (Ingestion / Low-Res): Heavy Blur (12px) + Rotating circular spinner ring
// Stage 2 (Cloud Sync / Verification): Medium Blur (4px) + Rotating Shimmer
// Stage 3 (Delivered & Verified): Crystal Clear (0px blur) + Verified Checkmark
// ============================================================================

import React, { useState, useEffect } from "react";
import { Camera, CheckCheck, Loader2 } from "lucide-react";

export type UploadStage = 1 | 2 | 3;

export interface TelegramStagePhotoProps {
  photoUrl?: string | null;
  photoPath?: string | null;
  fullName?: string;
  alt?: string;
  isNewArrival?: boolean;
  forcedStage?: UploadStage;
  initialStage?: UploadStage;
  className?: string;
  sizeClassName?: string;
  size?: "sm" | "md" | "lg" | string;
  onClick?: () => void;
  showBadge?: boolean;
  title?: string;
}

export function TelegramStagePhoto({
  photoUrl,
  photoPath,
  fullName,
  alt,
  isNewArrival = false,
  forcedStage,
  initialStage,
  className = "",
  sizeClassName,
  size,
  onClick,
  showBadge = true,
  title,
}: TelegramStagePhotoProps) {
  const actualPhoto = photoUrl || photoPath;
  const actualName = fullName || alt || "Student";
  const resolvedSize =
    sizeClassName ||
    (size === "sm"
      ? "h-10 w-10"
      : size === "lg"
      ? "h-24 w-24"
      : size === "md"
      ? "h-14 w-14"
      : "h-10 w-10");

  const [currentStage, setCurrentStage] = useState<UploadStage>(
    forcedStage !== undefined
      ? forcedStage
      : initialStage !== undefined
      ? initialStage
      : isNewArrival
      ? 1
      : 3
  );

  useEffect(() => {
    if (forcedStage !== undefined) {
      setCurrentStage(forcedStage);
      return;
    }

    if (initialStage !== undefined) {
      setCurrentStage(initialStage);
      return;
    }

    if (isNewArrival) {
      setCurrentStage(1);
      const timer1 = setTimeout(() => {
        setCurrentStage(2);
      }, 700);

      const timer2 = setTimeout(() => {
        setCurrentStage(3);
      }, 1500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setCurrentStage(3);
    }
  }, [isNewArrival, forcedStage, initialStage]);

  if (!actualPhoto) {
    return (
      <div
        className={`${resolvedSize} rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#eef5f1] dark:bg-[#1c261e] shrink-0 overflow-hidden flex items-center justify-center text-[#6b7771] dark:text-[#8a9e93] ${className}`}
        title={title || "No Photo Attached"}
        onClick={onClick}
      >
        <Camera className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative ${resolvedSize} rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#080808] shrink-0 overflow-hidden flex items-center justify-center select-none ${
        onClick ? "cursor-pointer group hover:border-[#8fe617] hover:scale-105 transition-all" : ""
      } ${className}`}
      title={title || `${actualName} (Verification Stage ${currentStage}/3 • Confirmed)`}
    >
      {/* Main Image with Stage-specific CSS Blur */}
      <img
        src={actualPhoto}
        alt={actualName}
        className={`h-full w-full object-cover transition-all duration-500 ${
          currentStage === 1
            ? "stage-photo-blur-1"
            : currentStage === 2
            ? "stage-photo-blur-2"
            : "stage-photo-clear-3"
        }`}
        loading="lazy"
      />

      {/* Stage 1 Overlay: Circular Rotating Loader */}
      {currentStage === 1 && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in duration-200">
          <div className="relative h-6 w-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center shadow-lg">
            <div className="absolute inset-0.5 rounded-full border-2 border-transparent border-t-[#8fe617] border-r-[#8fe617] stage-spinner-circle" />
            <span className="text-[7px] font-mono font-black text-white">1</span>
          </div>
        </div>
      )}


      {/* Stage 2 Overlay: Soft Rotating Shimmer & Syncing Glow */}
      {currentStage === 2 && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 animate-in fade-in duration-200">
          <div className="relative h-6 w-6 rounded-full bg-black/50 border border-[#8fe617]/50 flex items-center justify-center shadow-md">
            <Loader2 className="h-3.5 w-3.5 text-[#8fe617] animate-spin" />
          </div>
        </div>
      )}

      {/* Stage 3 Indicator: Double Checkmark (Delivered) */}
      {currentStage === 3 && showBadge && (
        <div className="absolute bottom-0.5 right-0.5 z-10">
          <div className="rounded-full bg-[#8fe617] p-0.5 shadow-sm">
            <CheckCheck className="h-2.5 w-2.5 text-[#062404] stroke-[3]" />
          </div>
        </div>
      )}
    </div>
  );
}
