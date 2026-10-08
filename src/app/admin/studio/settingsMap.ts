// How Studio presents its (very many) controls to a shop owner — a pure, UI-free map.
//
// Nothing here adds or removes a control: it only decides WHERE each existing Theme setting and
// Text & labels group appears (task-based headings, sub-sections inside big groups) and which values
// differ from the defaults ("changed" badges, "What I've changed", Reset to default). Every
// STYLE_GROUPS / COPY_SCHEMA group must sit under exactly one heading (settingsMap.test.ts), and any
// field not listed in a sub-section still shows under "More settings", so editing power is unchanged.

import { REGION_GROUPS } from "../../features/site/storefrontRegions";
import { readStyle, type StyleField, type StyleGroup } from "./styleSchema";

/** Studio-only categories that are not STYLE_GROUPS (they have bespoke panels in StudioEditor). */
export const EXTRA_STYLE_CATEGORIES: Record<string, { title: string; blurb: string }> = {
  themeLook: { title: "Theme presets & saved themes", blurb: "One-click looks, the Riso Noir style, and designs you've saved or downloaded." },
  paymentIcons: { title: "Payment icons", blurb: "Which card and wallet logos the footer shows." },
};

export type SettingsHeading = { id: string; title: string; blurb: string; groups: string[]; advanced?: boolean };

const REGION_IDS = REGION_GROUPS.map((g) => g.id);

/** Theme settings home, in the order an owner usually needs them. */
export const THEME_HEADINGS: SettingsHeading[] = [
  { id: "look", title: "Overall look", blurb: "Start here: colours, fonts and buttons used on every page.",
    groups: ["themeLook", "colors", "type", "buttons", "logo", "riso", "effects"] },
  { id: "chrome", title: "Header, menu & footer", blurb: "The parts that repeat at the top and bottom of every page.",
    groups: ["header", "navlinks", "footer", "paymentIcons"] },
  { id: "shop", title: "Shop & book pages", blurb: "The book grid, book cards and each book's own page.",
    groups: ["products", "catalog", "labels", "productPage", "productCard", "catalogLayout"] },
  { id: "buy", title: "Bag, checkout & accounts", blurb: "Everything after a shopper presses Add to bag.",
    groups: ["cartDrawer", "checkout", "accounts"] },
  { id: "pages", title: "Pages & small details", blurb: "Custom pages (About, Journal…), page width, tiny labels and on/off switches.",
    groups: ["customPages", "layout", "smallPrint", "elements"] },
  { id: "elements", title: "Fine-tune single elements", advanced: true,
    blurb: "Spacing, size, borders and visibility for one element at a time, per screen size. Quicker: click the element in the preview.",
    groups: [...REGION_IDS, "code"] },
];

/** One plain-English line under each category name (falls back to the group's own hint). */
export const GROUP_BLURBS: Record<string, string> = {
  colors: "Page background, text, accent and status colours.",
  type: "Heading, body and menu fonts, sizes and weights.",
  buttons: "Button style, colours and corners.",
  logo: "Logo image or text wordmark, and the picture shown when your shop is shared.",
  riso: "The printed-paper texture and ink effects of the Riso look.",
  effects: "Animations, hover effects and section spacing.",
  header: "Header layout and colours, the announcement bar, and which icons show.",
  navlinks: "Size, colour and spacing of menu links, and the drop-down menus.",
  footer: "Footer layout, social links and what the footer shows.",
  products: "Book cards in the shop grid: columns, photos, title, price and badges.",
  catalog: "The heading, category chips and search above the book grid.",
  labels: "Sale, sold-out and other little labels on books.",
  productPage: "Each book's page: photo layout, add-to-bag button and extras.",
  productCard: "The bordered buy box, breadcrumb and Description / Details tabs.",
  catalogLayout: "Masthead, cover cropping and nav spacing of the shop page.",
  cartDrawer: "The bag that slides in: size, colours, book rows and checkout button.",
  checkout: "Checkout colours, fonts, fields and what the order summary shows.",
  accounts: "Turn customer accounts on or off.",
  customPages: "One look for every custom page: title, text, width and the line under the title.",
  layout: "How wide your content is and the space around it.",
  smallPrint: "The tiny labels and captions everywhere, all at once.",
  elements: "Switch whole storefront features on or off.",
  code: "Your own CSS or scripts (public pages only).",
};

