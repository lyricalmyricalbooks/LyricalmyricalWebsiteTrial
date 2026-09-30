import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

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

/**
 * Decide whether the category bar fits on the header's single line.
 * Studio › Style › Navigation links › "Category bar position": auto (default) moves
 * the bar to its own full-width row only when the links would collide with the
 * logo/icons; "inline" and "below" force a placement.
 * Mark the logo and right-hand controls with `data-hdr-fixed`; pass the nav ref.
 */
export function useNavBelow(design: any, rowRef: RefObject<HTMLElement | null>, navRef: RefObject<HTMLElement | null>) {
  const mode = design?.navPlacement || "auto";
  const [below, setBelow] = useState(mode === "below");
  useLayoutEffect(() => {
    if (mode !== "auto") { setBelow(mode === "below"); return; }
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const nav = navRef.current;
      if (!nav) return;
      let needed = nav.scrollWidth + 96;
      row.querySelectorAll<HTMLElement>("[data-hdr-fixed]").forEach((el) => { needed += el.offsetWidth; });
      const styles = getComputedStyle(row);
      const avail = row.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      setBelow(needed > avail);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [mode, rowRef, navRef]);
  return below;
}
