// Declarative list of every site-wide style control in Studio › Style.
// Fields use the same shape as section fields, so they render through the
// shared SectionFieldEditor. Keys may be dotted paths (e.g. "social.instagram").

export type StyleField =
  | { key: string; label: string; kind: "text" | "textarea" | "color" | "toggle" | "image" | "html" }
  | { key: string; label: string; kind: "range" | "number"; min: number; max: number; step?: number; suffix?: string }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] };

export type StyleGroup = { id: string; title: string; hint?: string; fields: StyleField[] };

const opts = (...v: string[]) => v.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));
const weights = ["300", "400", "500", "600", "700", "800", "900"].map((w) => ({ value: w, label: w }));

export const STYLE_GROUPS: StyleGroup[] = [
  {
    id: "colors",
    title: "Colors",
    hint: "Site-wide palette. Applies to every page.",
    fields: [
      { key: "backgroundColor", label: "Page background", kind: "color" },
      { key: "textColor", label: "Text", kind: "color" },
      { key: "primaryColor", label: "Accent", kind: "color" },
      { key: "linkColorHover", label: "Link hover", kind: "color" },
      { key: "borderColor", label: "Borders & lines", kind: "color" },
    ],
  },
  {
    id: "buttons",
    title: "Buttons",
    fields: [
      { key: "buttonStyle", label: "Style", kind: "select", options: opts("solid", "outline", "soft") },
      { key: "buttonColor", label: "Background", kind: "color" },
      { key: "buttonTextColor", label: "Text", kind: "color" },
      { key: "buttonHoverBgColor", label: "Hover background", kind: "color" },
      { key: "buttonHoverTextColor", label: "Hover text", kind: "color" },
      { key: "buttonRadius", label: "Corner radius", kind: "range", min: 0, max: 999, step: 1, suffix: "px" },
      { key: "buttonUppercase", label: "UPPERCASE labels", kind: "toggle" },
      { key: "buttonShadow", label: "Drop shadow", kind: "toggle" },
    ],
  },
  {
    id: "type",
    title: "Typography",
    fields: [
      { key: "headingFont", label: "Heading font (Google Fonts name)", kind: "text" },
      { key: "bodyFont", label: "Body font (Google Fonts name)", kind: "text" },
      { key: "baseFontSize", label: "Base text size", kind: "range", min: 12, max: 22, step: 1, suffix: "px" },
      { key: "lineHeight", label: "Line height", kind: "range", min: 1, max: 2.4, step: 0.05 },
      { key: "headingWeight", label: "Heading weight", kind: "select", options: weights },
      { key: "bodyWeight", label: "Body weight", kind: "select", options: weights },
      { key: "letterSpacing", label: "Letter spacing", kind: "select", options: opts("normal", "wide", "ultra") },
    ],
  },
  {
    id: "layout",
    title: "Layout & spacing",
    fields: [
      { key: "containerWidth", label: "Content width", kind: "range", min: 800, max: 1800, step: 20, suffix: "px" },
      { key: "sectionSpacing", label: "Space between sections", kind: "range", min: 0, max: 160, step: 4, suffix: "px" },
      { key: "cardRadius", label: "Card corner radius", kind: "range", min: 0, max: 40, step: 1, suffix: "px" },
    ],
  },
  {
    id: "products",
    title: "Product cards & grid",
    fields: [
      { key: "productCardStyle", label: "Card style", kind: "select", options: opts("card", "minimal", "editorial") },
      { key: "productHoverEffect", label: "Hover effect", kind: "select", options: opts("none", "zoom", "lift") },
      { key: "imageAspectRatio", label: "Image shape", kind: "select", options: ["3:4", "2:3", "4:5", "1:1", "16:9"].map((v) => ({ value: v, label: v })) },
      { key: "productColumnsDesktop", label: "Columns (desktop)", kind: "range", min: 2, max: 6, step: 1 },
      { key: "productColumnsMobile", label: "Columns (phone)", kind: "range", min: 1, max: 3, step: 1 },
      { key: "catalogGridGap", label: "Gap between cards", kind: "range", min: 8, max: 72, step: 2, suffix: "px" },
      { key: "productCTA", label: "Card button text", kind: "text" },
      { key: "showPriceOnHover", label: "Show price only on hover", kind: "toggle" },
      { key: "showSoldOutBadge", label: "Show “sold out” badge", kind: "toggle" },
      { key: "showCollectionMeta", label: "Show collection label on cards", kind: "toggle" },
      { key: "badgeBgPrimary", label: "Badge background", kind: "color" },
      { key: "badgeTextPrimary", label: "Badge text", kind: "color" },
      { key: "badgeBgSecondary", label: "Secondary badge background", kind: "color" },
      { key: "badgeTextSecondary", label: "Secondary badge text", kind: "color" },
      { key: "lowInventoryColor", label: "“Low stock” color", kind: "color" },
    ],
  },
  {
    id: "header",
    title: "Header & announcement bar",
    fields: [
      { key: "headerStyle", label: "Header layout", kind: "select", options: opts("minimal", "centered", "full") },
      { key: "logoPosition", label: "Logo alignment", kind: "select", options: opts("left", "center", "right") },
      { key: "logoHeight", label: "Logo height", kind: "range", min: 12, max: 120, step: 1, suffix: "px" },
      { key: "stickyHeader", label: "Stick header to top", kind: "toggle" },
      { key: "transparentHeader", label: "Transparent header over hero", kind: "toggle" },
      { key: "headerBg", label: "Header background", kind: "color" },
      { key: "headerColor", label: "Header text", kind: "color" },
      { key: "showAnnouncement", label: "Show announcement bar", kind: "toggle" },
      { key: "announcementText", label: "Announcement text", kind: "textarea" },
      { key: "announcementBg", label: "Announcement background", kind: "color" },
      { key: "announcementColor", label: "Announcement text color", kind: "color" },
      { key: "announcementScrolling", label: "Scrolling ticker", kind: "toggle" },
    ],
  },
  {
    id: "footer",
    title: "Footer & social links",
    fields: [
      { key: "footerColumns", label: "Multi-column footer", kind: "toggle" },
      { key: "showSocialInFooter", label: "Show social links", kind: "toggle" },
      { key: "social.instagram", label: "Instagram URL", kind: "text" },
      { key: "social.twitter", label: "X / Twitter URL", kind: "text" },
      { key: "social.facebook", label: "Facebook URL", kind: "text" },
      { key: "social.tiktok", label: "TikTok URL", kind: "text" },
    ],
  },
  {
    id: "logo",
    title: "Logo & wordmark",
    hint: "The name in the header. Upload a logo image, or edit the wordmark text and color.",
    fields: [
      { key: "logoUrl", label: "Logo image (optional)", kind: "image" },
      { key: "logoTint", label: "Recolor logo image with the color below", kind: "toggle" },
      { key: "logoColor", label: "Logo / wordmark color", kind: "color" },
      { key: "logoText", label: "Text logo (when no wordmark / image)", kind: "text" },
      { key: "wordmarkStyle", label: "Wordmark style", kind: "select", options: [{ value: "two-part", label: "Two-part (name + second word)" }, { value: "single", label: "Single text logo" }] },
      { key: "wordmarkPrimary", label: "Wordmark: first word", kind: "text" },
      { key: "wordmarkSecondary", label: "Wordmark: second word", kind: "text" },
      { key: "wordmarkSecondaryMuted", label: "Dim the second word", kind: "toggle" },
      { key: "wordmarkSize", label: "Wordmark size", kind: "range", min: 1, max: 4, step: 0.1, suffix: "rem" },
      { key: "wordmarkWeight", label: "Wordmark weight", kind: "select", options: weights },
    ],
  },
  {
    id: "catalog",
    title: "Catalog page header & filters",
    hint: "The heading, category chips, search bar and result count above the book grid.",
    fields: [
      { key: "catalogHeading", label: "Heading (leave empty to hide)", kind: "text" },
      { key: "showCatalogCount", label: "Show “N titles” count", kind: "toggle" },
      { key: "showCategoryChips", label: "Show category chips", kind: "toggle" },
      { key: "categoryChipShowCounts", label: "Show counts on chips", kind: "toggle" },
      { key: "showCatalogControls", label: "Show search, sort & in-stock bar", kind: "toggle" },
    ],
  },
  {
    id: "riso",
    title: "Riso print treatment",
    hint: "Outlines, offset shadows, focus ring and texture of the Riso Press look.",
    fields: [
      { key: "themeStyle", label: "Print style", kind: "select", options: [{ value: "riso", label: "Riso Press (outlined, flat shadows)" }, { value: "default", label: "Standard" }] },
      { key: "risoOutlineColor", label: "Outline color", kind: "color" },
      { key: "risoOutlineWidth", label: "Outline width", kind: "range", min: 0, max: 6, step: 1, suffix: "px" },
      { key: "risoShadowColor", label: "Offset shadow color", kind: "color" },
      { key: "risoShadowOffset", label: "Offset shadow distance", kind: "range", min: 0, max: 12, step: 1, suffix: "px" },
      { key: "risoCardRadius", label: "Card corner radius", kind: "range", min: 0, max: 24, step: 1, suffix: "px" },
      { key: "focusRingColor", label: "Keyboard focus ring", kind: "color" },
      { key: "risoUppercaseHeadings", label: "UPPERCASE headings", kind: "toggle" },
      { key: "risoGrain", label: "Halftone texture", kind: "range", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "elements",
    title: "Storefront elements",
    hint: "Show or hide whole parts of the public site.",
    fields: [
      { key: "showRecentlyViewed", label: "Recently viewed row (product page)", kind: "toggle" },
      { key: "showBreadcrumbs", label: "Breadcrumbs (collection pages)", kind: "toggle" },
      { key: "showCookieBanner", label: "Cookie banner (keep on where law requires it)", kind: "toggle" },
    ],
  },
  {
    id: "code",
    title: "Custom code (advanced)",
    hint: "Runs on the live storefront. Use with care.",
    fields: [
      { key: "customCss", label: "Custom CSS", kind: "textarea" },
      { key: "customHeadHtml", label: "Extra <head> HTML", kind: "textarea" },
      { key: "customFooterScripts", label: "Footer scripts", kind: "textarea" },
    ],
  },
];

/** Every surface that carries its own copy of the style keys. */
export const STATIC_SURFACES = ["heroPage", "storefront", "productPage", "collectionPage", "cartPage", "page", "page404"];

/**
 * Write a site-wide style value. Storefront pages resolve their own surface
 * object before the root, so the value is written to the root AND every surface;
 * otherwise a previously-customised surface silently ignores the change.
 */
export function applyGlobalStyle(design: any, path: string, value: any, surfaceIds: string[]) {
  const [top, ...rest] = path.split(".");
  const nextTop = (() => {
    if (!rest.length) return value;
    const cur = { ...(design[top] || {}) };
    const leaf = rest.join(".");
    // one level of nesting is all the style schema uses
    if (value === undefined || value === "") delete cur[leaf];
    else cur[leaf] = value;
    return cur;
  })();
  const write = (obj: any) => {
    const o = { ...(obj || {}) };
    if (nextTop === undefined) delete o[top];
    else o[top] = nextTop;
    return o;
  };
  const next = write(design);
  for (const id of surfaceIds) next[id] = write(design[id]);
  return next;
}

/** Read a style value, preferring the root (what the editor writes). */
export function readStyle(design: any, path: string) {
  return path.split(".").reduce((n: any, k) => (n == null ? undefined : n[k]), design);
}
