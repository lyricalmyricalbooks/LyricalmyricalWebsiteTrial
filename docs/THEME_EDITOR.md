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

The editor is **not** a blank slate. It already supports:

- A **section + block** model with per-section/per-block settings schemas.
- **Drag-and-drop** reordering, duplicate, show/hide, and delete of sections.
- **Color schemes**, palettes, and a theme/preset library.
- **Fonts** (Google Font loader + selector) and typography tokens.
- **Contrast checking** (WCAG ratio badges) for accessibility.
- **Draft / publish** workflow, plus **scheduled publish**.
- **Section presets** (save/reuse a configured section).
- **Live preview** via an iframe `postMessage` channel (`THEME_UPDATE`) with
  click-to-edit (the preview can request a section be opened in the editor).
- **Import/export** of a theme design as JSON (in `ThemeEditorPro`).
- A **token/CSS-variable layer** applied to every storefront surface.

## Architecture map

| File | Owns |
|------|------|
| `src/app/admin/ThemeEditor.tsx` | Top-level editor shell and panels: Style, Colors, Navigation, Homepage. `HomepagePanel` drives the section list (drag/reorder, duplicate, visibility, delete) and the per-section/block settings forms. The section library is unified on the registry-driven `NewSectionLibraryModal`; the legacy `SECTION_TEMPLATES` + `SectionLibraryModal` dead code has been removed. |
| `src/app/admin/ThemeEditorExtensions.tsx` | The real **`SECTION_REGISTRY`** (~25 section types), `getSectionFields`, `getBlockFields`, `BlocksEditor`, `NewSectionLibraryModal`, `getSectionMeta`. Field types: `text`, `textarea`, `html`, `richtext`, `color`, `number`, `range`, `select`, `toggle`, `date`, `image`. |
| `src/app/admin/ThemeEditorPro.tsx` | Color math/normalization, palette & color-scheme tooling, theme import/export. |
| `src/app/admin/ThemeEditorBuilder.tsx` | Builder UI that consumes the registry helpers (`getSectionMeta`, `getSectionFields`, `getBlockFields`, `NewSectionLibraryModal`). |
| `src/app/components/SectionComponents.tsx` | **One storefront renderer per registry section type** (the components that actually draw each section) + shared style helpers (spacing, background, button styles, animation wrappers). Registry and renderers are at parity — every `SECTION_REGISTRY` type has a matching renderer. |
| `src/app/components/sectionRender.tsx` | **Shared section renderer** (single source of truth for section→renderer mapping). `SectionList` (pure: maps a `sections` array → renderers via `(Sections as any)[type]` and emits stable `data-fm-section` / `data-section-id` edit hooks); `TemplateSections` (renders `design[templateId].sections` for a page-type template); `GlobalSections` (renders the flat `design.globalSections`). Used by MainSite **and** every standalone page. |
| `src/app/components/MainSite.tsx` | Renders the homepage/storefront. Uses `SectionList` for `heroPage.sections` and the shared `GlobalSections` from `sectionRender`. |
| `src/app/features/site/StorefrontThemeStyle.tsx` + `themeTokens` | Injects the semantic token / CSS-variable layer onto any storefront surface via the `[data-fm-store]` attribute. |
| `src/app/admin/api.ts` | Persistence: `getSettings`, `updateSettings(settings, { publish })`, `schedulePublish`. |

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
- `adminApi.schedulePublish(design, at)` stores `scheduledPublish` so the
  storefront can promote a design at a future time.
- `design.sectionPresets` holds saved section presets.

## Known gaps & inconsistencies (seed for the roadmap)

- **Section library unified.** The single library is the registry-driven
  `NewSectionLibraryModal` over `SECTION_REGISTRY` (~25) in
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
- [ ] Add remaining common Shopify sections end-to-end as needed (e.g. featured
      collection, image banner, richer content compositions) — each via the full
      contract.
