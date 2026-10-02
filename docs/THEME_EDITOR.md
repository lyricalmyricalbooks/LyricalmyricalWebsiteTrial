# Theme Editor — Architecture & Shopify-Parity Roadmap

This is the **north star** for the theme editor. The editor is large
(~11k lines) and spread across several files with some overlapping/legacy
structures, so any AI session or contributor should **read this file first**,
then read the relevant source, before changing the editor. The goal is to reach
**Shopify-level theme editing**. Work the roadmap below milestone by milestone —
complete one end-to-end and check it off, rather than making a single timid
increment and stopping.

> Keep this file accurate. When you change the editor, update the architecture
> notes and tick/extend the roadmap in the same PR. Also keep the short "Theme
> Editor" sections in `CLAUDE.md` and `AGENTS.md` consistent with this doc.

## What already exists (don't rebuild it)

- [x] Studio › Menus category management: searchable Edit/Delete, descriptions,
  optional images, direct assignment counts, visibility, hierarchy and menu order;
  full-catalog book picker with add/remove/move and safe deletion choices.
  Category details remain draft/publish edits. Explicit book saves update live
  tags atomically (up to 400 books), anchored to published category names so
  Discard Draft cannot orphan assignments. New categories must be published first.
  Deletion preserves books, promotes children and refreshes membership before/after
  cleanup. For more than 400 members, use Edit › Assigned here in groups first.

The editor is **not** a blank slate. It already supports:

- A **section + block** model with per-section/per-block settings schemas.
- **Drag-and-drop** reordering, duplicate, show/hide, and delete of sections.
- **Color schemes**, palettes, and a theme/preset library.
- **Fonts** (Google Font loader + selector) and typography tokens.
- **Contrast checking** (WCAG ratio badges) for accessibility.
- **Draft / publish** workflow, plus **scheduled publish**.
- A persistent **unpublished changes** state and guarded **Discard Draft** flow
  that restores the working copy to the live theme without touching shoppers.
- An **All pages / This page only** scope switch for visual and feature panels.
  All-pages changes are copied to every static and dynamic template while
  preserving each template's section stack.
- **Section presets** (save/reuse a configured section).
- **Live preview** via an iframe `postMessage` channel with click-to-edit (the
  preview can request a section be opened in the editor). `STUDIO_PREVIEW_STATE`
  sends the complete unsaved design plus current books, published pages and
  non-design settings, so colors, navigation and newly created pages update
  together without an iframe reload. Studio also directly dispatches the same
  event into its same-origin iframe as a delivery fallback, preventing iframe
  timing from leaving the canvas on published colours; `THEME_UPDATE` remains
  supported for legacy callers. The snapshot is JSON-cloned first (`toCloneable`,
  dropping Firestore `_lastDoc`) because an uncloneable book made every post throw.
  **Preview in new tab** sends the same snapshot over
  `BroadcastChannel("studio_preview")` to a top-level `?preview=true` window
  (`features/site/previewTab.ts`), which re-dispatches it as a window message.
- **Import/export** of a theme design as JSON (in `ThemeEditorPro`).
- A **token/CSS-variable layer** applied to every storefront surface.
- **Shared shop categories** edited in Studio › Menus, with create-and-assign also
  available in the admin book editor. Catalog-created categories update the
  published storefront and Studio working copy atomically without replacing
  unrelated design fields.

## Architecture map

| File | Owns |
|------|------|
| `src/app/admin/ThemeEditor.tsx` | Top-level editor shell and panels: Style, Colors, Navigation, Homepage. `HomepagePanel` drives the section list (drag/reorder, duplicate, visibility, delete) and the per-section/block settings forms. The section library is unified on the registry-driven `NewSectionLibraryModal`; the legacy `SECTION_TEMPLATES` + `SectionLibraryModal` dead code has been removed. |
| `src/app/admin/ThemeEditorExtensions.tsx` | The real **`SECTION_REGISTRY`** (32 section types), `getSectionFields`, `getBlockFields`, `BlocksEditor`, `NewSectionLibraryModal`, `getSectionMeta`. Field types: `text`, `textarea`, `html`, `richtext`, `color`, `number`, `range`, `select`, `toggle`, `date`, `image`. |
| `src/app/admin/ThemeEditorPro.tsx` | Color math/normalization, palette & color-scheme tooling, theme import/export. |
| `src/app/admin/ThemeEditorBuilder.tsx` | Builder UI that consumes the registry helpers (`getSectionMeta`, `getSectionFields`, `getBlockFields`, `NewSectionLibraryModal`). |
| `src/app/components/SectionComponents.tsx` | **One storefront renderer per registry section type** (the components that actually draw each section) + shared style helpers (spacing, background, button styles, animation wrappers). Registry and renderers are at parity — every `SECTION_REGISTRY` type has a matching renderer. |
| `src/app/components/sectionRender.tsx` | **Shared section renderer** (single source of truth for section→renderer mapping). `SectionList` (pure: maps a `sections` array → renderers via `(Sections as any)[type]` and emits stable `data-fm-section` / `data-section-id` edit hooks); `TemplateSections` (renders `design[templateId].sections` for a page-type template); `GlobalSections` (renders the flat `design.globalSections`). Used by MainSite **and** every standalone page. |
| `src/app/components/MainSite.tsx` | Renders the homepage/storefront. Uses `SectionList` for `heroPage.sections` and the shared `GlobalSections` from `sectionRender`. |
| `src/app/features/site/StorefrontThemeStyle.tsx` + `themeTokens` | Injects the semantic token / CSS-variable layer onto any storefront surface via the `[data-fm-store]` attribute. |
| `src/app/admin/api.ts` | Persistence: `getSettings`, `updateSettings(settings, { publish })`, `schedulePublish`. |
| `src/app/admin/studio/studioModel.ts` | Immutable Studio state, recursive block-tree operations (three levels), linked shared-block resolution, normalization, and undo/redo. |

