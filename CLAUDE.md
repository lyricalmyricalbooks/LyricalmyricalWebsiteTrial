# CLAUDE.md

Guidance for working in this repository.

> [!IMPORTANT]
> **Read `AGENTS.md` at the start of every task, before doing anything else.**
> `AGENTS.md` is the companion operating guide: it defines your role, priorities,
> and — most importantly — the **skills/playbooks** you should pick up and apply
> while working in this repo. Re-read it each session (it may have changed) and
> **use the relevant skills from it whenever they apply** to the task at hand.
> Treat its skills as active tools, not background reading. If anything in
> `AGENTS.md` conflicts with this file, follow `CLAUDE.md` for repo facts and
> `AGENTS.md` for how to work, and call out the conflict.

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
                            `Dashboard.tsx` owns the default Reso admin shell;
                            shared cross-page styling lives under `.admin-reso`
                            in `src/styles/theme.css`.
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
- Checkout **order note / gift message** (`orderNote` on the order, max 500 chars, enforced in `firestore.rules`): Studio › Style › Checkout & cart drawer › **Order note / gift message box at checkout** (`showOrderNote`, off by default); words in Text & labels › Checkout; shown to admins in Order detail › Customer.
- `downloadDigitalAsset` — gated digital ebook downloads.
- `onOrderPaid` / `onOrderShipped` — Firestore triggers that send customer/admin
  emails (Resend).
- `abandonedCartSweep` — scheduled recovery email after ~1h.
- `onBookRestocked` — emails shoppers in `stockAlerts` (created from the sold-out product page's
  "Notify me when back in stock" box, `features/site/BackInStockForm.tsx`) when a book/variant goes
  0 → available. Studio › Style › Product page layout › **Notify me when back in stock** toggles the box;
  its words are in Text & labels › Product page.

Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`SHIPPO_API_TOKEN`) are stored as Firebase Functions secrets, not in the repo.

## Shipping engine

`functions/shippingEngine.js` (server, authoritative) and `src/app/features/site/shippingEngine.ts`
(display mirror) turn profiles → zones → rates into checkout quotes; `shippingEngine.parity.test.ts`
keeps them identical, so change both together. Rate `type`: flat | order | weight | percent | free |
pickup, plus conditions (order total / cart grams / item count), `freeOver`, `handlingFee`; profiles
add `freeShippingOver`, `handlingFee`, `defaultItemWeightG`. The server charges the quote matching
the customer's `shippingMethod` (else cheapest) and rejects unservable destinations; profiles with no
zones fall back to legacy flat `calculateShipping`. Live Shippo quotes are shown only when no zones
exist (charged = displayed). Admin UI: Settings › Shipping › profile editor (Profile rules, Test this
profile, rate dialog).

## Theme editor

> [!IMPORTANT]
> **The default Admin → Settings → Design editor is the new Studio editor**
> (`src/app/admin/studio/StudioEditor.tsx`; left tabs **Sections / Style / Text & labels / Menus**).
> The big `ThemeEditor.tsx` described below is only the legacy editor (opens with `?editor=legacy`).
> **Always add or change theme/design features in the Studio editor first** — the user only sees
> Studio. Shop categories (the storefront category bar) are edited in Studio › **Menus** ›
> **Shop categories**. Custom pages (About, Journal…) also live only in Studio › **Pages** tab
> (`studio/StudioPages.tsx`); there is **no** separate Pages screen in the admin nav — do not
> re-add one. New pages join the storefront header by default, and their public
> routes render the themed storefront header. Walkthroughs must use Studio's
> labels, not legacy legacy-editor tabs.

Studio › Menus › Shop categories has a searchable category manager with explicit
Edit/Delete, descriptions, optional images, visibility, parent placement and order.
Counts show direct assignments (including aliases); parent roll-ups and the
automatic PUBLICATIONS all-books view are separate. The picker reads the entire
catalog, including drafts and records without createdAt. Category details follow
Save draft/Publish; book assignments have an explicit live Save action, use the
published category name, and cannot target unpublished categories. Bulk writes
read fresh tags in an atomic transaction (up to 400 books), touching only
categories/genres/updatedAt. Deletion keeps all books, promotes children and offers
keep/remove/move assignments, refreshing membership before and after cleanup.
For larger categories, use Edit › Assigned here in groups of up to 400 first.

