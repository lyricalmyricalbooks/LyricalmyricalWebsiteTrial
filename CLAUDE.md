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
functions/                  Firebase Cloud Functions (Node 22, separate package)
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
  With `paymentElement: true` it creates a server-priced PaymentIntent instead, for the card form
  shown directly on the checkout page (`features/site/StripeCardForm.tsx`, Stripe Payment Element,
  deferred intent); `stripeWebhook` marks those paid on `payment_intent.succeeded` (metadata
  `checkout: "payment_element"`). `body.action` = `status` / `registerPaymentDomain` serve the
  return-page check and the wallet-domain button (no new public functions: the CI deploy account
  can't set IAM on them). Storefront card payment always uses the inline Payment Element;
  older saved redirect settings no longer move the shopper to hosted Checkout.
- `stripeWebhook` — the **only** path that marks Stripe orders paid; it also
  decrements stock, counts discount redemptions, and records revenue. Orders are
  created `unpaid` first.
- Checkout **order note / gift message** (`orderNote` on the order, max 500 chars, enforced in `firestore.rules`): Studio › Style › Checkout & cart drawer › **Order note / gift message box at checkout** (`showOrderNote`, off by default); words in Text & labels › Checkout; shown to admins in Order detail › Customer.
- `downloadDigitalAsset` — gated digital ebook downloads.
- `onOrderPaid` / `onOrderShipped` — Firestore triggers that send customer/admin
  emails (Resend).
- `abandonedCartSweep` — scheduled recovery email after ~1h.
- **Email delivery log:** every `sendEmail` attempt (sent or failed, with a plain-English reason from
  `functions/emailErrors.js`) is written to the admin-only `emailLog` collection and listed in
  Settings › Notifications › **Recent deliveries**. Customer and shop-copy sends are attempted
  separately, so a rejected customer address never suppresses the admin notification.
- `onBookRestocked` — emails shoppers in `stockAlerts` (created from the sold-out product page's
  "Notify me when back in stock" box, `features/site/BackInStockForm.tsx`) when a book/variant goes
  0 → available. Studio › Style › Product page layout › **Notify me when back in stock** toggles the box;
  its words are in Text & labels › Product page.

- `unpaidPaymentSweep` (every 15 minutes) — records pending reconciliation and emails the shop when Stripe
  shows a successful payment but the order is still unpaid 10 min–7 days later (`functions/paymentSweep.js`);
  stamps `paymentAlertSentAt`. Never marks Stripe orders paid — resend the verified webhook event from Stripe.
- `nightlyFirestoreBackup` (03:17 Toronto) — exports Firestore to `gs://<storageBucket>/backups/YYYY-MM-DD`.
  Needs the Functions service account to have **Cloud Datastore Import Export Admin** + bucket write.

**Email sending:** `sendEmail` sends through Gmail SMTP (nodemailer, account `lyricalmyricalbooks@gmail.com`) first, because the shop has no Resend-verified domain. The Gmail app password is entered in Settings › Notifications › **Gmail sending** (`admin/GmailSendingCard.tsx`) and stored in the admin-only `adminSecrets/gmail` doc (never in public `settings/*`). If it is unset or Gmail fails, sending falls back to Resend (`onboarding@resend.dev` only reaches the account owner).

Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`SHIPPO_API_TOKEN`) are stored as Firebase Functions secrets, not in the repo.

## Shipping engine

`functions/shippingEngine.js` (server, authoritative) and `src/app/features/site/shippingEngine.ts`
(display mirror) turn profiles → zones → rates into checkout quotes; `shippingEngine.parity.test.ts`
keeps them identical, so change both together. Rate `type`: flat | order | weight | percent | free |
pickup, plus conditions (order total / cart grams / item count), `freeOver`, `handlingFee`; profiles
add `freeShippingOver`, `handlingFee`, `defaultItemWeightG`. The server charges the quote matching
the customer's `shippingMethod` (else cheapest) and rejects unservable destinations; profiles with no
zones fall back to legacy flat `calculateShipping`. Live Shippo quotes can be enabled for an explicit
country allowlist in Settings › Shipping › Carrier & labels; all other countries use the regular
profile/zone path. Selected live quotes are fetched and validated again server-side so the charged
amount matches checkout. Admin UI: Settings › Shipping › profile editor (Profile rules, Test this
profile, rate dialog).

## Theme editor

> [!IMPORTANT]
> **The default Admin → Settings → Design editor is the new Studio editor**
> (`src/app/admin/studio/StudioEditor.tsx`; left tabs **Sections / Style / Text & labels / Menus**).
> The big `ThemeEditor.tsx` described below is only the legacy editor (opens with `?editor=legacy`).
> **Always add or change theme/design features in the Studio editor first** — the user only sees
> Studio. Shop categories (the storefront category bar) are edited in Studio › **Menus** ›
> **Shop categories**. They can also be created while editing a book in **Categories & tags**;
> that catalog workflow publishes the category immediately and synchronizes Studio's working copy.
> Custom pages (About, Journal…) also live only in Studio › **Pages** tab
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
**Find anything:** the Studio top bar **Find** button (or Ctrl/Cmd+K) searches every Style control, Text & labels
string, Menus panel, page, section and action (`studio/studioSearch.ts` + `StudioSearch.tsx`; `goToResult` in
`StudioEditor.tsx` navigates). It indexes `STYLE_GROUPS` and `COPY_SCHEMA`, so new controls are findable with no extra
work — give them clear labels. **Auto-fit for phones** (`studio/autoMobile.ts`) fills phone/tablet values from the
desktop design: Sections tab › *Auto-fit page for phones*, or section › Layout & style › *Phone & tablet layout*.

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

Preview canvas actions resolve section ownership and block arrays from the
current draft, including global sections and dynamic `page:<slug>` templates.
Linked compositions inherit source children when a placement has no child
override. Studio Pages stays mounted across editor tabs; unsaved page edits are
protected on exit, typing during a save is retained, and Ctrl/Cmd+S saves the
active page. Page-load failures expose Retry. Pre-publish checks inspect global
and nested content, and identify image-size and contrast review as manual checks.

