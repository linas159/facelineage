"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { capture } from "@/lib/posthog/client";
import { localizeHref, useI18n } from "@/lib/i18n/client";

interface Props {
  analysisId: string;
  /** Shown under the buttons once a link exists, so the user can copy it by
   *  hand on browsers where neither Web Share nor the clipboard API works. */
  backHref?: string;
}

type ShareResponse = { url?: string; title?: string; text?: string; error?: string };

/**
 * The report's footer actions.
 *
 * Share: asks the server for this analysis's public link (created on first
 * use, stable afterwards), then hands it to the native share sheet on mobile
 * and falls back to the clipboard on desktop.
 *
 * Download: pulls the generated PDF as a blob so we can show progress and a
 * real error instead of navigating the tab to a failed request.
 */
export function ReportActions({ analysisId, backHref }: Props) {
  const { t: dict, locale } = useI18n();
  const t = dict.reportActions;
  const back = backHref ?? localizeHref("/dashboard", locale);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setSharing(true);
    setError(null);
    setCopied(false);

    // Phase 1 — get the link. The busy state covers only this: the share
    // sheet and the clipboard can both leave their promise pending
    // indefinitely (an unfocused window never resolves `writeText`), and the
    // button must not be held hostage by that.
    let payload: { title: string; text: string; url: string } | null = null;
    try {
      const res = await fetch(`/api/share/${analysisId}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as ShareResponse;
      if (!res.ok || !data.url) {
        if (data.error) console.warn("[share]", data.error);
        setError(res.status === 409 ? t.notFinished : t.shareError);
        return;
      }
      setLink(data.url);
      payload = {
        title: data.title ?? dict.share.shareTitle,
        text: data.text ?? "",
        url: data.url,
      };
    } catch {
      setError(t.networkError);
    } finally {
      setSharing(false);
    }

    if (!payload) return;

    // Phase 2 — hand it off. Native sheet on mobile, clipboard elsewhere;
    // either way the link is already on screen as a fallback.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        capture("report_shared", { analysis_id: analysisId, method: "web_share" });
        return;
      } catch (err) {
        // The user dismissing the share sheet is not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    await copy(payload.url);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      capture("report_shared", { analysis_id: analysisId, method: "clipboard" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (insecure context, older browser) — the link is
      // rendered below, so the user can still select and copy it.
      capture("report_shared", { analysis_id: analysisId, method: "manual" });
    }
  }

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report/${analysisId}/pdf`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error) console.warn("[pdf]", data.error);
        setError(res.status === 409 ? t.notFinished : t.pdfError);
        return;
      }
      const blob = await res.blob();
      const filename =
        /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
        "facelineage-report.pdf";

      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a beat to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(href), 10_000);

      capture("report_pdf_downloaded", { analysis_id: analysisId });
    } catch {
      setError(t.networkError);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      <Button size="block" onClick={share} disabled={sharing}>
        {sharing ? t.preparing : copied ? t.linkCopied : t.share}
      </Button>

      <Button size="block" variant="secondary" onClick={download} disabled={downloading}>
        {downloading ? t.building : t.download}
      </Button>

      {link && (
        <div className="rounded-[var(--radius-input)] bg-[var(--color-bg-warm)] p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
            {t.linkLabel}
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 text-xs text-[var(--color-ink-soft)]"
              aria-label={t.linkLabel}
            />
            <Button size="sm" variant="outline" onClick={() => copy(link)}>
              {copied ? t.copied : t.copy}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
            {t.linkNote}
          </p>
        </div>
      )}

      {error && (
        <p className="text-center text-xs text-[var(--color-coral)]">{error}</p>
      )}

      <Link href={back}>
        <Button size="block" variant="ghost">{t.back}</Button>
      </Link>
    </div>
  );
}
