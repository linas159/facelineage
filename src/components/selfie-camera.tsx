"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface SelfieCameraProps {
  open: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * Fullscreen front-camera selfie capture.
 *
 * Uses getUserMedia({ facingMode: "user" }) for a live video preview, mirrors
 * the feed (so the user sees themselves the way they would in a mirror), draws
 * the captured frame onto a square canvas, and emits a JPEG File via onCapture.
 *
 * Requires HTTPS (or localhost) — getUserMedia is gated by a secure context.
 */
export function SelfieCamera({ open, onCapture, onClose }: SelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  // ── Start camera when opened, stop when closed/unmounted ──────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      setError(null);
      setReady(false);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Your browser doesn't support camera capture. Try a different browser or use the upload option.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera access is blocked. Allow camera permission in your browser settings, then try again.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera found on this device.");
        } else if (name === "NotReadableError") {
          setError("Your camera is busy with another app. Close it and try again.");
        } else {
          setError("Couldn't start the camera. Try uploading a photo instead.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  // ── Body scroll lock + ESC to close ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // ── Capture current frame to a JPEG File ──────────────────────────────────
  async function shoot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready || capturing) return;

    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 160);

    // Center-square crop at the camera's native resolution.
    const w = video.videoWidth;
    const h = video.videoHeight;
    const size = Math.min(w, h);
    const sx = (w - size) / 2;
    const sy = (h - size) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      return;
    }

    // Mirror the canvas drawing so the saved image matches the preview.
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCapturing(false);
          return;
        }
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCapture(file);
        setCapturing(false);
      },
      "image/jpeg",
      0.92,
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar */}
      <div
        className="flex items-center justify-between bg-black/40 px-4 py-3 text-white"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        <button
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl leading-none backdrop-blur"
        >
          ×
        </button>
        <span className="text-sm font-semibold">Take a selfie</span>
        <span className="w-10" aria-hidden />
      </div>

      {/* Video stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="max-w-xs px-8 text-center text-white">
            <p className="mb-3 text-3xl">📷</p>
            <p className="mb-6 text-sm leading-relaxed">{error}</p>
            <Button variant="secondary" onClick={onClose}>
              Close camera
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setReady(true)}
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
            />

            {/* Face oval guide + dark vignette */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <div
                className="rounded-[50%] border-[3px] border-white/70"
                style={{
                  width: "min(70vmin, 360px)",
                  height: "min(85vmin, 440px)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              />
            </div>

            {/* Hint */}
            <p className="absolute left-0 right-0 top-4 px-6 text-center text-sm font-semibold text-white/90">
              {ready ? "Center your face inside the oval" : "Starting camera…"}
            </p>

            {/* Capture flash */}
            {flash && (
              <div className="pointer-events-none absolute inset-0 bg-white opacity-80" />
            )}
          </>
        )}
      </div>

      {/* Shutter */}
      {!error && (
        <div
          className="flex items-center justify-center bg-black/40 pt-5"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
        >
          <button
            type="button"
            onClick={shoot}
            disabled={!ready || capturing}
            aria-label="Capture selfie"
            className="relative h-20 w-20 rounded-full border-4 border-white/50 bg-transparent transition-transform active:scale-95 disabled:opacity-50"
          >
            <span className="absolute inset-1.5 rounded-full bg-white" />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/** Lightweight runtime check — call from the parent before opening the modal. */
export function isCameraSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    window.isSecureContext
  );
}
