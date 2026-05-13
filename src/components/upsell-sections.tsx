"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type UpsellId =
  | "parents"
  | "ethnicity"
  | "ages"
  | "partner"
  | "book";

export type Upsell = {
  id: UpsellId;
  title: string;
  subtitle: string;
  body: string;
  price: string;
  imageSrc: string;
  cta: string;
  accent: string;
};

export const UPSELLS: Upsell[] = [
  {
    id: "parents",
    title: "See what came from each parent",
    subtitle: "Mom + Dad breakdown",
    body:
      "Upload a photo of each parent. We'll trace which features and which slices of heritage you inherited from each side, with a side-by-side comparison.",
    price: "$4.99",
    imageSrc: "/upsell/parents.png",
    cta: "Add my parents",
    accent: "var(--color-orange)",
  },
  {
    id: "ethnicity",
    title: "See yourself in every culture",
    subtitle: "Heritage Mirror",
    body:
      "Watch your face reborn as a Han poet, a Yoruba weaver, a Sami reindeer herder — and a dozen more reflections from across the world.",
    price: "$6.99",
    imageSrc: "/upsell/ethnicity.png",
    cta: "Show my reflections",
    accent: "var(--color-violet)",
  },
  {
    id: "ages",
    title: "See yourself across the ages",
    subtitle: "8 historical portraits",
    body:
      "What if you'd lived in Tang-dynasty China, ancient Rome, or the Viking age? We generate eight portraits of you across history.",
    price: "$6.99",
    imageSrc: "/upsell/ages.png",
    cta: "Generate my portraits",
    accent: "var(--color-yellow)",
  },
  {
    id: "partner",
    title: "Meet your future partner",
    subtitle: "AI face match",
    body:
      "Based on the proportions, palette, and heritage of your face, we render a portrait of the kind of person who would balance you most.",
    price: "$6.99",
    imageSrc: "/upsell/partner.png",
    cta: "Reveal my match",
    accent: "var(--color-coral)",
  },
  {
    id: "book",
    title: "The Heritage Guidebook",
    subtitle: "Your ancestry research companion",
    body:
      "Methods, tools, and frameworks for taking your heritage discovery further: how to trace ancestors, decode DNA results, conduct oral histories, and read old records. A printable PDF you keep forever.",
    price: "$9.99",
    imageSrc: "/upsell/book.png",
    cta: "Get the guidebook",
    accent: "var(--color-green)",
  },
];

interface UpsellCardProps {
  upsell: Upsell;
  busy: boolean;
  purchased?: boolean;
  error?: string;
  onAccept: (id: UpsellId) => void;
}

