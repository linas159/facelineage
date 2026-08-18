-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0012 — record the payment method type on each purchase      ║
-- ║                                                                           ║
-- ║  Since evidence capture went live, roughly 70% of payments arrive with    ║
-- ║  no card details: the Stripe Charge is read successfully (authorized_at   ║
-- ║  is stamped from charge.created) but carries no                           ║
-- ║  payment_method_details.card, which means a non-card payment method.      ║
-- ║                                                                           ║
-- ║  Which one decides whether that matters at all:                           ║
-- ║                                                                           ║
-- ║    paypal — settles on PayPal's rails under PayPal's descriptor. Visa     ║
-- ║             and Mastercard never send us a lookup for these, so having    ║
-- ║             no card identifiers costs nothing.                            ║
-- ║    link   — Stripe's wallet, but card-funded and settled on card rails.   ║
-- ║             An issuer CAN raise an Order Insight lookup against one, and  ║
-- ║             we would have nothing to match it against.                    ║
-- ║                                                                           ║
-- ║  We cannot tell the two apart from what we currently store, so store it.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.purchases
  add column if not exists payment_method_type text;

-- Answers "what share of our card-rail traffic can we actually match?" in one
-- query, without scanning Stripe.
create index if not exists idx_purchases_payment_method_type
  on public.purchases (payment_method_type, created_at desc)
  where payment_method_type is not null;