Studio's Sections outline supports sortable sections and blocks. Canvas clicks
open their inspector; **Edit mode** selects content and **Browse mode** lets
storefront links and controls work. **Style** has searchable controls with
**All pages / This page only** scope for supported visual groups. Save draft,
Publish and local unsaved recovery are separate actions. **My themes** (Style › Theme look) can be renamed, duplicated, downloaded as a file and re-imported. History provides
non-destructive snapshot Preview and Restore to draft; change-aware dialogs
guard Publish/Discard. Reusable/copyable sections, scheduled visibility,
phone overrides, canvas reordering and pre-publish checks also live in Studio. These live in
`studio/StudioEditor.tsx`, `StudioOutline.tsx`, `StudioInspector.tsx` and
`useStudioPersistence.ts`; `themeWrite.ts` replaces complete design maps when
saving so removed page overrides do not reappear. The iframe receives an atomic
`STUDIO_PREVIEW_STATE` snapshot of the unsaved design, settings, books and
published pages, keeping colors, menus and newly created page content live
across preview navigation without another Firestore read. Delivery uses both
`postMessage` and a same-origin message-event fallback so iframe load timing
cannot leave the canvas showing the published design. `buildPreviewState` makes the
snapshot clone-safe (`toCloneable` strips `_lastDoc` Firestore snapshots — they made
`postMessage` throw `DataCloneError` and silently froze the preview once books loaded).
In preview, `useSiteData` keeps the snapshot's books/pages/settings on `window.__studioPreviewState`
so a late Firestore load never overwrites them; chrome outside that pipeline (cookie banner,
boot splash) uses `useLiveDesign()`. **Preview in new tab** (Studio top bar) opens a full-screen
top-level `?preview=true` window: Studio posts the same snapshot on `BroadcastChannel("studio_preview")`
and `features/site/previewTab.ts` (started in `main.tsx`) re-dispatches it as a window message, answers
`PREVIEW_READY`, and keeps `?preview=true` on in-app navigation. Unsaved Studio › Pages edits ride
along in the snapshot (`withDraftPage`) without being saved.

Studio also supports three-level recursive composition blocks through the
**Flexible composition** section. Groups can contain text, image, button, or
more group blocks; the active desktop/tablet/mobile preview controls local
alignment, visibility, and CSS-grid coordinates. Any configured block can be
promoted to a linked shared block and inserted in another block-capable section;
shared content updates everywhere while placement stays local. The preview
supports section and block drag/reorder plus schema-derived inline editing for
safe text fields.

A large (~11k-line) Shopify-style theme editor under `/admin`. **Read
`docs/THEME_EDITOR.md` before changing it** — it has the architecture map, the
section/block contract, and the Shopify-parity roadmap.

- `src/app/admin/ThemeEditor.tsx` — editor shell + panels + `HomepagePanel`
  (section list, drag/reorder, duplicate, visibility, and library-to-outline
  insertion drop zones). The section library is
  unified on the registry-driven `NewSectionLibraryModal`; the legacy
  `SECTION_TEMPLATES` + `SectionLibraryModal` dead code has been removed.
  The top bar accurately distinguishes Live, Draft, and Unsaved states; when a
  working copy differs from the published design, **Discard Draft** provides a
  confirmed reset that also clears local undo/redo history.
  Visual/feature panels also expose **All pages / This page only** scope;
  all-pages writes update every static and dynamic template without replacing
  its section stack.
- `src/app/admin/ThemeEditorExtensions.tsx` — the real `SECTION_REGISTRY`,
  `getSectionFields`/`getBlockFields`, `BlocksEditor`, `NewSectionLibraryModal`;
  it includes reusable commerce/content sections such as `BlogPostsSection`
  and the catalog-driven "Lyricalmyrical Punk" set (`ProductCoverCarouselSection`,
  `ProductShowcaseGridSection`, `StaffNotesTableSection`, `EphemeraRowSection`).
  It also exports `buildPageTemplates(pages)` — static `PAGE_TEMPLATES` plus one
  dynamic `page:<slug>` template per published custom page, so pages like About
  and Journal get their own editable section stacks
  (`design["page:<slug>"].sections`, rendered by `PageView` with fallback to the
  shared `design.page.sections`).