export const blurbFor = (group: StyleGroup | undefined, id: string): string =>
  EXTRA_STYLE_CATEGORIES[id]?.blurb ?? GROUP_BLURBS[id] ?? group?.hint ?? "";

/**
 * Sub-sections inside the bigger categories, so 20–45 controls read as a few short lists.
 * Keys not listed land in a final "More settings" sub-section — nothing can disappear.
 */
export const STYLE_SUBSECTIONS: Record<string, { title: string; keys: string[] }[]> = {
  colors: [
    { title: "Main colours", keys: ["backgroundColor", "textColor", "primaryColor", "secondaryColor", "borderColor", "mutedTextColor"] },
    { title: "Panels, links & overlays", keys: ["surfaceColor", "surfaceRaisedColor", "overlayColor", "activeControlBg", "activeControlText", "linkColorHover"] },
    { title: "Status colours", keys: ["successColor", "warningColor", "dangerColor", "favoriteColor"] },
  ],
  type: [
    { title: "Fonts", keys: ["headingFont", "bodyFont", "navFont", "wordmarkFont", "font"] },
    { title: "Sizes & weights", keys: ["baseFontSize", "lineHeight", "headingWeight", "bodyWeight", "letterSpacing"] },
  ],
  logo: [
    { title: "Logo image", keys: ["logoUrl", "logoTint", "logoColor", "shareImageUrl"] },
    { title: "Text wordmark", keys: ["logoText", "wordmarkStyle", "wordmarkPrimary", "wordmarkSecondary", "wordmarkSecondaryMuted", "wordmarkSecondaryColor", "wordmarkSize", "wordmarkWeight"] },
  ],
  header: [
    { title: "Header layout", keys: ["headerStyle", "logoPosition", "logoHeight", "stickyHeader", "transparentHeader", "navStyle", "showMobileNavigation", "showSecondaryNavigation"] },
    { title: "Header colours", keys: ["headerBg", "headerColor"] },
    { title: "Announcement bar", keys: ["showAnnouncement", "announcementText", "announcementBg", "announcementColor", "announcementScrolling", "announcementFontSize", "announcementWeight", "announcementTracking", "announcementSpeed"] },
    { title: "Icons & buttons in the header", keys: ["hideHeaderSearch", "hideHeaderWishlist", "hideHeaderAccount", "hideCurrencySelector", "hideThemeToggle", "hideAdminLink", "hideCartButton"] },
  ],
  navlinks: [
    { title: "Link look", keys: ["navLinkColor", "navLinkSize", "navLinkWeight", "navLinkSpacing", "navLinkTransform", "navLinkOpacity"] },
    { title: "Placement & fitting on one line", keys: ["navPlacement", "navGap", "navLineMode", "navFitMin"] },
    { title: "Drop-down menus", keys: ["navFlatSubcategories", "navDropdownHideAll", "navDropdownBg", "navDropdownTextColor", "navDropdownBorderColor", "navDropdownBorderWidth", "navDropdownTransform"] },
    { title: "Sticker pills", keys: ["navPillRadius", "navPillRotate", "navPillActivePalette"] },
  ],
  footer: [
    { title: "Footer layout", keys: ["footerNavigationLayout", "footerColumns", "footerLayout", "footerBg"] },
    { title: "What the footer shows", keys: ["showFooterExplore", "showFooterConnect", "showFooterLegalHeading", "showFooterLocation", "hideNewsletter", "hideRecentlyViewed", "showSocialInFooter", "showPaymentBadges", "showPoweredBy"] },
    { title: "Social links", keys: ["social.instagram", "social.twitter", "social.facebook", "social.tiktok"] },
  ],
  products: [
    { title: "Grid & columns", keys: ["productCardStyle", "productColumnsDesktop", "productColumnsMobile", "catalogGridGap", "productHoverEffect"] },
    { title: "Book photos", keys: ["imageAspectRatio", "photoOutline", "productBorderRadius", "placeholderImageUrl"] },
    { title: "Title & price", keys: ["productTitleColor", "cardTitleSize", "cardTitleSizeMobile", "cardTitleWeight", "cardTitleFont", "cardTitleTracking", "productPriceColor", "cardPriceSize", "cardPriceSizeMobile", "cardPriceWeight", "cardPriceFont", "cardPriceTagBg", "cardPriceOldColor", "catalogPriceStyle", "catalogCardRuleWidth", "showPriceOnHover"] },
    { title: "Badges & stock", keys: ["showSoldOutBadge", "badgeBgPrimary", "badgeTextPrimary", "badgeBgSecondary", "badgeTextSecondary", "lowInventoryColor", "lowStockCardThreshold", "showCollectionMeta"] },
    { title: "Card button & product-page extras", keys: ["productCTA", "showQtyStepper", "productDescriptionStyle"] },
  ],
  productPage: [
    { title: "Page layout", keys: ["productImageLayout", "productContentPosition", "productAlignment", "productDetailsLayout"] },
    { title: "Photos", keys: ["productImageMaxWidth", "productImageAspect", "productPhotoOutline", "productImageFit", "productImageShadow", "productImageHoverScale", "showZoom", "showAmbientGlow", "glowIntensity", "productImageGlowColor"] },
    { title: "Title & add-to-bag button", keys: ["productTitleSize", "productSubtitleWeight", "addToBagLabel", "productCtaWidth", "productCtaSize", "productCtaAnimation"] },
    { title: "Extras on the page", keys: ["showSpecs", "showPdpEditionDetails", "showSocialShare", "showBackInStock", "showBundleWidget", "productBundleLayout", "showRelatedProducts", "recentlyViewedCount", "lowStockProductThreshold"] },
  ],
  productCard: [
    { title: "Buy card box", keys: ["pdpCardBg", "pdpCardBorderColor", "pdpCardBorderWidth", "pdpCardShadowColor", "pdpCardShadowOffset", "pdpCardPadding", "pdpCardDividerColor"] },
    { title: "Title, price & stock", keys: ["pdpShowTag", "pdpTagStyle", "pdpTitleFont", "pdpTitleSize", "pdpTitleSizeMobile", "pdpTitleColor", "pdpTitleCase", "pdpPriceFont", "pdpPriceSize", "pdpPriceSizeMobile", "pdpPriceColor", "pdpShowStock", "pdpStockColor"] },
    { title: "Photo frame & thumbnails", keys: ["pdpThumbPosition", "pdpThumbActiveColor", "pdpPhotoBorderColor", "pdpPhotoBorderWidth", "pdpShowCaption"] },
    { title: "Description / Details tabs", keys: ["pdpDetailsPlacement", "pdpSpecsStyle", "pdpTabActiveBg", "pdpTabActiveText", "pdpPanelBorderColor"] },
    { title: "Breadcrumb & small labels", keys: ["pdpShowBackLink", "pdpShowBreadcrumb", "pdpMetaFont", "pdpMetaSize", "pdpMetaColor"] },
  ],
  catalogLayout: [
    { title: "Masthead", keys: ["catalogLayoutStyle", "catalogMastheadText", "brandTransform", "catalogMastheadDesktop", "catalogMastheadMobile", "catalogHeaderWidth", "catalogHeaderRuleWidth"] },
    { title: "Navigation & cart button", keys: ["catalogNavGapDesktop", "catalogNavGapMobile", "referenceCategoryLimit", "catalogCartPlacement", "catalogCartTotalPlaceholder"] },
    { title: "Book covers", keys: ["catalogTitleTransform", "catalogImageFit", "catalogImageFocalX", "catalogImageFocalY"] },
  ],
  cartDrawer: [
    { title: "Size & position", keys: ["cartDrawerSide", "cartDrawerWidth", "cartDrawerPadding"] },
    { title: "Colours & outline", keys: ["cartDrawerBg", "cartDrawerText", "cartDrawerMuted", "cartDrawerSurface", "cartDrawerBorder", "cartDrawerEdgeColor", "cartDrawerEdgeWidth", "cartDrawerShadowColor", "cartDrawerShadowOffset", "cartDrawerBackdropColor", "cartDrawerBackdropBlur"] },
    { title: "Heading & fonts", keys: ["cartDrawerTitleFont", "cartDrawerTitleSize", "cartDrawerTitleCase", "cartDrawerMetaFont", "cartDrawerMetaSize", "cartDrawerShowCount"] },
    { title: "Free-shipping bar", keys: ["showFreeShipBar", "freeShipThreshold", "cartDrawerProgressColor", "cartDrawerProgressTrack", "cartDrawerProgressHeight"] },
    { title: "Book rows", keys: ["cartDrawerShowItemNumbers", "cartDrawerThumbWidth", "cartDrawerThumbOutline", "cartDrawerGrayscaleThumbs", "cartDrawerItemTitleSize", "cartDrawerShowUnitPrice", "cartDrawerShowLineTotal", "cartDrawerQtyStyle", "cartDrawerRemoveStyle"] },
    { title: "Suggestion card", keys: ["cartDrawerShowUpsell", "cartDrawerUpsellShadow"] },
    { title: "Total & checkout button", keys: ["cartDrawerShowSummary", "cartDrawerShowShippingPreview", "cartDrawerTotalSize", "showCartTrustBadges", "cartDrawerCheckoutBg", "cartDrawerCheckoutText", "cartDrawerCheckoutHeight", "cartDrawerCheckoutShadow", "cartDrawerShowCheckoutArrow", "cartDrawerShowDeliveryNote"] },
  ],
  checkout: [
    { title: "What shoppers see", keys: ["showOrderNote", "hideCheckoutAddressUnit", "hideCheckoutPaymentTotal", "hideCheckoutExpressWallets", "hideAddressSuggestions", "checkoutPinnedCountries", "hideCountryFlags", "checkoutSummaryOpenOnPhones", "hidePayButtonTotal", "alwaysShowDiscountBox", "hideCheckoutFreeShipNudge", "hideCheckoutLowStock", "hideCheckoutPolicyLinks"] },
    { title: "Colours", keys: ["checkoutAccentColor", "checkoutBgColor"] },
    { title: "Fonts & form fields", keys: ["checkoutHeadingFont", "checkoutFont", "checkoutFieldFont", "checkoutFieldBg", "checkoutFieldText", "checkoutFieldBorder", "checkoutInputRadius"] },
    { title: "Card payment form", keys: ["stripeFormBg", "stripeFormPadding"] },
  ],
  customPages: [
    { title: "What custom pages show", keys: ["showPageFooter", "showNotFoundMessage", "showNotFoundBack", "pageShowEyebrow"] },
    { title: "Page title", keys: ["pageTitleSize", "pageTitleUppercase", "pageTitleColor", "pageTitleFont", "pageTitleSizePx", "pageTitleSizePxMobile", "pageTitleWeight", "pageTopSpacing"] },
    { title: "Text & column", keys: ["pageChromeStyle", "pageBodySize", "pageTextColor", "pageAlign", "pageWidth", "pageTextMeasure"] },
    { title: "Line under the title", keys: ["pageShowRule", "pageRuleColor", "pageRuleWidth", "pageRuleSpacing"] },
  ],
};