Studio also supports three-level recursive composition blocks through the
**Flexible composition** section. Groups can contain text, image, button, or
more group blocks; the active desktop/tablet/mobile preview controls local
alignment, visibility, and CSS-grid coordinates. Any configured block can be
promoted to a linked shared block and inserted in another block-capable section;
shared content updates everywhere while placement stays local. The preview
supports section and block drag/reorder plus schema-derived inline editing for
safe text fields.

Studio's **Shared layout** workspace groups announcement, header, navigation,
footer and shared-section controls. In Edit mode, double-click plain text in the
iframe (or focus its edit hook and press Enter), then choose **Done** to commit
one undoable draft change or **Cancel** / Escape to restore it. Typing keeps the
preview stable; Save, Publish and Exit wait until the edit finishes. Announcement,
wordmark, masthead and footer labels edit their existing Studio fields. Linked
block text updates its shared source while placement stays local. Unsupported rich content
and templated labels open the inspector instead of flattening their content.
Browse mode restores normal interaction and removes editing focus hooks.

Studio canvas tools include a contextual section/block toolbar (Edit, Move up/down,
Duplicate, Hide, Delete and supported Add block). Plain-text clicks select on the
canvas without opening the inspector; Edit opens it. Structural actions on inherited
shared children stay unavailable, while their text edits still update the source.
Double-click supported rich-content fields for bold, italic, underline, links,
paragraph/heading style and alignment. Unsupported embeds/styles keep the inspector
path; formatted commits are sanitized and one undoable draft action.
**Spacing** exposes padding handles and renderer-supported gap handles. Dragging snaps
to 4px (Shift = 1px), arrow keys adjust values, and Escape cancels. The active preview
size controls desktop/tablet/phone scope; Reset removes that size's overrides. Numeric
spacing fields also live in Layout & style. The shared renderer applies padding once
at the content box and carries the same responsive overrides onto the storefront.

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

**Photo shapes:** Studio › Style › **Product cards & grid** has **Image shape (proportions)** (12 ratios, 3:4 … 21:9 … 9:16 — `PHOTO_RATIOS` in `features/site/photoShapes.ts`, also used by the Product grid / Product showcase grid / cover carousel sections) and **Image outline** (`photoOutline`: arch, window, pill, circle/oval, leaf, hexagon, octagon, diamond, cut corners, slanted). The product page has its own **Photo shape** / **Photo outline** (`productImageAspect`, `productPhotoOutline`; "Same as shop grid" by default). Outlines are CSS from `photoOutlineCss` (via `StorefrontOverrides`); new photo frames opt in with `fm-photo-frame` (shop cards) or `fm-photo-frame-pdp` (product photos).

**Shopping bag (cart drawer):** `components/CartDrawer.tsx` is a Riso "order slip" — ruled header, free-shipping
meter, numbered line items (photo, title, per-copy price, line total, qty stepper, Remove), "Complete your collection"
card, then Subtotal / Shipping / Total ledger, trust badges and checkout button. Every piece is a Studio › Style ›
**Cart drawer (shopping bag)** control (`cartDrawer*` keys + `showFreeShipBar`/`freeShipThreshold`/`showCartTrustBadges`,
CSS from `features/site/cartDrawerStyle.ts`, `fm-bag-*` classes); words are Text & labels › Cart. Each region carries
its own click-to-edit target (Bag heading, Free-shipping bar, Bag line items, Bag suggestion, Bag total & checkout).

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

**Overview layout** (`AnalyticsDashboard.tsx`, panels in `Overview{Parts,Sales,Marketing,Customers,Stock}.tsx`):
period control (+ Refresh) → compact **Ready to sell?** strip (`ReadinessStrip`; "N of M ready", only open checks listed,
done ones under *Show completed*, hidden when all pass; `launchReadiness.ts` + `readinessProgress`) → two KPI rows → "To do today" beside
newest orders → Revenue/Traffic chart (every day filled, *Compare with the period before*) → **Dig deeper** tabs
Sales · Marketing & traffic · Customers · Stock. Keep new Overview content inside those groups.
Everything sales-related (revenue net of partial refunds, orders, AOV, **conversion = paid orders ÷ visits**, chart revenue)
comes from real paid non-test orders (`overviewInsights.ts`); the webhook-bumped `analytics.orders/revenue` are not read.
Orders and traffic share calendar-day windows (`periodKeys`, UTC day keys like the `analytics/<date>` docs); all orders/books are
loaded (`getAllOrders`, `getAllBooks`), traffic via `getDailyAnalytics` (400 days). Traffic maths is in `overviewTraffic.ts` (pure, tested).
Marketing/Customers/Stock load carts and back-in-stock sign-ups only when opened.
**Storefront signals** (`funnelApi` in `lib/commerce.ts`, guarded by `lib/trackingGuard.ts`: analytics consent, not Studio preview, not a signed-in
admin): daily `analytics/<date>` docs get `increment()` merges for `visits`, `funnel`, `categoryViews` plus `sources`, `devices`
(from `trackSession`), `bookViews` (`trackProductView`) and `searches`/`noResults` (`trackSearch`, personal-looking terms dropped via
`cleanSearchTerm`). `firestore.rules` caps those maps and lets only the admin read `analytics`. **Deploy rules before the frontend.**
New panels say "Not recorded yet" until data exists — never a made-up zero.

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

- **Secret keys live only in admin-only `adminSecrets/*`** (`stripe`: `secretKey`/`testSecretKey`,
  `resend`: `apiKey`, `gmail`: `appPassword`). `admin/privateKeys.ts` strips them from every
  `settings/website` / `settings/notifications` write (`adminApi.updateSettings`, `saveNotificationSettings`);
  the UI only sees `*Stored` flags. Opening Settings moves any legacy public copy automatically.
  Functions read `adminSecrets` first (`withPrivateStripeKeys`, `readAdminSecret`), then legacy settings, then
  Functions secrets. Keys ever entered before this change were public — rotate them.

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

