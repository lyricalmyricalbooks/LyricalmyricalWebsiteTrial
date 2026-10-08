/**
 * The CAD price a book card shows (and the shop filters/sorts by).
 * A book's own price (sale price when it is positive) — or, for a book sold only in
 * editions with no price of its own, its lowest-priced edition, like Shopify's "from" price.
 * Never shows CA$ 0.00 for a book whose editions all cost money.
 */
export function editionPrices(book: any): number[] {
  const variants = Array.isArray(book?.variants) ? book.variants : [];
  return variants
    .map((variant: any) => (variant?.price === undefined || variant?.price === null || variant?.price === "" ? NaN : Number(variant.price)))
    .filter((price: number) => Number.isFinite(price) && price >= 0);
}

export function displayPrice(book: any, ignoreSale = false): number {
  if (!book) return 0;
  const base = Number(book.retailPrice) || 0;
  const sale = Number(book.salePrice) || 0;
  const own = !ignoreSale && book.isOnSale && sale > 0 ? sale : base;
  if (own > 0) return own;
  const editions = editionPrices(book);
  return editions.length ? Math.min(...editions) : own;
}
