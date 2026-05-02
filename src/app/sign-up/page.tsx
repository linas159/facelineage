import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <FunnelShell>
      <div className="pt-16 text-center">
        <h1 className="mb-4 font-display text-4xl">Save your report</h1>
        <p className="mx-auto mb-12 max-w-sm text-[var(--color-ivory-muted)]">
          Create a free account to unlock and revisit your heritage report anytime.
        </p>
      </div>

      <Card className="mx-auto max-w-md">
        <div className="space-y-4">
          <Button variant="secondary" className="w-full">
            <span className="mr-2"></span>
            Continue with Apple
          </Button>
          <Button variant="secondary" className="w-full">
            <span className="mr-2">G</span>
            Continue with Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--color-border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--color-bg-elevated)] px-3 font-mono uppercase tracking-wider text-[var(--color-muted)]">
                or with email
              </span>
            </div>
          </div>

          <input
            type="email"
            placeholder="you@example.com"
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 text-sm text-[var(--color-ivory)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-gold)] focus:outline-none"
          />
          <Link href="/paywall" className="block">
            <Button className="w-full" size="lg">Send magic link</Button>
          </Link>
        </div>
      </Card>

      <p className="mt-8 text-center text-xs text-[var(--color-muted)]">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-[var(--color-gold)]">Terms</Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-[var(--color-gold)]">Privacy Policy</Link>.
      </p>
    </FunnelShell>
  );
}