Live carrier choices show up to five distinct Canada Post methods, cheapest first, using the lowest quote for each service. Server quote selection sorts prices before resolving duplicate service names.

## Studio organization

Studio organization milestone: Page layout, Theme settings, Text & labels, Navigation and Pages
use readable navigation with page context. Theme settings and text browse by category; search spans
categories and Find anything/click-to-edit opens the owning category. The page outline searches
section and nested-block content, expands matching sections, numbers original positions and offers
Expand/Collapse all and explicit Move up/down actions. Section reorder is disabled while searching to preserve the complete stack.
The toolbar keeps page/device, undo/redo, draft state, Save draft and Publish visible; Theme actions
holds preview, history, checks and guarded discard. Inspector device context distinguishes shared
content from responsive layout overrides. Existing draft/publish persistence is unchanged.

**Friendlier settings homes (October 2026).** `studio/settingsMap.ts` (pure, tested) decides *where* controls
appear; it never adds or removes one. Theme settings opens on task headings: Overall look, Header, menu & footer,
Shop & book pages, Bag, checkout & accounts, Pages & small details, and a folded **Fine-tune single elements**
(per-element region groups + Custom code). Each category card has a one-line description (`GROUP_BLURBS`)
and a **● N changed** badge. **Theme presets & saved themes** and **Payment icons** are categories now
(`EXTRA_STYLE_CATEGORIES`; click-to-edit `style:paymentIcons` opens it). Big categories split into short collapsible
sub-sections (`STYLE_SUBSECTIONS`; unlisted keys fall into **More settings**, so a new control always shows);
Find anything opens the sub-section holding the field (`fieldFocus`). Fields that differ from the default
design show **Changed from default** + **Reset to default**, and **What I've changed** lists them all.
Text & labels uses the same home (`TEXT_HEADINGS`, `TEXT_BLURBS`, "Text I've changed"). Page layout shows
**Add section**, **Auto-fit page for phones** and a **Section tools** menu (copy / paste / save for reuse);
saved sections are picked from Add section › **Your saved sections**. A dismissible **How Studio works** card
(Theme actions › Show Studio tips) orients first-time use. `settingsMap.test.ts` fails if any Style category,
text group or field stops being reachable — place new STYLE_GROUPS / COPY_SCHEMA groups under a heading.

## Public storefront readiness repairs (2 October 2026)

Public product links retain unique slugs and use immutable book IDs when slugs collide; catalog records are never rewritten. The storefront reads the entire paginated catalog and the sitemap uses the same route resolver. Unknown URLs show editable recovery content. Custom pages share the support/policy footer, with **Show page footer** in Studio > Style > Custom pages.

Phone navigation is a keyboard-accessible disclosure shared by the homepage and standalone page/product header. Studio > Style > Header & announcement bar > **Show phone navigation** controls visibility; existing header visibility controls apply inside it. Studio > Text & labels > Header > **Mobile menu** controls its label. Missing-page visibility controls live in Style > Custom pages; words remain in Text & labels > Custom pages & 404.

Checkout rejects placeholder/wrong-mode publishable keys and disables payment until an inline Stripe Element is ready. Teardown is idempotent and exception-safe. Admin payment readiness reports invalid keys. Server totals and webhook-only Stripe-paid-order/inventory authority are unchanged. A production payment is still unverified until the owner configures valid Stripe credentials and completes a sandbox order, webhook, refund, email and fulfillment walkthrough. Public placeholder content still needs owner review.


## Publisher fulfillment desk (2 October 2026)

Orders reads the full paginated catalog of orders and private `order-operations` records.
Queues: Needs attention, Ready to pack, Ready to ship, In transit, Completed, Unpaid and All orders; oldest first.
Address review, country/province diagnostics, customer-confirmed corrections, item packing checklists, holds,
parcel presets (browser-local), batch packing with individual results, combined pick lists and separate packing slips
prepare orders for explicit tracked dispatch. Labels never dispatch an order. Terminal/refunded orders cannot be prepared.
Payment remains webhook-controlled; the order detail no longer offers Mark as paid. New internal notes and operational
history live in admin-only `order-operations`, never the guest-readable order. Older public activity is not migrated.
Private document ID reads and collection listing need no composite indexes. Deploy Firestore rules before the frontend.
Deploy updated Functions with the frontend: label requests recheck preparation and claim money-spending purchases
transactionally; uncertain purchase failures stay locked for Shippo reconciliation to prevent duplicate charges.
Address correction is disabled after label purchase. Stripe totals, inventory and refund authority are unchanged.

## Fulfillment workspace UX repair (2 October 2026)

Order detail uses one sequential FulfillmentWorkbench: shipping address, books to pack, shipping/dispatch.
Only the current step exposes its primary action; completed address details expand in place. Parcel setup
and tracked dispatch use focused Riso dialogs; preset naming is collapsed. Holds and refunds are under
More order actions, with refund details and explicit final confirmation. Customer/payment summaries are
secondary; activity and internal notes are collapsed. Phones render order cards and a Work queue selector,
with Filter & sort in a dialog. Batch packing asks for confirmation and retains per-order outcomes.
The private operations, label purchase safeguards, payment authority and server data contracts are unchanged.

### Public designer coverage (2 October 2026)

Wishlist, Customer account and Order tracking have Studio canvases and section stacks. `features/site/storefrontRegions.ts` owns the public region manifest, responsive styling and click-to-edit hooks; its categories are generated in `studio/styleSchema.ts`. Attach `regionProps` in every supported renderer layout when adding optional public elements. Required commerce/consent regions support presentation controls without hide toggles. Merge page-only regions with root settings, preserve product overrides over catalog defaults, and keep phone overrides in `autoFitRegions`. `docs/THEME_EDITOR.md` records the page-by-page ownership and authenticated/live verification limits. Local validation reasons and public order statuses use Text & labels; provider diagnostics must not bypass editable recovery copy.

## Checkout carrier delivery estimates