export const MORE_SETTINGS = "More settings";

/** A group's fields split into its sub-sections (unlisted fields → "More settings"); one section when unmapped. */
export function subsectionsFor(group: StyleGroup): { title: string; fields: StyleField[] }[] {
  const map = STYLE_SUBSECTIONS[group.id];
  if (!map) return [{ title: "", fields: group.fields }];
  const byKey = new Map(group.fields.map((f) => [f.key, f]));
  const used = new Set<string>();
  const out = map.map((s) => ({
    title: s.title,
    fields: s.keys.flatMap((k) => { const f = byKey.get(k); if (!f) return []; used.add(k); return [f]; }),
  })).filter((s) => s.fields.length);
  const rest = group.fields.filter((f) => !used.has(f.key));
  if (rest.length) out.push({ title: MORE_SETTINGS, fields: rest });
  return out;
}

// ── "Changed from default" ────────────────────────────────────────────────

const same = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The value Reset to default restores: the site's default design, else nothing (= storefront default). */
export const defaultFor = (field: StyleField, defaults: any) => readStyle(defaults, field.key);

/** True when the owner (or a theme preset) set this control to something other than its default. */
export function isChanged(field: StyleField, design: any, defaults: any): boolean {
  const value = readStyle(design, field.key);
  if (value === undefined || value === null) return false;
  const base = defaultFor(field, defaults) ?? field.defaultValue;
  if (value === "" && (base === undefined || base === null || base === "")) return false;
  return !same(value, base);
}

