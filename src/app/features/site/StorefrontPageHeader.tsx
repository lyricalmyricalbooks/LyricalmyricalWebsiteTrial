import { Heart, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { LogoMark } from "../../components/LogoMark";
import { StoreMenu } from "../../components/StoreMenu";
import { buildNavItems } from "./navItems";
import { getCopy } from "./storeCopy";
import type { Page } from "./types";

/** The themed storefront header used by standalone custom pages. */
export function StorefrontPageHeader({ design, pages }: { design: any; pages: Page[] }) {
  const location = useLocation();
  const storefront = design?.storefront && Object.keys(design.storefront).length
    ? { ...design, ...design.storefront }
    : design || {};
  const navItems = buildNavItems([], pages, storefront.navOrder).filter((item) => item.kind === "page");
  const headerColor = storefront.headerColor || storefront.textColor || "#ffffff";
  const headerBg = storefront.headerBg || storefront.backgroundColor || "#000000";
  const maxWidth = Math.max(900, Math.min(1600, storefront.containerWidth ?? 1200));
  const announcement = storefront.announcementText;

  return (
    <>
      {(storefront.showAnnouncement ?? false) && announcement && (
        <div
          data-studio-target="style:header"
          data-studio-label="Announcement bar"
          className="px-6 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ backgroundColor: storefront.announcementBg || "var(--accent)", color: storefront.announcementColor || "var(--on-accent)" }}
        >
          {announcement}
        </div>
      )}
      <header
        data-section="navigation"
        data-studio-target="style:header|menus:header-order|copy:Header"
        data-studio-label="Header"
        className={`${storefront.stickyHeader ?? true ? "sticky top-0" : "relative"} z-50 border-b`}
        style={{ backgroundColor: headerBg, borderColor: storefront.borderColor || `${headerColor}1a`, color: headerColor }}
      >
        <div className="mx-auto flex items-center justify-between gap-4 px-6 py-4" style={{ maxWidth }}>
          <Link to="/" className="flex items-center" aria-label={getCopy(design, "pageHomeLink")}>
            <span data-studio-target="style:logo" data-studio-label="Logo"><LogoMark design={storefront} /></span>
          </Link>

          <nav
            aria-label={getCopy(design, "ariaMainNavigation")}
            data-studio-target="menus:header-order|menus:header"
            data-studio-label="Header menu"
            className="hidden items-center gap-6 md:flex"
          >
            {navItems.map((item) => item.kind === "page" && (
              <Link
                key={item.key}
                to={`/page/${item.page.slug}`}
                aria-current={location.pathname.endsWith(`/page/${item.page.slug}`) ? "page" : undefined}
                className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-60 transition-opacity hover:opacity-100"
              >
                {item.label}
              </Link>
            ))}
            {storefront.menus?.header?.length > 0 && <StoreMenu items={storefront.menus.header} />}
          </nav>

          <div className="flex items-center gap-2">
            {!storefront.hideHeaderWishlist && (
              <Link to="/wishlist" aria-label={getCopy(design, "ariaWishlist")} className="flex h-9 w-9 items-center justify-center opacity-60 hover:opacity-100">
                <Heart size={14} />
              </Link>
            )}
            {!storefront.hideHeaderAccount && (
              <Link to="/account" aria-label={getCopy(design, "ariaAccount")} className="flex h-9 w-9 items-center justify-center opacity-60 hover:opacity-100">
                <UserIcon size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
