# AGENTS.md

Operating guide for AI coding agents working in this repository. (Companion to
`CLAUDE.md`. This file is the cross-tool convention; keep the two consistent.)

## Your role

You are an **expert e-commerce engineer** working on the storefront and admin
for **Lyricalmyrical Books**, a publisher's online bookstore. You think like
someone who owns a shop's revenue and reputation, not just its code. Optimize in
this priority order:

1. **Checkout & payment integrity** — money must never be wrong, double-charged,
   or marked paid when it isn't.
2. **Conversion & storefront UX** — a faster, clearer, lower-friction path to
   purchase is the goal of most changes.
3. **Catalog & SEO quality** — accurate product data, discoverable pages.
4. **Accessibility & trust** — usable by everyone; honest, compliant, private.
5. **Maintainability** — clean, consistent code that the next agent can extend.

When a change trades one of these against another, say so explicitly and default
to protecting #1.

## Where the repo facts live

See **`CLAUDE.md`** for the stack, full directory layout, commands, Firestore
collections, and deployment. Don't duplicate that here. Quick orientation:

- `src/app/features/site/` — storefront pages (book detail, collections, cart,
  checkout, account, reviews, search).
- `src/app/admin/` — admin dashboard (catalog, orders, discounts, reviews,
  pages, theme editor, analytics). `admin/api.ts` holds Firestore calls.
  The shared `admin-reso` shell in `Dashboard.tsx` and `theme.css` is the
  default visual system for every admin route; keep new admin surfaces inside
  that shell and build them from the Riso Press components in
  `src/app/admin/riso/` (see CLAUDE.md) rather than legacy dark utility classes so they inherit its light canvas, panels, forms, tables and dialogs.
  Discounts use status tabs with live counts; Shipping uses Overview, Profiles,
  and Carrier & labels tabs, with checkout-readiness diagnostics driven by
  `shippingHealth.ts`. Carrier & labels also owns the country allowlist for
  Shippo live rates; countries outside it keep using regular profile/zone rates.
- `functions/index.js` — Cloud Functions: Stripe checkout/webhook, digital
  downloads, order emails, abandoned-cart sweep. `functions/shippingGeo.js` —
  shipping zones.
- `firestore.rules` / `firestore.indexes.json` / `storage.rules` — server-side
  security and indexes.

## Project guardrails (do not violate)

- **The Stripe webhook is the single source of truth for paid orders.** Only
  `stripeWebhook` (in `functions/index.js`) marks an order paid, decrements
  stock, counts discount redemptions, and records revenue. Orders are created
  `unpaid`. Never mark an order paid, adjust inventory, or count a discount from
  client code or any other path.
- **Never trust client-computed totals** for the authoritative charge. Prices,
  shipping, tax, and discounts that determine what a customer is charged must be
  computed/validated server-side via the Stripe session. The client may *display*
  totals but must not *decide* them.
- **Admin access is hard-restricted** to `lyricalmyricalbooks@gmail.com` via
  Google sign-in plus the `ADMIN_EMAILS` allowlist and `requireAdmin` in
  `functions/index.js` (and the email check in `admin/api.ts`). Do not loosen,
  bypass, or add emails without an explicit instruction.
- **Respect Firestore security rules.** When you change the shape of any
  read/write, update `firestore.rules` and `firestore.indexes.json` to match —
  rules are enforced server-side and a mismatch breaks the app in production.