export function changedFields(group: StyleGroup, design: any, defaults: any): StyleField[] {
  return group.fields.filter((f) => isChanged(f, design, defaults));
}

/** Changed-field counts for every category, plus the total (for badges and "What I've changed"). */
export function changedCounts(groups: StyleGroup[], design: any, defaults: any): { byGroup: Record<string, number>; total: number } {
  const byGroup: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    const n = changedFields(g, design, defaults).length;
    if (n) { byGroup[g.id] = n; total += n; }
  }
  return { byGroup, total };
}

// ── Text & labels ─────────────────────────────────────────────────────────

export const TEXT_HEADINGS: { id: string; title: string; groups: string[] }[] = [
  { id: "everywhere", title: "Across the whole shop", groups: ["Site & sharing", "Header", "Footer", "Newsletter", "Cookie banner", "Sections"] },
  { id: "shop", title: "Shop & book pages", groups: ["Catalog & empty states", "Collection & wishlist pages", "Search & filters", "Product page", "Reviews"] },
  { id: "buy", title: "Bag, checkout & accounts", groups: ["Cart", "Checkout", "Order tracking", "Customer account"] },
  { id: "special", title: "Special pages & messages", groups: ["Custom pages & 404", "Loading screen", "Under construction", "Maintenance page"] },
];

