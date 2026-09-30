// Shop categories + in-menu pages form one ordered "header bar". `design.navOrder`
// is a list of keys ("cat:<id>" / "page:<id>") that the Studio › Menus panel edits.
// Anything not listed (a newly added page or category) is appended in default order.

// A category may sit under another one (`parentId` = the parent's id), e.g. BOOKS and ZINES
// under PUBLICATIONS. Sub-categories don't get their own spot in the bar: their parent
// becomes a drop-down listing them (Studio › Menus › Shop categories › "Sits under").

export type NavItem =
  | { kind: "category"; key: string; label: string; category: any; children: any[] }
  | { kind: "page"; key: string; label: string; page: any };

export const catKey = (cat: any, index: number) => `cat:${(typeof cat === "object" && cat?.id) || `cat-${index}`}`;
export const pageKey = (page: any) => `page:${page.id || page.slug}`;

export const catName = (cat: any): string => (typeof cat === "string" ? cat : cat?.name || "");

/** Names a category answers to: its current name plus anything it was renamed from. */
export function categoryNames(cat: any): string[] {
  if (typeof cat === "string") return [cat];
  return [cat?.name, ...(Array.isArray(cat?.aliases) ? cat.aliases : [])].filter(Boolean);
}

const catId = (cat: any, index: number) => (typeof cat === "object" && cat?.id) || `cat-${index}`;

/** Category objects with stable ids (plain-string categories get `cat-<index>`, as everywhere else). */
export function normalizeCategories(cats: any[]): any[] {
  return (cats || []).map((c, i) => (typeof c === "string" ? { id: `cat-${i}`, name: c, description: "", showInNav: true } : { ...c, id: catId(c, i) }));
}

/** The parent id of a category, only when that parent exists and is itself top-level (one level deep). */
export function parentOf(cat: any, cats: any[]): string | null {
  const list = normalizeCategories(cats);
  const rawParent = (c: any) => {
    const pid = typeof c === "object" ? c?.parentId : null;
    return pid && pid !== c?.id ? list.find((p) => p.id === pid) || null : null;
  };
  const parent = rawParent(cat);
  // A parent that itself points at an existing category isn't top-level (this also breaks cycles).
  return parent && !rawParent(parent) ? parent.id : null;
}

/** Sub-categories of `cat` (in list order). */
export function childCategories(cat: any, cats: any[]): any[] {
  const id = typeof cat === "object" ? cat?.id : null;
  if (!id) return [];
  return normalizeCategories(cats).filter((c) => c.parentId === id && parentOf(c, cats) === id);
}

/**
 * True when a book is filed under the category by its current name or an earlier one.
 * Pass the full category list so a parent also matches books filed under its sub-categories.
 */
export function bookInCategory(book: any, cat: any, allCats: any[] = []): boolean {
  const names = categoryNames(cat);
  if (names.includes("PUBLICATIONS")) return true;
  const tags: string[] = [...(book?.categories || []), ...(book?.genres || [])];
  if (tags.some((t) => names.includes(t))) return true;
  return childCategories(cat, allCats).some((c) => bookInCategory(book, c));
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
    if (parentOf(c, categories)) return;
    const children = childCategories(typeof c === "string" ? { id: `cat-${i}` } : { ...c, id: catId(c, i) }, categories)
      .filter((k) => k.showInNav !== false);
    items.push({ kind: "category", key: catKey(c, i), label: catName(c), category: c, children });
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