Live checkout shipping quotes preserve Shippo `estimated_days` and `duration_terms` for each
customer address, parcel and service. Missing carrier timing has no invented 3-7 day fallback.
Checkout displays carrier transit estimates after dispatch rather than calculating an arrival
promise from the order date; carrier terms stay separate from numeric days. Labels for transit
and unavailable timing are editable in Studio > Text & labels > Checkout. Static profile estimates
retain their existing Studio-controlled presentation. Deploy the updated `getShippoRates` Function
with the frontend. Live carrier response verification is separate from fixture-based tests.


## Responsive public element editing (4 October 2026)

Studio > Theme settings groups built-in public elements in a searchable element browser,
including hidden elements and conditional states. Selecting one opens only that element's
controls for the active desktop/tablet/phone preview, with an Edit words shortcut. Spacing
on each side, margins, dimensions, borders, typography, colors, optional visibility and
supported image cropping/grid columns are editable at each size. Tablet inherits desktop;
phone inherits tablet. Per-field resets and Reset size styling remove overrides in one
undoable draft change; All pages / This page only retain unrelated region settings.
Auto-fit for phones includes side spacing and uses tablet values where provided.
Required purchase, consent and recovery controls have presentation controls without hide
switches. Responsive visibility preserves the element's original flex/grid display.
Newsletter heading/description/form/button/status, search input/close/result rows/covers,
and individual review titles/body/authors/dates/states have explicit click-to-edit regions.
Text & labels displays effective defaults, preserves intentionally blank copy, and offers
Reset to default. Inline text uses the same page-aware writer so stale page copy cannot
shadow the new value. Copy changes preserve unrelated labels on other pages.
Local fixture checks do not certify authenticated Firestore publishing or live commerce.

Preview canvases retain their selected viewport width (1200px desktop, 820px tablet,
390px phone) in a scrollable canvas, so narrow editor windows cannot activate the
wrong breakpoint while the owner edits a different device.

## Storefront loading performance (4 October 2026)

Storefront components share one catalog/settings/published-pages bootstrap request, including
in-flight loads and route remounts. Successful display data is reused for 30 seconds; the next
mount after that refreshes it. Failed requests remain retryable and session-cached content
stays visible during refresh. The session cache is read only when a hook mounts, rather than
on every render. Studio snapshots still override backend data. Authoritative checkout prices,
stock validation and webhook payment handling are unchanged.


## Stripe checkout payment section (4 October 2026)

Checkout inserts `features/site/StripePaymentSection.tsx` with Stripe's actual
Payment Element fields inside the page. The method radio label is separate from
those interactive fields. Payment requires a valid mode-matched publishable key
and an Element-ready event. Missing/invalid keys block payment; they never route
to hosted Checkout. Legacy `stripeRedirect` design values are ignored and the
redirect control is removed from Studio. Failed/stalled loading offers an inline
Reload payment form action before a payment attempt; the form stays on checkout.
Studio > Style > Checkout · Stripe payment section owns responsive panel,
selector, card badges and recovery layout; required payment/recovery controls
cannot be hidden. Text & labels > Checkout owns all labels, badge text and retry
copy. Existing form background, padding, radius and fonts continue to apply.
Server totals and webhook-only Stripe-paid-order/inventory authority are unchanged.
Checkout submission locks synchronously before asynchronous field validation,
disables payment-method switches while processing, and retains the lock during
provider navigation. Failed validation/service calls release it for correction.
Actual field display can be verified without submitting a payment; authenticated
sandbox payment, webhook, refund and email verification remain separate.

Stripe field appearance follows Studio checkout field background, text, border, font, accent and corner-radius controls inside the secure iframe. Riso defaults use square, visibly outlined idle fields with accent focus outlines and danger outlines for invalid fields; payment tabs share the same border treatment.


## Book SEO pane (5 October 2026)

Catalog > Edit book > Search (SEO) owns `metaTitle`, `metaDescription` and optional
HTTPS `seoImage`, saved with the book through the existing admin-only write path.
A custom search title is used exactly; blank fields use catalog content and the
published Studio Site & sharing defaults. The pane previews the effective title,
plain-text description, collision-safe canonical URL and sharing image, and offers
content checks, catalog-default reset and a deployed-URL Rich Results Test link.
Checks are guidance, not a ranking score. Catalog copy and URLs are never bulk rewritten.

`lib/bookSeo.ts` supplies book metadata and Product + Book JSON-LD. The public
PDP uses its displayed currency, price and selected-edition availability, including
backorders. No reviews/ratings are fabricated. `lib/seo.ts` updates canonical and
social URLs on router navigation, strips query/fragment parameters, clears stale
sharing images, and marks previews and private account/checkout/tracking pages noindex.
`index.html` has no fixed homepage canonical that conflicts with product routes.

`build:sitemap` lists published book/page routes, escapes URLs and removes personal
pages. Book/page fetch failures fail the build instead of silently dropping their
URLs; the optional legacy collections endpoint may be unavailable and is reported.
Robots paths follow the deployment sub-path; Google reads robots.txt at the origin
root, so a project-folder robots.txt alone is not an origin-wide crawl restriction.
Private pages also use noindex metadata. Rebuild/deploy the sitemap when catalog
routes change. No new Firestore collection, rule, index or Function is required.

Verification covers focused SEO regression tests, the complete Vitest suite,
production build with public catalog reads, and local desktop/phone fixture checks
for preview/edit/save/reset and rendered PDP metadata. Fixture save evidence is not
live Firestore persistence. Google rankings/indexing and a live Rich Results Test
remain external verification. GitHub Pages still uses its existing SPA 404 redirect;
server-rendered HTML with direct 200 product routes remains a future crawlability
improvement. After deployment submit the sitemap and inspect URLs in Search Console.

## Discount codes: start date and one-use-per-customer (6 October 2026)

Discounts › New/Edit has an optional **Start date** (code is refused server-side until that day; a **Scheduled**
tab lists them). **One use per customer** is now enforced by `assertDiscountNotUsedByCustomer` in
`functions/index.js` (paid orders with the same code + email; checkout lower-cases `customer.email`
on the order). Both checks run in `fetchValidDiscount` / both checkout paths; totals and webhook authority are unchanged.

## Customer bug sweep (6 October 2026)

