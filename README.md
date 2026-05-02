# Facelineage

AI ancestry analysis from a single photo. Next.js 15 + Supabase + Stripe.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animation:** Motion (Framer Motion)
- **Auth + DB + Storage:** Supabase
- **Payments:** Stripe (Subscriptions + Checkout)
- **AI — face attributes:** DeepFace via Replicate + Face++
- **AI — narrative:** Claude Sonnet 4.6
- **Email:** Resend
- **Hosting:** Vercel

## Quick start

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill in values
cp .env.local.example .env.local

# 3. Run dev server
npm run dev
```

Open http://localhost:3000

## Environment variables

All required env vars are documented in `.env.local.example`. The minimum to run locally:

| Var | Where to get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (keep server-only) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | same page |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `REPLICATE_API_TOKEN` | replicate.com → Account → API tokens |
| `FACEPP_API_KEY` / `FACEPP_API_SECRET` | console.faceplusplus.com |

## Supabase setup

1. Create a Supabase project.
2. Run the migration:

```bash
# Option A: via Supabase CLI
npx supabase link --project-ref <your-ref>
npx supabase db push

# Option B: paste supabase/migrations/0001_initial.sql into the SQL editor
```

3. In Authentication → Providers, enable Email + Google + Apple.
4. In Storage, confirm `analysis-photos` bucket was created (it's part of the migration).

## Stripe setup

1. Create products & prices in the Stripe Dashboard matching:
   - `$1.95 / 3-day` (one-time) → chained with `$24.99/week` (recurring)
   - `$6.99 / 7-day` (one-time) → chained with `$24.99/week` (recurring)
   - `$17.99 / 1-month` (one-time) → chained with `$47.99/month` (recurring)
   - Upsells: `$14.99` PDF book, `$9.99` parents, `$9.99` ages, `$4.99` cultural
2. Paste the resulting `price_xxx` IDs into `.env.local`.
3. Forward webhooks for local dev:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.

## Project structure

```
src/
  app/
    page.tsx              Landing
    start/                Photo upload
    quiz/[step]/          6-question onboarding
    analyzing/            Theatrical loader
    preview/              Free teaser
    sign-up/              Magic link / OAuth
    paywall/              3 subscription tiers
    report/[id]/          Full report + upsells
    dashboard/            Past reports
    account/              Subscription mgmt
    layout.tsx
    globals.css           Design tokens
  components/
    brand/logo.tsx        SVG wordmark
    ui/                   shadcn primitives
    funnel-shell.tsx      Shared funnel chrome
  lib/
    supabase/             Client + server + middleware + types
    utils.ts              cn helper
  middleware.ts           Session refresh on every request

supabase/
  migrations/
    0001_initial.sql      Schema + RLS + storage + cron
```

## Roadmap

- [x] **M1** — Scaffold (this commit)
- [ ] **M2** — Photo upload + DeepFace pipeline + analyzing screen
- [ ] **M3** — Quiz state + Claude narrative generation
- [ ] **M4** — Stripe Checkout + webhook + paywall gating
- [ ] **M5** — Report animations + share cards (`@vercel/og`) + PDF
- [ ] **M6** — Upsells (PDF book, parents comparison, ages portraits)
- [ ] **M7** — PostHog funnel events + Sentry + Resend reminder emails
- [ ] **M8** — Polish, mobile pass, legal pages, launch

## Development notes

- **Never commit `.env.local`** — it's in `.gitignore`.
- **Service-role key** is server-only. Use `createServiceClient()` from `@/lib/supabase/server` only in server actions, route handlers, and webhooks.
- **Stripe webhooks** must validate signatures — never trust client-side payment confirmation.
- **Photo retention** is 30 days, enforced by a `pg_cron` job in the migration.
