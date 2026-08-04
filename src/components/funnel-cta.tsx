"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { capture } from "@/lib/posthog/client";

interface FunnelCtaProps extends Omit<ButtonProps, "asChild"> {
  /** Localized href for the quiz funnel (e.g. "/quiz/1"). */
  quizHref: string;
  children: React.ReactNode;
}

/**
 * Landing CTA into the quiz funnel. Prefetches the entry route so the first
 * tap feels instant and reports the click to PostHog.
 */
export function FunnelCta({
  quizHref,
  children,
  ...buttonProps
}: FunnelCtaProps) {
  const router = useRouter();

  // Warm the entry route so the first tap feels instant.
  useEffect(() => {
    router.prefetch(quizHref);
  }, [router, quizHref]);

  function handleClick() {
    capture("funnel_cta_clicked", { href: quizHref });
  }

  return (
    <Link href={quizHref} onClick={handleClick}>
      <Button {...buttonProps}>{children}</Button>
    </Link>
  );
}
