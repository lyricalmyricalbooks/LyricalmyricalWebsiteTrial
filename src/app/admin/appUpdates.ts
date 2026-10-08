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
    id: "seamless-page-navigation", date: "2026-10-08", title: "Smoother storefront page switching",
    summary: "About, Contact and other custom pages open from the loaded published content without briefly clearing the screen. Navigation stays visible during initial page loading.",
    links: [{ label: "Review pages in Studio", tab: "settings", settingsTab: "design" }],
  },
  {
    id: "stripe-field-contrast", date: "2026-10-08", title: "Readable card payment fields",
    summary: "Card fields and country menus automatically use readable text when checkout field colours have too little contrast. Labels still follow your checkout design.",
    links: [{ label: "Review checkout design", tab: "settings", settingsTab: "design" }],
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