- **Prices:** USD/EUR shoppers see the CAD price × today's rate everywhere (`CurrencyContext`), which is what the
  server charges. Stored `usdPrice`/`eurPrice` are reference-only (Books › edit › Pricing says so). `catalogUnitPrice`
  in `CartContext.tsx` mirrors the server's unit-price rule. A sale price counts only when it is above 0, and a variant
  with no price can't be added. One-click adds (wishlist, bag suggestion, "Add both") pick an in-stock edition via
  `features/site/buyable.ts`.
- **Checkout shipping:** until the shopper picks a rate, the best current quote stays selected, including after the
  address changes the quotes. With no option selected, the summary shows Text & labels › Checkout › `coShipChoose`
  instead of "Free". The IP country lookup only fills a form nobody has touched yet. BOGO "% off" uses `bogoPercent`
  (client `checkoutFulfillment.ts`, server `functions/localFulfillment.js`): missing means 100.
- **Abandoned carts:** `firestore.rules` limits browser writes to the cart fields and blocks `notified*`, and a
  recovered cart can't be reopened. `abandonedCartSweep` rebuilds items and prices from `books`, escapes the text,
  skips carts older than 7 days and throttles to one reminder per address every 3 days (`abandoned-cart-throttle`,
  server-only). Deploy rules and functions together.
- Order tracking accepts `#`/spaces in order numbers (`features/site/orderNumber.ts`).

## Bug sweep #2 (6 October 2026)

- **Payment integrity:** checkout accepts only CAD/USD/EUR (`functions/paymentGuards.js`). Stripe and PayPal store
  `expectedAmountMinor`/`expectedCurrency` when the payment is created, and the webhook/capture marks an order paid
  only on an exact match. A mismatch sets `paymentMismatch` and the order shows in Orders › Needs attention.
- **Stock** changes go through `functions/inventory.js` (`readBooks`/`writeStock`), one write per book, so two
  editions in one order both count. Oversells set `oversold: true`.
- **Buyable books:** the server refuses draft, archived and future-dated books, and bare lines for books sold in
  editions (`purchaseProblem`). The storefront shows only `isLiveBook` books (`features/site/liveBook.ts`, also used by
  the sitemap) outside a real Studio preview. Order item names come from the catalog.
- **Emails:** `compileEmailTemplate` HTML-escapes every value except `items_table`. Manual-payment instructions come from
  settings, not the order.
- **Checkout:** tax uses `features/site/taxRate.ts` (same matching as the server). E-book-only carts ask only
  country/province. A server-refused discount is removed with its reason (`coDiscountRejected`). PayPal has its own
  option (`coPaypalOption`). A failed PayPal capture returns to checkout. Discount dates follow the Toronto calendar day.
- **Consent:** `lib/consent.ts` `consentAllows()`. Declined analytics stops funnel/visit/referral tracking and custom code.
  Declined marketing stops abandoned-cart capture.
- Section links typed as `/path` get the site sub-path (`siteHref`). Category nav memoises on content. Untracked
  inventory never shows SOLD OUT.

## Crawlable public HTML

**Rich results (October 2026):** pages emit one JSON-LD `@graph` — home BookStore+WebSite, book Product/Book + breadcrumb + star rating from approved reviews only (`reviewsApi.listApproved`, shared with the reviews section), collection CollectionPage/ItemList, page breadcrumbs (`lib/bookSeo.ts`, `docs/SEO_CRAWLABILITY.md`). The sitemap lists book photos as `image:image`.

Production builds render the public sitemap into real HTML route documents via
`scripts/prerender-storefront.mjs` (see `docs/SEO_CRAWLABILITY.md`). Home, book,
custom-page and collection routes use the actual published storefront DOM;
account, wishlist, checkout, tracking and admin routes are excluded. Chromium is
installed by the Pages workflow. Snapshots update on deployment; rerun Pages
after publishing catalog or Studio changes. Browser storage and settings objects
are never serialized; render-time Firestore writes/analytics are blocked. Payment
and inventory authority remain live and unchanged. Install Chromium locally with
`pnpm exec playwright install chromium` before `npm run build`.

Public SEO/catalog pagination uses document IDs so records without `createdAt` are included consistently with the sitemap. Admin sorting is unchanged. HTML builds decline analytics/marketing consent and require completed custom-page content.

## Paid-but-unpaid recovery + Riso order tracking (6 October 2026)

- `markStripeOrderPaid` (functions/index.js) applies Stripe paid-order mutations only when called by
  `stripeWebhook` after signature verification (stock, discount usage, downloads, analytics and amount checks,
  idempotently). Status requests require an authorized customer/admin identity or the order's private access key;
  they retrieve that order's saved Stripe payment and record `reconciliationPending` when provider evidence
  indicates payment. The 15-minute `unpaidPaymentSweep` records the same evidence and alerts the owner.
  Neither path marks a Stripe order paid or changes stock, discount usage or revenue. Review webhook health
  and resend the signed Stripe event before fulfillment. PayPal, manual/offline and free-order paths remain available.
- Order tracking (`features/site/OrderTracking.tsx`) is a Riso order slip (`features/site/trackingStyle.ts`,
  `fm-track-*`, token-only). An unpaid Stripe order re-checks automatically and offers **Check payment again**
  (Text & labels › Order tracking › `trackRecheck`, `trackRechecking`, `trackStillUnpaid`).

## Stripe ↔ shop payment sync hardening (6 October 2026)

- `functions/stripeRecovery.js` (pure, tested): `modesToTry` looks up an order's payment in the Stripe account it
  was created in (`order.stripeMode`) and then the other one — sandbox orders used to be checked with the live key
  and silently stayed unpaid. `retrieveOrderPayment` in `index.js` is used by the status check and the sweep.
- `stripeWebhook` verifies against the Functions secret **and** endpoint secrets saved in admin-only
  `adminSecrets/stripeWebhook` (`live`/`test`), and settles any `payment_intent.succeeded` carrying
  `metadata.order_id` (either checkout path). It records `adminSecrets/stripeWebhookStatus` (last event / last signature failure).
