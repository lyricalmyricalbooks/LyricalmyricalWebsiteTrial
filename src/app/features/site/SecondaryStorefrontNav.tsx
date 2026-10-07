import { Link } from "react-router";
import { buildNavItems, splitNavigation } from "./navItems";
import { contentMaxWidth, navGapCss, navLinkStyle } from "./headerNav";
import { getCopy } from "./storeCopy";

export function SecondaryStorefrontNav({ design, pages }: { design: any; pages: any[] }) {
  const d = { ...design, ...design?.storefront };
  const items = splitNavigation(buildNavItems(d.categories || [], pages, d.navOrder), d).secondary;
  if (d.showSecondaryNavigation === false || !items.length) return null;
  return <nav aria-label={getCopy(design, "secondaryNavigationAria")} data-studio-target="menus:header-order|style:header|copy:Header" data-studio-label="Publisher navigation" className="mx-auto flex flex-wrap items-center px-6 py-2" style={{ maxWidth: contentMaxWidth(d), columnGap: navGapCss(d) }}>
    {items.map(item => item.kind === "page" && <Link key={item.key} to={`/page/${item.page.slug}`} className="inline-flex min-h-11 items-center hover:opacity-100" style={navLinkStyle(d, false)}>{item.label}</Link>)}
  </nav>;
}
