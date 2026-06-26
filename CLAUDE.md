# CLAUDE.md

Guidance for working in this repository.

## What this is

An e-commerce storefront + admin for **Lyricalmyrical Books**, a publisher.
It's a single-page React app (the public bookstore and the admin dashboard are
the same SPA), backed by **Firebase** (Firestore, Auth, Storage) and a set of
**Cloud Functions** that handle payments, email, and fulfillment. The UI was
originally generated from a Figma design ("Artsy Website for Publisher").

> Note: `README.md` still documents an older Express `backend/server.js` with a
> password-protected admin. That backend no longer exists — payments,
> fulfillment, and admin auth have all moved to Firebase (see below). Trust this
> file and the actual code over the README's "Backend API + Admin" section.

## Tech stack

- **React 18 + TypeScript**, built with **Vite 6**.
- **React Router 7** (`react-router`) — client-side routing in `src/app/App.tsx`.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) for styling; **shadcn/ui** +
  **Radix UI** primitives in `src/app/components/ui/`.
- **MUI** and **motion** (Framer Motion successor) are also present for some
  components/animations.
- **Firebase 11** client SDK (`src/lib/firebase.ts`, project
  `lyricalmyrical-web-v2`). A secondary "legacy" Firebase project is used for
  inventory sync (`src/lib/legacyFirebase.ts`).
- **Stripe** for checkout, **Resend** for transactional email, **Shippo** for
  address verification / shipping labels — all wired through Cloud Functions.
- **Vitest** for tests.

## Layout

```
src/
  main.tsx                  App entry
  app/
    App.tsx                 Routes + top-level providers (Theme, Currency, Cart)
    CartContext.tsx         Cart state
    CurrencyContext.tsx     Multi-currency state
    Checkout.tsx            Checkout flow (calls Stripe via Cloud Functions)
    admin/                  Admin dashboard (route /admin/*) — catalog, orders,
                            discounts, reviews moderation, pages, theme editor,
                            analytics, shop settings. `api.ts` = Firestore calls.
    components/             MainSite, CartDrawer, shared components, ui/ (shadcn)
    features/site/          Storefront pages: BookDetail, CollectionPage,
                            Wishlist, Account, OrderTracking, Search, Reviews,
                            plus constants.ts / storeCopy.ts / types.ts
    lib/                    seo, wishlist, recentlyViewed, functionsBase helpers
  lib/                      firebase.ts, legacyFirebase.ts
  styles/                   Tailwind/global CSS, fonts
functions/                  Firebase Cloud Functions (Node 20, separate package)
  index.js                  All functions (Stripe, webhook, emails, sweeps)
  shippingGeo.js            Shipping zone matching
scripts/                    generate-sitemap, check-readability, verify-admin
firestore.rules / .indexes  Firestore security rules + indexes
storage.rules               Storage security rules
firebase.json / .firebaserc Firebase deploy config (project lyricalmyrical-web-v2)
```

### Routes (`src/app/App.tsx`)
`/` storefront · `/books/:slug` · `/collections/:slug` · `/wishlist` ·
`/account/*` · `/page/:slug` · `/admin/*` · `/checkout` · `/track`

Pages are lazy-loaded via `React.lazy` + `Suspense`.

### Firestore collections
`books`, `authors`, `orders`, `discounts`, `reviews`, `pages`, `newsletter`,
`analytics`, plus a settings doc and audit log. Always check `firestore.rules`
before changing read/write shapes — rules are enforced server-side.

## Commands

```bash
npm install          # install deps
npm run dev          # Vite dev server (localhost:5173)
npm run build        # vite build + generate sitemap -> dist/
npm run preview      # preview the production build
npm test             # vitest run
npm run build:sitemap
npm run check:readability
```

Cloud Functions are a separate package:
```bash
cd functions && npm install
npm run serve        # firebase emulators (functions only)
npm run deploy       # firebase deploy --only functions
npm run logs
```

## Auth & admin access

- Admin login is **Google sign-in**, hard-restricted to
  `lyricalmyricalbooks@gmail.com` (see `src/app/admin/api.ts` and the
  `ADMIN_EMAILS` allowlist + `requireAdmin` in `functions/index.js`). There is
  no password-based admin anymore.
- Cloud Functions verify the Firebase ID token and require a verified admin
  email for privileged endpoints.

## Cloud Functions (`functions/index.js`)

- `createStripeCheckoutSession` — secure Stripe session creation.
- `stripeWebhook` — the **only** thing that marks orders paid; it also
  decrements stock, counts discount redemptions, and records revenue. Orders are
  created `unpaid` first.
- `downloadDigitalAsset` — gated digital ebook downloads.
- `onOrderPaid` / `onOrderShipped` — Firestore triggers that send customer/admin
  emails (Resend).
- `abandonedCartSweep` — scheduled recovery email after ~1h.

Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`SHIPPO_API_TOKEN`) are stored as Firebase Functions secrets, not in the repo.

## Deployment

- **Frontend** → GitHub Pages via `.github/workflows/deploy-pages.yml` on push
  to `main`. Pages serves under `/LyricalmyricalWebsiteTrial/`, so Vite `base`
  and the router basename are set accordingly (`vite.config.ts`, `App.tsx`).
  Override with `SITE_BASE=/` for a root/custom domain.
- **Firebase** (Firestore rules/indexes, Storage rules, Functions) →
  `.github/workflows/deploy-firebase.yml` (needs `FIREBASE_SERVICE_ACCOUNT`
  secret), or manually: `npx firebase-tools deploy --only
  firestore:rules,firestore:indexes,storage,functions`.
- If adding a custom domain, update `ALLOWED_ORIGINS` in `functions/index.js`
  and OAuth redirect URIs.

## Conventions & gotchas

- Path alias `@` → `src/` (see `vite.config.ts`).
- `figma:asset/...` imports resolve to `src/assets/` via a custom Vite plugin;
  `ImageWithFallback` in `components/figma/` handles broken images.
- The site lives under a sub-path on GitHub Pages — be careful with absolute
  paths/links; prefer router-relative navigation and `import.meta.env.BASE_URL`.
- Money/checkout logic is security-sensitive: never trust client-computed totals
  for the authoritative charge — the Stripe session/webhook path is the source
  of truth.
- shadcn/ui components in `src/app/components/ui/` are generated primitives;
  prefer composing them over hand-rolling new UI.
- Tests live next to source as `*.test.ts` (e.g. `features/site/*.test.ts`).
