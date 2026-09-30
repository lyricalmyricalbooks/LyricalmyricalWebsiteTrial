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

const HEADER_FIT_BUFFER = 96;

/** Keep the fit decision small and deterministic so late font/layout changes can be retested. */
export function navNeedsOwnRow(navWidth: number, fixedWidth: number, availableWidth: number) {
  return navWidth + fixedWidth + HEADER_FIT_BUFFER > availableWidth;
}

/**
 * Decide whether the category bar fits on the header's single line.
 * Studio › Style › Navigation links › "Category bar position": auto (default) moves
 * the bar to its own full-width row only when the links would collide with the
 * logo/icons; "inline" and "below" force a placement.
 * Mark the logo and right-hand controls with `data-hdr-fixed`; pass the nav ref.
 */
export function useNavBelow(design: any, rowRef: RefObject<HTMLElement | null>, navRef: RefObject<HTMLElement | null>) {
  const mode = design?.navPlacement || "auto";
  // Auto starts on the safe row. The first layout measurement may move it inline,
  // but a slow webfont or restored page data can never briefly make links overlap
  // the account/currency/cart controls.
  const [below, setBelow] = useState(mode !== "inline");
  useLayoutEffect(() => {
    if (mode !== "auto") { setBelow(mode === "below"); return; }
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const nav = navRef.current;
      if (!nav) return;
      let fixedWidth = 0;
      // Only count top-level fixed regions. A right-positioned logo is itself
      // marked fixed inside the fixed controls region and must not be counted twice.
      row.querySelectorAll<HTMLElement>(":scope > * [data-hdr-fixed], :scope > [data-hdr-fixed]").forEach((el) => {
        if (!el.parentElement?.closest("[data-hdr-fixed]")) fixedWidth += el.offsetWidth;
      });
      const styles = getComputedStyle(row);
      const avail = row.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      setBelow(navNeedsOwnRow(nav.scrollWidth, fixedWidth, avail));
    };
    measure();
    const frame = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(row);
    if (navRef.current) ro?.observe(navRef.current);
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(measure);
    if (navRef.current) mo?.observe(navRef.current, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", measure);

    // Font swaps alter text width without reliably resizing an already constrained
    // nav box. Recheck both the initial font-ready promise and later font loads.
    let cancelled = false;
    const fonts = document.fonts;
    fonts?.ready.then(() => { if (!cancelled) measure(); });
    fonts?.addEventListener?.("loadingdone", measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", measure);
      fonts?.removeEventListener?.("loadingdone", measure);
    };
  }, [mode, rowRef, navRef]);
  return below;
}