## The section/block contract (read before adding a section)

The storefront maps a section to its renderer **by name**, in
`MainSite.tsx`:

```tsx
const SectionComponent = (Sections as any)[section.type];
if (!SectionComponent) return null;   // <-- silently renders nothing
```

This is the #1 footgun: if a section type exists in `SECTION_REGISTRY` (so it
appears/edits in the admin) but has **no matching exported renderer** in
`SectionComponents.tsx`, the storefront silently renders nothing — "I added it
but it doesn't show up." The registry and renderers are currently at **parity**
— every `SECTION_REGISTRY` type has an identically named renderer — so keep it
that way: whenever you add a registry type, add its renderer in the same change
(verify with the grep in "Verifying").

To add (or fix) a section end-to-end, all of these must line up:

1. **Schema** — add/extend the entry in `SECTION_REGISTRY`
   (`ThemeEditorExtensions.tsx`) with its `getSectionFields` (and
   `getBlockFields` if it has blocks). The registry `type` string is the join
   key for everything else.
2. **Renderer** — add an `export function <Type>({ settings, books, onCtaClick,
   onProductClick, enableAnimations }) {…}` in `SectionComponents.tsx`. The
   export name **must equal** the registry `type`.
3. **Storefront mapping** — rendering goes through `sectionRender.tsx`
   (`SectionList`), so a correctly named renderer resolves automatically on every
   surface: the homepage (`heroPage.sections`), each page-type template via
   `TemplateSections` (product/collection/page/cart), and `globalSections`. No
   per-page wiring is needed for a new section type.
4. **Section library** — make sure it's exposed in `NewSectionLibraryModal`
   (registry-driven; this is the only section library).
5. **Verify on the live storefront**, not just in the editor preview — render it,
   reorder it, hide/show it, and save+publish.

Blocks follow the same idea: schema via `getBlockFields` + `BlocksEditor`,
rendered by the section's renderer (e.g. `RowSection`/`RowBlock`).

## Persistence model

- The theme lives in site settings as **`design`** (live) and **`draftDesign`**
  (work-in-progress). Sections are in `design.sections` (homepage),
  `design.globalSections`, and `design.homepageSections` (legacy alias still
  read as a fallback).
- `adminApi.updateSettings({ design }, { publish })`:
  - `publish: true` → writes both `design` and `draftDesign` (goes live).
  - `publish: false`/omitted → writes only `draftDesign` (save draft).
- `adminApi.discardThemeDraft(design)` replaces `draftDesign` with the current
  published design. The editor clears local undo/redo state at the same time so
  a discarded draft cannot accidentally be restored and re-saved.
- `adminApi.schedulePublish(design, at)` stores `scheduledPublish` so the
  storefront can promote a design at a future time.
- `design.sectionPresets` holds saved section presets.
- **Per-page section stacks** live at `design["page:<slug>"]` — one dynamic
  surface per published custom page, listed by `buildPageTemplates(pages)`
  (`ThemeEditorExtensions.tsx`) and shown as extra template pills. `PageView`
  renders that surface when it has sections and falls back to the shared
  `design.page.sections` otherwise; `design["page:<slug>"].hidePageBody`
  suppresses the legacy title + body HTML so a page can be fully
  section-built. Fully backward compatible — pages without a per-page stack
  behave exactly as before. Custom pages use the themed storefront header
  (logo, header menu, published in-header pages, wishlist and account controls),
  and newly created pages opt into that header navigation by default.
- **Full-theme presets** (`THEME_LIBRARY` in `ThemeEditor.tsx`) may carry a
  `global` record; `applyThemePreset` bulk-writes those keys to the design
  root and **every static/dynamic page surface** in one undo step via
  `applyGlobalDesignKeys`. The same mechanism powers the editor's **All pages**
  setting scope for colors, typography, layout, controls, and feature toggles.
  This matters because page surfaces resolve object-first, so surface clones
  shadow root-only writes. A preset may also name a `homeLayoutTemplate`
  (`HOME_LAYOUT_TEMPLATES` id), offered opt-in (confirm dialog) after apply.
  Reference implementation: `lyricalmyrical-punk`.

## Known gaps & inconsistencies (seed for the roadmap)

- **Section library unified.** The single library is the registry-driven
  `NewSectionLibraryModal` over `SECTION_REGISTRY` (32 types) in
  `ThemeEditorExtensions.tsx`. The legacy `SECTION_TEMPLATES` +
  `SectionLibraryModal` dead code in `ThemeEditor.tsx` has been removed.
- **Registry↔renderer parity.** Every `SECTION_REGISTRY` type has an identically
  named renderer in `SectionComponents.tsx` (verify before each change with the
  grep in "Verifying"). Keep them in lockstep when adding section types.
- **Page-type templates (milestone A — done).** Product, collection, custom
  page, cart, and the catalog `storefront` surface now render their own
  `design[surface].sections`, and global sections render on every page
  (including Wishlist/Account/OrderTracking). The remaining follow-up is
  click-to-edit routing per template (noted in roadmap A).

## Shopify-parity roadmap

Status legend: `[ ]` todo · `[~]` partial · `[x]` done. Update these as work
lands. Pick a milestone, take it **end-to-end** (schema → renderer → mapping →
library → verify), then check it off.

### A. Sections everywhere (page-type templates) — DONE
- [x] Template concept keyed by page type. Sections live at
      `design[surface].sections` for `heroPage / storefront / productPage /
      collectionPage / cartPage / page / page404` (`PAGE_TEMPLATES` in
      `ThemeEditorExtensions.tsx`).
- [x] Section editor targets the current template via the `PAGE_TEMPLATES`
      pills; `update()` scopes writes to the active `designSurface`.
