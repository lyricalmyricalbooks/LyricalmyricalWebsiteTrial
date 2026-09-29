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
      { key: "cartCountLabel", label: "Item count line", default: "{count} unique entries", hint: "Use {count} for the number of entries." },
      { key: "cartCloseAria", label: "Close button — screen-reader label", default: "Close cart" },
      { key: "cartFreeShipAway", label: "Free-shipping progress", default: "{amount} away from free shipping", hint: "Use {amount} for the remaining price." },
      { key: "cartFreeShipQualified", label: "Free-shipping reached", default: "You qualify for free shipping" },
      { key: "cartContinue", label: "Continue-shopping button", default: "Continue shopping" },
      { key: "cartUpsellHeading", label: "Upsell heading", default: "Complete your collection" },
      { key: "cartUpsellAdd", label: "Upsell add button", default: "+ Add to Bag" },
      { key: "cartOnlyAvailable", label: "Stock-limit warning", default: "Only {count} available", hint: "Use {count} for the stock left." },
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
      { key: "bookLoading", label: "Loading text", default: "Loading" },
      { key: "bookNotFound", label: "Not-found message", default: "Publication not found" },
      { key: "bookReturn", label: "Not-found button", default: "Return to Archive" },
      { key: "bookFormatLabel", label: "Format selector label", default: "Format / Edition" },
      { key: "bookAdded", label: "Added-to-bag confirmation", default: "Added to Bag" },
      { key: "bookShare", label: "Share button — label", default: "Share" },
      { key: "tabDescription", label: "Accordion: Description", default: "Description" },
      { key: "tabDetails", label: "Tab: Details", default: "Details" },
      { key: "tabSpecs", label: "Accordion: Specifications", default: "Specifications" },
      { key: "tabReviews", label: "Accordion: Reviews", default: "Reviews" },
      { key: "bundleHeading", label: "Bundle heading", default: "Frequently Bought Together" },
      { key: "ariaPrevPhoto", label: "Previous photo — screen-reader label", default: "Previous photo" },
      { key: "ariaNextPhoto", label: "Next photo — screen-reader label", default: "Next photo" },
      { key: "ariaQtyDown", label: "Decrease quantity — screen-reader label", default: "Decrease quantity" },
      { key: "ariaQtyUp", label: "Increase quantity — screen-reader label", default: "Increase quantity" },
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
      { key: "navInformation", label: "Nav: Information button", default: "INFORMATION" },
      { key: "navEnterArchive", label: "Nav: Enter-archive fallback (Navigation › Enter archive label wins)", default: "ENTER ARCHIVE" },
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
  {
    group: "Collection & wishlist pages",
    fields: [
      { key: "collectionBack", label: "Collection: back link", default: "Archive" },
      { key: "collectionEyebrow", label: "Collection: header label", default: "Collection" },
      { key: "breadcrumbAria", label: "Breadcrumb — screen-reader label", default: "Breadcrumb" },
      { key: "breadcrumbHome", label: "Breadcrumb: Home", default: "Home" },
      { key: "breadcrumbCollections", label: "Breadcrumb: Collections", default: "Collections" },
      { key: "wishlistTitle", label: "Wishlist title", default: "Wishlist" },
      { key: "wishlistCount", label: "Wishlist item count", default: "{count} items", hint: "Use {count} for the number of items." },
      { key: "wishlistEmpty", label: "Wishlist empty message", default: "Your wishlist is empty" },
      { key: "wishlistBrowse", label: "Wishlist empty button", default: "Browse the archive" },
      { key: "wishlistAdd", label: "Wishlist: add-to-bag button", default: "Add" },
      { key: "wishlistAddAria", label: "Heart (add) — screen-reader label", default: "Add to wishlist" },
      { key: "wishlistRemoveAria", label: "Heart (remove) — screen-reader label", default: "Remove from wishlist" },
      { key: "recentlyViewedHeading", label: "Recently viewed heading", default: "Recently Viewed" },
    ],
  },
  {
    group: "Search & filters",
    fields: [
      { key: "filterSearchPlaceholder", label: "Filter box placeholder", default: "Search by title, author, category…" },
      { key: "filterClearAria", label: "Clear button — screen-reader label", default: "Clear search" },
      { key: "sort_newest", label: "Sort: newest", default: "Newest" },
      { key: "sort_price_asc", label: "Sort: price low→high", default: "Price ↑" },
      { key: "sort_price_desc", label: "Sort: price high→low", default: "Price ↓" },
      { key: "sort_title_az", label: "Sort: A→Z", default: "A → Z" },
      { key: "sort_title_za", label: "Sort: Z→A", default: "Z → A" },
      { key: "filterInStock", label: "In-stock toggle", default: "In stock" },
      { key: "filterResults", label: "Result count", default: "{count} results", hint: "Use {count} for the number of results." },
      { key: "searchDialogAria", label: "Search overlay — screen-reader label", default: "Search products" },
      { key: "searchPlaceholder", label: "Search overlay placeholder", default: "Search books, authors, categories…" },
      { key: "searchCloseAria", label: "Search close — screen-reader label", default: "Close search" },
      { key: "searchPrompt", label: "Search prompt", default: "Start typing to search" },
      { key: "searchNoResults", label: "No results", default: "No results for “{query}”", hint: "Use {query} for what was typed." },
    ],
  },
  {
    group: "Order tracking",
    fields: [
      { key: "trackEyebrow", label: "Eyebrow", default: "Order Ledger" },
      { key: "trackTitle", label: "Heading", default: "Track Order" },
      { key: "trackSubtitle", label: "Subheading", default: "Secure Order Status Ledger" },
      { key: "trackOrderLabel", label: "Order ID label", default: "ORDER IDENTIFIER" },
      { key: "trackOrderPlaceholder", label: "Order ID placeholder", default: "e.g. ABCD-123456" },
      { key: "trackEmailLabel", label: "Email label", default: "CUSTOMER EMAIL" },
      { key: "trackEmailPlaceholder", label: "Email placeholder", default: "e.g. reader@archive.com" },
      { key: "trackSubmit", label: "Submit button", default: "Initialize Pulse" },
      { key: "trackLoading", label: "Submit button (loading)", default: "Querying..." },
      { key: "trackFound", label: "Order found banner", default: "ARCHIVE MATCH FOUND" },
      { key: "trackTotalPayable", label: "Total payable label", default: "Total Payable" },
      { key: "trackBack", label: "Back link", default: "Back to Store" },
      { key: "trackTimeline", label: "Timeline heading", default: "Transit Status Timeline" },
      { key: "trackLogisticsEyebrow", label: "Logistics eyebrow", default: "Fulfillment Logistics" },
      { key: "trackCarrier", label: "Carrier heading", default: "Carrier Assigned" },
      { key: "trackDigitalTitle", label: "Digital delivery heading", default: "Digital Archive Delivery" },
      { key: "trackDigitalText", label: "Digital delivery text", multiline: true, default: "Download your secure digital purchases below. Generated download tokens expire in 24 hours." },
      { key: "trackDigitalFormat", label: "Digital format line", default: "Format: Digital Book" },
      { key: "trackDownload", label: "Download button", default: "Download File" },
      { key: "trackItems", label: "Items heading", default: "Cart Items Ledger" },
      { key: "summarySubtotal", label: "Summary: subtotal", default: "Subtotal" },
      { key: "summaryDiscount", label: "Summary: discount", default: "Discount" },
      { key: "summaryShipping", label: "Summary: shipping", default: "Shipping" },
      { key: "summaryTax", label: "Summary: tax", default: "Estimated Tax" },
      { key: "summaryTotal", label: "Summary: total", default: "Total" },
    ],
  },
  {
    group: "Customer account",
    fields: [
      { key: "accountTitle", label: "Sign-in / dashboard title", default: "Customer Account" },
      { key: "accountSubtitle", label: "Sign-in subtitle", default: "Lyricalmyrical Books Ledger" },
      { key: "accountSignInLabel", label: "Sign-in field label", default: "Passwordless Sign In" },
      { key: "accountEmailPlaceholder", label: "Email placeholder", default: "name@example.com" },
      { key: "accountMagicLink", label: "Magic-link button", default: "Send Magic Link" },
      { key: "accountOr", label: "Divider word", default: "OR" },
      { key: "accountGoogle", label: "Google button", default: "Continue with Google" },
      { key: "accountBackToStore", label: "Back link (signed out)", default: "Back to Storefront" },
      { key: "accountStorefront", label: "Back link (signed in)", default: "Storefront" },
      { key: "accountPortal", label: "Header label", default: "Vault Portal" },
      { key: "accountSignOut", label: "Sign-out button", default: "Sign out" },
      { key: "accountWishlist", label: "Tile: wishlist", default: "Wishlist Ledger" },
      { key: "accountSaved", label: "Tile: saved count", default: "{count} Saved", hint: "Use {count} for the number." },
      { key: "accountOrders", label: "Tile: orders", default: "Order Logs" },
      { key: "accountTransacted", label: "Tile: order count", default: "{count} Transacted" },
      { key: "accountShipping", label: "Tile: shipping", default: "Shipping Vector" },
      { key: "accountUnconfigured", label: "Tile: no address", default: "Unconfigured" },
      { key: "accountAddressTitle", label: "Address form heading", default: "Configure Shipping Vector" },
      { key: "accountAbort", label: "Address cancel", default: "ABORT" },
      { key: "accountCancel", label: "Address cancel button", default: "Cancel" },
      { key: "accountFieldName", label: "Field: name", default: "Full Legal Name" },
      { key: "accountFieldPhone", label: "Field: phone", default: "Contact Phone" },
      { key: "accountPhonePlaceholder", label: "Phone placeholder", default: "e.g. 647 123 4567" },
      { key: "accountFieldStreet", label: "Field: street", default: "Street Address" },
      { key: "accountStreetPlaceholder", label: "Street placeholder", default: "e.g. 456 Montrose Ave" },
      { key: "accountFieldCity", label: "Field: city", default: "City" },
      { key: "accountFieldState", label: "Field: state", default: "State / Province" },
      { key: "accountFieldZip", label: "Field: postal code", default: "Postal Code" },
      { key: "accountFieldCountry", label: "Field: country", default: "Country" },
      { key: "accountSaveAddress", label: "Save address button", default: "Save Vector Details" },
      { key: "accountHistory", label: "Order history heading", default: "Purchase History Log" },
      { key: "accountHistoryLoading", label: "Order history loading", default: "Accessing transaction logs..." },
      { key: "accountHistoryEmpty", label: "Order history empty", default: "No transaction entries found" },
      { key: "accountDigitalTitle", label: "Digital heading", default: "Digital Archive Access" },
      { key: "accountDigitalText", label: "Digital text", default: "Download your digital secure purchases. Tokens refresh automatically." },
      { key: "accountEbook", label: "E-book label", default: "E-Book File" },
      { key: "accountDownload", label: "Download button", default: "Download E-Book" },
      { key: "accountItems", label: "Items heading", default: "Items Breakdown" },
      { key: "accountDispatch", label: "Dispatch heading", default: "Dispatch Logistics" },
      { key: "accountShipTo", label: "Ship-to heading", default: "Shipping Address" },
      { key: "accountLogisticsFee", label: "Shipping fee label", default: "Logistics Fee" },
    ],
  },
  {
    group: "Checkout",
    fields: [
      { key: "coBrand", label: "Header brand name", default: "Lyricalmyrical Books" },
      { key: "coReturn", label: "Back link", default: "Return to store" },
      { key: "coSecure", label: "Secure label", default: "Secure checkout" },
      { key: "coProgressAria", label: "Progress — screen-reader label", default: "Checkout progress" },
      { key: "coStepInfo", label: "Breadcrumb: information", default: "Information" },
      { key: "coStepShipping", label: "Breadcrumb: shipping", default: "Shipping" },
      { key: "coStepPayment", label: "Breadcrumb: payment", default: "Payment" },
      { key: "coStepOf", label: "Step counter", default: "{n} of 3", hint: "Use {n} for the step number." },
      { key: "coContact", label: "Section: contact", default: "Contact" },
      { key: "coDelivery", label: "Section: delivery", default: "Delivery" },
      { key: "coPayment", label: "Section: payment", default: "Payment" },
      { key: "coSignedIn", label: "Signed-in label", default: "Signed in" },
      { key: "coGoogle", label: "Google sign-in button", default: "Sign in with Google" },
      { key: "coEmail", label: "Field: email", default: "Email address" },
      { key: "coEmailNote", label: "Email note", default: "We’ll send your receipt and delivery updates to this email." },
      { key: "coName", label: "Field: full name", default: "Full name" },
      { key: "coAddress", label: "Field: address", default: "Address" },
      { key: "coCountry", label: "Field: country", default: "Country" },
      { key: "coCity", label: "Field: city", default: "City" },
      { key: "coState", label: "Field: state", default: "State / province" },
      { key: "coZip", label: "Field: postal code", default: "ZIP / postal code" },
      { key: "coPhone", label: "Field: phone", default: "Phone (optional)" },
      { key: "coShipMethod", label: "Shipping-method heading", default: "Shipping method" },
      { key: "coShipMethodNote", label: "Shipping-method note", default: "Choose the delivery speed that works for you." },
      { key: "coRates", label: "Loading rates text", default: "Calculating live shipping rates..." },
      { key: "coPaymentNote", label: "Payment note", default: "All transactions are handled by the payment provider you select." },
      { key: "coCard", label: "Card option", default: "Credit or debit card" },
      { key: "coCardsAria", label: "Accepted cards — screen-reader label", default: "Accepted cards" },
      { key: "coPay", label: "Pay button (card)", default: "Pay securely" },
      { key: "coPayPal", label: "Pay button (PayPal)", default: "Continue to PayPal" },
      { key: "coPlaceOrder", label: "Pay button (manual)", default: "Place order" },
      { key: "coProcessing", label: "Pay button (processing)", default: "Processing order…" },
      { key: "coTrust1", label: "Trust badge 1", default: "Secure payment" },
      { key: "coTrust2", label: "Trust badge 2", default: "Order support" },
      { key: "coTrust3", label: "Trust badge 3", default: "Privacy protected" },
      { key: "coSummary", label: "Order-summary heading", default: "Order summary" },
      { key: "coDiscount", label: "Discount placeholder", default: "Discount code" },
      { key: "coDiscountRemove", label: "Remove discount — screen-reader label", default: "Remove discount" },
      { key: "coTaxLater", label: "Tax placeholder", default: "Calculated at checkout" },
      { key: "coPacked", label: "Reassurance title", default: "Carefully packed and tracked" },
      { key: "coPickup", label: "Pickup note", default: "Collect in person — no delivery" },
      { key: "coEstimated", label: "Delivery estimate", default: "Estimated {days} business days", hint: "Use {days} for the number of days." },
      { key: "coFree", label: "Free shipping label", default: "Free" },
      { key: "coNoPayment", label: "No payment method message", multiline: true, default: "No payment method is currently available. Please contact the store before placing your order." },
      { key: "coPrivacyNote", label: "Payment privacy note", multiline: true, default: "Your payment details are submitted directly to the selected payment provider and are not stored by this shop." },
      { key: "coPackedNote", label: "Reassurance text", default: "You’ll receive an order confirmation and shipping updates by email." },
      { key: "coTestMode", label: "Test-mode banner", default: "Test mode is active. No real charges will be made." },
      { key: "coThanks", label: "Thank-you heading", default: "Thank You" },
      { key: "coPending", label: "Pending-payment message", default: "Your order is pending verification of payment. We will ship once received." },
      { key: "coContinue", label: "Thank-you button", default: "Continue Exploring" },
      { key: "coEmptyEyebrow", label: "Empty cart eyebrow", default: "Empty Archive" },
      { key: "coEmptyTitle", label: "Empty cart heading", default: "Nothing Here" },
      { key: "coEmptyButton", label: "Empty cart button", default: "Return to Catalog" },
    ],
  },
  {
    group: "Reviews",
    fields: [
      { key: "reviewsHeading", label: "Section heading", default: "Customer Reviews" },
      { key: "reviewsNone", label: "No reviews (summary)", default: "No reviews yet" },
      { key: "reviewsCountOne", label: "Count (1 review)", default: "{count} review", hint: "Use {count} for the number." },
      { key: "reviewsCountMany", label: "Count (many reviews)", default: "{count} reviews", hint: "Use {count} for the number." },
      { key: "reviewsLoading", label: "Loading text", default: "Loading reviews…" },
      { key: "reviewsEmpty", label: "Empty message", default: "Be the first to share your thoughts on this book." },
      { key: "reviewsReply", label: "Store reply label", default: "Reply from Lyricalmyrical Books" },
      { key: "reviewsThanks", label: "Submitted message", default: "Thanks — your review has been submitted for moderation." },
      { key: "reviewsWrite", label: "Form heading", default: "Write a review" },
      { key: "reviewsRating", label: "Rating label", default: "Your rating" },
      { key: "reviewsName", label: "Name placeholder", default: "Name" },
      { key: "reviewsEmail", label: "Email placeholder", default: "Email (optional, not published)" },
      { key: "reviewsHeadline", label: "Headline placeholder", default: "Headline (optional)" },
      { key: "reviewsBody", label: "Body placeholder", default: "What did you think?" },
      { key: "reviewsSubmit", label: "Submit button", default: "Submit Review" },
      { key: "reviewsModerated", label: "Moderation note", default: "Reviews are moderated before appearing." },
    ],
  },
];

/**
 * Legacy flat keys that are edited elsewhere in the theme editor (Text & Translations › System Labels,
 * Products › Badges). They keep a default here but are intentionally not listed in COPY_SCHEMA, so
 * the Content panel never shows two inputs for one string.
 */
export const FLAT_COPY_DEFAULTS: Record<string, string> = {
  cartLabel: "Bag",
  soldOutLabel: "Sold Out",
  saleBadgeLabel: "Sale",
};

// Flat key → default lookup, derived once from the schema.
export const DEFAULT_COPY: Record<string, string> = COPY_SCHEMA.reduce(
  (acc, g) => {
    for (const f of g.fields) acc[f.key] = f.default;
    return acc;
  },
  { ...FLAT_COPY_DEFAULTS } as Record<string, string>,
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
