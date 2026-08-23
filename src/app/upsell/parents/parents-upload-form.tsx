"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadParentPhotos } from "@/lib/actions/upload-parents";
import { normalizeToJpeg } from "@/lib/image-normalize";

interface Props {
  analysisId: string;
}

export function ParentsUploadForm({ analysisId }: Props) {
  const [mother, setMother] = useState<File | null>(null);
  const [father, setFather] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mother || !father) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("analysisId", analysisId);
      fd.append("mother", mother);
      fd.append("father", father);
      const result = await uploadParentPhotos(fd);
      if (result?.error) {
        setError(result.error);
        setBusy(false);
      }
      // On success the action redirects.
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
      setError(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PhotoPicker label="Mother" value={mother} onChange={setMother} />
      <PhotoPicker label="Father" value={father} onChange={setFather} />

      {error && (
        <Card className="border-2 border-[var(--color-coral)]/30 bg-[var(--color-coral)]/5">
          <p className="text-sm text-[var(--color-coral)]">{error}</p>
        </Card>
      )}

      <Button size="block" type="submit" disabled={busy || !mother || !father}>
        {busy ? "Comparing…" : "Run comparison →"}
      </Button>
    </form>
  );
}

function PhotoPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
}) {
  const url = value ? URL.createObjectURL(value) : null;
  return (
    <label className="block">
      <p className="mb-2 text-sm font-semibold text-[var(--color-ink)]">{label}</p>
      <div
        className="flex h-32 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-line-strong)] bg-white p-3"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label} preview`} className="h-full w-auto rounded-md object-cover" />
        ) : (
          <span className="text-sm text-[var(--color-ink-muted)]">
            Tap to choose a photo
          </span>
        )}
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={async (e) => {
          const picked = e.target.files?.[0];
          // iOS hands back HEIC here too, which the model cannot read.
          onChange(picked ? await normalizeToJpeg(picked) : null);
        }}
      />
    </label>
  );
}