- [x] Product/collection/custom-page/cart surfaces render their template's
      sections via `TemplateSections` (in `BookDetail`, `CollectionPage`,
      `PageView`, `Checkout`). Rendering is unified in `sectionRender.tsx`.
- [x] `GlobalSections` now renders on **every** standalone page (previously
      homepage-only), via the shared `sectionRender.tsx` — including the
      Wishlist, Account, and OrderTracking pages.
- [x] The catalog `storefront` surface now renders its template's sections via
      `TemplateSections` in `MainSite`.
- [x] Click-to-edit now routes preview section clicks to the owning page-template
      panel before opening the section editor.
- [ ] Follow-up: group global sections into header/footer/announcement.

### B. More section types (close gaps + expand)
- [x] Configurable screenshot-style storefront homepage milestone shipped: a
      black editorial header/product-grid design can now be built from theme
      sections and settings rather than hard-coded homepage code. The milestone
      is considered complete only when the published storefront matches the
      reference screenshot, keeps registry↔renderer parity, and remains editable
      through the theme editor.
- [x] Reference design follow-through shipped: accurate live multi-currency
      cart subtotal display, reusable `ProductGridHeaderSection` registry +
      renderer + library entry, responsive masthead/nav controls, product focal
      point controls, and preview-canvas section drag/reorder via
      `data-fm-section` hooks.
- [x] Existing live storefronts now default into the photo-reference catalog
      treatment even before a merchant manually reapplies the preset, so older
      Firestore theme documents no longer stay on the previous utility-grid
      storefront by accident.
- [x] Renderers added for `VideoHeroSection`, `StatsCounterSection`,
      `PricingTableSection` — registry and renderers are now at full parity.
- [x] Unified the section library on `SECTION_REGISTRY`; retired the legacy
      `SECTION_TEMPLATES` + `SectionLibraryModal`.
- [x] Blog posts / journal cards shipped end-to-end as a reusable
      `BlogPostsSection` (registry schema, block fields, storefront renderer,
      and library exposure) for announcements, release notes, and editorial
      content.
- [x] Responsive Image Banner shipped end-to-end with separate desktop/mobile
      artwork, image focal/style controls, nine content positions, four heights,
      accessible alt text, overlay strength, and primary/secondary CTAs. It is
      registry-driven, appears in the Media library, and renders on every template.
- [ ] Add remaining common Shopify sections end-to-end as needed (e.g. featured
      collection and richer content compositions) — each via the full contract.
- [x] Core sections shipped end-to-end (Hero, FeatureGrid, Testimonials, FAQ,
      Newsletter, Slideshow, Multicolumn, RichText, Image-with-text, Video,
      Collection list, Featured product, Blog posts, Countdown, Contact form,
      Map, Gallery, Row, Marquee, Logo list, Collapsible, Text content,
      Custom HTML).
- [x] "Lyricalmyrical Riso" full-app design shipped as a first-class theme:
      warm uncoated-paper surfaces, red/blue/yellow ink tokens, hard black
      rules, halftone texture, deliberately stepped interactions, print-style
      card shadows, cart and checkout tokens, and matching global loading and
      consent overlays. The preset includes the curated
      `lyricalmyrical-riso` homepage layout (cover carousel, press marquee,
      product grid, print-room notes, and newsletter), and the shared Riso CSS
      is applied across the homepage and every standalone storefront surface
      when `themeStyle` is `riso`.
- [x] **Riso Press alignment (September 2026).** The "Lyricalmyrical Riso" preset now
      uses the published Riso Press design-system tokens (newsprint `#faf6ec`, ink
      `#100f0d`, flare `#e8402a` with ink text, press blue `#1b3fe0`, Anton / Archivo,
      square outlined objects, flat offset shadows, ink footer/announcement) and
      `RISO_STOREFRONT_CSS` mirrors it (2px ink outlines, flare focus ring, reduced
      motion, 44px coarse-pointer targets; halftone texture removed). `BookDetail` now
      loads the Riso CSS too. Editor chrome: the top bar wraps so Publish / Save Draft
      stay reachable below ~1500px and at 375px; a generated accent remap in
      `theme.css` fixes unreadable violet/blue active states in legacy panels.
      Draft/publish separation is covered by `admin/themeDraft.test.ts`.
      Known follow-up: the editor's panels are still legacy markup on the compat layer.
- [x] **Product page — Riso catalogue card (September 2026).** `BookDetail.tsx` uses a breadcrumb,
      thumbnail rail + framed photo + caption, one bordered buy card and full-width details tabs.
      Every part is in Studio › Style › **Product page · buy card & details** (`pdp*` keys →
      `features/site/productPageStyle.ts`, tested by `productPageStyle.test.ts`); words in Text & labels ›
      Product page. Trust-signal lines removed.
