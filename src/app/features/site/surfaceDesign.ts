/** Resolve page overrides over root tokens; keep template trees available. */
export function resolveSurfaceDesign(design: any, pathname: string) {
  if (!design) return design;
  const template = pathname.startsWith("/books/") ? "productPage"
    : pathname.startsWith("/collections/") ? "collectionPage"
    : pathname === "/checkout" ? "cartPage"
    : pathname.startsWith("/page/") ? "page" : null;
  if (!template) return design;
  const custom = template === "page" ? design[`page:${decodeURIComponent(pathname.slice(6))}`] : null;
  return { ...design, ...(design[template] || {}), ...(custom || {}) };
}
