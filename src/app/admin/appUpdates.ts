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