- [x] Core sections shipped end-to-end (Hero, FeatureGrid, Testimonials, FAQ,
      Newsletter, Slideshow, Multicolumn, RichText, Image-with-text, Video,
      Collection list, Featured product, Blog posts, Countdown, Contact form,
      Map, Gallery, Row, Marquee, Logo list, Collapsible, Text content,
      Custom HTML).

### C. Live preview & editing UX
- [x] Inline click-to-edit routes preview clicks to the correct section/template panel and keeps the selected section highlighted.
- [x] Device preview toggle (desktop / tablet / mobile widths).
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
      `PricingTableSection`'s "Features" field. (Full recursive multi-field
      nested blocks across more section types remains a follow-up.)
- [~] Live preview channel (`THEME_UPDATE` postMessage) exists — extend it to
      cover all edits (not only some) and all templates.
- [x] Per-section box fill, raised box fill, and line/border color controls now feed the storefront token layer so hard-coded card/form/divider utilities can be recolored from the editor.


### Next five theme-editor suggestions

After the reference-grid follow-through work, the next five highest-leverage
Shopify/WordPress-parity improvements are:

1. **Nested block drag/drop** — extend `BlocksEditor`'s new `kind: "list"`
   sub-list pattern from flat plain-text rows to 2–3 levels of recursive,
   multi-field blocks for columns, cards, and media/text groups, and adopt it
   in more section types beyond `PricingTableSection`.
2. **CSS-grid visual positioning** — add guarded grid coordinates, z-index, and
   overlap controls for sections that need true visual layout rather than only
   vertical order.
3. **Per-breakpoint layout overrides** — store desktop/tablet/mobile placement
   overrides and pair them with the existing device preview toggle so mobile
   layouts can be intentionally edited.
4. **Reusable shared blocks** — promote configured blocks into a cross-section
   library so repeated cards, CTAs, and media/text groups can be updated once.
5. **Live-preview iframe drag/drop** — let `data-fm-section` / `data-fm-block`
   hooks in the preview itself become drag sources/targets, not just click
   targets, so reordering can happen directly in the canvas.

> Mega-menu child/grandchild drag/drop (previously #2 on this list) shipped:
> `MenuBuilderPanel` in `ThemeEditor.tsx` now uses `SortableList`/`SortableRow`
> for top-level items, sub-links, and mega-menu column links alike.

### D. Theme management
- [~] Draft/publish + scheduled publish exist — bring to full Shopify parity
      (clear "unpublished changes" state, discard-draft).
- [x] Import/export JSON exists (`ThemeEditorPro`) plus a friendly duplicate-theme draft flow in the theme toolbar.
- [ ] Multiple saved themes (a library of full themes, not just presets), with
      one active/published.
- [ ] Version history / restore previous published versions.

### E. Visual layout & responsive engine (Fluid Engine / Wix Studio)
- [ ] Nested blocks (block-in-block) in the schema, `BlocksEditor`, and
      renderers — at least 2–3 levels deep.
- [ ] Reusable shared blocks usable across any section ("theme blocks").
- [x] Emit stable `data-fm-section` / `data-fm-block` ids on rendered
      section and block nodes for reliable click-to-edit/hover-highlight.
- [ ] CSS-Grid block positioning (start/end coords + `z-index` overlap) with
      separate desktop/mobile grids and dynamic-row guardrails.
- [ ] Per-breakpoint overrides + device preview toggle (also under C) with
      auto `clamp()` typography.
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
- [ ] Desktop → mobile breakpoint/typography auto-generation.
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
- Run the app (`npm run dev`), open `/admin` → theme editor, add/edit/reorder the
  affected section, then **load the live storefront** and confirm it renders,
  toggles visibility, and survives save → publish.
- `npm run build` should succeed; run `npm test` (Vitest) for any touched logic.
- Respect existing guardrails in `CLAUDE.md` / `AGENTS.md` (sub-path routing,
  Firestore rules, accessibility).
