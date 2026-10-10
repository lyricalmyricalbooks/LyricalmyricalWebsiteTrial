// Which book category names a category-targeted discount matches. The storefront shows a shop
// category's books by its current name or any earlier name (aliases), and a parent category also
// shows its sub-categories' books (one level deep); PUBLICATIONS shows every book
// (src/app/features/site/categoryMembership.mjs). A discount on a category follows the same rule,
// so before pricing, its selectedCategories are widened to every name those books may carry.
// Mirrored for display in src/app/features/site/discountCategories.ts (discountCategories.parity.test.ts).

const ALL_BOOKS = "PUBLICATIONS";

function normalizeCategories(cats) {
  return (Array.isArray(cats) ? cats : []).map((c, i) => (typeof c === "string"
    ? { id: `cat-${i}`, name: c, aliases: [] }
    : { ...(c || {}), id: (c && c.id) || `cat-${i}` }));
}

const namesOf = cat => [cat.name, ...(Array.isArray(cat.aliases) ? cat.aliases : [])].filter(n => typeof n === "string" && n);

/** The discount with selectedCategories widened to aliases and sub-categories (same object when nothing changes). */
function expandDiscountCategories(discount, shopCategories) {
  if (!discount || discount.appliesTo !== "categories") return discount;
  const selected = (Array.isArray(discount.selectedCategories) ? discount.selectedCategories : []).filter(n => typeof n === "string");
  if (selected.includes(ALL_BOOKS)) return { ...discount, appliesTo: "all", selectedCategories: [] };
  const cats = normalizeCategories(shopCategories);
  const byId = new Map(cats.map(c => [c.id, c]));
  // A parent counts only when it exists and is itself top-level (breaks cycles, one level deep).
  const rawParent = c => (c.parentId && c.parentId !== c.id ? byId.get(c.parentId) || null : null);
  const parentOf = c => { const p = rawParent(c); return p && !rawParent(p) ? p : null; };
  const names = new Set(selected);
  for (const cat of cats) {
    const own = namesOf(cat);
    if (!own.some(n => selected.includes(n))) continue;
    if (own.includes(ALL_BOOKS)) return { ...discount, appliesTo: "all", selectedCategories: [] };
    own.forEach(n => names.add(n));
    for (const child of cats) if (parentOf(child) === cat) namesOf(child).forEach(n => names.add(n));
  }
  return names.size === selected.length ? discount : { ...discount, selectedCategories: [...names] };
}

module.exports = { expandDiscountCategories };