- [x] **Riso Noir (September 2026) — full public-site Riso redesign on black.** The
      storefront now defaults to Riso Press on black with white text and the flare
      `#e8402a` accent (ink text on flare fills). `features/site/risoNoir.ts` holds the shared
      `RISO_NOIR_TOKENS` record used by (a) the first `THEME_LIBRARY` preset
      (`lyricalmyrical-riso-noir`, with a matching `HOME_LAYOUT_TEMPLATES` layout), (b) the default
      design in `adminApi.getDefaultSettings` and `DEFAULT_SETTINGS`, and (c) `withRisoNoirDefault`,
      which restyles saved designs that never chose a `themeStyle` or applied a library preset
      (content, sections and menus are untouched; choosing "Standard" print style or any preset opts
      out). `RISO_STOREFRONT_CSS` is now 100% token-driven (`--rp-outline`, `--rp-outline-w`,
      `--rp-shadow-color`, `--rp-shadow-x`, `--rp-focus`, `--rp-card-radius`, `--rp-heading-transform`,
      `--on-accent`) with an optional halftone (`risoGrainCss`), a legibility floor for the faint
      `text-white/20…50` greys, explicit input borders, square pills, and `RISO_CHECKOUT_DARK_CSS`
      (turns the conventional white checkout dark). New editable keys: `risoOutlineColor`,
      `risoOutlineWidth`, `risoShadowColor`, `risoShadowOffset`, `risoCardRadius`,
      `risoUppercaseHeadings`, `risoGrain`, `focusRingColor`, `showRecentlyViewed`, `showBreadcrumbs`,
      `showCookieBanner`. `COPY_SCHEMA` grew to ~25 groups (~350 strings: header/About, cart, search &
      filters, collection/wishlist, product page, account, order tracking, checkout, 404,
      maintenance, loading screen, cookie banner) with a search box in Text & Translations, and
      `storeCopy.coverage.test.ts` fails if a `getCopy(…, "key")` is used without a schema entry.
      Bug fixed on the way: the token layer emitted space-separated triplets (`255 255 255`) but
      consumed them as `rgba(var(--x-rgb), a)` — invalid CSS, so every `text-white/N`,
      `bg-white/N` and `border-white/N` remap silently fell back to full white/transparent.
      Triplets are now comma-separated. Also: `StorefrontThemeStyle` now sets `--body-font` /
      `--heading-font` so standalone pages (not just the homepage) follow the chosen fonts.
- [x] **Studio parity (Shopify-style "everything editable").** `studio/styleSchema.ts` now exposes every
      design key the public storefront reads (logo & wordmark, catalog header/filters, navigation
      links, product page layout, badges & labels, motion/spacing/effects, checkout & cart drawer,
      footer extras, Riso print treatment, storefront elements) and Style › Theme look lists the whole
      `THEME_LIBRARY` with one-click apply. `studioCoverage.test.ts` scans the public source and fails
      if a design key is read without a Studio control; `storeCopy.coverage.test.ts` does the same for
      shopper-facing strings (now incl. reviews, checkout extras). Section-level text (sale label,
      form thank-you, slide arrows) is section settings.
- [x] **Studio: preview click-to-edit for storefront text, payment-icon picker, "My themes".**
      Double-clicking any storefront string (footer, cart drawer, account, checkout…) in the Studio
      preview is matched against the editable copy (`SET_COPY_MAP` → `COPY_SELECT` in
      `previewBridge.ts`) and jumps to that field in Text & labels. Footer payment icons are
      chosen in Style › Payment icons (`design.footerBadges`, falls back to Settings › Payments;
      `resolveFooterBadges`). Style › Theme look › **My themes** saves/loads/deletes whole-design
      copies (`settings.savedThemes`, max 10, `studio/savedThemes.ts`). Still open: recursive
      nested blocks with drag-and-drop.
- [x] **Studio "Find anything" (October 2026).** Top bar **Find** button / **Ctrl+K** (⌘K) opens one search
      over every Style control, every Text & labels string (by label *and* current wording), the Menus panels,
      each page and the sections on it, and the main actions (Save, Publish, History, phone preview…).
      `studio/studioSearch.ts` (pure, tested) builds and ranks the index — every typed word must match, titles
      beat location beats hidden keywords, and owner words work ("colour", "phone" ↔ mobile, "go live" →
      Publish). `StudioSearch.tsx` is the palette; `StudioEditor.goToResult` opens the right tab, expands the
      group, scrolls to and flashes the field (`data-style-key` / `data-copy-key`), selects a section, or opens
      a page in Studio › Pages (`StudioPages` `openSlug`). New Style/Text controls are picked up automatically.
- [x] **Studio visual editing workflow.** The active Studio has a sortable section
      outline with explicit add positions and expandable sortable blocks. Preview
      block selection opens its own inspector, including block fields, visibility,
      duplicate and remove. Edit/Browse modes separate selection from storefront
      interaction; device preview, selected product/collection, searchable settings,
      page/global style scope and phone-sized editor navigation are available.
      Draft saves capture an immutable snapshot, local unsaved work can be
      recovered, and design writes replace the full map so cleared overrides
      stay cleared. `studio/StudioEditor.tsx`, `StudioOutline.tsx`,
      `StudioInspector.tsx`, `previewBridge.ts`, `useStudioPersistence.ts` and
      `themeWrite.ts` own these behaviors. Fixture browser checks cover canvas
      block selection, slideshow selection, keyboard reorder and save races;
      authenticated Firestore save/publish remains to be checked in a live admin
      session. Recursive blocks and canvas drag remain future milestones.
- [x] Fixes found while verifying: token-layer selectors now also match roots that carry `data-fm-store` and `fm-page`/`fm-surface`/`text-white` on the SAME element (Account and Tracking never received the theme background before); Tracking text/placeholder contrast raised; `ProductCoverCarouselSection` text is pinned light
      over its image scrim (it was following the theme text colour), and Checkout restores
      literal paper for `bg-white` on light themes (the token layer maps `bg-white` to the
      foreground, which turned checkout fields black).