- `unpaidPaymentSweep` runs every 15 minutes (orders 10 min–7 days old), records pending Stripe reconciliation
  and alerts the owner; only a verified webhook settles the order.
- Settings › Payments › Stripe › **Webhook health** (`admin/StripeWebhookHealth.tsx`, action `webhookHealth`) checks the
  endpoint, **Fix webhook** adds missing events / re-enables / creates it, **Reset webhook signing** recreates it when
  signatures fail. Opening an unpaid Stripe order in Orders asks Stripe automatically; **Check payment with Stripe**
  repeats the evidence check without marking it paid.

**Admin alerts:** `admin/adminAlerts.ts` (pure, tested) turns the orders feed + `adminSecrets/stripeWebhookStatus`
into banners shown above every admin page (`AdminAlerts.tsx`, rendered in `Dashboard.tsx`, refreshed with the
Orders badge every 5 minutes): payment/amount mismatch, unpaid after a started Stripe payment (>10 min), disputes,
rejected webhooks, oversold, paid orders waiting >3 days to ship, manual payments pending >2 days. Test orders are
ignored. Dismiss hides one for the browser session until a new order joins it.

## Collection indexing (7 October 2026)

Collection pages with no published, released books receive `noindex, follow` and are
omitted from the sitemap. Empty visible Studio categories remain in the prerender
route list so their initial HTML carries the same instruction. Search, sort and stock
filters do not change indexing; sold-out books still count. Renamed category URLs
canonicalize to current names. `categoryMembership.mjs` shares alias, parent and
PUBLICATIONS membership between navigation and sitemap generation. Published and
activated scheduled Studio designs remain authoritative; draft categories stay private.

## Automatic SEO refresh and catalog search controls

The Pages workflow checks published Firestore catalog/pages/settings every 15 minutes,
compares the published-content SHA-256 marker, and rebuilds only on a change. Draft-only
Studio edits do not trigger refreshes; scheduled release visibility does. Push/manual
builds always run. Only successful deployments advance the public digest marker.
Studio visible categories (including visible children) own collection sitemap URLs and
collection SEO copy. Books > Search (SEO) exposes `seoNoindex`: excluded books remain
available to shoppers, receive noindex HTML, and are omitted from the sitemap.
Studio > Text & labels > Site & sharing owns the public Google Search Console verification
token. Google property verification/submission still requires the owner's Search Console access.

**Refund/dispute sync (7 October 2026):** `syncStripeReversal` in `functions/index.js` is the one place a Stripe
refund or dispute changes an order (full refund → refunded/cancelled, stock back, revenue reversed, once; partial
refund → `partiallyRefunded` + `refundedAmountMinor`, stays paid; dispute → `disputeStatus`). It is fed by the
`charge.refunded` / `charge.dispute.*` webhooks **and** by direct Stripe reads (`checkStripeReversal`): the status
action for paid orders (admin order open / **Sync with Stripe**) and `unpaidPaymentSweep`, which re-reads paid Stripe
orders (≤120 days) at most every 6 h (`ordersDueReversalCheck`, `stripeCheckedAt`).

## Payments & shipping panel repair (7 October 2026)

- **Sandbox payments** (`session.livemode === false` / `stripeMode: "test"`, PayPal `paypalMode: "test"`) mark the
  order `isTest: true, sandboxPayment: true` and never touch stock, discount usage or revenue — on payment or refund
  (`functions/sandboxPayment.test.js`). `onOrderUpdated` still emails sandbox orders so the rehearsal covers email.
- **Stripe keys:** `SecretField` passes every edit up (clearing cancels), refuses wrong-slot keys
  (`stripeSecretKeyProblem`), and offers **Remove stored key** (`adminApi.removeStripeSecretKey`). Saves return
  true/false (`Dashboard.saveSection`), and saved secrets are scrubbed from screen state (`scrubSavedSecrets`).
  The "secret in public settings" blocker only fires on a real leak (`publicSecretLeak`). Test mode without a test
  secret key blocks; live without a stored key warns.
- **Test connection** (action `verifyStripeKeys`) and **Webhook health** (`webhookHealth`, verdicts in
  `admin/stripeChecks.ts`): per-mode delivery status, signing-secret presence (`STRIPE_WEBHOOK_SECRET` is declared
  on `createStripeCheckoutSession`), processing failures, signature failures recorded only for real Stripe-signed
  requests, reset clears old failures and asks first. Checkout refuses a payment whose server `stripeMode` differs
  from the card form's publishable key.
- **Shipping:** zones store ISO codes (`toCountryCodes`); both engines match names too. `functions/shippingGeo.js` is
  generated from `shippingZones.ts` COUNTRIES (`shippingGeo.parity.test.ts`). Profile rules persist. Quote ids are
  unique per option. A zone-less profile offers nothing once any profile has zones. Live rates resolve countries
  with `resolveCountry` and fall back to profile rates when Shippo has none; `SHIPPO_API_TOKEN` is declared on both
  checkout functions. Product assignment sends explicit removals; the panel reads the whole catalog (`getAllBooks`).

**Order emails (7 October 2026):** one order = one customer email ("Order confirmed", `order_confirmation`, on paid)
and one shop email (`[NEW ORDER] <id> · paid …`, `new_order_admin`, on paid, `[TEST]` prefix for sandbox) with a
**Fulfil this order** button to `/admin#orders/<id>`. `onOrderCreated` emails the shop only for manual-payment
(`pending`) orders. Card payments send no Stripe receipt (`receipt_email` removed); Stripe's own "successful payments"
customer email must also be off in the Stripe dashboard. `functions/orderEmails.test.js` pins this.

**Orders desk (7 October 2026):** Admin › Orders is an inbox-style split view (`admin/OrdersDesk.tsx`, logic in
`ordersDesk.ts`, tested): list on the left (search; **Needs me** / **Shipped** / **All**; test orders hidden unless
toggled), the full `OrderDetail` on the right — so Stripe sync, refunds, disputes, labels and dispatch are unchanged —
with the oldest order that needs work opened automatically and finishing an order moving to the next (`goToNext`).
`OrderDetail` reports reloads via `onChanged` so the list refreshes. Phones show list *or* order. **Table view** opens the
previous `Orders` table (bulk packing, pick lists, CSV). Email links `/admin#orders/<id>` still open that order.
The packing checklist shows each book's current cover and **Shelf location** (Books › edit › Inventory, `shelfLocation`,
per edition when set; `packingInfo` in `fulfillment.ts`). Books are public-readable, so the shelf code is too.

