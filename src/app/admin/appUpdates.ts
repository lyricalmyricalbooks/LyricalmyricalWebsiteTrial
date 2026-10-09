export type AppUpdate = {
  id: string;
  date: string;
  title: string;
  summary: string;
  /** `studio` (a `#designer?…` link, see studio/studioLocation.ts) opens the Design studio at that page/tool. */
  links: Array<{ label: string; tab: string; settingsTab?: string; studio?: string }>;
};

// Newest first. Every PR adds an entry; links open the affected admin workspace.
export const APP_UPDATES: AppUpdate[] = [
  {
    id: "studio-2-media", date: "2026-10-09", title: "A media library for your shop's pictures",
    summary: "The Design studio has a new Media button in its left rail. Pictures you upload there — or with Upload image on any image field — are saved as three sizes (480, 960 and 1600 pixels wide); in page sections, phones then download a small file and big screens a sharp one; pictures in the first section of the home page load first. Each picture has a description for screen readers, a focal point, its file sizes (with a warning when one is larger than recommended), and a list of where it's used — click a place to open that section. Filters show unused pictures, pictures over the size budget and pictures without a description. Replace swaps a picture everywhere in your draft at once; Delete refuses while a picture is still used — including in My themes or a saved version in Version history. Image fields have a new Choose from library button. Pictures already on your site look exactly as before. The library needs its new security rules switched on; until then Media explains this and image fields work as they always have.",
    links: [{ label: "Open Media", tab: "settings", settingsTab: "designer", studio: "#designer?tab=media" }],
  },
  {
    id: "overview-front-page", date: "2026-10-09", title: "A livelier Overview that tells you how the shop is doing",
    summary: "Overview now opens like a newspaper front page. A headline sums up the period in one sentence (for example \"CA$1,530 taken, up 10% on the 30 days before\"), with the best-selling title underneath and the revenue or traffic chart in a bright panel. Beside it, a black \"Today's run sheet\" counts what needs you right now — orders to ship, reviews to moderate, titles to reprint, sold-out books — each with a button straight to the fix. The other figures sit in one ruled strip below, with green and red change badges. Ready to sell?, Newest orders and the Dig deeper tabs work as before.",
    links: [{ label: "Open Overview", tab: "overview" }],
  },
  {
    id: "studio-2-theme-system", date: "2026-10-09", title: "Theme settings, sorted into your site's look and its parts",
    summary: "Theme settings in the Design studio now opens in three parts. \"Site-wide design\" holds what every page shares: theme presets, logo, colours, fonts, buttons, spacing and the Riso print look. \"Parts of your shop\" holds the header and footer, the shop and book pages, and the bag, checkout and account pages — each has a \"Show on page\" button that opens that page in the preview (or opens the shopping bag) and selects the part, so you can see what you're changing. Long word lists in Text & labels (Checkout, Order tracking, Customer account, Product page, Cart) are split into short sections such as \"Discount codes\" and \"Error messages\". Find anything gives shorter result lists and opens an element's setting at the screen size you're previewing.",
    links: [{ label: "Open Theme settings", tab: "settings", settingsTab: "designer", studio: "#designer?tab=style" }],
  },
  {
    id: "studio-2-list-tools", date: "2026-10-09", title: "Move, copy and tidy sections faster",
    summary: "In the Design studio's Page layout list, right-click a section (or use its ··· button) to copy it, paste it below another, copy its look and paste that look onto other sections, save it for reuse, or move it to another page — for example from Home to About. Hold Ctrl (⌘ on a Mac) and click several sections to hide, show, restyle, move or delete them together. Blocks inside a section can move to another section of the same kind with the arrows button, or by dragging them onto it in the preview. Every change can be undone.",
    links: [{ label: "Open Page layout", tab: "settings", settingsTab: "designer", studio: "#designer?tab=sections" }],
  },
  {
    id: "studio-2-one-inspector", date: "2026-10-09", title: "Click any part of your shop to edit it in one place",
    summary: "In the Design studio, clicking any part of the preview — the header, the category bar, the buy card, the shopping bag, the footer — now opens its settings on the right, in tabs: Words (the words shown in that part), Style, Layout and Visibility. You no longer get a small \"what do you want to edit?\" menu or get sent to another tab. Sections have the same tabs (Content, Style, Layout, Visibility), with a new switch to hide a section on tablets only. The separate Shared layout tab is gone: the header and footer are listed in Page layout. Deleting from the preview's toolbar now happens straight away with an Undo button.",
    links: [{ label: "Open Page layout", tab: "settings", settingsTab: "designer", studio: "#designer?tab=sections" }],
  },
  {
    id: "studio-2-page-structure", date: "2026-10-08", title: "See every part of a page in one list",
    summary: "Page layout in the Design studio now lists the whole page you're previewing, top to bottom: the header and its parts, the parts built into the page (like the catalog heading and product grid) and your sections, the footer, and pop-overs. Point at a row and the preview outlines that part; point at the preview and the row lights up. Click a row to open its settings. Built-in parts have an eye button to hide them on the size you're previewing (parts shoppers need, like the newsletter button, show a lock instead). Pop-overs has \"Open in preview\" for the shopping bag and search, so you can style them without adding a book first. You can also rename a section (Section actions › Rename) — the name is only shown in the studio. When you click a part with several kinds of settings, the choices are now clearly named (for example \"Style: Header & announcement bar\" or \"Words: Header\"). Also fixed: on a slow connection, a section you selected before the preview finished loading no longer gets unselected when it does.",
    links: [{ label: "Open Page layout", tab: "settings", settingsTab: "designer", studio: "#designer?tab=sections" }],
  },
  {
    id: "studio-2-undo-shortcuts-links", date: "2026-10-08", title: "Undo everywhere, shortcuts and Edit in Studio",
    summary: "Deleting a section or applying a theme in the Design studio now happens straight away with an Undo button, instead of a browser pop-up asking first. Undo and Redo say what they will change. Press ? in the studio for keyboard shortcuts (for example Delete, Alt+arrows to move a section, 1/2/3 for desktop, tablet and phone). While you're signed in, an \"Edit in Studio\" button on your live shop opens the studio on the page you're looking at, and a book's editor has \"Design this page\".",
    links: [{ label: "Open the Design studio", tab: "settings", settingsTab: "designer" }, { label: "Open a book to design its page", tab: "catalog" }],
  },
  {
    id: "studio-2-editor-frame", date: "2026-10-08", title: "A roomier, easier Design studio",
    summary: "The studio's tools now sit in a slim icon rail on the left. Drag the edges between the settings panel, the preview and the inspector to size them; the studio remembers your layout. The preview shrinks to fit your screen, so you see the whole desktop page at once (use Zoom for 100%). One \"Page to edit\" box now finds any page, collection or book by typing its name, and switching pages keeps you in the same tool. The studio reopens where you left off.",
    links: [{ label: "Open the Design studio", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "studio-2-what-you-see", date: "2026-10-08", title: "What you see in the studio is what goes live",
    summary: "The shop now uses exactly the values the Design studio shows. Fixed along the way: your footer wordmark text now appears on every page (it was missing on Contact, About, Account and Tracking), product and custom-page headers list all your shop categories, the menu order is the same on every page, and an old \"Why choose us\" sample block that only showed above the catalog footer (and couldn't be edited) is gone. When a page keeps its own value for a setting, Theme settings now lists it under \"This page differs from all pages\", with buttons to use the all-pages value or make it the all-pages value.",
    links: [{ label: "Review page differences in Theme settings", tab: "settings", settingsTab: "designer", studio: "#designer?t=storefront&tab=style" }],
  },
  {
    id: "studio-2-private-drafts", date: "2026-10-08", title: "Private drafts and safe saving in two tabs",
    summary: "Your unpublished Design studio draft and My themes are now stored privately instead of in the settings every shopper's browser downloads, so the shop loads less data and unannounced designs stay hidden. My themes no longer has a size limit. If the studio is open in two tabs or devices, saving no longer silently overwrites the other one: changes to different settings are combined, and you choose when both changed the same setting. This needs the updated Firestore rules deployed; until then the studio keeps working as before.",
    links: [{ label: "Open the Design studio", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "studio-2-test-harness", date: "2026-10-08", title: "Design studio is now tested in a real browser",
    summary: "Every change to the app now opens the Design studio in a test browser and checks the basics: the preview shows your unsaved work, adding a section, undo and redo, Save draft that never publishes, device sizes, Find anything and clicking a section to edit it. Nothing changes in how you use the studio.",
    links: [{ label: "Open the Design studio", tab: "settings", settingsTab: "designer" }],
  },
  {
    id: "studio-2-repairs", date: "2026-10-08", title: "Design studio repairs",
    summary: "Image uploads in the Design studio work again: pictures are shrunk automatically, and a clear message explains any failed upload. Section backgrounds and category pictures gained an Upload button. Linked shared blocks now show in every section type. A section that breaks no longer blanks the whole page. Unpublished pages can be designed and previewed. Built-in page parts switch to their phone layout at the same width as sections, so large phones held sideways (640–767 pixels wide) now show phone layouts. Featured product shows the shopper's currency. Creating a category while editing a book no longer publishes unrelated draft categories.",
    links: [{ label: "Open the Design studio", tab: "settings", settingsTab: "designer" }, { label: "Edit a book's categories", tab: "catalog" }],
  },
  {
    id: "studio-2-foundations-infra", date: "2026-10-08", title: "Design studio opens faster",
    summary: "The Design studio now loads only when you open it, so the rest of the admin starts quicker. Every change to the app is now automatically tested before it can ship. This is the first step of a larger Design studio upgrade.",
    links: [{ label: "Open the Design studio", tab: "settings", settingsTab: "designer" }],
  },
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
    links: [{ label: "Edit the footer in Studio", tab: "settings", settingsTab: "designer", studio: "#designer?tab=shared" }],
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
