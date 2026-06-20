import { buildStorefrontTokenVars, STOREFRONT_TOKEN_CSS } from "./themeTokens";

/**
 * Drop-in <style> block that wires the semantic token layer onto any storefront
 * surface. Render it once inside an element that has the `data-fm-store`
 * attribute and every Tailwind white/black alpha utility + the fm-* helper
 * classes below it become themeable.
 *
 * Use on standalone pages (Collection, Wishlist, Page, Account, Checkout, the
 * cart drawer, …). The homepage uses MainSite's richer TypographyTokens, which
 * injects the same token layer.
 */
export function StorefrontThemeStyle({ design }: { design?: any }) {
  const d = design || {};
  const css = `
    [data-fm-store]{
      ${buildStorefrontTokenVars(d)}
      --bg-color:${d.backgroundColor || "#050508"};
      --text-color:${d.textColor || "#ffffff"};
      --link-hover-color:${d.linkColorHover || "#F61515"};
      --border-color:${d.borderColor || "rgba(255,255,255,0.05)"};
      --btn-bg:${d.buttonColor || d.primaryColor || "#A855F7"};
      --btn-text:${d.buttonTextColor || "#000000"};
      --btn-hover-bg:${d.buttonHoverBgColor || "#C1BBBB"};
      --btn-hover-text:${d.buttonHoverTextColor || "#FFFFFF"};
      --badge-text-primary:${d.badgeTextPrimary || "#000000"};
      --badge-bg-primary:${d.badgeBgPrimary || "#F63737"};
      --badge-text-secondary:${d.badgeTextSecondary || "#000000"};
      --badge-bg-secondary:${d.badgeBgSecondary || "#E0E0E0"};
      --low-inventory-color:${d.lowInventoryColor || "#056FFA"};
    }
    [data-fm-store] a:hover{color:var(--link-hover-color);}
    [data-fm-store] .custom-btn{background-color:var(--btn-bg) !important;color:var(--btn-text) !important;}
    [data-fm-store] .custom-btn:hover{background-color:var(--btn-hover-bg) !important;color:var(--btn-hover-text) !important;}
    ${STOREFRONT_TOKEN_CSS}
  `;
  const customCss = d.customCss ? `\n/* Custom CSS */\n${d.customCss}` : '';
  return <style>{css}{customCss}</style>;
}