- `src/app/admin/ThemeEditorPro.tsx` — color math, schemes, import/export.
- `src/app/admin/ThemeEditorBuilder.tsx` — builder UI over the registry helpers.
- `src/app/components/SectionComponents.tsx` — the storefront section renderers
  (one per registry type; registry and renderers are now at parity).
- `src/app/components/sectionRender.tsx` — shared renderer: `SectionList` maps a
  section to its renderer **by name** (`(Sections as any)[section.type]`),
  `TemplateSections` renders `design[templateId].sections` for a page-type
  template, `GlobalSections` renders `design.globalSections`, and section
  wrappers emit stable `data-fm-section` / `data-section-id` hooks for preview
  click-to-edit, scoped per-section CSS, and template-aware preview selection. Used by MainSite and every standalone page
  (product/collection/page/cart all render their template's sections — milestone A).

> [!IMPORTANT]
> **After every theme-editor change, end your reply with a plain-English navigation
> walkthrough** of how to find and use the new/changed feature in the actual admin
> UI — not just a code/file summary. The user has said they find the theme editor
> hard to navigate, so this is required, not optional, even for a small change.
> Use the real on-screen labels (tab names, accordion titles, button text) as a click
> path a non-developer can follow, e.g.:
> - "Homepage → click a section on the canvas → **Design** tab → scroll to **Effects**"
>   (shadow/radius/blur/hover effect/shape dividers/magnetic buttons/text gradients —
>   these live in the per-section **Design** tab, via `SectionSettingsPanel`).
> - "Homepage → click a section → **Content** tab → any image field → **Image style**"
>   (focal point/filter/overlay/hover zoom — collapsed by default under image fields).
> - "Homepage → click a section with blocks (Multicolumn, Row, Pricing Table, etc.) →
>   **Content** tab → open a block → the list field (Links/Buttons/Features)" (drag
>   handle to reorder, "Add" button to append a row).
> - "Menus → Header or Footer tab → sub-links and (if Mega menu is on) column links
>   now drag-reorder with the grip handle."
> - "Just double-click text directly in the live preview pane" (inline canvas
>   editing — dashed outline on hover, Escape to cancel; no panel involved).
> - "Colors → scroll to **Checkout & Cart**" (accent/background/input radius +
>   automatic WCAG contrast badges once a color is set).
> Since `/admin` requires real Google sign-in restricted to one account, agents
> cannot screenshot the live authenticated UI themselves — write the walkthrough
> from the actual on-screen labels in the code (accordion `title`s, tab labels,
> button text), not from memory or guesswork.

Recommended next theme-editor increments after the insertion-zone DnD work
(mega-menu child/grandchild sortable lists are now done — see below; nested
block drag/drop has an initial `kind: "list"` sub-list field in `BlocksEditor`,
demonstrated on `PricingTableSection`'s features — full recursive multi-field
nested blocks across more section types remains a follow-up):
1. live-preview iframe drag/drop using `data-fm-section` / `data-fm-block`;
2. extend nested block drag/drop in `BlocksEditor` to more section types and
   richer (multi-field, not just plain-text) nested items;
3. CSS-grid visual positioning with guarded coordinates and overlap;
4. per-breakpoint layout overrides tied to the device preview toggle.

> [!IMPORTANT]
> **Everything shopper-facing must be editable in Studio — nothing "built into the site".**
> Any storefront element (box, row, link, heading, text) needs a Studio control to hide/show it
> and its words in Text & labels (`COPY_SCHEMA`). Add the toggle to `STYLE_GROUPS` in
> `studio/styleSchema.ts` (default = current behaviour) in the same change that adds the element.

> [!IMPORTANT]
> **Every design must be fully editable in Studio.** Each theme-library preset
> (`studio/themeLibrary.ts`) may only set keys that have a Studio › Style control in
> `STYLE_GROUPS`: top-level keys go through `THEME_APPLIED_KEYS`, everything else in the preset's
> `global`. `studio/themeLibrary.test.ts` fails on any preset key with no control, and
> `features/site/studioCoverage.test.ts` fails on any design key the storefront reads without one.
> Add the control in the same change as the design key — never allowlist around the test.

