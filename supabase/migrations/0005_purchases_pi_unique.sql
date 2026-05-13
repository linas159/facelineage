-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0005 — unique index on purchases.stripe_payment_intent      ║
-- ║                                                                           ║
-- ║  The upsell + intro-fee handlers upsert on `stripe_payment_intent`, but   ║
-- ║  the original schema only had a UNIQUE on `stripe_checkout_session`      ║
-- ║  (back when everything went through Checkout). Postgres rejects          ║
-- ║  ON CONFLICT against a column with no unique constraint.                  ║
-- ║                                                                           ║
-- ║  Partial index: NULL allowed (older rows pre-PaymentIntent flow have it). ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create unique index if not exists purchases_stripe_payment_intent_unique
  on public.purchases (stripe_payment_intent)
  where stripe_payment_intent is not null;
