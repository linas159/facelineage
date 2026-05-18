import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

const NON_DEFAULT: ReadonlyArray<Locale> = LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE,
);

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Combined middleware: locale routing + Supabase session refresh.
 *
 * Locale routing URL convention:
 *   - English (default):  /quiz/1, /paywall, /
 *   - Other locales:      /ro/quiz/1, /ro/paywall, /ro
 *
 * On `/ro/...` requests we internally rewrite to the matching unprefixed
 * route and set an `x-locale` header that server components read via
 * `getLocale()`. The browser URL stays `/ro/...`.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Decide locale + final rewrite URL.
  const matched = NON_DEFAULT.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  const locale: Locale = matched ?? DEFAULT_LOCALE;

  let response: NextResponse;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  if (matched) {
    const stripped = pathname.replace(new RegExp(`^/${matched}`), "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = stripped;
    response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. Refresh Supabase session — must run on every page request so the
  // auth cookie stays fresh. We mutate the cookies on the in-flight
  // response we just built, so the rewrite + auth cookies coexist.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - any file with an extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)",
  ],
};
