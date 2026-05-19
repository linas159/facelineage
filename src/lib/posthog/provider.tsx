"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/**
 * Initializes PostHog once on mount and tracks SPA route changes as
 * `$pageview` events. Autocapture is on by default — every click, form
 * submit, and change event becomes a PostHog event automatically. Named
 * `capture(...)` calls augment autocapture at funnel milestones.
 *
 * Session recording is enabled — review them in PostHog → Replay.
 *
 * Render <PostHogProvider /> once inside <body> in the root layout.
 */
export function PostHogProvider() {
  const initialized = useRef(false);
  const pathname = usePathname();
  const search = useSearchParams();

  // One-time init.
  useEffect(() => {
    if (initialized.current) return;
    if (!KEY) return;
    initialized.current = true;
    posthog.init(KEY, {
      api_host: HOST,
      // PostHog handles $pageview manually because Next App Router
      // navigations don't trigger full page loads.
      capture_pageview: false,
      capture_pageleave: true,
      // Autocapture clicks/inputs/forms — the bread and butter of "where did
      // they quit?" without instrumenting every element by hand.
      autocapture: true,
      // Session replay. Costs more PostHog events; turn off if budget tight.
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true, // never record what users type (email, etc.)
      },
      persistence: "localStorage+cookie",
      person_profiles: "identified_only", // create profiles only after identify()
    });
  }, []);

  // Track every route change as a pageview. The first run also fires
  // (intentional — covers the initial load).
  useEffect(() => {
    if (!KEY) return;
    if (typeof window === "undefined") return;
    const url = window.location.pathname + (window.location.search ?? "");
    posthog.capture("$pageview", { $current_url: window.location.href, path: url });
  }, [pathname, search]);

  return null;
}
