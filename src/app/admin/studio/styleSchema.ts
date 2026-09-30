// Declarative list of every site-wide style control in Studio › Style.
// Fields use the same shape as section fields, so they render through the
// shared SectionFieldEditor. Keys may be dotted paths (e.g. "social.instagram").

import { FONT_SELECT_OPTIONS } from "../../features/site/fonts";

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
      { key: "mutedTextColor", label: "Muted text", kind: "color" },
      { key: "secondaryColor", label: "Second accent (press blue)", kind: "color" },
      { key: "surfaceColor", label: "Panel background", kind: "color" },
      { key: "surfaceRaisedColor", label: "Raised panel background", kind: "color" },
      { key: "overlayColor", label: "Image overlay / scrim", kind: "color" },
      { key: "activeControlBg", label: "Selected tab / chip background", kind: "color" },
      { key: "activeControlText", label: "Selected tab / chip text", kind: "color" },
      { key: "successColor", label: "Success (in stock, added)", kind: "color" },
      { key: "warningColor", label: "Warning", kind: "color" },
      { key: "dangerColor", label: "Error / danger", kind: "color" },
      { key: "favoriteColor", label: "Wishlist heart", kind: "color" },
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
      { key: "headingFont", label: "Heading font (Google Fonts)", kind: "select", options: FONT_SELECT_OPTIONS },
      { key: "bodyFont", label: "Body font (Google Fonts)", kind: "select", options: FONT_SELECT_OPTIONS },
      { key: "navFont", label: "Header & menu font (Google Fonts)", kind: "select", options: [{ value: "", label: "Same as body font" }, ...FONT_SELECT_OPTIONS] },
      { key: "wordmarkFont", label: "Logo wordmark font (Google Fonts)", kind: "select", options: [{ value: "", label: "Same as heading font" }, ...FONT_SELECT_OPTIONS] },
      { key: "font", label: "Theme font (overrides body font — clear it to use Body font)", kind: "text" },
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
    id: "customPages",
    title: "Custom pages",
    hint: "One look for every custom page (About, History, Journal…). A page's Page content section can opt out with its own style.",
    fields: [
      { key: "pageChromeStyle", label: "Page colours", kind: "select", options: [{ value: "theme", label: "Match the storefront" }, { value: "classic", label: "Classic white page" }] },
      { key: "pageShowEyebrow", label: "Show small label above title", kind: "toggle" },
      { key: "pageTitleSize", label: "Title size", kind: "select", options: [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra large" }] },
      { key: "pageTitleUppercase", label: "Uppercase title", kind: "toggle" },
      { key: "pageTitleColor", label: "Title colour", kind: "color" },
      { key: "pageBodySize", label: "Text size", kind: "select", options: [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }] },
      { key: "pageTextColor", label: "Text colour", kind: "color" },
      { key: "pageAlign", label: "Alignment", kind: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
      { key: "pageWidth", label: "Column width", kind: "select", options: [{ value: "narrow", label: "Narrow" }, { value: "normal", label: "Medium" }, { value: "wide", label: "Wide" }, { value: "full", label: "Full width" }] },
    ],
  },
  {
    id: "products",
    title: "Product cards & grid",
    fields: [
      { key: "productCardStyle", label: "Card style", kind: "select", options: opts("card", "minimal", "editorial") },
      { key: "placeholderImageUrl", label: "Image shown for books with no photo", kind: "image" },
      { key: "lowStockCardThreshold", label: "Show “low stock” when this many or fewer are left (cards)", kind: "number", min: 1, max: 100, step: 1 },
      { key: "productHoverEffect", label: "Hover effect", kind: "select", options: opts("none", "zoom", "lift") },
      { key: "imageAspectRatio", label: "Image shape", kind: "select", options: ["3:4", "2:3", "4:5", "1:1", "16:9"].map((v) => ({ value: v, label: v })) },
      { key: "productColumnsDesktop", label: "Columns (desktop)", kind: "range", min: 2, max: 6, step: 1 },
      { key: "productColumnsMobile", label: "Columns (phone)", kind: "range", min: 1, max: 3, step: 1 },
      { key: "catalogGridGap", label: "Gap between cards", kind: "range", min: 8, max: 72, step: 2, suffix: "px" },
      { key: "productCTA", label: "Card button text", kind: "text" },
      { key: "productBorderRadius", label: "Product image corner radius", kind: "range", min: 0, max: 48, step: 1, suffix: "px" },
      { key: "showQtyStepper", label: "Quantity stepper on product page", kind: "toggle" },
      { key: "productDescriptionStyle", label: "Description style", kind: "select", options: [{ value: "plain", label: "Plain" }, { value: "designed", label: "Designed card" }] },
      { key: "showPriceOnHover", label: "Show price only on hover", kind: "toggle" },
      { key: "showSoldOutBadge", label: "Show “sold out” badge", kind: "toggle" },
      { key: "showCollectionMeta", label: "Show collection label on cards", kind: "toggle" },
      { key: "catalogCardRuleWidth", label: "Line above card title (0 = hidden)", kind: "range", min: 0, max: 8, step: 1, suffix: "px" },
      { key: "catalogPriceStyle", label: "Card price style", kind: "select", options: [{ value: "boxed", label: "Boxed tag" }, { value: "plain", label: "Plain text" }] },
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
      { key: "announcementFontSize", label: "Announcement text size", kind: "range", min: 9, max: 20, step: 1, suffix: "px" },
      { key: "announcementWeight", label: "Announcement weight", kind: "select", options: weights },
      { key: "announcementTracking", label: "Announcement letter spacing", kind: "range", min: 0, max: 0.5, step: 0.02, suffix: "em" },
      { key: "announcementSpeed", label: "Ticker speed (seconds per loop)", kind: "range", min: 5, max: 90, step: 1 },
      { key: "navStyle", label: "Nav link style", kind: "select", options: [{ value: "default", label: "Plain" }, { value: "stickers", label: "Sticker pills" }] },
      { key: "hideHeaderSearch", label: "Hide search icon", kind: "toggle" },
      { key: "hideHeaderWishlist", label: "Hide wishlist (heart) icon", kind: "toggle" },
      { key: "hideHeaderAccount", label: "Hide account icon", kind: "toggle" },
      { key: "hideCurrencySelector", label: "Hide currency selector", kind: "toggle" },
      { key: "hideThemeToggle", label: "Hide light/dark toggle", kind: "toggle" },
      { key: "hideAdminLink", label: "Hide “Admin” link", kind: "toggle" },
      { key: "hideCartButton", label: "Hide cart button", kind: "toggle" },
    ],
  },
  {
    id: "footer",
    title: "Footer & social links",
    fields: [
      { key: "hideNewsletter", label: "Hide the “Join the Archive” sign-up box", kind: "toggle" },
      { key: "hideRecentlyViewed", label: "Hide the “Recently viewed” row", kind: "toggle" },
      { key: "footerColumns", label: "Multi-column footer", kind: "toggle" },
      { key: "footerLayout", label: "Footer columns", kind: "select", options: [{ value: "3col", label: "3 columns" }, { value: "4col", label: "4 columns (with location)" }] },
      { key: "footerBg", label: "Footer background", kind: "color" },
      { key: "showSocialInFooter", label: "Show social links", kind: "toggle" },
      { key: "showPaymentBadges", label: "Show payment-method icons row", kind: "toggle" },
      { key: "showPoweredBy", label: "Show “Powered by” line", kind: "toggle" },
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
      { key: "shareImageUrl", label: "Share image (link previews on social / messages)", kind: "image" },
      { key: "logoTint", label: "Recolor logo image with the color below", kind: "toggle" },
      { key: "logoColor", label: "Logo / wordmark color", kind: "color" },
      { key: "logoText", label: "Text logo (when no wordmark / image)", kind: "text" },
      { key: "wordmarkStyle", label: "Wordmark style", kind: "select", options: [{ value: "two-part", label: "Two-part (name + second word)" }, { value: "single", label: "Single text logo" }] },
      { key: "wordmarkPrimary", label: "Wordmark: first word", kind: "text" },
      { key: "wordmarkSecondary", label: "Wordmark: second word", kind: "text" },
      { key: "wordmarkSecondaryMuted", label: "Dim the second word", kind: "toggle" },
      { key: "wordmarkSecondaryColor", label: "Second word color (overrides dimming)", kind: "color" },
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
      { key: "searchResultLimit", label: "Search pop-up: max results shown", kind: "number", min: 1, max: 24, step: 1 },
    ],
  },
  {
    id: "catalogLayout",
    title: "Catalog layout (advanced)",
    hint: "Masthead, grid and image details of the shop page.",
    fields: [
      { key: "catalogLayoutStyle", label: "Layout", kind: "select", options: [{ value: "modern", label: "Modern" }, { value: "reference", label: "Reference" }] },
      { key: "catalogMastheadText", label: "Masthead text (replaces the wordmark)", kind: "text" },
      { key: "brandTransform", label: "Masthead text case", kind: "select", options: [{ value: "none", label: "None" }, { value: "uppercase", label: "Uppercase" }, { value: "lowercase", label: "Lowercase" }, { value: "capitalize", label: "Capitalize" }] },
      { key: "catalogMastheadDesktop", label: "Masthead size (desktop)", kind: "range", min: 28, max: 96, step: 1, suffix: "px" },
      { key: "catalogMastheadMobile", label: "Masthead size (phone)", kind: "range", min: 20, max: 64, step: 1, suffix: "px" },
      { key: "catalogHeaderWidth", label: "Header width", kind: "range", min: 900, max: 1800, step: 20, suffix: "px" },
      { key: "catalogHeaderRuleWidth", label: "Header rule thickness", kind: "range", min: 0, max: 8, step: 1, suffix: "px" },
      { key: "catalogNavGapDesktop", label: "Nav spacing (desktop)", kind: "range", min: 12, max: 80, step: 1, suffix: "px" },
      { key: "catalogNavGapMobile", label: "Nav spacing (phone)", kind: "range", min: 8, max: 40, step: 1, suffix: "px" },
      { key: "catalogTitleTransform", label: "Book title case", kind: "select", options: [{ value: "none", label: "None" }, { value: "uppercase", label: "Uppercase" }, { value: "capitalize", label: "Capitalize" }] },
      { key: "catalogImageFit", label: "Cover image fit", kind: "select", options: [{ value: "cover", label: "Full bleed (fill & crop)" }, { value: "contain", label: "Fit whole image" }] },
      { key: "catalogImageFocalX", label: "Cover focus (left↔right)", kind: "range", min: 0, max: 100, step: 1, suffix: "%" },
      { key: "catalogImageFocalY", label: "Cover focus (top↔bottom)", kind: "range", min: 0, max: 100, step: 1, suffix: "%" },
      { key: "catalogCartPlacement", label: "Cart button placement", kind: "select", options: [{ value: "top-right", label: "Top right" }, { value: "nav-end", label: "Nav end" }] },
      { key: "catalogCartTotalPlaceholder", label: "Empty cart total text", kind: "text" },
      { key: "referenceCategoryLimit", label: "Max categories in the nav", kind: "range", min: 1, max: 12, step: 1 },
    ],
  },
  {
    id: "navlinks",
    title: "Navigation links",
    fields: [
      { key: "navHeading", label: "Nav heading (before page links)", kind: "text" },
      { key: "navLinkColor", label: "Link color", kind: "color" },
      { key: "navLinkSize", label: "Link size", kind: "range", min: 8, max: 20, step: 1, suffix: "px" },
      { key: "navLinkWeight", label: "Link weight", kind: "select", options: weights },
      { key: "navLinkSpacing", label: "Link letter spacing", kind: "range", min: 0, max: 0.6, step: 0.02, suffix: "em" },
      { key: "navLinkOpacity", label: "Inactive link brightness", kind: "range", min: 0.1, max: 1, step: 0.05 },
      { key: "navPlacement", label: "Category bar position", kind: "select", options: [{ value: "auto", label: "Auto (own row when it doesn’t fit)" }, { value: "inline", label: "Always beside logo" }, { value: "below", label: "Always full-width row below" }] },
      { key: "navGap", label: "Space between links", kind: "range", min: 4, max: 64, step: 1, suffix: "px" },
      { key: "navLinkTransform", label: "Link case", kind: "select", options: [{ value: "", label: "Inherit" }, { value: "none", label: "None" }, { value: "uppercase", label: "Uppercase" }, { value: "lowercase", label: "Lowercase" }, { value: "capitalize", label: "Capitalize" }] },
      { key: "navPillRadius", label: "Sticker pill corners (CSS radius)", kind: "text" },
      { key: "navPillRotate", label: "Tilt sticker pills", kind: "toggle" },
      { key: "navPillActivePalette", label: "Colorful sticker pills", kind: "toggle" },
    ],
  },
  {
    id: "productPage",
    title: "Product page layout",
    fields: [
      { key: "lowStockProductThreshold", label: "Show “only N left” on the product page at or below", kind: "number", min: 1, max: 100, step: 1 },
      { key: "recentlyViewedCount", label: "Recently viewed: how many books", kind: "number", min: 1, max: 12, step: 1 },
      { key: "productImageLayout", label: "Image layout", kind: "select", options: [{ value: "slider", label: "Slider" }, { value: "grid", label: "Grid" }] },
      { key: "productContentPosition", label: "Details side", kind: "select", options: [{ value: "right", label: "Right" }, { value: "left", label: "Left" }] },
      { key: "productAlignment", label: "Text alignment", kind: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }] },
      { key: "productTitleSize", label: "Title size", kind: "select", options: [{ value: "medium", label: "Medium" }, { value: "large", label: "Large" }, { value: "xlarge", label: "Xlarge" }] },
      { key: "productTitleColor", label: "Title color", kind: "color" },
      { key: "productPriceColor", label: "Price color", kind: "color" },
      { key: "productSubtitleWeight", label: "Subtitle weight", kind: "select", options: [{ value: "light", label: "Light" }, { value: "medium", label: "Medium" }, { value: "bold", label: "Bold" }] },
      { key: "productImageMaxWidth", label: "Photo size (max width)", kind: "range", min: 320, max: 900, step: 10, suffix: "px" },
      { key: "productImageAspect", label: "Photo shape", kind: "select", options: [{ value: "grid", label: "Same as shop grid" }, ...["3:4", "2:3", "4:5", "1:1", "16:9"].map((v) => ({ value: v, label: v }))] },
      { key: "productImageFit", label: "Photo fit", kind: "select", options: [{ value: "cover", label: "Full bleed (fill & crop)" }, { value: "contain", label: "Fit whole image" }] },
      { key: "productImageShadow", label: "Image shadow", kind: "select", options: [{ value: "none", label: "None" }, { value: "sm", label: "Sm" }, { value: "md", label: "Md" }, { value: "lg", label: "Lg" }, { value: "xl", label: "Xl" }] },
      { key: "productImageHoverScale", label: "Image hover zoom", kind: "range", min: 1, max: 1.3, step: 0.01 },
      { key: "showAmbientGlow", label: "Ambient glow behind image", kind: "toggle" },
      { key: "glowIntensity", label: "Glow strength", kind: "range", min: 0, max: 60, step: 1, suffix: "%" },
      { key: "productImageGlowColor", label: "Glow color", kind: "color" },
      { key: "productDetailsLayout", label: "Details layout", kind: "select", options: [{ value: "sections", label: "Sections" }, { value: "tabs", label: "Tabs" }, { value: "accordions", label: "Accordions" }] },
      { key: "productCtaWidth", label: "Add-to-bag width", kind: "select", options: [{ value: "full", label: "Full" }, { value: "auto", label: "Auto" }] },
      { key: "productCtaSize", label: "Add-to-bag size", kind: "select", options: [{ value: "medium", label: "Medium" }, { value: "large", label: "Large" }] },
      { key: "productCtaAnimation", label: "Add-to-bag animation", kind: "select", options: [{ value: "none", label: "None" }, { value: "pulse", label: "Pulse" }, { value: "glow", label: "Glow" }, { value: "scale", label: "Scale" }] },
      { key: "addToBagLabel", label: "Add-to-bag text", kind: "text" },
      { key: "showTrustSignals", label: "Show trust signals", kind: "toggle" },
      { key: "productTrustLayout", label: "Trust signal layout", kind: "select", options: [{ value: "row", label: "Row" }, { value: "grid", label: "Grid" }, { value: "stack", label: "Stack" }] },
      { key: "productTrust1", label: "Trust signal 1", kind: "text" },
      { key: "productTrust2", label: "Trust signal 2", kind: "text" },
      { key: "productTrust3", label: "Trust signal 3", kind: "text" },
      { key: "showBundleWidget", label: "“Frequently bought together”", kind: "toggle" },
      { key: "productBundleLayout", label: "Bundle style", kind: "select", options: [{ value: "bordered", label: "Bordered" }, { value: "card", label: "Card" }, { value: "glassmorphic", label: "Glassmorphic" }] },
      { key: "showRelatedProducts", label: "Related products", kind: "toggle" },
      { key: "showSpecs", label: "Specifications", kind: "toggle" },
      { key: "showSocialShare", label: "Share button", kind: "toggle" },
      { key: "showBackInStock", label: "“Notify me when back in stock” box (sold-out items)", kind: "toggle" },
      { key: "showZoom", label: "Image zoom", kind: "toggle" },
    ],
  },
  {
    id: "labels",
    title: "Badges & shop labels",
    fields: [
      { key: "showSaleBadge", label: "Sale badge", kind: "toggle" },
      { key: "saleBadgeLabel", label: "Sale badge text", kind: "text" },
      { key: "showNewBadge", label: "New badge", kind: "toggle" },
      { key: "newBadgeLabel", label: "New badge text", kind: "text" },
      { key: "newBadgeDays", label: "“New” for how many days", kind: "range", min: 1, max: 180, step: 1 },
      { key: "soldOutLabel", label: "Sold-out text", kind: "text" },
      { key: "cartLabel", label: "Cart label", kind: "text" },
      { key: "heroCTA", label: "Hero button text", kind: "text" },
      { key: "heroSubtext", label: "Hero subtext", kind: "text" },
    ],
  },
  {
    id: "effects",
    title: "Motion, spacing & effects",
    fields: [
      { key: "enableAnimations", label: "Page animations", kind: "toggle" },
      { key: "density", label: "Spacing density", kind: "select", options: [{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }] },
      { key: "spacingScale", label: "Spacing scale", kind: "select", options: [{ value: "compact", label: "Compact" }, { value: "normal", label: "Normal" }, { value: "relaxed", label: "Relaxed" }, { value: "spacious", label: "Spacious" }] },
      { key: "shadowScale", label: "Card shadow depth", kind: "select", options: [{ value: "flat", label: "Flat" }, { value: "subtle", label: "Subtle" }, { value: "medium", label: "Medium" }, { value: "raised", label: "Raised" }, { value: "dramatic", label: "Dramatic" }] },
      { key: "cartDrawerGrayscaleThumbs", label: "Black & white cart thumbnails", kind: "toggle" },
      { key: "successTextColor", label: "Text on success color", kind: "color" },
      { key: "faviconUrl", label: "Favicon", kind: "image" },
    ],
  },
  {
    id: "checkout",
    title: "Checkout & cart drawer",
    hint: "Leave blank to inherit the main colors.",
    fields: [
      { key: "checkoutAccentColor", label: "Checkout accent", kind: "color" },
      { key: "checkoutBgColor", label: "Checkout background", kind: "color" },
      { key: "checkoutInputRadius", label: "Checkout field corner radius", kind: "range", min: 0, max: 24, step: 1, suffix: "px" },
      { key: "cartDrawerBg", label: "Cart drawer background", kind: "color" },
      { key: "cartDrawerText", label: "Cart drawer text", kind: "color" },
      { key: "cartDrawerMuted", label: "Cart drawer muted text", kind: "color" },
      { key: "cartDrawerSurface", label: "Cart drawer raised surface", kind: "color" },
      { key: "cartDrawerBorder", label: "Cart drawer dividers", kind: "color" },
      { key: "showFreeShipBar", label: "Free-shipping progress bar", kind: "toggle" },
      { key: "freeShipThreshold", label: "Free shipping over", kind: "number", min: 0, max: 1000, step: 5 },
      { key: "showCartTrustBadges", label: "Secure / Tracked / Returns badges", kind: "toggle" },
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