## reCAPTCHA / App Check

Invisible reCAPTCHA Enterprise initializes before Firestore/Auth in src/lib/firebase.ts.
Use functionFetch from src/app/lib/functionsBase.ts for every browser HTTP Function
request and onBrowserRequest in functions/index.js for its server handler. Keep signed
provider webhooks and emailed digital-download links outside browser attestation.
APP_CHECK_MODE defaults to monitor; enforce only after registering the public site key,
verifying traffic, and completing the rollout in docs/RECAPTCHA.md. Direct Firestore
protection requires separate Firebase App Check console enforcement. Verification
failure copy lives in Studio > Text & labels > Site & sharing. Tokens, debug credentials
and provider diagnostics must never be logged or saved to public settings.

**Maximum discount cap (7 October 2026):** Discounts › New/Edit › **Maximum discount (CA$)** (`maxDiscountAmount`, blank = no cap)
limits what one code can take off an order ("20% off, up to $15"). The server enforces it in `computeDiscountAmount`
(`capDiscountAmount`, `functions/index.js`); `Checkout.tsx` mirrors it for display only. Shown as a **Max … off** badge in the list.

## Bug sweep #3 — ready for sales (7 October 2026)

- **Refunds:** `applyOrderRefund` (functions/index.js) is the one place an order becomes refunded — admin refunds
  (Stripe, PayPal captures API, or manual via `refundProviderOf`), Stripe Dashboard refunds, lost disputes and PayPal
  `PAYMENT.CAPTURE.REFUNDED/REVERSED` webhooks. Stock (admin's `refundRequest.restock`), discount use and revenue are
  reversed once; `refund_pending` completes later via the reversal sweep.
- **Payments:** PayPal request ids include amount+currency; a late `async_payment_failed` can't undo a paid order;
  a second Stripe payment is kept in `duplicatePayments` and alerted (Orders shows "Paid twice"); a card retry
  cancels the order's previous unfinished PaymentIntent; hosted sessions save `stripeCheckoutSessionId` at creation.
- **Orders from browsers:** `firestore.rules` lets guests create only unpaid Stripe/PayPal/Free orders with a fixed
  key list. Every manual-payment order is priced and created by `createManualLocalOrder`. $0 orders use
  `action: "completeFreeOrder"` (server completes only when its own total is 0; `completeOrderWithoutCard`).
- **Checkout:** the bag is repriced against the live catalog (`repriceCart`), Pay waits for the catalog, server
  refusals and card declines are shown, the server total is compared before charging, 99 copies max per line,
  email format checked on both sides. Policy links sit under Pay (Style › `hideCheckoutPolicyLinks`).
- **Email:** customer emails use the paid currency (`functions/emailMoney.js`); manual orders get
  `order_pending_payment`; footers add Settings › General › Location; abandoned-cart reminders honour their switch
  and a signed unsubscribe (`functions/marketingOptOut.js`, `marketing-optout`, `/track?unsubscribe=1`).
- **Other:** ebook downloads need the digital edition; Shippo webhook re-reads status from Shippo; policy pages are in
  the sitemap/prerender; Orders CSV has tax/payment/currency/refund columns (paid/refunded only for whole lists).
- **Not changed on purpose:** rate-limit IP source (verify the real X-Forwarded-For shape first), sales-tax model
  (shipping tax / printed-book rebate need the owner's accountant).

## Bug sweep #4 (7 October 2026)

- **Reviews:** public reads only `status == "approved"`; reviewer emails live in admin-only `reviewContacts/{reviewId}`
  (`reviewsApi.create` writes both; `contactsFor` moves older public emails once per admin session).
- **Signups:** `stockAlerts` ids are `<email>__<bookId>__<variantId>` and `newsletter` ids are the email (both enforced
  in `firestore.rules`), so repeats are refused. `onBookRestocked` sends once per address, skips draft/archived books,
  reclaims sends stuck >15 min and deletes the alert after sending.
- **Emails:** refund amount in the currency refunded (`refundAmountText`); no "won't be charged" email for paid orders;
  shipped email without tracking drops those lines (`withoutTrackingLines`), none for pickup/local delivery.
- **Storefront:** search/wishlist use `isLiveBook`; Canadian time zones start in CAD (`currencyForTimeZone`).
- Signed-in order reads need `email_verified`. Analytics visits can't decrease.

## Readiness fixes from the 5-agent audit (7 October 2026)

- **Payments:** `markOrderPaid` refuses card/PayPal and cancelled orders (`manualPaidRefusal`); checkout refuses cancelled
  orders (`checkoutRefusal`); a payment arriving for a cancelled order is recorded but **not** marked paid
  (`paymentMismatch.paidAfterCancel`, Orders › Needs attention). PaymentIntents use `stripeIntentKey` and hosted sessions a
  per-minute idempotency key, so a double click can't open two live payments. "Paid" is set by the Stripe webhook, the
  server-verified status check / sweep (`markStripeOrderPaid`), the verified PayPal capture, or `completeOrderWithoutCard`
  for manual/$0 orders — never by the browser.
- **Stock holds:** `functions/stockHolds.js` transactionally holds tracked stock for 30 min per order (server-only `stock-holds/{bookId}`)
  before Stripe, PayPal, manual-payment, or free checkout can settle; payment revalidates/renews the hold. Reservation-store failures fail closed;
  expected stock conflicts after a provider capture stay unpaid and raise an inventory-reconciliation alert. Holds release on payment or cancel and expire automatically.
- **Tax gaps:** Overview › Ready to sell lists provinces/states with no matching rate (`uncoveredTaxRegions`).
- **Customer requests:** order tracking has *Ask to cancel / return* (`action: "orderRequest"`, `order.customerRequest`,
  Needs attention + Order detail › Mark request handled) and *Your data* (`action: "privacyRequest"` →
  admin-only `privacyRequests`; Settings › General › **Privacy requests** exports JSON or erases, keeping orders).
  Words: Text & labels › Order tracking (`trackReq*`, `trackPrivacy*`); boxes: Style regions `trackingRequests`/`trackingPrivacy`.
- **Rate limits:** `clientIpOf` takes the right-most non-proxy `X-Forwarded-For` hop (Google appends the real client);
  Shippo rate/address and PayPal create/capture have their own buckets. Deploy rules + functions before the frontend.

## Commerce access, navigation and merchandising (7 October 2026)

Stripe paid-order authority belongs only to the signature-verified webhook. Authenticated or private-key
payment status checks and the payment sweep record pending reconciliation; provider success alone does not
release an unpaid Stripe order for fulfillment. PayPal capture, manual/offline payment and server-validated
free orders remain supported through their existing contracts. Guest order access requires the private order
key; an order number or payment ID alone is not authorization.

Studio > Navigation > Header bar order chooses each published page's Main shopping bar or Publisher navigation
row (`secondaryNavKeys`). Initially, exact Submissions, History, Our history and Open call(s) page titles use the
publisher row; an explicit selection, including an empty list, overrides that grouping. Categories remain in
shopping navigation. Style > Header layout > Show publisher navigation row controls visibility; Text & labels >
Header owns its accessible name. Both header layouts and standalone page/product headers share this hierarchy,
including phones, where search stays directly available under the existing search visibility control.

Books > Categories & tags > Curated recommendations offers automatic category matches or up to four chosen
books in editable display order, with full-catalog search and removal. Saving the book applies the choice; an
empty publisher selection hides recommendations. Public rendering excludes missing, current and unpublished
books without filling a curator's selection with automatic results. Studio's existing related-books visibility
and heading controls still apply. Product details show supplied edition, positive page count, publisher and
publication date; a selected variant's name takes precedence for edition. Show edition details and the four
spec labels live in Studio. Existing contributor display, genuine photo upload, cover order and alt-text fields
remain the content source; owner-supplied photographs and editorial facts are required, never fabricated.

Checkout adds a separate optional apartment/unit field, eligible Stripe express-wallet presentation and a total
beside payment. Studio > Checkout controls their optional visibility and Text & labels owns their words. Wallet
availability depends on Stripe, browser, account and domain eligibility; this change does not prove live wallet
activation. Required payment, validation and server-priced totals remain intact.

Readiness distinguishes payment configuration, contributor/edition metadata and possible test titles from
verified deployment, hosting and email delivery. Admin alerts cover pending payment reconciliation, unresolved
label purchases and recent failed/bounced/complained email attempts, with links to the relevant workspace.
Provider acceptance is distinct from inbox delivery. Local tests and builds do not verify deployment or live
Stripe/PayPal payments, wallet eligibility, webhook delivery, email, refunds or carrier purchases.


## Cart estimates, returns and catalog review (7 October 2026)

The cart offers country/postal-code shipping previews from current server catalog prices,
edition weights and configured shipping profiles. These are preliminary profile estimates;
live carrier prices and eligibility require the full checkout address. They exclude discounts
and tax, never authorize a charge and reset when the cart/destination changes. Session storage
carries the destination into checkout. Matching saved addresses may fill street details;
other saved/recovered destinations cannot overwrite or mix with the selected destination.
Studio > Style > Cart drawer > Total & checkout button owns Show shipping cost preview;
Text & labels > Cart owns its words. Inputs use the shared cart palette and typography.

Orders > Customer return progresses through approval/decline with customer-visible instructions,
parcel receipt, full-order inspection and an explicitly confirmed full-order refund. Mixed-condition
lines record a resellable quantity. Only eligible physical copies restock, once, through the existing
provider/admin-authorized refund path. Approval and receipt never change money or inventory.
Full-order refunds include shipping, tax and digital items; partial financial refunds remain a
separate provider workflow. Cash/e-Transfer refunds must be sent externally before recording them.
Private inspection/actor/history data live in admin-only order-operations.returnCase. A limited
returnProgress summary appears in secure customer tracking with Studio-owned status words and the
existing trackingRequests region controls. Open returns block dispatch/local fulfillment and label
purchases. Stripe paid-order authority remains webhook-only; supported PayPal/manual authority is
unchanged. New endpoints cartShippingPreview and manageReturn use functionFetch and App Check.

Books loads the full catalog. Show books needing publish review flags cover/interior images,
contributor credits, base/sale/edition prices, format/edition/page count, shipping weight, publisher
copy and possible placeholders. Single-book saves to Published and bulk Publish open a reviewed
selection; invalid title/prices block publishing, other warnings require explicit acknowledgement.
Bulk Move to draft previews the chosen records and preserves their content, inventory and order
history. Failed updates remain selected for retry. Publication status controls public routes,
lists, recommendations and sitemap: titles never automatically hide products. Owners must review
and draft currently published test/duplicate records before releasing this visibility change.

Deploy the Functions bundle with the frontend so cart estimates, return transitions and refund
completion agree (including Stripe/PayPal webhooks and reconciliation). Existing books/orders/
order-operations access patterns require no new rules or composite indexes; inspection remains
private. Local handler tests and provider-isolated browser fixtures prove workflow behavior,
not deployed functions, real payment/refund acceptance, carrier rates or email delivery.

## App release notes
Every PR must prepend one entry to `src/app/admin/appUpdates.ts`: stable unique ID, date (YYYY-MM-DD), plain-language title and summary, and shortcuts to the affected admin screens (`tab`, optional `settingsTab`, using IDs from `riso/nav.ts`). Explain user-visible benefits honestly; do not claim a backend deployment or live provider verification from local checks. For maintenance-only PRs, say what reliability changed and link to its relevant workspace. Keep older entries for View all updates. The admin sidebar's What's new box shows the newest entry bundled with the deployed frontend; it is not a live GitHub feed.