- [x] "Lyricalmyrical Punk" design shipped end-to-end (violet-on-black,
      Cormorant Garamond headings / Inter body). Four new catalog-driven
      sections: `ProductCoverCarouselSection` (hero auto-cycling book covers
      with dots, scrim, color-blend overlay, film grain),
      `ProductShowcaseGridSection` (4:5 covers, category tags, quick-add via
      `useCart()`, duotone + grain), `StaffNotesTableSection` (books-driven
      table; per-book note blocks resolved by `resolveStaffNoteRows` in
      `features/site/staffNotes.ts`, keyboard-accessible rows), and
      `EphemeraRowSection` (pure-CSS decorative objects as blocks). Section
      extensions: HeroSection `eyebrow`/`titleItalic`/`metaText`/
      `sideImageUrl`/`ctaUrl`; MarqueeSection `fontWeight`/`letterSpacing`.
      Theme plumbing: `punk` palette + `lyricalmyrical-punk` THEME_LIBRARY
      preset with a full `global` token record, and `lyricalmyrical-punk` /
      `lyricalmyrical-about` / `lyricalmyrical-journal` layout templates in
      `HOME_LAYOUT_TEMPLATES` (the About/Journal ones are applied while a
      per-page template pill is active). Chrome counterparts (settings-gated,
      defaults preserve the old look): sticker-pill nav + two-part wordmark
      (`navStyle`/`wordmarkStyle` etc., rendered by `MainSite` + `LogoMark`),
      a real scrolling announcement marquee (`announcementScrolling` now
      honored, plus speed/size/weight/tracking), catalog heading/count +
      category filter chips (`showCategoryChips`, adds an "ALL"
      pseudo-category), 4-column footer (`footerLayout`/`footerBg` +
      `footerLocationHeading` copy), themeable cart drawer
      (`cartDrawerBg/Text/Muted/Surface/Border`, `cartDrawerGrayscaleThumbs`),
      themed custom-page chrome (`pageChromeStyle`), product-page quantity
      stepper (`showQtyStepper`; `addToCart(product, variant?, quantity)`)
      and designed description card (`productDescriptionStyle`). Bugfix:
      `ProductGridHeaderSection`'s "Featured" source now filters on
      `isFeatured` (it previously matched every book).

- [x] **Studio audit (30 Sep 2026).** Browser-driven audit of Studio. Fixed: tabbing through an *unset* colour field wrote `#000000` (blank now stays blank; `transparent`/`rgba()` survive); the preview iframe no longer counts visits / funnel events as shopper traffic; unset sliders show the storefront default (`defaultValue` in `styleSchema.ts`); My themes refuses to grow past ~500 KB (each copy is a whole design and `settings/website` is one 1 MiB Firestore doc); dirty/unpublished compares memoised. Known gap: preview double-click→copy matching is exact-text, so strings with `{count}`/`{year}` placeholders never jump to their field.

### C. Live preview & editing UX
- [x] Canvas drag actions resolve section ownership and blocks from the latest
      draft, including global sections and custom-page templates, so delayed
      preview events cannot overwrite newer edits. Linked nested blocks retain
      their source children. Studio Pages keeps unsaved page edits mounted when
      switching tabs, protects them on exit, and preserves typing during a save.
      The pre-publish check scans nested content and reports manual image-size
      and contrast review as warnings rather than claiming those checks passed.
- [x] Inline click-to-edit routes preview clicks to the correct section/template panel and keeps the selected section highlighted.
- [x] Device preview toggle (desktop / tablet / mobile widths).
- [x] Visual/feature setting scope: **All pages** applies colors, typography,
      navigation, layout, buttons, product controls, announcements, social,
      sizing, translations, and additional settings across every static and
      dynamic template; **This page only** keeps intentional page-level
      overrides. Section stacks and page content are preserved.
- [x] Undo / redo for editor changes (Ctrl+Z / Ctrl+Y).
- [x] Reorder polish: sections, blocks, global sections, nav menu items and
      color schemes all reorder via `@dnd-kit` (pointer + keyboard) through the
      shared `src/app/admin/dndSortable.tsx` helper. Section types can also be
      dragged out of the library modal onto explicit between-section insertion
      zones, and existing sections use the same insertion targets plus a lifted
      drag overlay for precise moves, including an empty page and the start/end
      of the outline. Mega-menu child and grandchild links (`MenuBuilderPanel`
      in `ThemeEditor.tsx`) now reorder via the same `SortableList`/`SortableRow`
      pattern as top-level menu items, at all three nesting levels. `BlocksEditor`
      also gained a generic `kind: "list"` nested sub-list field (drag-reorderable
      plain-text rows via the same primitives), demonstrated on
      `PricingTableSection`'s "Features" field. The same `kind: "list"` field also
      supports a structured `itemFields` variant (`Record<string, string>[]` rows
      instead of plain strings), first demonstrated on `MulticolumnSection`'s
      "Links" field (`text` + `url` per row) and now also on `RowSection`'s button
      blocks (`buttons` field, `text` + `url` per row) so a single column can hold
      multiple CTAs side by side — the legacy single `buttonText`/`buttonUrl`
      fields remain as a fallback for blocks that haven't been migrated to the
      list. (Full recursive multi-field nested blocks across more section types
      remains a follow-up.)
- [x] Live preview channel (`THEME_UPDATE` postMessage) covers the full design
      snapshot on every template. Studio also sends a schema-derived editable
      field map, so safe text/textarea fields can be edited in the canvas even
      when a renderer does not carry a handwritten `data-theme-field` hook.
- [x] Studio iframe preview state is atomic: `STUDIO_PREVIEW_STATE` carries the
      unsaved design, settings, books and published pages on every relevant
      change and again after every preview navigation/ready handshake. This
      keeps colors, menus, page content and newly created pages in sync without
      relying on a second Firestore read or timing-sensitive iframe reload.
- [x] Double-click-to-edit (`TEXT_EDIT` postMessage) now has broad `data-theme-field`
      coverage: nearly every section-level `text`/`textarea` field across the 27
      renderers in `SectionComponents.tsx` is wired (title/subtitle/eyebrow/CTA/body
      copy, etc.), not just a handful of sections. The injected preview script also
      shows a dashed hover outline on editable fields and supports Escape-to-cancel
      (reverts to the pre-edit value and emits a final `TEXT_EDIT` so editor state
      matches). Intentionally still unwired: `richtext`/`html` fields (would corrupt
      markup via `textContent`), `FeaturedProductSection` (renders live product data, not
      themed settings), `MarqueeSection`'s `text`/`separator` (rendered as a
      repeated/joined composite string, not a 1:1 field-to-node mapping), and
      `ProductGridHeaderSection`'s `cartLabel` (pre-existing composite text node
      shared with `cartTotalText`).