function UpsellCard({ upsell, busy, purchased, error, onAccept }: UpsellCardProps) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-warm)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={upsell.imageSrc}
          alt={upsell.title}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-5">
        <p
          className="mb-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: upsell.accent }}
        >
          {upsell.subtitle}
        </p>
        <CardTitle className="mb-2">{upsell.title}</CardTitle>
        <CardDescription className="mb-4">{upsell.body}</CardDescription>

        <div className="mb-3 flex items-baseline justify-between rounded-[var(--radius-input)] bg-[var(--color-bg-warm)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            One-time
          </span>
          <span
            className="font-display text-2xl font-bold tabular"
            style={{ color: upsell.accent }}
          >
            {upsell.price}
          </span>
        </div>

        {purchased ? (
          <div
            className="rounded-[var(--radius-input)] bg-[var(--color-green)]/10 p-3 text-center text-sm font-semibold text-[var(--color-green)]"
          >
            ✓ Purchased — generating now
          </div>
        ) : (
          <Button
            size="block"
            disabled={busy}
            onClick={() => onAccept(upsell.id)}
          >
            {busy ? "Processing…" : upsell.cta}
          </Button>
        )}

        {error && (
          <p className="mt-2 text-center text-xs text-[var(--color-coral)]">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}

interface UpsellSectionsProps {
  heading?: string;
  subhead?: string;
  ids?: UpsellId[];
  /** Required to charge — every upsell attaches to a specific analysis. */
  analysisId?: string;
  className?: string;
}

export function UpsellSections({
  heading = "Take your story further",
  subhead = "Optional one-time purchases — keep them forever.",
  ids,
  analysisId,
  className,
}: UpsellSectionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<UpsellId | null>(null);
  const [purchased, setPurchased] = useState<Partial<Record<UpsellId, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<UpsellId, string>>>({});
  const list = ids ? UPSELLS.filter((u) => ids.includes(u.id)) : UPSELLS;

  async function handleAccept(id: UpsellId) {
    if (!analysisId) {
      // eslint-disable-next-line no-console
      console.warn("UpsellSections: no analysisId; cannot charge");
      return;
    }
    setBusy(id);
    setErrors((e) => ({ ...e, [id]: undefined }));
    const result = await chargeUpsell(id, analysisId);
    if (result === "success") {
      setPurchased((p) => ({ ...p, [id]: true }));
      // Re-render the server component so the buy card disappears and the
      // owned-state UI (download / upload prompt / generating) takes its
      // place — no manual refresh needed.
      router.refresh();
    } else if (result === "checkout") {
      window.location.href = `/checkout?upsell=${id}&analysis=${analysisId}`;
      return;
    } else if (typeof result === "string") {
      setErrors((e) => ({ ...e, [id]: result }));
    }
    setBusy(null);
  }

  return (
    <section className={cn("mt-10", className)}>
      <h2 className="mb-2 text-center text-balance">{heading}</h2>
      <p className="mx-auto mb-6 max-w-sm text-center text-sm text-[var(--color-ink-soft)]">
        {subhead}
      </p>

      <div className="space-y-5">
        {list.map((u) => (
          <UpsellCard
            key={u.id}
            upsell={u}
            busy={busy === u.id}
            purchased={!!purchased[u.id]}
            error={errors[u.id]}
            onAccept={handleAccept}
          />
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pop-up variant — sequenced modals, triggered when the user scrolls to the
// bottom of the page. Used at the end of the report.
// ────────────────────────────────────────────────────────────────────────────

interface UpsellModalProps {
  upsell: Upsell;
  busy: boolean;
  onAccept: (id: UpsellId) => void;
  onDecline: () => void;
}

function UpsellModal({ upsell, busy, onAccept, onDecline }: UpsellModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-bg-overlay)] sm:items-center sm:p-4"
      onClick={onDecline}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-warm)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={upsell.imageSrc}
            alt={upsell.title}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onDecline}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-[var(--color-ink-soft)] shadow-[var(--shadow-chip)] backdrop-blur"
          >
            ×
          </button>
        </div>

        <div className="p-6 pb-7">
          <p
            className="mb-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: upsell.accent }}
          >
            {upsell.subtitle}
          </p>
          <h2 className="mb-3 font-display text-2xl font-bold leading-tight text-[var(--color-ink)]">
            {upsell.title}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {upsell.body}
          </p>

          <div className="mb-4 flex items-baseline justify-between rounded-[var(--radius-input)] bg-[var(--color-bg-warm)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              One-time
            </span>
            <span
              className="font-display text-2xl font-bold tabular"
              style={{ color: upsell.accent }}
            >
              {upsell.price}
            </span>
          </div>

          <Button size="block" disabled={busy} onClick={() => onAccept(upsell.id)}>
            {upsell.cta}
          </Button>
          <button
            type="button"
            onClick={onDecline}
            className="mt-3 w-full text-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
          >
            No thanks, maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

interface UpsellPopupSequenceProps {
  ids?: UpsellId[];
  /** Required for the buttons to actually start checkout. Demo report has no analysisId. */
  analysisId?: string;
}

/**
 * Drop this at the very bottom of a page. It renders a 1px sentinel that —
 * when it intersects the viewport — triggers a sequence of upsell modals.
 * Each modal advances on accept or decline; once all are seen, nothing
 * shows again for the rest of the page life.
 */
export function UpsellPopupSequence({ ids, analysisId }: UpsellPopupSequenceProps) {
  const list = ids ? UPSELLS.filter((u) => ids.includes(u.id)) : UPSELLS;
  const [step, setStep] = useState<number>(-1);
  const [busy, setBusy] = useState<UpsellId | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !triggered.current) {
            triggered.current = true;
            setStep(0);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px 200px 0px", threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  async function handleAccept(id: UpsellId) {
    if (!analysisId) {
      // Demo report — just close the modal.
      setStep((s) => s + 1);
      return;
    }
    setBusy(id);
    const result = await chargeUpsell(id, analysisId);
    setBusy(null);
    if (result === "checkout") {
      window.location.href = `/checkout?upsell=${id}&analysis=${analysisId}`;
      return;
    }
    // On success or error, advance to the next modal. The card surface
    // (UpsellSections) shows inline confirmation; the popup is more
    // ephemeral so we just move on.
    setStep((s) => s + 1);
  }

  function handleDecline() {
    setStep((s) => s + 1);
  }

  const current = step >= 0 && step < list.length ? list[step] : null;

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      {current && (
        <UpsellModal
          upsell={current}
          busy={busy === current.id}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Off-session upsell charge helper.
//
// Returns "success" | "checkout" | <error message>. "checkout" means the
// server couldn't charge off-session and wants the user routed to the
// interactive /checkout page.
// ────────────────────────────────────────────────────────────────────────────

type ChargeResult = "success" | "checkout" | string;

async function chargeUpsell(upsell: UpsellId, analysisId: string): Promise<ChargeResult> {
  let res: Response;
  try {
    res = await fetch("/api/upsell-charge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ upsell, analysisId }),
    });
  } catch {
    return "Network error — please try again";
  }

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    alreadyOwned?: boolean;
    requiresAction?: boolean;
    requiresCheckout?: boolean;
    clientSecret?: string;
    publishableKey?: string;
    error?: string;
    message?: string;
  };

  // The server refuses to re-charge if the user already owns the add-on.
  // We treat that as success client-side so the card flips to "Purchased"
  // without an error toast.
  if (data.alreadyOwned) return "success";
  if (data.success) return "success";
  if (data.requiresCheckout) return "checkout";

  if (data.requiresAction && data.clientSecret && data.publishableKey) {
    // 3DS / SCA — Stripe shows its own popup. After it succeeds the webhook
    // fires and the user lands back on the page.
    try {
      const stripe = await loadStripe(data.publishableKey);
      if (!stripe) return "Could not load Stripe.js";
      const { error, paymentIntent } = await stripe.handleNextAction({
        clientSecret: data.clientSecret,
      });
      if (error) return error.message ?? "Authentication failed";
      if (paymentIntent?.status === "succeeded") return "success";
      return `Payment status: ${paymentIntent?.status ?? "unknown"}`;
    } catch (err) {
      return err instanceof Error ? err.message : "Authentication failed";
    }
  }

  return data.error ?? "Payment failed";
}
