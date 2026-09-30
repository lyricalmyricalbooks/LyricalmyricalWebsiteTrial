import type { CSSProperties } from "react";

/**
 * Shared nav-link look for every storefront header (home/catalog in MainSite and
 * custom pages in StorefrontPageHeader) so both stay identical. Every value is a
 * Studio › Style › Navigation links control; the fallbacks are the defaults.
 */
export function navLinkStyle(design: any, active: boolean, color?: string): CSSProperties {
  const d = design || {};
  const idle = Math.max(0.1, Math.min(1, Number(d.navLinkOpacity ?? 0.6)));
  return {
    color: d.navLinkColor || color,
    fontSize: d.navLinkSize ?? 11,
    fontWeight: Number(d.navLinkWeight ?? 800),
    letterSpacing: `${d.navLinkSpacing ?? 0.22}em`,
    textTransform: (d.navLinkTransform || "uppercase") as CSSProperties["textTransform"],
    opacity: active ? 1 : idle,
    whiteSpace: "nowrap",
  };
}

/** Gap between header nav links (px). */
export const navGap = (design: any) => Math.max(4, Math.min(64, Number(design?.navGap ?? 28)));
