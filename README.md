# Facelineage

AI ancestry analysis from a single photo. Mobile-first Next.js 15 + Supabase + Stripe.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 + custom design tokens (peach/orange playful)
- **Fonts:** Outfit (body) + Signika (display) via `next/font/google`
- **Auth + DB + Storage:** Supabase
- **Payments:** Stripe (chained intro→recurring via Subscription Schedules)
- **AI — face reading + narrative:** Claude Opus 5 (high-resolution vision; adaptive thinking)
- **AI — portraits:** nano-banana via Replicate / Google AI Studio
- **Email:** Resend (M3)
- **Hosting:** Vercel

## Funnel

```
/  →  /quiz/1 → /quiz/2 → /quiz/3 → /capture → /analyzing → /sign-up → /paywall → /report/[id]
                                                  ↑
                                          (mid-quiz questions during wait)
```

After payment, three upsell modals pop sequentially on the report page:
PDF Heritage Book → Parents Comparison → Through The Ages.

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env template and fill in (NEVER commit your real .env.local)
cp .env.local.example .env.local

# 3. Run dev server
npm run dev

# 4. Run Supabase migration in your project's SQL editor
# Paste: supabase/migrations/0001_initial.sql

# 5. Create Stripe products (chained intro→recurring can't be done via UI)
node --env-file=.env.local scripts/setup-stripe.mjs
# Copy the printed STRIPE_PRICE_* lines into .env.local

# 6. Forward Stripe webhooks for local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy whsec_... → STRIPE_WEBHOOK_SECRET in .env.local
```

Open http://localhost:3000 (resize to phone width — designed mobile-first).

## Environment variables

All required vars are documented in `.env.local.example`. **Never put real values in `.env.local.example` — that file is committed to git.** Real values go in `.env.local` only.

## Project structure

```
src/
  app/
    page.tsx                    Landing
    quiz/[step]/page.tsx        3-question pre-quiz
    capture/                    Selfie / photo upload
      page.tsx
      capture-form.tsx
    analyzing/                  Theatrical loader + mid-quiz
      page.tsx
      analyzing-client.tsx
    sign-up/page.tsx            Magic link / OAuth
    paywall/                    3 tiers with dynamic disclosure
      page.tsx
      paywall-client.tsx
    report/[id]/page.tsx        Report + popup upsells
    dashboard/page.tsx          User's library
    account/page.tsx            Subscription management
    api/
      checkout/route.ts         POST → Stripe Checkout session
      webhooks/stripe/route.ts  Stripe webhook → chains schedule
    layout.tsx
    globals.css                 Design tokens (@theme block)
  components/
    brand/logo.tsx              SVG wordmark
    funnel-shell.tsx            Mobile-first chrome with progress bar
    illustration.tsx            Placeholder art (see docs/visual-assets-plan.md)
    testimonials.tsx            Card / carousel / grid
    upsell-modal.tsx            Post-purchase popup sequence
    ui/
      button.tsx                Pill button, 5 variants
      card.tsx                  White rounded cards + Chip
  lib/
    supabase/                   client / server / middleware / types
    actions/upload-photo.ts     Server action: upload + create analysis row
    stripe.ts                   Stripe SDK init + plan metadata
    utils.ts                    cn helper
  middleware.ts                 Session refresh

supabase/
  migrations/
    0001_initial.sql            Schema + RLS + storage + cron

scripts/
  setup-stripe.mjs              Creates Stripe products + prices

docs/
  visual-assets-plan.md         What to commission, how, prompts
```

## Design system

Defined in `src/app/globals.css` via Tailwind v4 `@theme` block:

- **Background:** `#fff5e8` peach cream
- **Primary:** `#ff7a3d` orange
- **Accents:** `#5fac23` green, `#ffb21d` yellow, `#f36671` coral, `#7c5cff` violet
- **Fonts:** Outfit (body) + Signika (display, headings)
- **Radii:** chunky/rounded — `999px` pills, `24px` cards
- **Shadows:** soft warm with subtle CTA "press" effect

Use design tokens via `var(--color-orange)` etc. — never hard-code hex values in components.

## Roadmap

- [x] **M1** — scaffold (dark/luxe, deprecated)
- [x] **M2** — design pivot (peach/orange playful, mobile-first), funnel reorder, testimonials, upsell modals, Stripe products script, photo-upload server action, checkout API, webhook handler
- [ ] **M3** — wire AI pipeline: Face++ + DeepFace (Replicate) + Claude narrative; real `/preview` and `/report` content; Supabase Realtime for analyzing progress
- [ ] **M4** — auth flow polish: Supabase magic link + Google OAuth + Apple OAuth; session-aware funnel that reconciles `pending-{uuid}` to real user_id post-signup
- [ ] **M5** — visual assets dropped in (see `docs/visual-assets-plan.md`); replace placeholder gradients
- [ ] **M6** — share cards (`@vercel/og`) + PDF report generation + actual upsell delivery (Stripe + artifact generation)
- [ ] **M7** — PostHog funnel analytics + Sentry + Resend transactional emails (24h-before-charge reminders, etc.)
- [ ] **M8** — legal pages (privacy, terms, refunds), App Store / Play Store-style review compliance, launch

## Development notes

- **Mobile-first**: max-width on funnel pages is `max-w-md` (~448px). Always design for narrow first, then enhance for `md:`.
- **Never commit `.env.local`** — gitignored. `.env.local.example` must stay placeholders only.
- **Service-role key** is server-only. Use `createServiceClient()` from `@/lib/supabase/server` only in server actions, route handlers, and webhooks.
- **Stripe webhooks** validate signatures via `constructEvent`. The webhook handler is what upgrades the simple intro subscription into a chained schedule with the recurring price.
- **Photo retention:** 30 days, enforced by `pg_cron` job in the migration.
- **Pre-auth uploads:** allowed via service-role client into a `pending-{uuid}` folder. On sign-up, reconcile by moving the analysis row's `user_id` (M4 work).
