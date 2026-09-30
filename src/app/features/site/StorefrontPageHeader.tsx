import { Heart, Search, User as UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { useCart } from "../../CartContext";
import { CurrencySelector } from "../../CurrencyContext";
import { LogoMark } from "../../components/LogoMark";
import { StoreMenu } from "../../components/StoreMenu";
import { navGap, navLinkStyle } from "./headerNav";
import { buildNavItems } from "./navItems";
import { SearchOverlay } from "./SearchOverlay";
import { getCopy } from "./storeCopy";
import type { Book, Page } from "./types";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** The same full commerce navigation bar used by the main storefront, for standalone custom pages. */
export function StorefrontPageHeader({ design, pages, books }: { design: any; pages: Page[]; books: Book[] }) {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const storefront = design?.storefront && Object.keys(design.storefront).length
    ? { ...design, ...design.storefront }
    : design || {};
  const categories = storefront.categories || design?.categories || [];
  const navItems = useMemo(
    () => buildNavItems(categories, pages, storefront.navOrder),
    [categories, pages, storefront.navOrder],
  );
  const headerColor = storefront.headerColor || storefront.textColor || "var(--text)";
  const headerBg = storefront.headerBg || storefront.backgroundColor || "var(--background)";
  const maxWidth = Math.max(900, Math.min(1600, storefront.containerWidth ?? 1200));
  const showAdmin = !storefront.hideAdminLink && (storefront.headerLinks?.showSys ?? true);

  return (
    <>
      {(storefront.showAnnouncement ?? false) && storefront.announcementText && (
        <div
          data-studio-target="style:header"
          data-studio-label="Announcement bar"
          className="px-6 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ backgroundColor: storefront.announcementBg || "var(--accent)", color: storefront.announcementColor || "var(--on-accent)" }}
        >
          {storefront.announcementText}
        </div>
      )}
      <header
        data-section="navigation"
        data-studio-target="style:header|menus:header-order|copy:Header"
        data-studio-label="Header"
        className={`${storefront.stickyHeader ?? true ? "sticky top-0" : "relative"} z-50 border-b`}
        style={{ backgroundColor: headerBg, borderColor: storefront.borderColor || "var(--border-color)" , color: headerColor }}
      >
        <div className="mx-auto flex flex-nowrap items-center justify-between gap-4 px-6 py-4" style={{ maxWidth, color: headerColor }}>
          <div className="flex min-w-0 flex-1 items-center gap-8 md:gap-12">
            <Link to="/" className="flex shrink-0 items-center" aria-label={getCopy(design, "logoAlt")}>
              <span data-studio-target="style:logo" data-studio-label="Logo"><LogoMark design={storefront} /></span>
            </Link>

            <nav
              aria-label={getCopy(design, "ariaMainNavigation")}
              data-studio-target="menus:header-order|menus:categories|style:navlinks"
              data-studio-label="Category bar"
              className="hidden min-w-0 flex-nowrap items-center md:flex"
              style={{ columnGap: navGap(storefront) }}
            >
              {navItems.map((item) => {
                const isPage = item.kind === "page";
                const to = isPage ? `/page/${item.page.slug}` : `/collections/${slugify(item.label)}`;
                const active = location.pathname.endsWith(to);
                return (
                  <Link
                    key={item.key}
                    to={to}
                    aria-current={active ? "page" : undefined}
                    style={navLinkStyle(storefront, active, headerColor)}
                    className="transition-all hover:!opacity-100 hover-text-accent"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-6 md:gap-8" data-studio-target="style:header|copy:Header" data-studio-label="Header icons & cart">
            {storefront.menus?.header?.length > 0 && <div className="mr-2"><StoreMenu items={storefront.menus.header} /></div>}
            {!storefront.hideHeaderSearch && (
              <button onClick={() => setSearchOpen(true)} aria-label={getCopy(design, "ariaSearch")} className="hidden h-9 w-9 items-center justify-center rounded-full opacity-50 transition-all hover:opacity-100 sm:flex">
                <Search size={14} />
              </button>
            )}
            {!storefront.hideHeaderWishlist && (
              <Link to="/wishlist" aria-label={getCopy(design, "ariaWishlist")} className="hidden h-9 w-9 items-center justify-center rounded-full opacity-50 transition-all hover:opacity-100 sm:flex">
                <Heart size={14} />
              </Link>
            )}
            {!storefront.hideHeaderAccount && (
              <Link to="/account" aria-label={getCopy(design, "ariaAccount")} className="hidden h-9 w-9 items-center justify-center rounded-full opacity-50 transition-all hover:opacity-100 sm:flex">
                <UserIcon size={14} />
              </Link>
            )}
            {!storefront.hideCurrencySelector && (
              <div className="hidden items-center justify-center gap-2 sm:flex">
                <CurrencySelector label={getCopy(design, "currencyLabel")} ariaLabel={getCopy(design, "ariaCurrency")} />
              </div>
            )}
            {showAdmin && (
              <Link to="/admin" className="mr-2 hidden items-center gap-1.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 transition-all hover:opacity-100 sm:flex">
                {getCopy(design, "navAdmin")}
              </Link>
            )}
            {!storefront.hideCartButton && (
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label={getCopy(design, "ariaCart")}
                className="store-btn-primary group flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: storefront.buttonColor || "var(--accent)", color: storefront.buttonTextColor || "var(--on-accent)" }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{storefront.cartLabel || getCopy(design, "cartLabel")}</span>
                {cartCount > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: storefront.buttonTextColor || "var(--on-accent)", color: storefront.buttonColor || "var(--accent)" }}>{cartCount}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} books={books} design={design} />
    </>
  );
}
