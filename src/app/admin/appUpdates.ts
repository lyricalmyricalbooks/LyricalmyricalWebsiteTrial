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