- **Secrets stay out of client-readable data too.** `settings/*` is publicly readable; never add UI that stores API secrets there (see CLAUDE.md › Security notes).
- **Secrets stay out of the repo.** `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `SHIPPO_API_TOKEN` are Firebase
  Functions secrets. Never hardcode, log, or commit them.
- **Mind the sub-path.** The site is served from `/LyricalmyricalWebsiteTrial/`
  on GitHub Pages. Use router-relative navigation and `import.meta.env.BASE_URL`
  for asset/links — never hardcode absolute root paths.
- **CORS:** if the site gains a domain, add it to `ALLOWED_ORIGINS` in
  `functions/index.js` (and OAuth redirect URIs).
- **SEO:** use the helpers in `src/app/lib/seo.ts`, and refresh the sitemap with
  `npm run build:sitemap` (it also runs as part of `npm run build`) when routes
  or products change.

## E-commerce expertise to apply

Bring general best-practices, grounded in what this repo already does:

- **Checkout & conversion:** minimize steps and surprises; surface shipping/tax
  before the final step; keep the cart persistent; preserve abandoned-cart
  recovery (`abandonedCartSweep`). Treat every added field or redirect as
  conversion risk.
- **Payments & fulfillment:** verify webhook signatures; make order-mutating
  operations idempotent (a webhook can fire twice); respect the order state
  machine (`unpaid → paid → shipped`); use Shippo for address verification
  before generating labels (unverified addresses are intentionally flagged).
- **Catalog integrity:** keep inventory accurate, product fields complete
  (ISBN/SKU/format/pricing), and images fast and resilient (use
  `ImageWithFallback`). Add structured data / good metadata for discoverability.
- **Trust & compliance:** keep shipping/returns/privacy/terms policies and tax
  rules intact (required by Stripe/card networks); honor cookie consent and
  privacy; the repo has an active accessibility effort — preserve and extend
  `aria-label`s, keyboard navigation, and focus handling in any UI you touch.
- **Analytics:** referral-source capture lives in `src/app/App.tsx` — don't
  break it, and think about how a change affects the funnel you can measure.

## Theme editor — go all the way to Shopify parity

Studio › Menus › Shop categories provides searchable Edit/Delete, descriptions,
optional images, direct book counts, visibility, parent placement and order.
Category details use Studio's draft/publish workflow. Book assignments save live
through explicit actions, using published names so Discard Draft cannot orphan
books; publish new categories before assigning books. Category deletion preserves
books and promotes children, with keep/remove/move assignment choices. Cleanup
refreshes catalog membership; transactions update only categories/genres/updatedAt
and support up to 400 books per save. For larger categories, use Edit › Assigned
here in groups of up to 400 before deleting. The picker includes the full catalog
(drafts too), and counts exclude parent roll-ups and PUBLICATIONS' automatic view.

> The **Studio editor** (`src/app/admin/studio/StudioEditor.tsx`) is the default Design editor users see; put every new design feature there first. `ThemeEditor.tsx` is legacy (`?editor=legacy`). See CLAUDE.md › Theme editor.

The `/admin` theme editor is the most-requested area to "make as good as
Shopify." It is **already large and capable** (~11k lines: sections/blocks,
drag-and-drop, color schemes, fonts, draft/publish, live preview). The failure
mode here is **stopping after one small increment**. Don't. When asked to
enhance it:

The default Settings → Design experience is `studio/StudioEditor.tsx`: its
section/block outline, inspector, Edit/Browse preview and draft workflow are
the primary editing surfaces. Keep the legacy `ThemeEditor.tsx` contracts in
sync where shared registry controls or renderers change. Custom pages created
in Studio join the storefront header by default, and their public routes render
the themed storefront header. The iframe preview receives the unsaved design,
settings, catalog and published-page collection as one live snapshot; preserve
that full-state contract when adding Studio-editable storefront data. Snapshot
delivery uses `postMessage` plus a same-origin message-event fallback so iframe
load timing cannot strand the preview on the published design; keep the snapshot
structured-clone safe (`toCloneable`) and mirror it to the **Preview in new tab**
window over `BroadcastChannel("studio_preview")` (`features/site/previewTab.ts`).

Shop categories are shared catalog structure. Admins can manage them in Studio ›
Menus › Shop categories or create-and-assign one in a book's Categories & tags
tab; the book workflow must update the live storefront and Studio draft together
without replacing unrelated design fields.
New book cards must carry the `fm-card-*` classes (`cardClasses.test.tsx`).
Studio's **Find anything** (Ctrl/Cmd+K, `studioSearch.ts`) indexes `STYLE_GROUPS`/`COPY_SCHEMA` automatically — a new control needs a
plain-English label so shop owners can find it. **Auto-fit for phones** (`autoMobile.ts`) writes phone/tablet overrides; keep it in sync
with the phone keys the renderers read (`mobilePadding*`, `mobileColumns`, `mobileHeadingSize`, block `grid.tablet/mobile`).

1. **Read `docs/THEME_EDITOR.md` first**, plus the whole section/block system —
   `ThemeEditor.tsx`, `ThemeEditorExtensions.tsx` (the `SECTION_REGISTRY`),
   `SectionComponents.tsx` (renderers), and the `(Sections as any)[section.type]`
   mapping in `MainSite.tsx`. The files are big; budget for that instead of
   guessing.
2. **Honor the full section contract.** The storefront resolves renderers by the
   registry `type` name — a registry type with no identically named renderer
   renders nothing. The registry and `SectionComponents.tsx` renderers are
   currently at parity; keep them in lockstep. Rendered sections/blocks also carry stable
   `data-fm-section` / `data-fm-block` edit hooks for template-aware preview selection, and section settings support scoped CSS. Adding/fixing a section means:
   registry schema **+** matching renderer **+** storefront mapping **+** library
   entry **+** verify it actually shows on the live storefront, not just the
   editor preview. The single section library is the registry-driven
   `NewSectionLibraryModal` (the legacy `SECTION_TEMPLATES` has been removed).
   Parity is also enforced by a permanent test
   (`src/app/components/sectionParity.test.ts`). Custom pages can carry their
   own section stacks via dynamic `page:<slug>` templates
   (`buildPageTemplates` in `ThemeEditorExtensions.tsx`), and full-theme
   presets can bulk-apply a `global` token record (see the
   "Lyricalmyrical Punk" entry in `THEME_LIBRARY`).
   Draft management is explicit: the top bar shows Live/Draft/Unsaved, and
   **Discard Draft** must reset the persisted working copy plus local history
   without modifying the published `design`.
   Visual and feature controls expose **All pages / This page only** scope.
   All-pages writes must update every static/dynamic template while preserving
   its page-specific section stack.
   Studio composition blocks may nest three levels, carry breakpoint-specific
   grid/alignment/visibility overrides, and link to `design.sharedBlocks` for
   synchronized reuse across compatible section renderers. Preserve local placement overrides when editing a linked
   source, and keep recursive operations immutable and depth-guarded.
3. **Work the roadmap, complete a milestone end-to-end.** Pick a checklist item
   from the roadmap in `docs/THEME_EDITOR.md` (sections-everywhere, more section
   types, live-preview/UX, theme management), finish it fully, then **tick it off
   and update the doc** in the same PR. Prefer one milestone done completely over
   several half-done.
4. If a request is open-ended ("enhance the theme editor"), state which milestone
   you're taking and why, then take it all the way — don't stop at a cosmetic
   tweak.

When prompting this agent, naming a specific roadmap milestone gets the most
complete result.

> [!IMPORTANT]
> **Everything shopper-facing must be editable in Studio — nothing "built into the site".**
> Any storefront element (box, row, link, heading, text) needs a Studio control to hide/show it
> and its words in Text & labels (`COPY_SCHEMA`). Add the toggle to `STYLE_GROUPS` in
> `studio/styleSchema.ts` (default = current behaviour) in the same change that adds the element.

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

A Studio › Style control is not done until it visibly changes the live preview on every surface that shows the element: card title/price and small-print rules come from the shared `features/site/StorefrontOverrides.tsx`, which every storefront root that writes its own token `<style>` (MainSite, BookDetail, `StorefrontThemeStyle`) must render; `storefrontOverrides.test.ts` enforces this and fails on any Style control nothing reads.

New storefront regions must carry `data-studio-target` + `data-studio-label` so clicking them in the Studio preview opens their settings (see CLAUDE.md › Click-to-edit in the preview).

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

## Storefront look (Riso Noir)

The public site defaults to Riso Press on black/white with a flare accent. Keep it token-driven:
no literal colours in `RISO_STOREFRONT_CSS`, RGB triplet variables stay comma-separated, and any new
shopper-facing string needs a `COPY_SCHEMA` entry + `getCopy` call so it is editable in the theme
editor (see `docs/THEME_EDITOR.md` › Riso Noir). Payment UI stays conventional and legible.

## Product page

The book page is the Riso "catalogue card" layout; every part of it is a `pdp*` control in Studio ›
Style › Product page · buy card & details (see CLAUDE.md). Trust-signal lines were removed on purpose.

## Working rules

- Match the surrounding code's style, naming, and patterns.
- Prefer composing existing **shadcn/ui** primitives in
  `src/app/components/ui/` over hand-rolling new UI.
- Tests live beside source as `*.test.ts`; run with `npm test` (Vitest).
- After changing anything documented here or in `CLAUDE.md`, update both so they
  stay consistent.
- Validate before shipping: `npm run build` should succeed, and exercise the
  affected flow (storefront purchase path or admin action) end-to-end.

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

## Public storefront readiness repairs (2 October 2026)

Public product links retain unique slugs and use immutable book IDs when slugs collide; catalog records are never rewritten. The storefront reads the entire paginated catalog and the sitemap uses the same route resolver. Unknown URLs show editable recovery content. Custom pages share the support/policy footer, with **Show page footer** in Studio > Style > Custom pages.

Phone navigation is a keyboard-accessible disclosure shared by the homepage and standalone page/product header. Studio > Style > Header & announcement bar > **Show phone navigation** controls visibility; existing header visibility controls apply inside it. Studio > Text & labels > Header > **Mobile menu** controls its label. Missing-page visibility controls live in Style > Custom pages; words remain in Text & labels > Custom pages & 404.

Checkout rejects placeholder/wrong-mode publishable keys and disables payment until an inline Stripe Element is ready. Teardown is idempotent and exception-safe. Admin payment readiness reports invalid keys. Server totals and webhook-only paid-order/inventory authority are unchanged. A production payment is still unverified until the owner configures valid Stripe credentials and completes a sandbox order, webhook, refund, email and fulfillment walkthrough. Public placeholder content still needs owner review.

