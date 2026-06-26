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
  const next = params.next ?? "/dashboard";
  const locale = await getLocale();

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
            <Button size="block">Continue to dashboard →</Button>
          </Link>
          <form action={`/auth/signout?next=/sign-up`} method="post">
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
        <h1 className="mb-3 text-balance">Sign in to Facelineage</h1>
        <p className="mx-auto mb-8 max-w-sm text-base leading-relaxed text-[var(--color-ink-soft)]">
          Enter the email you used at checkout — we&apos;ll send you a one-tap sign-in link.
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

      <p className="mt-6 text-center text-base leading-relaxed text-[var(--color-ink-soft)]">
        New here?{" "}
        <Link href={localized("/", locale)} className="font-semibold underline hover:text-[var(--color-orange)]">
          Take the quiz to start a report
        </Link>
        .
      </p>
    </FunnelShell>
  );
}

