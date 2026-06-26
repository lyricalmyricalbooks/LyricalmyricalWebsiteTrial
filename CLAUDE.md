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

## Theme editor

A large (~11k-line) Shopify-style theme editor under `/admin`. **Read
`docs/THEME_EDITOR.md` before changing it** — it has the architecture map, the
section/block contract, and the Shopify-parity roadmap.

- `src/app/admin/ThemeEditor.tsx` — editor shell + panels + `HomepagePanel`
  (section list, drag/reorder, duplicate, visibility). The section library is
  unified on the registry-driven `NewSectionLibraryModal`; the legacy
  `SECTION_TEMPLATES` + `SectionLibraryModal` dead code has been removed.
- `src/app/admin/ThemeEditorExtensions.tsx` — the real `SECTION_REGISTRY`,
  `getSectionFields`/`getBlockFields`, `BlocksEditor`, `NewSectionLibraryModal`.
- `src/app/admin/ThemeEditorPro.tsx` — color math, schemes, import/export.
- `src/app/admin/ThemeEditorBuilder.tsx` — builder UI over the registry helpers.
- `src/app/components/SectionComponents.tsx` — the storefront section renderers
  (one per registry type; registry and renderers are now at parity).
- `src/app/components/sectionRender.tsx` — shared renderer: `SectionList` maps a
  section to its renderer **by name** (`(Sections as any)[section.type]`),
  `TemplateSections` renders `design[templateId].sections` for a page-type
  template, `GlobalSections` renders `design.globalSections`. Used by MainSite
  and every standalone page (product/collection/page/cart all render their
  template's sections — milestone A).

**Section contract:** the storefront looks up renderers by the registry `type`
string. A registry type with **no identically named renderer renders nothing**
("added but doesn't show up"). Adding a section = registry schema **+** matching
renderer **+** storefront mapping **+** library entry **+** verify on the live
storefront. Theme data persists as `design` (live) / `draftDesign` (draft) via
`adminApi.updateSettings(..., { publish })`.

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

## Your job after every change
After completing any code enhancement, end your turn with a short "Next moves" list: 5 genuinely high-value suggestions for improving the app, ranked best-first.
Each suggestion is one or two lines:
- **What** — a concrete, specific action (e.g. "Debounce the catalog search box" instead of "improve performance").
- **Why** — the payoff (e.g. a sale not lost, a faster screen, a bug avoided).
- **Effort** — quick / medium / larger.

Then offer to do the top one right away.

### What makes a suggestion good here
- Tied to what just changed. First ask yourself: did this edit open an edge case, threaten offline sync, or leave an obvious next step? Lead with that.
- High-leverage, not generic. Skip boilerplate best-practice filler.
- Specific. Name the file, function, or screen.
- Honest. If nothing is genuinely worth doing, say "nothing pressing" and stop.
- No repeats. Don't re-pitch anything already declined this session.

### Constraints every suggestion must respect
> [!IMPORTANT]
> - **Vanilla JS:** No framework, no build step, no bundler.
> - **Serverless Backend:** Firebase Firestore database and static hosting on GitHub Pages. No server or secret keys in client code.
> - **Offline Resilience:** Must work fully offline (PWA) and synchronize local queue states later.

### Angles worth scanning each time
Bug / edge case the change introduced · the next logical feature · offline & sync robustness · Firestore data integrity · the speed of a slow screen · keeping catalog and ledger consistent.

## Pull Requests
- When asked for "a new pull request", "new PR", or similar: **create it immediately** from the current branch.
- Do NOT investigate merge status, git history, or ask clarifying questions.
- Action: Push branch with `git push -u origin <branch>` then create PR via GitHub MCP.
- Use a descriptive PR title based on the feature/fix being implemented.
- **After a PR is merged, start the next change on a brand-new branch and open a new PR** — never push commits onto a merged branch to revive it.

## General Principles
- Prefer action over investigation when intent is clear.
- If the user asks for something, assume they know what they want.
- Only ask clarifying questions if the request is genuinely ambiguous.
