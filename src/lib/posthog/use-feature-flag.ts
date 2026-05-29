"use client";

import { useEffect, useState } from "react";
import { getFeatureFlag, onFeatureFlags } from "./client";

/**
 * React hook around a single PostHog feature flag. Re-renders the component
 * when PostHog finishes loading flags so the UI can settle on the resolved
 * variant.
 *
 * Returns:
 *   - `value`:  the flag value (boolean / variant string), or `undefined`
 *               while flags are still loading or PostHog is unavailable.
 *   - `loaded`: `true` once PostHog has reported its flags at least once.
 *
 * Call sites typically pick a sensible default for the `undefined`/!loaded
 * window so there's no flash of the wrong experience.
 */
export function useFeatureFlag(key: string): {
  value: boolean | string | undefined;
  loaded: boolean;
} {
  const [value, setValue] = useState<boolean | string | undefined>(() =>
    getFeatureFlag(key),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Pick up a value already resolved before this effect ran.
    const current = getFeatureFlag(key);
    if (current !== undefined) {
      setValue(current);
      setLoaded(true);
    }
    const unsub = onFeatureFlags(() => {
      setValue(getFeatureFlag(key));
      setLoaded(true);
    });
    return unsub;
  }, [key]);

  return { value, loaded };
}
