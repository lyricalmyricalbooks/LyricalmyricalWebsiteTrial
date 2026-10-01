import type { Book } from "./types";

/**
 * "You may also like" picks for the cart drawer (Shopify-style product recommendations).
 * Candidates are published, purchasable books not already in the bag. Books with variants are
 * skipped because the drawer's one-tap add can't choose a format. Ranked by shared author, then
 * shared categories, then featured, then catalogue order; `count` caps the list.
 */
export function cartRecommendations(
  books: Book[] | undefined,
  cart: Array<{ id: string }>,
  count: number,
): Book[] {
  const limit = Math.max(0, Math.floor(count) || 0);
  if (!limit || !books?.length) return [];
  const inCart = new Set(cart.map((i) => i.id));
  const byId = new Map(books.map((b) => [b.id, b]));
  const cartBooks = cart.map((i) => byId.get(i.id)).filter(Boolean) as Book[];
  const authors = new Set(cartBooks.map((b) => b.authorId).filter(Boolean));
  const cats = new Set(cartBooks.flatMap((b) => b.categories || []));

  const scored = books
    .map((b, index) => ({ b, index }))
    .filter(({ b }) => {
      if (inCart.has(b.id) || b.status !== "published") return false;
      if (b.variants && b.variants.length > 0) return false;
      return Number(b.stockLevel ?? 0) > 0;
    })
    .map(({ b, index }) => ({
      b,
      index,
      score:
        (b.authorId && authors.has(b.authorId) ? 4 : 0) +
        ((b.categories || []).some((c) => cats.has(c)) ? 2 : 0) +
        (b.isFeatured ? 1 : 0),
    }));

  scored.sort((x, y) => y.score - x.score || x.index - y.index);
  return scored.slice(0, limit).map((s) => s.b);
}