- [x] Block-level (array-item) double-click-to-edit: the `TEXT_EDIT` protocol now
      carries an optional `blockId`, resolved in the injected preview script by
      walking up to the closest `[data-fm-block]`/`[data-block-id]` ancestor of the
      double-clicked field (the same `closest()` lookup the existing `SECTION_SELECT`
      click handler already used). On the parent side, a truthy `blockId` is matched
      against the section's blocks array (via `getBlocksKey(section.type)`) — first by
      real `block.id`, falling back to parsing the `block-N` synthetic id — and only
      that block's field is updated; a falsy/absent `blockId` keeps writing
      `section.settings[settingKey]` exactly as before (non-breaking, additive).
      Initial renderer coverage: `TestimonialsSection` (`quote`/`author`/`role`),
      `FAQSection` (`question`/`answer`), and `SlideshowSection` (`eyebrow`/`title`/
      `subtitle`/`ctaText`, gated on the currently displayed slide via `blockEditAttrs(slide, active)`).
      Also covered: `FeatureGridSection` (`title`/`description`; `icon` intentionally
      skipped — low value) and `BlogPostsSection` (`title`/`excerpt`/`tag`; `date` is
      skipped because it renders through `formatArticleDate()`, a display transform,
      so the visible text isn't the raw stored value, and `linkUrl` is skipped since
      it's only used as the card `href`, never rendered as text). Extending more
      block-heavy sections are covered by the schema-derived editable-field map,
      including recursively nested blocks; transformed/composite strings remain
      inspector-only.
- [x] Per-section box fill, raised box fill, and line/border color controls now feed the storefront token layer so hard-coded card/form/divider utilities can be recolored from the editor.


### Next five theme-editor suggestions

After the reference-grid follow-through work, the next five highest-leverage
Shopify/WordPress-parity improvements are:

The September 2026 composition milestone completed the previous five items:
recursive three-level blocks, linked shared blocks, breakpoint overrides,
guarded CSS-grid placement, and direct section/block canvas drag/drop. The next
five highest-leverage increments are asset processing, performance profiling,
collaboration conflict handling, a complete theme-management workspace, and
schema-valid AI composition authoring.

> Mega-menu child/grandchild drag/drop (previously #2 on this list) shipped:
> `MenuBuilderPanel` in `ThemeEditor.tsx` now uses `SortableList`/`SortableRow`
> for top-level items, sub-links, and mega-menu column links alike.

### Studio usability and organization — DONE

- [x] Readable workspace navigation and page context.
- [x] Category browsing for Style and Text with cross-category search and click-to-edit/search routing.
- [x] Searchable section/block outline, original positions, hidden-state labels, expand/collapse controls and safe filtered ordering.
- [x] Primary editing/publishing toolbar plus accessible secondary Theme actions menu.
- [x] Explicit inspector device context; shared content remains distinct from breakpoint-specific layout.

Studio organization milestone: Page layout, Theme settings, Text & labels, Navigation and Pages
use readable navigation with page context. Theme settings and text browse by category; search spans
categories and Find anything/click-to-edit opens the owning category. The page outline searches
section and nested-block content, expands matching sections, numbers original positions and offers
Expand/Collapse all and explicit Move up/down actions. Section reorder is disabled while searching to preserve the complete stack.
The toolbar keeps page/device, undo/redo, draft state, Save draft and Publish visible; Theme actions
holds preview, history, checks and guarded discard. Inspector device context distinguishes shared
content from responsive layout overrides. Existing draft/publish persistence is unchanged.

### D. Theme management
- [x] Draft/publish + scheduled publish now include a clear Live/Draft/Unsaved
      state, persistent unpublished-change detection, and a guarded Discard
      Draft action that resets both Firestore and local editor history to the
      published storefront without changing what shoppers see.
- [x] Import/export JSON exists (`ThemeEditorPro`) plus a friendly duplicate-theme draft flow in the theme toolbar.
- [x] Multiple saved themes: Studio › Style › Theme look › **My themes** (up to 10 full
      designs) with Rename, Duplicate, Download as a `.theme.json` file and
      **Import a theme file…** (`studio/savedThemes.ts`). Applying one loads it into the
      undoable draft; the published site is the active theme until Publish.
- [x] Version history / restore previous published versions: every Save Draft / Publish
      writes a snapshot to the admin-only `theme-versions` Firestore collection
      (`adminApi.saveThemeVersion`/`listThemeVersions`, last 30 kept, pruned on save),
      shown in Studio's History dialog so history survives reloads. Preview is
      non-destructive; Restore loads a snapshot into the working copy as an
      unsaved change, and nothing goes live until Publish.
- [x] Publish and Discard use accessible admin dialogs with a concise inventory
      of changed surfaces/settings instead of browser confirms. Ctrl/Cmd+S saves.
- [x] Studio can copy/paste sections between templates and save configured
      sections into the draft's reusable `sectionPresets` library.
- [x] Sections support phone/desktop visibility, scheduled show windows, phone
      padding/type/grid overrides, and direct drag reorder in the preview canvas.
- [x] A pre-publish check flags empty content and missing image descriptions and
      reminds editors of contrast and image-weight review.

### E. Visual layout & responsive engine (Fluid Engine / Wix Studio)
- [x] Nested blocks (block-in-block) in the Studio model, outline, inspector,
      and `CompositionSection` renderer — guarded to three levels deep.
- [x] Reusable linked shared blocks can be promoted from or inserted into any
      compatible section of the same renderer type. Content inherits from one
      source while placement, visibility and responsive layout remain local.
- [x] Emit stable `data-fm-section` / `data-fm-block` ids on rendered
      section and block nodes for reliable click-to-edit/hover-highlight.
- [x] `CompositionSection` supports CSS-Grid row/column/span/`z-index`
      positioning with separate desktop/tablet/mobile layouts and a three-level
      tree guardrail.
- [x] Block alignment/visibility and grid placement use the active
      desktop/tablet/mobile preview as their editing scope, with inheritance
      when an override is blank. Auto `clamp()` typography remains a later enhancement.
- [x] Soft section/block limits with in-editor warnings (25 sections / 50
      blocks reference).

### F. Performance & assets (Core Web Vitals)
- [ ] Keep renderers shallow; add a DOM-depth/node-count audit.
- [ ] Image pipeline: 1500–2000px cap, JPEG 80–85, WebP/AVIF, responsive
      `srcset`, focal-point mapping, payload budgets (hero <200KB / content
      <150KB / thumb <50KB).
- [ ] Lazy-load below-the-fold sections/images; on-demand section JS.
- [ ] Element caching of unchanged rendered section HTML.
- [x] Surface an in-editor theme-weight guardrail score (section/block counts plus warning states).
- [ ] Expand theme-weight into a full Core Web Vitals proxy (LCP, CLS, INP, DOM node count).

### G. AI authoring & custom code
- [ ] Prompt → registry-valid section/block JSON inserted as a draft.
- [x] Desktop → mobile breakpoint/typography auto-generation (October 2026). `studio/autoMobile.ts`
      (pure, tested) fills phone values the owner hasn't set: phone top/bottom spacing (~55% of desktop),
      a smaller large heading (`mobileHeadingSize`, rendered as a phone-only `h1,h2` rule in `sectionRender.tsx`),
      fewer grid columns, and — for **Flexible composition** — stacked tablet (two-up) and phone (one per row)
      block placement in reading order. Own values are kept unless **Redo all phone values** is used; **Reset
      phone layout** removes them. Entry points: Sections tab › **Auto-fit page for phones** (whole page),
      section › **Layout & style** › **Phone & tablet layout** (one section), and Find anything › "Auto-fit this
      page for phones". Fixed along the way: tablet/phone grid rules in `compositionBreakpointCss` are now
      `!important` — the desktop placement is an inline style, so previously per-device grid overrides never won.
      `phoneLayout.test.tsx` guards the storefront output. Remaining: auto `clamp()` body typography and a
      visual diff of the phone result.
- [x] Custom CSS panel (global + per-section) via the token layer / scoped section style injection.
- [ ] Deferred custom JS hook (post first-paint) for widgets/analytics.

## Best-in-class feature targets (competitive analysis)

This is the bar a "legit" theme editor has to clear. It's distilled from a
comparative analysis of **Shopify Online Store 2.0 / Horizon, BigCommerce
Stencil / Catalyst, WooCommerce (Gutenberg vs Elementor), Wix Studio /
Harmony, and Squarespace Fluid Engine**. Each item below names the
best-in-class behaviour, then maps it to where it lands in *this* codebase
(registry, renderers, `design`/`draftDesign`, the token layer) so it can be
built end-to-end via the section contract above.

### Where we stand vs. the platforms

| Capability | Best-in-class reference | Us today | Gap to close |
|------------|------------------------|----------|--------------|
| Declarative page state | Shopify OS 2.0 JSON template tree (`templates/*.json`) | `design.sections` JSON in settings | Per-page-type templates (roadmap A) |
| Sections + blocks | OS 2.0 sections/blocks; Horizon **8 levels** of nesting | section → 1 level of blocks | Nested/recursive blocks |
| Reusable blocks across sections | OS 2.0 "theme blocks" / app blocks | section-local blocks only | Shared block library |
| Click-to-edit in preview | `{{ block.shopify_attributes }}` data hooks | partial (`THEME_UPDATE` postMessage) | Emit stable `data-fm-*` ids on every section/block; bidirectional highlight |
| Visual drag layout | Squarespace Fluid Engine CSS-Grid coordinates; Wix Studio Grid+Flexbox | vertical section list only | Grid/coordinate positioning w/ z-index overlap |
| Responsive per-device editing | Wix Studio breakpoints; Squarespace 24-col desktop / 8-col mobile grids | single layout, CSS handles reflow | Per-breakpoint overrides + device preview |
| AI authoring | Horizon AI block generator; Wix AI layout/`clamp` typography | none | Prompt → registry-valid section JSON |
| Custom code | OS 2.0 `custom.css` inject + editor CSS panel | token/CSS-var layer only | Global + per-section custom CSS, deferred custom JS |
| Performance budgets | Lean semantic HTML, Core Web Vitals pass-rate, element caching | not measured in-editor | Asset pipeline + CWV/score surfacing |
| Theme management | Theme library, versions, duplicate | draft/publish + presets + JSON import/export | Multiple themes, version history |

### Feature backlog (the "make it legit" list)

**1. Sections & blocks model parity (Shopify OS 2.0 / Horizon)**
- **Nested blocks.** Today blocks are a flat list under a section. Add
  recursive blocks (block-in-block) so layouts like cards-in-columns work
  without bespoke section types. Horizon allows up to **8** levels; even 2–3
  unlocks most real layouts. Extend `getBlockFields`/`BlocksEditor` and the
  renderer's block loop.
- **Reusable / shared blocks** ("theme blocks"): promote a configured block to
  a library entry usable inside any section, not just where it was authored.
- **Limits + guardrails.** OS 2.0 caps templates at **25 sections / 50 blocks
  per section** to protect performance. Surface soft caps + a warning in
  `HomepagePanel` instead of letting pages grow unbounded.
- **Stable edit ids.** `SectionList` emits `data-fm-section` on every rendered section wrapper, and block-based renderers emit `data-fm-block`/`data-block-id` on their primary block node (the analogue of `block.shopify_attributes`) so the preview iframe can hover-highlight and round-trip click-to-edit reliably.

**2. Visual layout & responsive engine (Squarespace Fluid Engine / Wix Studio)**
- **Grid positioning.** Move beyond a single vertical stack: allow blocks to be
  placed on a CSS Grid with start/end coordinates and a `z-index` so elements
  can overlap natively (Fluid Engine stores `[x_start,y_start]→[x_end,y_end]` +
  z per block). Keep the storefront output as CSS Grid so no layout JS runs at
  runtime.
- **Separate desktop/mobile grids.** Fluid Engine exposes a **24-col desktop /
  8-col mobile** grid; store per-breakpoint coordinates so mobile isn't just a
  squashed desktop.
- **Editing guardrails** (so dynamic row heights don't make dragging chaotic):
  prevent shrinking a container below its content, auto-adjust the end
  coordinate when content height changes, and temporarily restore a uniform
  grid while a drag is in progress.
- **Per-breakpoint overrides + device preview toggle** (desktop/tablet/mobile),
  with auto `clamp()` typography generation like Wix Studio's AI breakpoints.

**3. AI authoring (Horizon AI block generator / Wix AI layout)**
- **Prompt → section.** "Add a 3-up testimonial row in our brand colors"
  should emit a *registry-valid* section/block JSON (validated against
  `SECTION_REGISTRY` field types) and insert it as a draft. This is the single
  highest-leverage modern differentiator.
- **Desktop → mobile.** Given a desktop layout, auto-generate the mobile
  breakpoint coordinates/typography rather than making the merchant redo it.

**4. Custom code & extensibility (OS 2.0 `custom.css` / BigCommerce widgets)**
- **Custom CSS panel** — global and per-section — injected through the existing
  `StorefrontThemeStyle` / token layer (scoped under `[data-fm-store]`).
- **Deferred custom JS** hook for analytics/widgets, executed after first paint
  (Wix's lesson: never block INP with editor-injected scripts).
- **Custom HTML block** already exists — keep it sandboxed/sanitised.

**5. Performance & asset discipline (Core Web Vitals — the report's headline)**
The whole report hammers one point: **lean semantic HTML wins.** Gutenberg
beats Elementor by ~75% smaller DOM purely by avoiding nested `div` wrappers.
Our renderers must stay shallow.
- **Keep renderers shallow** — no Elementor-style wrapper-in-wrapper nesting in
  `SectionComponents.tsx`. Audit DOM depth as sections are added.
- **Image pipeline / payload budgets:** cap uploads at **1500–2000px**, JPEG
  **80–85%**, prefer **WebP/AVIF**, generate responsive `srcset`, and apply
  **focal-point mapping** so subjects stay centred across breakpoints. Target
  budgets: hero **<200 KB**, content image **<150 KB**, thumbnail **<50 KB**.
- **Lazy-load** below-the-fold sections/images; load section JS on demand.
- **Element caching:** memoise rendered section HTML where settings are
  unchanged (Elementor 3.24+ cut response time ~30% this way).
- **Surface a Core Web Vitals / "theme weight" score** in the editor (LCP, CLS,
  INP proxy, DOM node count) so merchants see the cost of what they add.

**6. Theme management & TCO (all platforms)**
- **Multiple saved themes** (a library of complete themes, one published) +
  **version history / restore** — already seeded in roadmap D.
- **Duplicate-theme** flow on top of the existing JSON import/export.
- **Section & theme presets** library (presets exist; grow into a gallery).

### Guiding principles pulled from the analysis
- **Declarative, JSON-first state** (we already match this with `design`).
- **Lean DOM > visual convenience** — every wrapper has a Core Web Vitals cost.
- **Responsive by construction**, not absolute positioning — favour CSS
  Grid/Flexbox and breakpoint overrides over pixel coordinates baked for one
  screen.
- **Editor stays WYSIWYG** — block-limit workarounds that push merchants into
  sidebar-only forms (the Shopify metafield-repeater hack) are a regression in
  UX; prefer real nested blocks.

## Verifying changes

- Re-confirm the registry↔renderer match before/after a change:
  - Registry types: `grep -oE 'type: "\w+Section"' src/app/admin/ThemeEditorExtensions.tsx`
  - Renderers: `grep -E 'export function \w+Section' src/app/components/SectionComponents.tsx`
  - Every registry `type` should have an identically named renderer.
  - This grep is also enforced as a permanent Vitest test:
    `src/app/components/sectionParity.test.ts` (runs with `npm test`).
- Run the app (`npm run dev`), open `/admin` → theme editor, add/edit/reorder the
  affected section, then **load the live storefront** and confirm it renders,
  toggles visibility, and survives save → publish.
- `npm run build` should succeed; run `npm test` (Vitest) for any touched logic.
- Respect existing guardrails in `CLAUDE.md` / `AGENTS.md` (sub-path routing,
  Firestore rules, accessibility).

## Riso chrome (Phase 5 complete)

The editor root is now `.rp` and follows the admin appearance (`appearance` prop from `Dashboard`). Top bar (Design studio heading, Live/Draft/Unsaved badge on `--rp-*` status tints), the tab strip (`role="tablist"`, 44px targets, flare active tab), left panel surface, shared primitives, and the section library (`role="dialog"`, focus trap, Escape, labelled search and delete controls) all use Riso tokens. Deeper panel bodies still carry legacy utility classes under the `.admin-reso` compat layer; migrate them panel by panel.

- [x] **Public recovery and phone navigation (2 Oct 2026).** Shared phone menu with Studio visibility/copy controls; custom pages retain the shared policy footer with a page-footer toggle; wildcard recovery exposes existing 404 copy and message/back-link visibility controls. Checkout configuration errors remain editable in Text & labels > Checkout.
