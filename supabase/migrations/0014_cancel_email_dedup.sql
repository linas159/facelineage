-- Atomic dedupe for the cancellation-confirmation email. A cancellation can
-- reach us more than once — `customer.subscription.updated` when the customer
-- schedules it, `customer.subscription.deleted` when it actually ends, plus
-- Stripe's own webhook retries — and the customer should be told exactly once.
-- Whoever wins the update-where-null race sends; the rest no-op.
--
-- Cleared again whenever a subscription goes back to not-canceling, so a
-- customer who reactivates and later cancels again still gets confirmation.
alter table public.subscriptions
  add column if not exists cancel_email_sent_at timestamptz;
