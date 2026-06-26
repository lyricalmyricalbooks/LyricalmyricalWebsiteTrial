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
| `src/app/admin/ThemeEditor.tsx` | Top-level editor shell and panels: Style, Colors, Navigation, Homepage. `HomepagePanel` drives the section list (drag/reorder, duplicate, visibility, delete) and the per-section/block settings forms. **Contains a legacy `SECTION_TEMPLATES` (5 entries) + `SectionLibraryModal` — superseded by the registry below.** |
| `src/app/admin/ThemeEditorExtensions.tsx` | The real **`SECTION_REGISTRY`** (~25 section types), `getSectionFields`, `getBlockFields`, `BlocksEditor`, `NewSectionLibraryModal`, `getSectionMeta`. Field types: `text`, `textarea`, `html`, `richtext`, `color`, `number`, `range`, `select`, `toggle`, `date`, `image`. |
| `src/app/admin/ThemeEditorPro.tsx` | Color math/normalization, palette & color-scheme tooling, theme import/export. |
| `src/app/admin/ThemeEditorBuilder.tsx` | Builder UI that consumes the registry helpers (`getSectionMeta`, `getSectionFields`, `getBlockFields`, `NewSectionLibraryModal`). |
| `src/app/components/SectionComponents.tsx` | **22 storefront section renderers** (the components that actually draw each section) + shared style helpers (spacing, background, button styles, animation wrappers). |
| `src/app/components/sectionRender.tsx` | **Shared section renderer** (single source of truth for section→renderer mapping). `SectionList` (pure: maps a `sections` array → renderers via `(Sections as any)[type]`); `TemplateSections` (renders `design[templateId].sections` for a page-type template); `GlobalSections` (renders the flat `design.globalSections`). Used by MainSite **and** every standalone page. |
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
but it doesn't show up." As of this writing the registry has **25** types but
`SectionComponents.tsx` exports only **22** renderers; missing renderers:
**`VideoHeroSection`**, **`StatsCounterSection`**, **`PricingTableSection`**.

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
   (registry-driven). Do **not** add it only to the legacy `SECTION_TEMPLATES`.
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

- **Two section libraries.** Legacy `SECTION_TEMPLATES` (5) in `ThemeEditor.tsx`
  vs `SECTION_REGISTRY` (~25) in `ThemeEditorExtensions.tsx`. Unify on the
  registry and remove/retire the legacy list.
- **Registry types without renderers:** `VideoHeroSection`,
  `StatsCounterSection`, `PricingTableSection` (verify before each change with
  the grep in "Verifying"). Either add renderers or remove the dead schemas.
- **Page-type templates (milestone A — done).** Product, collection, custom
  page, and cart now render their own `design[surface].sections`, and global
  sections render on every page. Remaining surfaces (catalog `storefront`,
  Wishlist/Account/OrderTracking) and click-to-edit routing per template are
  follow-ups noted in roadmap A.

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
      homepage-only), via the shared `sectionRender.tsx`.
- [ ] Follow-ups: wire the `storefront` (catalog) surface and the
      Wishlist/Account/OrderTracking pages; route the editor's click-to-edit to
      the correct template panel (currently maps non-global clicks to the home
      sections panel); group global sections into header/footer/announcement.

### B. More section types (close gaps + expand)
- [ ] Add renderers for `VideoHeroSection`, `StatsCounterSection`,
      `PricingTableSection` (or remove the schemas).
- [ ] Unify the section library on `SECTION_REGISTRY`; retire
      `SECTION_TEMPLATES`.
- [ ] Add common Shopify sections end-to-end as needed (e.g. featured
      collection, image banner, blog posts, rich content) — each via the full
      contract.
- [x] Core sections shipped end-to-end (Hero, FeatureGrid, Testimonials, FAQ,
      Newsletter, Slideshow, Multicolumn, RichText, Image-with-text, Video,
      Collection list, Featured product, Countdown, Contact form, Map, Gallery,
      Row, Marquee, Logo list, Collapsible, Text content, Custom HTML).

### C. Live preview & editing UX
- [~] Inline click-to-edit exists (preview → open section); polish coverage and
      make it bidirectional/stable.
- [ ] Device preview toggle (desktop / tablet / mobile widths).
- [ ] Undo / redo for editor changes.
- [ ] Reorder polish: keyboard reordering, drag affordances, nested block DnD
      parity with section DnD.
- [~] Live preview channel (`THEME_UPDATE` postMessage) exists — extend it to
      cover all edits (not only some) and all templates.

### D. Theme management
- [~] Draft/publish + scheduled publish exist — bring to full Shopify parity
      (clear "unpublished changes" state, discard-draft).
- [~] Import/export JSON exists (`ThemeEditorPro`) — add a friendly
      duplicate-theme flow.
- [ ] Multiple saved themes (a library of full themes, not just presets), with
      one active/published.
- [ ] Version history / restore previous published versions.

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
