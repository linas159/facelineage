-- ───── Nov 2026 price update ────────────────────────────────────────────────
-- New customers: $2.49 for 3 days / $4.99 for 7 days / $17.99 for 1 month,
-- then $49/month. Display-only catalog rows (checkout reads PLANS in
-- src/lib/stripe.ts); existing subscribers keep their old Stripe Price.
update public.products set amount_cents = 249, recurring_amount_cents = 4900,
  description = '$2.49 for 3 days, then $49/month'
 where sku = 'sub_intro_3d_m';
update public.products set amount_cents = 499, recurring_amount_cents = 4900,
  description = '$4.99 for 7 days, then $49/month'
 where sku = 'sub_intro_7d_m';
update public.products set amount_cents = 1799, recurring_amount_cents = 4900,
  description = '$17.99 for 1 month, then $49/month'
 where sku = 'sub_intro_1m';