> [!IMPORTANT]
> **Every aspect of the public website must be editable in the designer (Studio).** No hard-coded
> colours in storefront code: use a design key (`design.x || "#hex"`) or a theme variable
> (`var(--token, #hex)`) — the hex may only be a fallback. Every section default needs a Content
> field (lists are edited as blocks). `features/site/designerCoverage.test.ts` enforces both,
> alongside `studioCoverage`, `storeCopy.coverage`, `studioTargets` and `themeLibrary` tests.
> Tailwind colour classes count too: every one the storefront uses (incl. `hover:`/`focus:`/
> `group-hover:`/`selection:`/`md:` variants) must be listed in `features/site/storefrontColorClasses.ts`,
> which `colorUtilityCss` in `themeTokens.ts` re-points at a Studio token (greys → text/muted/surface,
> black → overlay/page colour, hues → accent/success/warning/danger). `designerCoverage.test.ts` fails
> on an unlisted or unmappable class — add it to the list rather than hard-coding a colour.

**Custom pages share one look:** Studio › Style › **Custom pages** (`page*` design keys, `sitePageStyle`
in `PageView.tsx`) sets eyebrow, title size/case/colour, text size/colour, alignment and column
width for every custom page. Each "Page content" section follows it unless its **Style this page on
its own** switch (`ownStyle`) is on; pages without that section render the same component. Default is the Riso "Ruled" layout (Option D): no small "Page" label (`pageShowEyebrow`
off), the title lined up with the header (`pageWidth: "header"`, same width as `StorefrontPageHeader`), a line
under it (`pageShowRule`, `pageRuleColor/Width/Spacing`) and a readable text column (`pageTextMeasure`). Title
font/size px (desktop + phone)/weight and top spacing are `pageTitleFont`, `pageTitleSizePx*`, `pageTitleWeight`,
`pageTopSpacing`; the Page content section has the same fields for "Style this page on its own".

> [!IMPORTANT]
> **Sentences that reach shoppers indirectly are copy too.** Error messages (`new Error("…")`),
> notices (`setNotice`/`setError`), `window.prompt`, SEO titles/descriptions, template-literal
> `aria-label`/`alt`s and renderer word-fallbacks must all come from `getCopy()` (Studio › Text & labels —
> groups *Checkout*, *Order tracking*, *Reviews*, *Sections*, **Site & sharing**) or, inside
> `SectionComponents.tsx`, from `sectionFallbacks.ts` (`fb("Type.field")`, each backed by a Content
> field; use `??` so clearing a field blanks it). `noHardwiredMessages.test.ts` and
> `components/sectionFallbacks.test.ts` enforce this; `designerCoverage.test.ts` also rejects literal
> `rgb()/rgba()/hsl()` (use `rgba(var(--accent-rgb, …), a)` or a design key). Behaviour numbers
> (low-stock thresholds, recently-viewed count, search-result cap) and the no-photo placeholder image
> are Studio › Style controls read with `designNumber()` / `placeholderImage()`. Site name, default
> title/description and share image live in Text & labels › **Site & sharing** and Style › Logo &
> wordmark › **Share image**; `lib/seo.ts` reads them via `setSiteIdentity` (published by `useSiteData`).
> No sample books or announcements are shown to shoppers; empty sections show their "how to fill me" sample
> only in the Studio preview (`sampleInPreview`/`sampleHtml`, guarded by `components/noSampleContent.test.tsx`).
> Footer policy link/page titles are Text & labels › Footer (`policyTitle*`).

**Click-to-edit in the preview:** sections carry `data-fm-section`; every other storefront region carries `data-studio-target="style:<groupId>|copy:<Group>|menus:<panel>|pages"` + `data-studio-label`. In Edit mode the preview bridge (`studio/previewBridge.ts`) outlines it, and a click sends `STUDIO_TARGET` (several targets → a small in-preview menu); `StudioEditor.tsx` switches tab and opens/flashes the matching `Group id` / `data-studio-panel`. New storefront regions must carry a target — `studioTargets.test.ts` checks every target points at a real panel.

**Category drop-downs:** a shop category can sit under another (`parentId`, Studio › Menus › Shop categories ›
**Sits under**, one level deep — `navItems.ts` `parentOf`/`childCategories`). A parent with sub-categories renders as
`features/site/NavDropdown.tsx` in every header (All + each sub-category); `bookInCategory(book, cat, allCats)` makes a
parent include its sub-categories' books. Books are filed in Books › edit › Organize (chips show `Parent › Child`).
Style › Navigation links has the drop-down controls (`navDropdown*`, `navFlatSubcategories`); the "All" word is
Text & labels › Header (`navDropdownAll`). `/collections/:slug` renders `MainSite` (same header/footer) opened on that
category — the standalone `CollectionPage` is no longer routed.

