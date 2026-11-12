import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getLocale, localized } from "@/lib/i18n/server";
import { SignUpForm } from "./sign-up-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const next = safeNext(params.next) ?? localized("/dashboard", locale);
  // Arriving with a report as `next` means a customer who already paid is
  // trying to open their report (e.g. from the receipt email on another
  // device). Don't steer them back into the quiz/paywall.
  const forReport = /^\/(?:[a-z]{2}\/)?report\//.test(next);

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (user) {
    // Already signed in — let them continue OR sign out to use a different
    // account. No silent redirect (used to be the bug that locked you out).
    return (
      <FunnelShell>
        <div className="pt-8 text-center">
          <h1 className="mb-3 text-balance">You&apos;re already signed in</h1>
          <p className="mx-auto mb-8 max-w-sm text-base leading-relaxed text-[var(--color-ink-soft)]">
            Signed in as <span className="font-semibold">{user.email}</span>.
          </p>
        </div>

        <Card className="flex flex-col gap-4">
          <Link href={next}>
            <Button size="block">{forReport ? "Open my report →" : "Continue to dashboard →"}</Button>
          </Link>
          <form action={`/auth/signout?next=${encodeURIComponent(
              localized(`/sign-up?next=${encodeURIComponent(next)}`, locale),
            )}`} method="post">
            <Button size="block" variant="secondary" type="submit">
              Sign out and use a different email
            </Button>
          </form>
        </Card>
      </FunnelShell>
    );
  }

  return (
    <FunnelShell>
      <div className="pt-8 text-center">
        <h1 className="mb-3 text-balance">
          {forReport ? "Sign in to see your report" : "Sign in to Facelineage"}
        </h1>
        <p className="mx-auto mb-8 max-w-sm text-base leading-relaxed text-[var(--color-ink-soft)]">
          {forReport
            ? "Your payment went through and your report is saved to your account. Enter the email you used at checkout — we\u2019ll send a one-tap link that opens it. No need to take the test or pay again."
            : "Enter the email you used at checkout — we\u2019ll send you a one-tap sign-in link."}
        </p>
      </div>

      <Card>
        <SignUpForm next={next} />
      </Card>

      {params.error && (
        <p className="mt-4 text-center text-xs text-[var(--color-coral)]">
          {decodeURIComponent(params.error)}
        </p>
      )}

      {forReport ? (
        <p className="mt-6 text-center text-base leading-relaxed text-[var(--color-ink-soft)]">
          Can&apos;t find the email or used a different address? Write to{" "}
          <a
            href="mailto:support@facelineage.com"
            className="font-semibold underline hover:text-[var(--color-orange)]"
          >
            support@facelineage.com
          </a>{" "}
          and we&apos;ll get you to your report.
        </p>
      ) : (
        <p className="mt-6 text-center text-base leading-relaxed text-[var(--color-ink-soft)]">
          New here?{" "}
          <Link href={localized("/", locale)} className="font-semibold underline hover:text-[var(--color-orange)]">
            Take the quiz to start a report
          </Link>
          .
        </p>
      )}
    </FunnelShell>
  );
}

/** Only same-origin absolute paths — `next` ends up in a redirect. */
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}
