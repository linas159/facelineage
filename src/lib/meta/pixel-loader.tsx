"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { PIXEL_ID } from "./pixel";

/**
 * Injects the Meta Pixel base script (afterInteractive). The vendor snippet
 * fires its own `PageView` on init. We then watch route changes via the
 * App Router hooks and fire PageView again so SPA navigations get tracked.
 *
 * Render <PixelLoader /> inside the <body> of the root layout. Renders
 * nothing if NEXT_PUBLIC_META_PIXEL_ID isn't set.
 */
export function PixelLoader() {
  if (!PIXEL_ID) return null;
  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
          `.trim(),
        }}
      />
      {/* No-JS pixel fallback (image beacon). */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <RouteTracker />
    </>
  );
}

function RouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      // The base snippet already fired PageView on init — don't double-count.
      first.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, search]);
  return null;
}