**One storefront shell:** `MainSite` renders a single Riso header/footer for every view; the Home view swaps the catalog grid for `design.heroPage.sections`. Studio › Sections (Home) › **Show a Home page** toggles `showHero` (off = open straight on the catalog). The legacy hero header/`HeroCarousel` were removed — don't re-add a second header.

**Shop card title & price:** Studio › Style › **Product cards & grid** has colour, size (desktop + phone), weight, font and letter-spacing controls for the card title and price (`productTitleColor`, `cardTitle*`, `productPriceColor`, `cardPrice*`), plus the boxed-tag and old-price colours. `features/site/cardTypography.ts` turns them into CSS (emitted by `StorefrontThemeStyle`); cards opt in with the `fm-card-title` / `fm-card-price-wrap` / `fm-card-price` / `fm-card-price-tag` / `fm-card-price-old` classes — the shop grid, collection, wishlist, search, related-books and recently-viewed cards and the **Product grid** / **Product showcase grid** sections do. When a Style card colour is set it wins over a section's own colour; empty = the section's colour. Add those classes to any new book card — `features/site/cardClasses.test.tsx` renders every section with sample books and fails on a book title without `fm-card-title`.

**Product page (catalogue card):** `features/site/BookDetail.tsx` renders the Riso "catalogue card" layout —
breadcrumb, thumbnail rail + framed photo + "Fig. n" caption, one bordered buy card (tag, title, price,
stock line | formats, qty, Add to bag, wishlist, share), then Description / Details / Reviews tabs (or
accordions) with Details as a label | value record. Every piece is a Studio › Style › **Product page · buy
card & details** control (`pdp*` keys, turned into CSS by `features/site/productPageStyle.ts`, `fm-pdp-*`
classes); its words are in Text & labels › Product page (`pdp*` copy keys). The old trust-signal lines
(`productTrust*`, `showTrustSignals`) were removed at the owner's request — don't re-add them.

**Every Style control must reach every surface (and the preview iframe):** the card title/price and small-print CSS comes from one place, `features/site/StorefrontOverrides.tsx` (`storefrontOverridesCss`). `StorefrontThemeStyle` renders it, and so do `MainSite`'s `TypographyTokens` and `BookDetail` — any new storefront root that injects its own token `<style>` must render `<StorefrontOverrides>` too. `storefrontOverrides.test.ts` fails on a surface that skips it and on any `STYLE_GROUPS` control that nothing on the storefront reads (wire it or delete it — don't allow-list). Custom code (Style › Custom code) is injected by `features/site/customCode.ts` on public pages only — never in the preview, checkout or admin.

**Small print:** Studio › Style › **Small print & labels** (`smallPrint*` keys, `features/site/smallPrint.ts`) sets a minimum size, colour, case, letter spacing and font for every tiny `text-[8px]…text-[11px]` label at once.

**Click focus:** clicking a preview region pins an "Editing: <label>" card at the top of Studio › Style with only that element's controls (`STYLE_TARGET_FIELDS` in `styleSchema.ts` gathers fields across groups by key; labels not listed show their whole group). **Show all style settings** returns to the full list.

**Fonts:** Studio › Style › **Typography** has Google Fonts pickers (heading, body, header & menu `navFont`, logo `wordmarkFont`) fed by the curated list in `features/site/fonts.ts` (Riso trio Anton / Archivo / DM Mono first; `googleFontHref` uses only weights each family serves).

**Riso Noir storefront:** the public site defaults to the Riso Press look on black with white text
(`src/app/features/site/risoNoir.ts` → `RISO_NOIR_TOKENS`, `withRisoNoirDefault`; theme-library
preset `lyricalmyrical-riso-noir`). `RISO_STOREFRONT_CSS` in `themeTokens.ts` must stay token-driven
(no literal hex — `themeTokens.test.ts` enforces it). Colour triplet variables (`--fg-rgb`, `--accent-rgb`,
…) are **comma-separated** (`255, 255, 255`) so `rgba(var(--x-rgb), a)` is valid. Every shopper-facing
string goes through `getCopy(design, key)` with a `COPY_SCHEMA` entry (`storeCopy.coverage.test.ts`
guards this); print-treatment knobs live in Colors › **Riso print treatment**, element toggles in
Additional › **Storefront elements**.

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

