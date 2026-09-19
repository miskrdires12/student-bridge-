"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Camera } from "lucide-react";

interface ResilientStudentPhotoProps {
  src?: string | null;
  alt?: string;
  fullName?: string;
  studentId?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: "portrait" | "square";
  showInitialsOnEmpty?: boolean;
  priority?: boolean;
  onAutoDelete?: (studentId: string, fullName?: string, failedSrc?: string) => void;
}

const CACHE_NAME = "siliconlabs_student_photos_v1";

export const ResilientStudentPhoto: React.FC<ResilientStudentPhotoProps> = ({
  src,
  alt = "Student Photo",
  fullName = "",
  studentId = "",
  className = "",
  containerClassName = "",
  showInitialsOnEmpty = true,
  priority = false,
  onAutoDelete: _onAutoDelete,
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(src));
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute initials for clean fallback (e.g. "Yeah Tarekegn" -> "YT")
  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : studentId.slice(0, 2).toUpperCase() || "ST";

  useEffect(() => {
    let isMounted = true;

    if (!src) {
      setResolvedSrc(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // 1. Check if cached in browser CacheStorage (for instant 0ms offline/low-net load)
    const loadPhoto = async () => {
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(src);
          if (cachedResponse && isMounted) {
            const blob = await cachedResponse.blob();
            const blobUrl = URL.createObjectURL(blob);
            setResolvedSrc(blobUrl);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // Cache API error fallback to direct URL
        }
      }

      if (isMounted) {
        setResolvedSrc(src);
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [src]);

  const handleImageLoad = async () => {
    setIsLoading(false);
    setHasError(false);
    setIsRetrying(false);

    // Save to CacheStorage in background once successfully downloaded
    if (src && typeof window !== "undefined" && "caches" in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const exists = await cache.match(src);
        if (!exists && !src.startsWith("data:") && !src.startsWith("blob:")) {
          fetch(src, { mode: "cors" })
            .then((res) => {
              if (res.ok) cache.put(src, res);
            })
            .catch(() => {});
        }
      } catch (e) {}
    }
  };

  const handleImageError = () => {
    // If low internet caused network drop, auto-retry up to 3 times (Automatic 3-Strike Exponential Backoff)
    if (retryCount < 3 && src) {
      setIsRetrying(true);
      const nextCount = retryCount + 1;
      setRetryCount(nextCount);

      // Backoff retry: 1.2s, 2.4s, 3.6s
      retryTimeoutRef.current = setTimeout(() => {
        const separator = src.includes("?") ? "&" : "?";
        setResolvedSrc(`${src}${separator}retry=${nextCount}&t=${Date.now()}`);
      }, nextCount * 1200);
    } else {
      // 3 STRIKES EXHAUSTED: Offline / Low signal state (Photo preserved, NEVER auto-deleted)
      setIsLoading(false);
      setHasError(true);
      setIsRetrying(false);
    }
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;
    setIsLoading(true);
    setHasError(false);
    setIsRetrying(true);
    setRetryCount(0);
    const separator = src.includes("?") ? "&" : "?";
    setResolvedSrc(`${src}${separator}refresh=${Date.now()}`);
  };

  // No photo assigned
  if (!src) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-surface-secondary/80 dark:bg-[#161e19] text-foreground-subtle dark:text-[#6c8074] select-none ${containerClassName}`}
      >
        {showInitialsOnEmpty ? (
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="font-mono font-bold text-xs text-[#8fe617]/80">{initials}</span>
            <Camera className="h-3.5 w-3.5 opacity-40" />
          </div>
        ) : (
          <Camera className="h-4 w-4 opacity-50" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex items-center justify-center bg-surface-secondary dark:bg-[#0d120f] ${containerClassName}`}
    >
      {/* Low-bandwidth Loading Shimmer */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-secondary/90 dark:bg-[#111613]/90 animate-pulse">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-[#8fe617] border-t-transparent animate-spin mb-1" />
          <span className="text-[9px] font-mono text-[#8a9e93] tracking-tight">
            {isRetrying ? `Retrying (${retryCount}/3)...` : "Loading..."}
          </span>
        </div>
      )}

      {/* Network Drop / Offline State: Preserved Status & Retry */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-1 text-center bg-surface-secondary/95 dark:bg-[#111613]/95 backdrop-blur-xs">
          <span className="font-mono font-bold text-xs text-[#8fe617]/80">{initials}</span>
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <span className="text-[7.5px] font-mono text-amber-500 dark:text-amber-400 font-bold leading-tight">
              Offline • Pending
            </span>
            <span className="text-[7px] font-mono text-foreground-subtle dark:text-[#6c8074]">
              Photo preserved
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualRetry}
            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#8fe617] text-[#070908] text-[8px] font-bold hover:brightness-110 shadow-xs cursor-pointer"
            title="Click to manually reload photo"
          >
            <RefreshCw className="h-2 w-2" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Primary Image with Native Decoding & Lazy Loading */}
      {resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`h-full w-full object-cover transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          } ${className}`}
        />
      )}
    </div>
  );
};