export const TEXT_BLURBS: Record<string, string> = {
  "Site & sharing": "Your shop name, default page title and description for search and sharing.",
  Header: "Menu words, the phone menu button and header labels.",
  Footer: "Footer headings, policy links and small print.",
  Newsletter: "The email sign-up box.",
  "Cookie banner": "The cookie consent message and its buttons.",
  Sections: "Fallback words used inside page sections.",
  "Catalog & empty states": "Shop heading and the message when nothing matches.",
  "Collection & wishlist pages": "Category pages and the saved-books page.",
  "Search & filters": "The search box, filter and sort words.",
  "Product page": "Add to bag, stock lines, tabs and other book-page words.",
  Reviews: "Review form, ratings and moderation messages.",
  Cart: "The bag: heading, totals, buttons and empty-bag message.",
  Checkout: "Every checkout step, field, error and the payment area.",
  "Order tracking": "The order-tracking page and its status messages.",
  "Customer account": "Sign-in, account pages and their messages.",
  "Custom pages & 404": "Missing-page message and custom-page helper words.",
  "Loading screen": "Words on the loading splash.",
  "Under construction": "The 'coming soon' page.",
  "Maintenance page": "The page shown while the shop is paused.",
};

/** Labels the owner rewrote (including deliberately blank ones). */
export function changedCopyCount(fields: { key: string }[], design: any): number {
  return fields.filter((f) => typeof design?.copy?.[f.key] === "string").length;
}