### Release banner (removed)

The admin Overview no longer shows a "System status & recent release" card, so there is
nothing to update after a deploy. Don't re-add it unless asked.

## Riso Press admin design system

`src/app/admin/riso/` implements the published **Riso Press design system**
(artifact https://claude.ai/artifact/MvJwSgL7vE4vExRKaC9Gph): newsprint/ink palette, flare
`gold` primary fill with **ink** text (never lighten it), `gold-text` for flare words,
square corners, 2px ink outlines on objects and hairlines inside lists, flat offset
shadows by day, warm-grey night mode, Anton / Archivo / DM Mono, status = glyph + word.
If tokens change there, update `riso.css` to match.

- `riso.css` — semantic `--rp-*` tokens (light + night) and every `rp-*` component
  class; reduced motion, 44px coarse-pointer targets, visible focus, print.
- `components.tsx` — AppShell, Sidebar, Topbar, PageHeader, Breadcrumbs, SectionCard,
  SectionHead, MetricCard, buttons, IconButton, TextField/TextArea/SelectField/
  SearchField, Toggle, Checkbox, StatusBadge, DataTable (row states, sticky head),
  FilterBar, Pagination, Tabs, TabBar, Dialog/Drawer/ConfirmDialog (focus trap, Escape,
  focus restore), `useConfirm()`, ActionMenu, Toast, SyncChip, Empty/Loading/ErrorState,
  SaveBar. `shellParts.tsx` — GlobalSearch, ActivityLogDialog. `nav.ts` — nav config.
- `src/app/lib/useFocusTrap.ts` — shared by admin dialogs and the storefront cart drawer.

**Migrated (built from these components):** shell, Login, Reviews, Activity Logs,
Orders list + detail, Overview, Books catalog, Discounts, Settings › General,
Payments, Shipping (profiles/zones/rates + dialogs), Notifications (+ Inventory sync). `Dashboard.tsx` renders migrated pages
outside the legacy wrapper via its `migrated` flag — add new ones there.

**Overview layout** (`AnalyticsDashboard.tsx`): one period control → headline KPIs (revenue,
orders, average order, conversion — all sales figures from paid, non-test orders via
`overviewInsights.ts`) → "To do today" beside newest orders → trend chart → tabbed details
(Sales · Stock · Readers & traffic). Keep new Overview content inside those groups.

**Not yet rebuilt** (still legacy markup, styled by the scoped compatibility layer in
`theme.css` under `.admin-reso[data-admin-theme="reso"]`, which maps old dark utilities
and violet/blue accents onto Riso tokens): Taxes/Communications
(not in the nav), the Book editor's layout (it does have a dialog for unsaved changes,
a `beforeunload` guard and an inline validation summary), and the theme editor's panels.
Never wrap `rp-*` chrome in `.admin-light` — its `aside button` / `input` rules override
it. Don't add new compat rules for new work; compose the components instead.

## Verification

- `npm test` (vitest, node env): includes the registry/renderer parity test, nav,
  discount-state, order-status/CSV, cart-quantity and the **theme draft/publish
  separation** test (Firestore mocked) — a draft/discard must never write `design`.
- There is **no `tsconfig.json`** in the repo, so `tsc -p .` checks nothing. To type-check,
  use a temporary tsconfig (strict off, `jsx: react-jsx`, `moduleResolution: bundler`,
  `@types/react` installed, `include: src/**`); baseline has ~23 pre-existing errors.
- `react`/`react-dom` are optional peer deps: a plain `npm install` leaves tests/build
  failing; install them (`--no-save`) locally.
- Page-level visual checks used a throwaway harness that mounts a page with mocked
  `adminApi` data (not committed). Screenshots: `docs/screenshots/riso/`.

## Security notes

- **Public-readable settings hold secrets (owner decision pending).** `firestore.rules`
  allows `read: if true` on `settings/{docId}`; Settings › Payments can write Stripe
  **secret** keys into `settings/website`, and Notifications can write the Resend key into
  `settings/notifications`. The UI now treats them as write-only and warns, but the stored
  values remain publicly readable. Fix: use Functions secrets / an admin-only collection,
  update `functions/index.js`, and rotate any key ever entered in the admin.

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
