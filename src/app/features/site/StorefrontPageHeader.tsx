import { Heart, Search, User as UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { useCart } from "../../CartContext";
import { CurrencySelector } from "../../CurrencyContext";
import { LogoMark } from "../../components/LogoMark";
import { StoreMenu } from "../../components/StoreMenu";
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
  const maxWidth = Math.max(900, Math.min(1600, storefront.containerWidth ?? 1480));
  const showAdmin = !storefront.hideAdminLink && (storefront.headerLinks?.showSys ?? true);

  return (
    <>
      <header
        data-section="navigation"
        data-studio-target="style:header|menus:header-order|copy:Header"
        data-studio-label="Header"
        className={`${storefront.stickyHeader ?? true ? "sticky top-0" : "relative"} z-50 border-b`}
        style={{ backgroundColor: headerBg, borderColor: storefront.borderColor || "var(--border-color)" , color: headerColor }}
      >
        <div className="mx-auto flex min-h-[94px] items-center gap-8 px-6 md:px-10" style={{ maxWidth }}>
          <Link to="/" className="mr-auto flex min-w-0 items-center" aria-label={getCopy(design, "logoAlt")}>
            <span data-studio-target="style:logo" data-studio-label="Logo"><LogoMark design={storefront} /></span>
          </Link>

          <nav
            data-studio-target="menus:header-order|menus:categories"
            data-studio-label="Header bar order"
            className="hidden items-center gap-8 lg:flex"
          >
            {navItems.map((item) => item.kind === "page" ? (
              <Link
                key={item.key}
                to={`/page/${item.page.slug}`}
                aria-current={location.pathname.endsWith(`/page/${item.page.slug}`) ? "page" : undefined}
                className="whitespace-nowrap text-[11px] font-black uppercase tracking-[0.24em] opacity-50 transition-opacity hover:opacity-100 aria-[current=page]:opacity-100"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.key}
                to={`/collections/${slugify(item.label)}`}
                className="whitespace-nowrap text-[11px] font-black uppercase tracking-[0.24em] opacity-100 transition-opacity hover:opacity-70"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 sm:flex" data-studio-target="style:header|copy:Header" data-studio-label="Header controls">
            {storefront.menus?.header?.length > 0 && <StoreMenu items={storefront.menus.header} />}
            {!storefront.hideHeaderSearch && (
              <button onClick={() => setSearchOpen(true)} aria-label={getCopy(design, "ariaSearch")} className="flex h-10 w-10 items-center justify-center opacity-50 transition-opacity hover:opacity-100">
                <Search size={18} />
              </button>
            )}
            {!storefront.hideHeaderWishlist && (
              <Link to="/wishlist" aria-label={getCopy(design, "ariaWishlist")} className="flex h-10 w-10 items-center justify-center opacity-50 transition-opacity hover:opacity-100">
                <Heart size={18} />
              </Link>
            )}
            {!storefront.hideHeaderAccount && (
              <Link to="/account" aria-label={getCopy(design, "ariaAccount")} className="flex h-10 w-10 items-center justify-center opacity-50 transition-opacity hover:opacity-100">
                <UserIcon size={18} />
              </Link>
            )}
            {!storefront.hideCurrencySelector && <CurrencySelector label={getCopy(design, "currencyLabel")} ariaLabel={getCopy(design, "ariaCurrency")} />}
            {showAdmin && (
              <Link to="/admin" className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.24em] opacity-40 transition-opacity hover:opacity-100">
                {getCopy(design, "navAdmin")}
              </Link>
            )}
          </div>

          {!storefront.hideCartButton && (
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={getCopy(design, "ariaCart")}
              className="store-btn-primary flex min-h-12 items-center gap-3 px-5 text-[11px] font-black uppercase tracking-[0.2em]"
              style={{ backgroundColor: storefront.buttonColor || "var(--accent)", color: storefront.buttonTextColor || "var(--on-accent)" }}
            >
              <span>{storefront.cartLabel || getCopy(design, "cartLabel")}</span>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--text)] px-1.5 text-[10px] text-[var(--background)]">{cartCount}</span>
            </button>
          )}
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} books={books} design={design} />
    </>
  );
}
