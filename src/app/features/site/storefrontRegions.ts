// One public-region contract shared by Studio's controls and the live CSS layer.
// Defaults stay in the existing layouts; unset controls emit no overrides.
type Region = { id: string; label: string; required?: boolean; grid?: boolean; copy?: string };
type RegionGroup = { id: string; title: string; copy: string; files: string[]; regions: Region[] };
export const REGION_GROUPS: RegionGroup[] = [
  { id: "catalogElements", title: "Catalog & shared content · layout", copy: "Search & filters", files: ["features/site/CatalogControls.tsx", "features/site/RecentlyViewedRow.tsx", "components/MainSite.tsx"], regions: [
    { id: "catalogSearch", label: "Catalog search field" }, { id: "catalogSort", label: "Catalog sort selector" },
    { id: "catalogStock", label: "In-stock filter" }, { id: "catalogResults", label: "Filter result count" },
    { id: "recentGrid", label: "Recently viewed grid", grid: true, copy: "Collection & wishlist pages" },
    { id: "newsletterPanel", label: "Newsletter layout", copy: "Newsletter" },
    { id: "footerPanel", label: "Footer layout", required: true, copy: "Footer" },
  ] },
  { id: "productContent", title: "Product details · content layout", copy: "Product page", files: ["features/site/BookDetail.tsx"], regions: [
    { id: "productDescription", label: "Book description" }, { id: "productSpecs", label: "Book specifications" },
    { id: "productReviews", label: "Book reviews" },
  ] },
  { id: "wishlistLayout", title: "Wishlist · layout & elements", copy: "Collection & wishlist pages", files: ["features/site/Wishlist.tsx"], regions: [
    { id: "wishlistHeader", label: "Wishlist header" }, { id: "wishlistTitle", label: "Wishlist title" },
    { id: "wishlistCount", label: "Saved-book count" }, { id: "wishlistEmpty", label: "Empty wishlist" },
    { id: "wishlistGrid", label: "Saved-book grid", grid: true }, { id: "wishlistPhoto", label: "Saved-book photo" },
    { id: "wishlistActions", label: "Saved-book actions" },
  ] },
  { id: "accountLayout", title: "Customer account · layout & elements", copy: "Customer account", files: ["features/site/Account.tsx"], regions: [
    { id: "accountLogin", label: "Sign-in panel", required: true }, { id: "accountIntro", label: "Sign-in heading & description" },
    { id: "accountHeader", label: "Account navigation", required: true }, { id: "accountProfile", label: "Customer profile" },
    { id: "accountVitals", label: "Account cards", grid: true }, { id: "accountSaved", label: "Wishlist card" },
    { id: "accountOrders", label: "Order count card" }, { id: "accountAddress", label: "Address card", required: true },
    { id: "accountAddressForm", label: "Address form", required: true }, { id: "accountHistory", label: "Order history", required: true },
    { id: "accountDownloads", label: "Purchased downloads", required: true }, { id: "accountShipment", label: "Shipment information", required: true },
    { id: "accountGlow", label: "Account background glow" },
  ] },
  { id: "trackingLayout", title: "Order tracking · layout & elements", copy: "Order tracking", files: ["features/site/OrderTracking.tsx"], regions: [
    { id: "trackingHeader", label: "Tracking navigation" }, { id: "trackingForm", label: "Order lookup form", required: true },
    { id: "trackingIntro", label: "Lookup heading & description" }, { id: "trackingSummary", label: "Order summary", required: true },
    { id: "trackingTimeline", label: "Fulfillment timeline" }, { id: "trackingShipment", label: "Carrier information", required: true },
    { id: "trackingDownloads", label: "Purchased downloads", required: true }, { id: "trackingItems", label: "Order items & totals", required: true },
    { id: "trackingGlow", label: "Tracking background glow" },
  ] },
  { id: "checkoutLayout", title: "Checkout · layout & elements", copy: "Checkout", files: ["Checkout.tsx"], regions: [
    { id: "checkoutHeader", label: "Checkout header" }, { id: "checkoutProgress", label: "Checkout step labels" },
    { id: "checkoutForm", label: "Checkout form", required: true }, { id: "checkoutSummary", label: "Order summary", required: true },
    { id: "checkoutPromise", label: "Message under Pay button" }, { id: "checkoutSuccess", label: "Order confirmation", required: true },
    { id: "checkoutEmpty", label: "Empty cart", required: true },
  ] },
  { id: "searchLayout", title: "Search · layout & elements", copy: "Search & filters", files: ["features/site/SearchOverlay.tsx"], regions: [
    { id: "searchPanel", label: "Search panel", required: true }, { id: "searchPrompt", label: "Search guidance" },
    { id: "searchEmpty", label: "No search results" }, { id: "searchPhoto", label: "Result cover" },
    { id: "searchAuthor", label: "Result author" },
  ] },
  { id: "reviewsLayout", title: "Reviews · layout & elements", copy: "Reviews", files: ["features/site/ReviewsSection.tsx"], regions: [
    { id: "reviewsHeading", label: "Reviews heading" }, { id: "reviewsList", label: "Published reviews" },
    { id: "reviewsForm", label: "Write a review" }, { id: "reviewsReply", label: "Publisher replies" },
    { id: "reviewsGuidance", label: "Review moderation note" },
  ] },
  { id: "recoveryLayout", title: "404 & error · layout & elements", copy: "Custom pages & 404", files: ["features/site/NotFoundPage.tsx", "components/ErrorBoundary.tsx"], regions: [
    { id: "notFoundPanel", label: "Not-found layout", required: true }, { id: "notFoundCode", label: "Not-found code" },
    { id: "notFoundHeading", label: "Not-found heading" }, { id: "errorPanel", label: "Error layout", required: true },
    { id: "errorHeading", label: "Error heading" },
  ] },
  { id: "overlayLayout", title: "Loading, cookies & construction · layout", copy: "Loading screen", files: ["components/BootSplash.tsx", "components/CookieConsent.tsx", "components/UnderConstructionWall.tsx"], regions: [
    { id: "loadingArtwork", label: "Loading artwork" }, { id: "loadingTag", label: "Loading tag" },
    { id: "loadingWordmark", label: "Loading wordmark" }, { id: "loadingSubtitle", label: "Loading subtitle" },
    { id: "loadingProgress", label: "Loading animation" }, { id: "loadingStatus", label: "Loading status" },
    { id: "cookiePanel", label: "Cookie panel", required: true, copy: "Cookie banner" }, { id: "cookieTag", label: "Cookie tag", copy: "Cookie banner" },
    { id: "cookieHeading", label: "Cookie heading", copy: "Cookie banner" }, { id: "cookieBody", label: "Cookie explanation", required: true, copy: "Cookie banner" },
    { id: "constructionArtwork", label: "Construction background" }, { id: "constructionPanel", label: "Construction panel", required: true },
    { id: "constructionTag", label: "Construction tag" }, { id: "constructionHeading", label: "Construction heading" },
    { id: "constructionBody", label: "Construction explanation" }, { id: "constructionFootnote", label: "Construction footnote" },
  ] },
];

