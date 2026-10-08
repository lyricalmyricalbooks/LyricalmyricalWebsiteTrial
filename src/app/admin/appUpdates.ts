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
