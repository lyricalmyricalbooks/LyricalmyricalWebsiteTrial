import { useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import * as Sections from "./SectionComponents";
import { hexToRgbTriplet } from "../features/site/themeTokens";
import { DEFAULT_COLOR_SCHEMES } from "../features/site/colorSchemes";

// ─────────────────────────────────────────────────────────────────────────────
// Shared section renderer
//
// This is the single source of truth for turning a `sections` array (from the
// theme editor) into rendered storefront output. It is used by:
//   - MainSite (homepage `heroPage.sections` + `globalSections`)
//   - every standalone page (product/collection/page/cart) via `TemplateSections`
//
// The storefront resolves a section to its component **by name** through
// `(Sections as any)[section.type]` — see docs/THEME_EDITOR.md. A registry type
// with no identically named renderer in SectionComponents.tsx renders nothing.
//
// NOTE: the small font/animation helpers below are intentionally self-contained
// (not imported from MainSite) so standalone pages don't pull in the large
// MainSite module. Keep them in sync if the MainSite typography behavior changes.
// ─────────────────────────────────────────────────────────────────────────────

/** Loads a Google font stylesheet on demand (no-op for the default Inter). */
function GoogleFontLoader({ font }: { font: string }) {
  useEffect(() => {
    if (!font || font === "Inter") return;
    const linkId = `google-font-${font.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, "+")}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
  }, [font]);
  return null;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Per-section publish window: only render between showFrom and showUntil (if set). */
export function sectionInWindow(section: any): boolean {
  const s = section?.settings || {};
  if (s.showFrom && Date.now() < new Date(s.showFrom).getTime()) return false;
  if (s.showUntil && Date.now() > new Date(s.showUntil).getTime()) return false;
  return true;
}

/** Scoped style + font loading for a section's heading/body font overrides. */

function SectionScopedCss({ sectionId, css }: { sectionId: string; css?: string }) {
  if (!css) return null;
  const selector = `[data-fm-section="${sectionId}"]`;
  const scoped = String(css)
    .split("}")
    .map((rule) => {
      const [rawSelectors, body] = rule.split("{");
      if (!rawSelectors || !body) return "";
      const selectors = rawSelectors
        .split(",")
        .map((sel) => {
          const trimmed = sel.trim();
          if (!trimmed) return "";
          return trimmed.includes("&") ? trimmed.replace(/&/g, selector) : `${selector} ${trimmed}`;
        })
        .filter(Boolean)
        .join(", ");
      return selectors ? `${selectors}{${body}}` : "";
    })
    .filter(Boolean)
    .join("\n");
  return scoped ? <style>{scoped}</style> : null;
}

function SectionFontOverride({ sectionId, settings }: { sectionId: string; settings: any }) {
  const heading = settings?.headingFontOverride;
  const body = settings?.bodyFontOverride;
  if (!heading && !body) return null;
  let css = "";
  if (body) css += `[data-section-id="${sectionId}"]{font-family:'${body}',sans-serif;}`;
  if (heading)
    css += `[data-section-id="${sectionId}"] h1,[data-section-id="${sectionId}"] h2,[data-section-id="${sectionId}"] h3,[data-section-id="${sectionId}"] h4{font-family:'${heading}',sans-serif;}`;
  return (
    <>
      {heading && <GoogleFontLoader font={heading} />}
      {body && <GoogleFontLoader font={body} />}
      <style>{css}</style>
    </>
  );
}

/** Entrance animation wrapper driven by section.settings.animation. */
function SectionReveal({ animation, enableAnimations, children }: any) {
  const mode = animation || (enableAnimations ? "" : "none");
  if (mode === "none" || mode === "" || prefersReducedMotion()) return children;
  const initials: Record<string, any> = {
    "fade-up": { opacity: 0, y: 36 },
    fade: { opacity: 0 },
    "slide-left": { opacity: 0, x: 60 },
    "slide-right": { opacity: 0, x: -60 },
    zoom: { opacity: 0, scale: 0.92 },
  };
  const initial = initials[mode];
  if (!initial) return children;
  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.215, 0.61, 0.355, 1] }}
    >
      {children}
    </motion.div>
  );
}

export type SectionListProps = {
  sections?: any[];
  colorSchemes?: any[];
  books?: any[];
  onCtaClick?: () => void;
  onProductClick?: (book: any) => void;
  enableAnimations?: boolean;
  /** Value for the `data-section` attribute (used by the editor's click-to-edit). */
  dataSection?: string;
};

/**
 * Renders an ordered list of theme sections. Pure (no router/data hooks) so it
 * can be used on any surface. Returns null when there is nothing to render.
 */
export function SectionList({
  sections,
  colorSchemes,
  books = [],
  onCtaClick,
  onProductClick,
  enableAnimations = true,
  dataSection = "homepage",
}: SectionListProps) {
  const list = (sections || []).filter((section: any) => section.visible !== false && sectionInWindow(section));
  if (list.length === 0) return null;
  const schemes: any[] = colorSchemes && colorSchemes.length > 0 ? colorSchemes : DEFAULT_COLOR_SCHEMES;

  return (
    <div className="flex flex-col">
      {list.map((section: any) => {
        const SectionComponent = (Sections as any)[section.type];
        if (!SectionComponent) return null;

        const s = section.settings || {};
        const scheme = s.colorSchemeId ? schemes.find((sc: any) => sc.id === s.colorSchemeId) : null;
        const wrapperCls =
          [
            "relative",
            s.fullWidth ? "w-full" : "",
            s.hideOnMobile ? "hidden md:block" : "",
            s.hideOnDesktop ? "block md:hidden" : "",
            s.customClass || "",
          ]
            .filter(Boolean)
            .join(" ") || undefined;

        return (
          <div
            key={section.id}
            id={`section-${section.id}`}
            data-section={dataSection}
            data-section-id={section.id}
            data-fm-section={section.id}
            className={wrapperCls}
            style={{
              paddingTop: s.paddingTop != null ? `${s.paddingTop}px` : undefined,
              paddingBottom: s.paddingBottom != null ? `${s.paddingBottom}px` : undefined,
              background: scheme?.background || s.sectionBackground || undefined,
              color: scheme?.text || undefined,
              ...(s.lineColor && { "--border-rgb": hexToRgbTriplet(s.lineColor) }),
              ...(s.boxColor && { "--surface": s.boxColor, "--surface-rgb": hexToRgbTriplet(s.boxColor, "10 10 10") }),
              ...(s.raisedBoxColor && { "--surface-2": s.raisedBoxColor, "--surface-2-rgb": hexToRgbTriplet(s.raisedBoxColor, "23 23 23") }),
            }}
          >
            <SectionFontOverride sectionId={section.id} settings={s} />
            <SectionScopedCss sectionId={section.id} css={s.customCss} />
            <SectionReveal animation={s.animation} enableAnimations={enableAnimations}>
              <SectionComponent
                settings={s}
                books={books}
                onCtaClick={onCtaClick}
                onProductClick={onProductClick}
                enableAnimations={enableAnimations}
              />
            </SectionReveal>
          </div>
        );
      })}
    </div>
  );
}

const slugify = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Default product-click handler used by standalone pages: navigate to the book. */
function useDefaultSectionHandlers() {
  const navigate = useNavigate();
  return {
    onCtaClick: () => navigate("/"),
    onProductClick: (book: any) => navigate(`/books/${book?.slug || slugify(book?.title)}`),
  };
}

/**
 * Renders the sections authored for a specific page-type template
 * (`design[templateId].sections`, e.g. productPage / collectionPage / page /
 * cartPage / storefront). Safe to drop into any standalone page — renders
 * nothing if that template has no sections.
 */
export function TemplateSections({
  design,
  templateId,
  books = [],
  enableAnimations,
}: {
  design: any;
  templateId: string;
  books?: any[];
  enableAnimations?: boolean;
}) {
  const handlers = useDefaultSectionHandlers();
  const surface = (design && design[templateId]) || {};
  const sections: any[] = surface.sections || [];
  if (sections.length === 0) return null;
  const colorSchemes =
    surface.colorSchemes && surface.colorSchemes.length > 0 ? surface.colorSchemes : design?.colorSchemes;
  return (
    <SectionList
      sections={sections}
      colorSchemes={colorSchemes}
      books={books}
      onCtaClick={handlers.onCtaClick}
      onProductClick={handlers.onProductClick}
      enableAnimations={enableAnimations ?? (design?.enableAnimations ?? true)}
      dataSection={templateId}
    />
  );
}

/**
 * Global sections render on every page (above the footer). Reads the flat
 * `design.globalSections` array. `onCtaClick`/`onProductClick` are optional —
 * standalone pages can omit them to get sensible router-based defaults.
 */
export function GlobalSections({
  design,
  books = [],
  onCtaClick,
  onProductClick,
}: {
  design: any;
  books?: any[];
  onCtaClick?: () => void;
  onProductClick?: (book: any) => void;
}) {
  const handlers = useDefaultSectionHandlers();
  const sections: any[] = design?.globalSections || [];
  if (sections.length === 0) return null;
  return (
    <SectionList
      sections={sections}
      colorSchemes={design?.colorSchemes}
      books={books}
      onCtaClick={onCtaClick || handlers.onCtaClick}
      onProductClick={onProductClick || handlers.onProductClick}
      enableAnimations={false}
      dataSection="globalSections"
    />
  );
}
