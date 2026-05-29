// ─────────────────────────────────────────────────────────────────────────────
// Store copy — single source of truth for shopper-facing text.
//
// Every editable string lives here with a sensible default. The storefront reads
// values via getCopy(design, key); the theme editor's "Content & Text" panel
// auto-generates its inputs from COPY_SCHEMA, so adding a new editable string is
// a one-line change in this file (plus a getCopy() call at the render site).
// Values are stored on `design.copy[key]`; empty/missing values fall back to the
// default, so the storefront never renders a blank.
// ─────────────────────────────────────────────────────────────────────────────

export type CopyField = {
  key: string;
  label: string;
  default: string;
  multiline?: boolean;
  /** Hint shown under the field, e.g. available tokens. */
  hint?: string;
};

export type CopyGroup = {
  group: string;
  fields: CopyField[];
};

export const COPY_SCHEMA: CopyGroup[] = [
  {
    group: "Cart",
    fields: [
      { key: "cartTitle", label: "Cart heading", default: "Shopping Bag" },
      { key: "cartEmpty", label: "Empty cart message", default: "The archive is empty." },
      { key: "cartTotalLabel", label: "Total label", default: "Estimated Total" },
      { key: "cartCheckoutButton", label: "Checkout button", default: "PROCEED TO CHECKOUT" },
      {
        key: "cartDeliveryNote",
        label: "Delivery note",
        default: "Estimated delivery 5–7 business days · Taxes calculated at checkout",
        multiline: true,
      },
      { key: "trustSecureLabel", label: "Trust badge 1", default: "Secure" },
      { key: "trustTrackedLabel", label: "Trust badge 2", default: "Tracked" },
      { key: "trustReturnsLabel", label: "Trust badge 3", default: "Returns" },
    ],
  },
  {
    group: "Newsletter",
    fields: [
      { key: "newsletterHeading", label: "Heading", default: "Join the Archive" },
      {
        key: "newsletterText",
        label: "Description",
        default: "New publications, limited editions, and press announcements — delivered quietly.",
        multiline: true,
      },
      { key: "newsletterPlaceholder", label: "Email placeholder", default: "your@email.com" },
      { key: "newsletterButton", label: "Button label", default: "JOIN" },
      { key: "newsletterSuccess", label: "Success message", default: "✓ You're on the list." },
      { key: "newsletterError", label: "Error message", default: "Something went wrong. Try again." },
    ],
  },
  {
    group: "Footer",
    fields: [
      {
        key: "footerAbout",
        label: "About blurb",
        default:
          "An independent publishing house based in Toronto, specializing in contemporary photography and art books.",
        multiline: true,
      },
      { key: "footerNavHeading", label: "Navigation heading", default: "Navigate" },
      { key: "footerLegalHeading", label: "Legal heading", default: "Legal" },
      { key: "footerLocation", label: "Location line", default: "Toronto, Canada" },
      {
        key: "footerCopyright",
        label: "Copyright line",
        default: "© {year} Lyricalmyrical Books · All rights reserved",
        hint: "Use {year} for the current year.",
      },
    ],
  },
  {
    group: "Product page",
    fields: [
      { key: "productTrust1", label: "Trust signal 1", default: "Tracked shipping" },
      { key: "productTrust2", label: "Trust signal 2", default: "14-day returns" },
      { key: "productTrust3", label: "Trust signal 3", default: "Ships in 1–2 days" },
      { key: "relatedHeading", label: "Related products heading", default: "From the Archive" },
      { key: "backToCatalog", label: "Back link label", default: "Back" },
    ],
  },
  {
    group: "Catalog & empty states",
    fields: [
      { key: "catalogEmpty", label: "No results message", default: "No publications match these filters." },
    ],
  },
];

// Flat key → default lookup, derived once from the schema.
export const DEFAULT_COPY: Record<string, string> = COPY_SCHEMA.reduce(
  (acc, g) => {
    for (const f of g.fields) acc[f.key] = f.default;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Resolve a shopper-facing string. Order of precedence:
 *   design.copy[key]  →  design[key] (legacy flat)  →  schema default.
 * Supports {year} token replacement and optional extra vars.
 */
export function getCopy(design: any, key: string, vars?: Record<string, string | number>): string {
  const raw =
    (design?.copy && design.copy[key]) ||
    design?.[key] ||
    DEFAULT_COPY[key] ||
    "";
  const all: Record<string, string | number> = { year: new Date().getFullYear(), ...(vars || {}) };
  return raw.replace(/\{(\w+)\}/g, (m: string, name: string) =>
    name in all ? String(all[name]) : m,
  );
}
