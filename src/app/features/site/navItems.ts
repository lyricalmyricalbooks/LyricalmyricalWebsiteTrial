// Shop categories + in-menu pages form one ordered "header bar". `design.navOrder`
// is a list of keys ("cat:<id>" / "page:<id>") that the Studio › Menus panel edits.
// Anything not listed (a newly added page or category) is appended in default order.

export type NavItem =
  | { kind: "category"; key: string; label: string; category: any }
  | { kind: "page"; key: string; label: string; page: any };

export const catKey = (cat: any, index: number) => `cat:${(typeof cat === "object" && cat?.id) || `cat-${index}`}`;
export const pageKey = (page: any) => `page:${page.id || page.slug}`;

export const catName = (cat: any): string => (typeof cat === "string" ? cat : cat?.name || "");

/** Names a category answers to: its current name plus anything it was renamed from. */
export function categoryNames(cat: any): string[] {
  if (typeof cat === "string") return [cat];
  return [cat?.name, ...(Array.isArray(cat?.aliases) ? cat.aliases : [])].filter(Boolean);
}

/** True when a book is filed under the category by its current name or an earlier one. */
export function bookInCategory(book: any, cat: any): boolean {
  const names = categoryNames(cat);
  if (names.includes("PUBLICATIONS")) return true;
  const tags: string[] = [...(book?.categories || []), ...(book?.genres || [])];
  return tags.some((t) => names.includes(t));
}

/** Rename a category, remembering the old name so books tagged with it still match. */
export function renameCategory(cats: any[], index: number, nextName: string): any[] {
  return cats.map((c, i) => {
    if (i !== index) return c;
    const cur = typeof c === "string" ? { id: `cat-${i}`, name: c, description: "", showInNav: true } : c;
    const name = nextName.trim();
    if (!name || name === cur.name) return cur;
    const aliases = Array.from(new Set([...(cur.aliases || []), cur.name])).filter((a) => a && a !== name);
    return { ...cur, name, aliases };
  });
}

export function buildNavItems(categories: any[], pages: any[], order?: string[]): NavItem[] {
  const items: NavItem[] = [];
  (categories || []).forEach((c, i) => {
    if (typeof c === "object" && c?.showInNav === false) return;
    items.push({ kind: "category", key: catKey(c, i), label: catName(c), category: c });
  });
  (pages || [])
    .filter((p) => p?.showInNav && p.status === "published")
    .forEach((p) => items.push({ kind: "page", key: pageKey(p), label: p.title, page: p }));
  if (!Array.isArray(order) || order.length === 0) return items;
  const rank = (k: string) => {
    const at = order.indexOf(k);
    return at === -1 ? Number.MAX_SAFE_INTEGER : at;
  };
  // Array.prototype.sort is stable, so unlisted items keep their default order.
  return [...items].sort((a, b) => rank(a.key) - rank(b.key));
}

/** New navOrder after moving the item at `index` by `delta` within the visible list. */
export function moveNavItem(items: NavItem[], index: number, delta: number): string[] {
  const j = index + delta;
  const keys = items.map((i) => i.key);
  if (j < 0 || j >= keys.length) return keys;
  [keys[index], keys[j]] = [keys[j], keys[index]];
  return keys;
}
