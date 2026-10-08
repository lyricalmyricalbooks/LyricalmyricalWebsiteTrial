export type AppUpdate = {
  id: string;
  date: string;
  title: string;
  summary: string;
  links: Array<{ label: string; tab: string; settingsTab?: string }>;
};

// Newest first. Every PR adds an entry; links open the affected admin workspace.
export const APP_UPDATES: AppUpdate[] = [
  {
    id: "preorders", date: "2026-10-08", title: "Take pre-orders for upcoming books",
    summary: "Turn on Pre-order in Books › edit › Inventory and set the publication date. Shoppers see a Pre-order button, badge and release date on the book page, bag, checkout and order tracking; the book becomes a normal one on release day. Paid pre-orders wait in Orders › Pre-orders until release (or press Ready to ship now), pre-ordered e-books unlock on release day, and order emails explain the timing. Every label is editable in Studio. Deploy Functions with this release so checkout, emails and downloads follow the pre-order rules.",
    links: [{ label: "Set up a pre-order in Books", tab: "catalog" }, { label: "See waiting pre-orders", tab: "orders" }, { label: "Edit pre-order words in Studio", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "bug-sweep-7", date: "2026-10-08", title: "Stock, discounts and prices stay correct",
    summary: "Saving a book no longer puts back a stock count from before a sale, and editing a discount no longer resets how many times it was used. Two discounts can't share a code, and dates show the shop's own day. Books sold in editions show the price shoppers pay, backorder books can be ordered past their stock, and release dates open at midnight in Toronto. Bulk Feature now shows books as featured on the shop, Approve selected only acts on the reviews you can see, and the Orders CSV includes partial refunds. Functions need deploying with this release for the PayPal refund, discount code and email fixes to apply.",
    links: [{ label: "Review books", tab: "catalog" }, { label: "Review discounts", tab: "discounts" }, { label: "Moderate reviews", tab: "reviews" }],
  },
  {
    id: "seo-book-search-details", date: "2026-10-08", title: "Richer Google listings for your books",
    summary: "Book pages now tell Google each edition's format, page count, publication date, edition name and ISBN (as a barcode number, only when the ISBN is valid), and the alt text you write for book photos is now used on the product page, which helps Google Images. Search snippets end on a whole word, Google may show your covers as large previews, and Pinterest/Facebook shares carry the price and stock. Nothing is invented: blank catalog fields are simply left out. The new details reach Google after the next site build and crawl.",
    links: [{ label: "Fill in book details and photo alt text", tab: "catalog" }],
  },
  {
    id: "book-photos-20", date: "2026-10-08", title: "Up to 20 photos per book",
    summary: "Each book can now hold 20 photos instead of 10 (Books › edit › Media). On the product page, a long thumbnail strip beside the photo now scrolls instead of stretching the page.",
    links: [{ label: "Add photos in Books", tab: "catalog" }],
  },
  {
    id: "shop-filters-bug-sweep-6", date: "2026-10-08", title: "Shop filters and checkout fixes",
    summary: "Shoppers can filter the shop by format (paperback, hardcover, e-book, audiobook) and price, and clear filters in one click; \"In stock\" now counts editions. Checkout shows the same capped discount the shop charges, a declined card no longer locks a shopper out of the last copy, and e-book return requests can be refunded or closed directly. Functions need deploying with this release for the server-side fixes to apply.",
    links: [{ label: "Turn on shop filters in Studio", tab: "settings", settingsTab: "designer" }, { label: "Handle returns in Orders", tab: "orders" }, { label: "Review discount codes", tab: "discounts" }],
  },
  {
    id: "bug-sweep-5-review", date: "2026-10-08", title: "Cancelling checks Stripe first",
    summary: "Cancel unpaid order now asks Stripe before cancelling, and refuses when the customer has already paid there. Disputed parcels already on their way can still be marked delivered. The bag's free-shipping bar only appears when every shipping option really becomes free.",
    links: [{ label: "Review orders", tab: "orders" }, { label: "Check free-shipping rules", tab: "settings", settingsTab: "shipping" }],
  },
  {
    id: "bug-sweep-5", date: "2026-10-08", title: "Safer cancelling, disputes and checkout retries",
    summary: "Cancelling an unpaid order now stops its card payment and frees its books. Disputed orders wait in Needs attention, and orders paid after cancelling clear with Mark refunded. Shoppers can retry checkout without their own earlier attempt holding stock, and the bag's free-shipping bar follows your shipping rules.",
    links: [{ label: "Review orders", tab: "orders" }, { label: "Check free-shipping rules", tab: "settings", settingsTab: "shipping" }, { label: "Review discounts", tab: "discounts" }],
  },
  {
    id: "grouped-footer-navigation", date: "2026-10-08", title: "A shorter, clearer footer",
    summary: "Footer links now sit in Explore and Participate & connect groups, with policies in a compact row. Studio lets you edit group headings, move or hide links, and switch back to classic columns.",
    links: [{ label: "Edit the footer in Studio", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "seamless-page-navigation", date: "2026-10-08", title: "Smoother storefront page switching",
    summary: "About, Contact and other custom pages open from the loaded published content without briefly clearing the screen. Navigation stays visible during initial page loading.",
    links: [{ label: "Review pages in Studio", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "stripe-field-contrast", date: "2026-10-08", title: "Readable card payment fields",
    summary: "Card fields and country menus automatically use readable text when checkout field colours have too little contrast. Labels still follow your checkout design.",
    links: [{ label: "Review checkout design", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "admin-whats-new", date: "2026-10-07", title: "Updates, right where you work",
    summary: "The sidebar now explains app changes. Open an affected screen directly or browse the update history.",
    links: [{ label: "Explore the overview", tab: "overview" }],
  },
  {
    id: "pr-399", date: "2026-10-07", title: "Shipping previews, returns and publishing checks",
    summary: "Shoppers can preview shipping in the cart. Orders have a return workflow, and books get a review before publishing.",
    links: [{ label: "Review returns in Orders", tab: "orders" }, { label: "Review books before publishing", tab: "catalog" }, { label: "Manage shipping", tab: "settings", settingsTab: "shipping" }],
  },
  {
    id: "pr-398", date: "2026-10-07", title: "Inventory holds and storefront readiness",
    summary: "Inventory holds and storefront launch checks help you prepare the shop for selling.",
    links: [{ label: "Check inventory", tab: "inventory" }, { label: "Check shop settings", tab: "settings", settingsTab: "general" }],
  },
];
