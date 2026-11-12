import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, Chip } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { PLANS, formatPrice, pickCurrency } from "@/lib/stripe";
import { fmt, getLocale, getDictionary, localized } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { ManagePortalButton } from "./account-actions";

export const dynamic = "force-dynamic";

type AccountKey = keyof Dictionary["account"];
const SUB_STATUS: Record<string, { label: AccountKey; color: "green" | "yellow" | "coral" }> = {
  trialing: { label: "statusTrial", color: "yellow" },
  active: { label: "statusActive", color: "green" },
  past_due: { label: "statusPastDue", color: "coral" },
  canceled: { label: "statusCanceled", color: "coral" },
  incomplete: { label: "statusIncomplete", color: "yellow" },
  paused: { label: "statusPaused", color: "yellow" },
};

export default async function AccountPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const locale = await getLocale();
  if (!user) redirect(localized(`/sign-up?next=${encodeURIComponent(localized("/account", locale))}`, locale));

  const { data: sub } = await sb
    .from("subscriptions")
    .select("status, product_sku, current_period_end, cancel_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const planMeta = sub?.product_sku ? PLANS[sub.product_sku as keyof typeof PLANS] : null;
  const statusMeta = sub?.status ? SUB_STATUS[sub.status] : null;
  const renewsAt = sub?.current_period_end
    ? formatDate(sub.current_period_end, locale, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const dict = await getDictionary();
  const t = dict.account;
  const currency = pickCurrency(locale);
  const planLabel = planMeta ? dict.paywall[planMeta.labelKey] : null;
  const recurringDisplay = planMeta
    ? formatPrice(planMeta.recurring[currency], currency, locale)
    : null;

  return (
    <FunnelShell showBack backHref="/dashboard">
      <div className="pt-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {t.eyebrow}
        </p>
        <h1 className="mb-6">{t.title}</h1>

        <Card className="mb-3">
          <CardTitle>{t.profile}</CardTitle>
          <CardDescription className="mt-1">{user.email}</CardDescription>
          <form
            action={`/auth/signout?next=${encodeURIComponent(localized("/", locale))}`}
            method="post"
            className="mt-4"
          >
            <Button size="block" variant="ghost" type="submit">
              {t.signOut}
            </Button>
          </form>
        </Card>

        <Card className="mb-3">
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>{t.subscription}</CardTitle>
            {statusMeta && <Chip color={statusMeta.color}>{t[statusMeta.label]}</Chip>}
          </div>
          <CardDescription className="mb-4">
            {planLabel && renewsAt && recurringDisplay
              ? fmt(t.renews, {
                  plan: planLabel,
                  recurring: fmt(
                    planMeta!.recurringPeriod === "week"
                      ? dict.paywall.recurringWeekly
                      : dict.paywall.recurringMonthly,
                    { price: recurringDisplay },
                  ),
                  date: renewsAt,
                })
              : planLabel
              ? planLabel
              : t.noSubscription}
          </CardDescription>
          {sub && (
            <div className="space-y-2">
              <ManagePortalButton
                labels={{
                  button: t.portalButton,
                  opening: t.portalOpening,
                  error: t.portalError,
                  network: t.networkError,
                }}
              />
            </div>
          )}
          <div className="mt-4 border-t border-[var(--color-ink)]/10 pt-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{t.refundTitle}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {t.refundBody.split("{email}")[0]}
              <a
                href="mailto:support@facelineage.com"
                className="font-semibold text-[var(--color-orange)] underline underline-offset-2"
              >
                support@facelineage.com
              </a>
              {t.refundBody.split("{email}")[1]}
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>{t.privacyTitle}</CardTitle>
          <CardDescription className="mt-1">{t.privacyBody}</CardDescription>
        </Card>
      </div>
    </FunnelShell>
  );
}
