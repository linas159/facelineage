-- ───── new customers renew monthly only ─────────────────────────────────────
-- The 3-day and 7-day intro offers now renew at the monthly price instead of
-- weekly. They get new SKUs so existing weekly subscribers keep resolving to
-- the weekly plan; the old SKUs are soft-deleted (deactivated), not removed,
-- because subscriptions/purchases reference them.
update public.products
   set active = false
 where sku in ('sub_intro_3d', 'sub_intro_7d');

insert into public.products (sku, kind, stripe_price_id, stripe_recurring_price_id, amount_cents, recurring_amount_cents, display_name, description) values
  ('sub_intro_3d_m', 'subscription_intro_3d', 'STRIPE_PRICE_INTRO_3D', 'STRIPE_PRICE_RECUR_MONTH', 195, 4799, '3-Day Access', '$1.95 for 3 days, then $47.99/month'),
  ('sub_intro_7d_m', 'subscription_intro_7d', 'STRIPE_PRICE_INTRO_7D', 'STRIPE_PRICE_RECUR_MONTH', 395, 4799, '7-Day Access', '$3.95 for 7 days, then $47.99/month')
on conflict (sku) do update set
  kind = excluded.kind,
  stripe_price_id = excluded.stripe_price_id,
  stripe_recurring_price_id = excluded.stripe_recurring_price_id,
  amount_cents = excluded.amount_cents,
  recurring_amount_cents = excluded.recurring_amount_cents,
  display_name = excluded.display_name,
  description = excluded.description,
  active = true;
