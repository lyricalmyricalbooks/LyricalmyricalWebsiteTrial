import { useRef } from "react";
import { accountsEnabled } from "./customerAccounts";
import { Link } from "react-router";
import { CurrencySelector } from "../../CurrencyContext";
import { buildNavItems } from "./navItems";
import { getCopy } from "./storeCopy";

export function MobileStorefrontNav({ design, pages, onSearch }: { design: any; pages: any[]; onSearch: () => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const d = { ...design, ...design?.storefront };
  const close = () => { if (ref.current) ref.current.open = false; };
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (d.showMobileNavigation === false) return null;
  const linkClass = "block min-h-11 px-6 py-3 hover:opacity-70";
  return <details ref={ref} className="md:hidden" data-studio-target="style:header|menus:categories|copy:Header" data-studio-label="Mobile navigation"
    onKeyDown={e => { if (e.key === "Escape") { close(); ref.current?.querySelector("summary")?.focus(); } }}>
    <summary className="min-h-11 cursor-pointer px-6 py-3 font-semibold">{getCopy(design, "navMenu")}</summary>
    <nav aria-label={getCopy(design, "ariaMainNavigation")} className="border-t border-current/20 pb-4">
      {buildNavItems(d.categories || [], pages, d.navOrder).map(item => <div key={item.key}>
        <Link className={linkClass} onClick={close} to={item.kind === "page" ? `/page/${item.page.slug}` : `/collections/${slug(item.label)}`}>{item.label}</Link>
        {item.kind === "category" && item.children.filter(c => c.showInNav !== false).map(c => <Link key={c.id} className={`${linkClass} pl-10`} onClick={close} to={`/collections/${slug(c.name)}`}>{c.name}</Link>)}
      </div>)}
      {!d.hideHeaderSearch && <button className={linkClass} onClick={() => { close(); onSearch(); }}>{getCopy(design, "navSearch")}</button>}
      {!d.hideHeaderWishlist && <Link className={linkClass} onClick={close} to="/wishlist">{getCopy(design, "ariaWishlist")}</Link>}
      {!d.hideHeaderAccount && accountsEnabled(design) && <Link className={linkClass} onClick={close} to="/account">{getCopy(design, "ariaAccount")}</Link>}
      {!d.hideCurrencySelector && <div className="px-6 py-3"><CurrencySelector label={getCopy(design, "currencyLabel")} ariaLabel={getCopy(design, "ariaCurrency")} /></div>}
    </nav>
  </details>;
}
