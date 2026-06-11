import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { resolveHref, isExternal, type MenuItem } from "../features/site/storeMenu";

// Top-level links inherit the header's text color (set by the theme), so the
// menu stays readable on both light and dark backgrounds. Dropdown/mega panels
// keep explicit white text on their dark surfaces.
const linkCls = "text-[10px] tracking-[0.2em] text-current opacity-50 hover:opacity-100 transition-opacity uppercase whitespace-nowrap";

function MenuLink({ item, className }: { item: MenuItem; className?: string }) {
  const href = resolveHref(item);
  if (isExternal(item)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? linkCls}>
        {item.label}
      </a>
    );
  }
  return (
    <Link to={href} className={className ?? linkCls}>
      {item.label}
    </Link>
  );
}

/** Mega menu panel: child items become link-group columns (their own children are
 *  the group links), plus an optional featured image card on the right. */
function MegaMenuPanel({ item }: { item: MenuItem }) {
  const groups = item.children || [];
  return (
    <div className="absolute right-0 top-full pt-3 z-50">
      <div className="w-[min(760px,calc(100vw-3rem))] bg-black/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex gap-10">
          <div
            className="flex-1 grid gap-8"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, groups.length))}, minmax(0, 1fr))` }}
          >
            {groups.map((group) => {
              const links = group.children || [];
              return (
                <div key={group.id} className="space-y-3">
                  <MenuLink
                    item={group}
                    className="block text-[10px] tracking-[0.3em] font-bold text-white uppercase whitespace-nowrap hover:text-white/70 transition-colors"
                  />
                  {links.map((link) => (
                    <MenuLink
                      key={link.id}
                      item={link}
                      className="block text-[10px] tracking-[0.2em] text-white/40 hover:text-white transition-colors uppercase whitespace-nowrap"
                    />
                  ))}
                </div>
              );
            })}
          </div>
          {item.featuredImage && (
            <Link
              to={item.featuredLink || "/"}
              className="group relative w-56 flex-shrink-0 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10"
            >
              <img
                src={item.featuredImage}
                alt={item.featuredTitle || ""}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              {item.featuredTitle && (
                <p className="absolute bottom-0 left-0 right-0 p-4 text-white text-[10px] font-bold tracking-[0.25em] uppercase">
                  {item.featuredTitle}
                </p>
              )}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Header navigation built from an editor-defined menu, with hover dropdowns
 *  and optional full-width mega-menu panels. */
export function StoreMenu({ items }: { items: MenuItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!items || items.length === 0) return null;

  return (
    <nav className="hidden lg:flex items-center gap-6">
      {items.map((item) => {
        const children = item.children || [];
        if (children.length === 0) {
          return <MenuLink key={item.id} item={item} />;
        }
        const isMega = item.mega === true;
        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setOpenId(item.id)}
            onMouseLeave={() => setOpenId((cur) => (cur === item.id ? null : cur))}
          >
            <button className={`${linkCls} flex items-center gap-1`}>
              {item.label}
              <ChevronDown size={10} className="opacity-60" />
            </button>
            {openId === item.id && (
              isMega ? (
                <MegaMenuPanel item={item} />
              ) : (
                <div className="absolute left-0 top-full pt-3 z-50">
                  <div className="min-w-[180px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col">
                    {children.map((child) => (
                      <MenuLink
                        key={child.id}
                        item={child}
                        className="px-4 py-2.5 rounded-xl text-[10px] tracking-[0.2em] text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase whitespace-nowrap"
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Footer navigation: a heading column with its child links flattened. */
export function FooterMenu({ items }: { items: MenuItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map((item) => (
        <MenuLink
          key={item.id}
          item={item}
          className="block hover:text-white transition-colors"
        />
      ))}
    </>
  );
}
