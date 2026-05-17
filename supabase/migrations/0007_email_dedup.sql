-- Atomic dedupe for the report-ready email. Both the Stripe webhook
-- and /payment-complete now fire the email; whichever wins the
-- update-where-null race actually sends.
alter table public.analyses
  add column if not exists report_email_sent_at timestamptz;