export function regionProps(id: string) {
  const group = REGION_GROUPS.find(g => g.regions.some(r => r.id === id));
  const region = group?.regions.find(r => r.id === id);
  const copy = region?.copy || (id.startsWith("construction") ? "Under construction" : group?.copy);
  return { "data-store-region": id, "data-studio-target": `style:${group?.id}|copy:${copy}`,
    "data-studio-label": region?.label || id };
}

export function regionVisible(design: any, id: string): boolean {
  const region = REGION_GROUPS.flatMap(g => g.regions).find(r => r.id === id);
  return Boolean(region?.required) || design?.regions?.[id + "Visible"] !== false;
}

const numeric = (value: unknown, max: number) => value !== "" && value != null && Number.isFinite(Number(value))
  ? Math.max(0, Math.min(max, Number(value))) : undefined;
const safe = (value: unknown) => typeof value === "string" && !/[;{}<>]/.test(value) ? value : "";

/** CSS targets the same existing DOM elements in the iframe and published storefront. */
export function storefrontRegionCss(design: any): string {
  const values = design?.regions || {};
  return REGION_GROUPS.flatMap(group => group.regions.map(region => {
    const value = (suffix: string) => values[region.id + suffix];
    const selector = `[data-fm-store] [data-store-region="${region.id}"], [data-fm-store][data-store-region="${region.id}"]`;
    const rules: string[] = [];
    const add = (property: string, v: any, unit = "") => { if (v !== undefined && v !== "") rules.push(`${property}:${v}${unit} !important;`); };
    if (!region.required && value("Visible") === false) add("display", "none");
    add("padding", numeric(value("Padding"), 120), "px");
    add("gap", numeric(value("Gap"), 120), "px");
    add("border-radius", numeric(value("Radius"), 120), "px");
    add("max-width", numeric(value("Width"), 2400), "px");
    add("background-color", safe(value("Background")));
    add("border-color", safe(value("Border")));
    if (safe(value("Border"))) { add("border-style", "solid"); add("border-width", "1px"); }
    if (region.grid && numeric(value("Columns"), 6)) add("grid-template-columns", `repeat(${Math.round(numeric(value("Columns"), 6)!)}, minmax(0, 1fr))`);
    let css = rules.length ? `${selector}{${rules.join("")}}` : "";
    const text: string[] = [];
    const size = numeric(value("Size"), 180);
    if (size != null && size > 0) text.push(`font-size:${size}px !important;`);
    if (safe(value("Color"))) text.push(`color:${safe(value("Color"))} !important;`);
    if (safe(value("Font"))) text.push(`font-family:'${safe(value("Font")).replace(/'/g, "")}',sans-serif !important;`);
    if (["300", "400", "500", "600", "700", "800", "900"].includes(String(value("Weight")))) text.push(`font-weight:${value("Weight")} !important;`);
    if (["inherit", "none", "uppercase", "lowercase", "capitalize"].includes(value("Case"))) text.push(`text-transform:${value("Case")} !important;`);
    if (["left", "center", "right"].includes(value("Align"))) text.push(`text-align:${value("Align")} !important;`);
    if (text.length) css += `${selector},[data-fm-store] [data-store-region="${region.id}"] :where(h1,h2,h3,h4,h5,h6,p,span,label,input,textarea,select,button,a,dt,dd,li,code){${text.join("")}}`;
    const phone: string[] = [];
    const padding = numeric(value("MobilePadding"), 120);
    if (padding != null) phone.push(`padding:${padding}px !important;`);
    if (region.grid && numeric(value("MobileColumns"), 6)) phone.push(`grid-template-columns:repeat(${Math.round(numeric(value("MobileColumns"), 6)!)}, minmax(0, 1fr)) !important;`);
    if (phone.length) css += `@media(max-width:639px){${selector}{${phone.join("")}}}`;
    const phoneSize = numeric(value("MobileSize"), 180);
    if (phoneSize && phoneSize > 0) css += `@media(max-width:639px){${selector},[data-fm-store] [data-store-region="${region.id}"] :where(h1,h2,h3,h4,h5,h6,p,span,label,input,textarea,select,button,a,dt,dd,li,code){font-size:${phoneSize}px !important;}}`;
    return css;
  })).join("\n").trim();
}

export function regionFontNames(design: any): string[] {
  return REGION_GROUPS.flatMap(g => g.regions.map(r => safe(design?.regions?.[r.id + "Font"]))).filter(Boolean);
}
