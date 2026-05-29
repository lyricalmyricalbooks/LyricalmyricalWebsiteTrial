import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { resolveHref, isExternal, type MenuItem } from "../features/site/storeMenu";

const linkCls = "text-[10px] tracking-[0.2em] text-white/40 hover:text-white transition-colors uppercase whitespace-nowrap";

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

/** Header navigation built from an editor-defined menu, with hover dropdowns. */
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
