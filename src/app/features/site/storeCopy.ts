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
      { key: "footerWordmark", label: "Footer wordmark (single-line style)", default: "LYRICALMYRICAL BOOKS" },
      { key: "footerLinkAbout", label: "Link: About", default: "About" },
      { key: "footerLinkShop", label: "Link: Shop", default: "Shop" },
      { key: "footerLinkTrack", label: "Link: Track order", default: "Track Order" },
      { key: "footerLinkInstagram", label: "Link: Instagram", default: "Instagram" },
      { key: "footerLinkContact", label: "Link: Contact", default: "Contact" },
      { key: "footerLegalHeading", label: "Legal heading", default: "Legal" },
      { key: "footerLocationHeading", label: "Location heading (4-column footer)", default: "Location" },
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
      { key: "addToBagLabel", label: "Add to bag button", default: "ADD TO BAG" },
      { key: "productDescriptionLabel", label: "Designed description eyebrow", default: "ABOUT THIS EDITION" },
    ],
  },
  {
    group: "Catalog & empty states",
    fields: [
      { key: "catalogEmpty", label: "No results message", default: "No publications match these filters." },
    ],
  },
  {
    group: "Custom pages & 404",
    fields: [
      { key: "pageLoading", label: "Page loading text", default: "Loading…" },
      { key: "pageEyebrow", label: "Page eyebrow", default: "Page" },
      { key: "pageHomeLink", label: "Header 'home' link", default: "HOME" },
      { key: "notFoundCode", label: "404 number", default: "404" },
      { key: "notFoundTitle", label: "404 message", default: "Page not found" },
      { key: "notFoundBack", label: "404 back link", default: "BACK TO HOME" },
    ],
  },
  {
    group: "Loading screen",
    fields: [
      { key: "loadingAria", label: "Accessible label", default: "Loading Lyricalmyrical Books" },
      { key: "loadingTag", label: "Sticker tag", default: "Toronto · Est. independently" },
      { key: "loadingWordmarkA", label: "Wordmark (first part)", default: "Lyrical" },
      { key: "loadingWordmarkB", label: "Wordmark (accent part)", default: "myrical" },
      { key: "loadingSub", label: "Subline", default: "Books / printed matter" },
      { key: "loadingStatus", label: "Status text", default: "Pulling the first print" },
    ],
  },
  {
    group: "Cookie banner",
    fields: [
      { key: "cookieAria", label: "Accessible label", default: "Cookie consent" },
      { key: "cookieTag", label: "Sticker tag", default: "Your privacy" },
      { key: "cookieHeading", label: "Heading (first part)", default: "Cookies," },
      { key: "cookieHeadingAccent", label: "Heading (accent part)", default: "your call." },
      {
        key: "cookieBody", label: "Description", multiline: true,
        default: "We use cookies to keep the site running, measure traffic, and improve your experience. You can choose which categories to allow.",
      },
      { key: "cookieNecessary", label: "Necessary — label", default: "Necessary" },
      { key: "cookieNecessaryText", label: "Necessary — description", default: "required for the cart and checkout to work." },
      { key: "cookieAnalytics", label: "Analytics — label", default: "Analytics" },
      { key: "cookieAnalyticsText", label: "Analytics — description", default: "anonymous usage statistics so we can improve the site." },
      { key: "cookieMarketing", label: "Marketing — label", default: "Marketing" },
      { key: "cookieMarketingText", label: "Marketing — description", default: "personalized content and abandoned-cart reminders." },
      { key: "cookieAcceptAll", label: "Accept button", default: "Accept all" },
      { key: "cookieReject", label: "Reject button", default: "Reject" },
      { key: "cookieSave", label: "Save button", default: "Save choices" },
      { key: "cookieCustomize", label: "Customize link", default: "Customize" },
    ],
  },
  {
    group: "Maintenance page",
    fields: [
      { key: "maintenanceTag", label: "Sticker tag", default: "Back soon" },
      { key: "maintenanceTitle", label: "Heading", default: "Under maintenance" },
      { key: "maintenanceMessage", label: "Default message (if none set in Settings)", default: "We are updating our archive. Please check back soon.", multiline: true },
      { key: "maintenanceFooter", label: "Footer line", default: "Lyricalmyrical Books · Toronto" },
      { key: "maintenanceAdmin", label: "Admin link label", default: "Admin console" },
    ],
  },
  {
    group: "Header & About panel",
    fields: [
      { key: "navAbout", label: "Nav: About", default: "About" },
      { key: "navSearch", label: "Nav: Search", default: "Search" },
      { key: "navAdmin", label: "Nav: Admin (debug only)", default: "Admin" },
      { key: "ariaSearch", label: "Search icon — screen-reader label", default: "Search" },
      { key: "ariaWishlist", label: "Wishlist icon — screen-reader label", default: "Wishlist" },
      { key: "ariaAccount", label: "Account icon — screen-reader label", default: "Account" },
      { key: "ariaCart", label: "Cart icon — screen-reader label", default: "Open cart" },
      { key: "ariaPrevSlide", label: "Previous slide — screen-reader label", default: "Previous slide" },
      { key: "ariaNextSlide", label: "Next slide — screen-reader label", default: "Next slide" },
      { key: "poweredBy", label: "Powered-by line", default: "Powered by Lyricalmyrical" },
      { key: "aboutTitle", label: "About panel title", default: "Information" },
      { key: "aboutCloseAria", label: "About panel close — screen-reader label", default: "Close information" },
      { key: "aboutIntro", label: "About panel intro (if none in Settings)", multiline: true, default: "An independent publishing house based in Toronto, Canada. We specialize in contemporary photography and fine art books — curating rare editions, limited ephemera, and a growing archive of visual culture." },
      { key: "aboutMissionHeading", label: "Mission heading", default: "Our Mission" },
      { key: "aboutMission", label: "Mission text", multiline: true, default: "We believe photography is literature. Each book in our archive is a document — a record of vision, place, and time. We publish work that endures." },
      { key: "aboutContactHeading", label: "Contact heading", default: "Contact" },
      { key: "aboutFollowHeading", label: "Follow heading", default: "Follow" },
      { key: "aboutShopAll", label: "Shop-all link", default: "SHOP ALL" },
      { key: "aboutShippingNote", label: "Shipping note", default: "Shipping Policy available" },
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
