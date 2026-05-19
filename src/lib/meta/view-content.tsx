"use client";

import { useEffect } from "react";
import { fbqTrack, type PixelEventParams } from "./pixel";

/**
 * Fires Meta Pixel ViewContent on mount. Use sparingly — Meta's algorithm
 * already gets PageView for every nav. ViewContent is meant for "high-intent
 * content view" signals: a paywall, a product detail page, a key landing.
 *
 * Mount inside any Server Component by rendering <ViewContentBeacon ... />.
 */
export function ViewContentBeacon(props: {
  contentName: string;
  contentCategory?: string;
  contentIds?: string[];
}) {
  useEffect(() => {
    const params: PixelEventParams = { content_name: props.contentName };
    if (props.contentCategory) params.content_category = props.contentCategory;
    if (props.contentIds) params.content_ids = props.contentIds;
    fbqTrack("ViewContent", params);
    // Run once per mount. The fbq global is idempotent on its own — but
    // double-firing would still inflate metrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
