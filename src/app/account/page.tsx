import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, Chip } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { PLANS, formatPrice, pickCurrency } from "@/lib/stripe";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { ManagePortalButton, DeleteDataButton } from "./account-actions";

export const dynamic = "force-dynamic";

const SUB_STATUS_LABEL: Record<string, { label: string; color: "green" | "yellow" | "coral" }> = {
  trialing: { label: "Trial", color: "yellow" },
  active: { label: "Active", color: "green" },
  past_due: { label: "Past due", color: "coral" },
  canceled: { label: "Canceled", color: "coral" },
  incomplete: { label: "Incomplete", color: "yellow" },
  paused: { label: "Paused", color: "yellow" },
};

export default async function AccountPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/sign-up?next=/account");

  const { data: sub } = await sb
    .from("subscriptions")
    .select("status, product_sku, current_period_end, cancel_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const planMeta = sub?.product_sku ? PLANS[sub.product_sku as keyof typeof PLANS] : null;
  const statusMeta = sub?.status ? SUB_STATUS_LABEL[sub.status] : null;
  const renewsAt = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const locale = await getLocale();
  const dict = await getDictionary();
  const currency = pickCurrency(locale);
  const planLabel = planMeta ? dict.paywall[planMeta.labelKey] : null;
  const recurringDisplay = planMeta
    ? formatPrice(planMeta.recurring[currency], currency, locale)
    : null;

  return (
    <FunnelShell showBack backHref="/dashboard">
      <div className="pt-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Account
        </p>
        <h1 className="mb-6">Your account</h1>

        <Card className="mb-3">
          <CardTitle>Profile</CardTitle>
          <CardDescription className="mt-1">{user.email}</CardDescription>
          <form action="/auth/signout?next=/" method="post" className="mt-4">
            <Button size="block" variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </Card>

        <Card className="mb-3">
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Subscription</CardTitle>
            {statusMeta && <Chip color={statusMeta.color}>{statusMeta.label}</Chip>}
          </div>
          <CardDescription className="mb-4">
            {planLabel && renewsAt && recurringDisplay
              ? `${planLabel} · renews ${recurringDisplay}/${planMeta!.recurringPeriod} on ${renewsAt}`
              : planLabel
              ? planLabel
              : "No active subscription."}
          </CardDescription>
          {sub && (
            <div className="space-y-2">
              <ManagePortalButton />
            </div>
          )}
          <div className="mt-4 border-t border-[var(--color-ink)]/10 pt-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Request a refund</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Not happy with your purchase? Email{" "}
              <a
                href="mailto:support@facelineage.com"
                className="font-semibold text-[var(--color-orange)] underline underline-offset-2"
              >
                support@facelineage.com
              </a>{" "}
              and we&apos;ll take care of it.
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>Privacy</CardTitle>
          <CardDescription className="mt-1 mb-4">
            Your photos are auto-deleted 30 days after upload. You can delete them sooner here.
          </CardDescription>
          <DeleteDataButton />
        </Card>
      </div>
    </FunnelShell>
  );
}
