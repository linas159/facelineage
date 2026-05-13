"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CameraIcon,
  PhotosIcon,
  ShieldLockIcon,
  TrashIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { SelfieCamera, isCameraSupported } from "@/components/selfie-camera";
import { uploadPhoto } from "@/lib/actions/upload-photo";

export function CaptureView() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function openCamera() {
    if (isCameraSupported()) {
      setCameraOpen(true);
    } else {
      cameraFallbackRef.current?.click();
    }
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);

    // Stash the photo as a data URL so the next page (/analyzing) can render
    // it inside the pulsating oval without a Supabase round-trip.
    try {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            try { sessionStorage.setItem("fl_selfie_preview", reader.result); } catch {}
          }
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });
    } catch {}

    try {
      const fd = new FormData();
      fd.append("file", file);
      // Attach quiz answers + timezone captured during the funnel.
      try {
        const answers = sessionStorage.getItem("fl_quiz_answers");
        if (answers) fd.append("quiz_answers", answers);
      } catch {}
      try {
        const tz = sessionStorage.getItem("fl_timezone")
          ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) fd.append("timezone", tz);
      } catch {}
      const result = await uploadPhoto(fd);
      if (result?.error) {
        setError(result.error);
        setUploading(false);
      }
      // On success the server action redirects; we won't reach here.
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
        throw e;
      }
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setError(null);
    router.refresh();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Preview view — only the photo + Looks good / Try again buttons
  // ─────────────────────────────────────────────────────────────────────────
  if (preview) {
    return (
      <>
        <div className="flex min-h-0 flex-1 items-center justify-center py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Your selfie"
            className="max-h-full max-w-full rounded-[var(--radius-card)] object-cover"
            style={{ aspectRatio: "1 / 1" }}
          />
        </div>

        {error && (
          <p className="mb-3 rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Button size="block" onClick={submit} disabled={uploading}>
            {uploading ? "Uploading…" : "Looks good — analyze it"}
          </Button>
          <Button size="block" variant="ghost" onClick={reset} disabled={uploading}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Capture view — heading, illustration, capture buttons, trust strip
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hero illustration — flex-1 absorbs leftover vertical space */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/selfie.png"
          alt=""
          aria-hidden
          className="h-full w-auto max-h-[55dvh] max-w-[440px] object-contain"
        />
      </div>

      {/* Heading + subhead */}
      <div className="text-center">
        <h2 className="mb-2 text-balance">Now show us your face</h2>
        <p className="mx-auto max-w-sm text-sm leading-snug text-[var(--color-ink-soft)]">
          A clear, front-facing photo gives the most accurate analysis. We delete it
          after 30 days and never share it.
        </p>
      </div>

      {/* Capture buttons */}
      <Card className="mt-4 !p-4">
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraFallbackRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          <Button size="block" onClick={openCamera}>
            <CameraIcon className="h-6 w-6" />
            Take a selfie
          </Button>
          <Button
            size="block"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
          >
            <PhotosIcon className="h-6 w-6 text-[var(--color-ink)]" />
            Upload from photos
          </Button>
        </div>
      </Card>

      {/* Trust strip */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-[var(--color-ink-muted)]">
        <div className="rounded-[var(--radius-chip)] bg-white p-2">
          <ShieldLockIcon className="mx-auto h-7 w-7" />
          <div className="mt-0.5 font-semibold text-[var(--color-ink-soft)]">Encrypted</div>
        </div>
        <div className="rounded-[var(--radius-chip)] bg-white p-2">
          <TrashIcon className="mx-auto h-7 w-7" />
          <div className="mt-0.5 font-semibold text-[var(--color-ink-soft)]">30-day auto-delete</div>
        </div>
        <div className="rounded-[var(--radius-chip)] bg-white p-2">
          <ShieldCheckIcon className="mx-auto h-7 w-7" />
          <div className="mt-0.5 font-semibold text-[var(--color-ink-soft)]">Never shared</div>
        </div>
      </div>

      <SelfieCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(captured) => {
          handleFile(captured);
          setCameraOpen(false);
        }}
      />
    </>
  );
}
