/**
 * The CAD price a book card shows (and the shop filters/sorts by).
 * A book sold in editions is always charged an edition's own price (CartContext
 * `catalogUnitPrice`, functions/catalogPrice.js), so it shows its lowest-priced edition,
 * like Shopify's "from" price — never the book's own (sale) price, which is never charged.
 * Other books show their own price (sale price when it is positive).
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
  const editions = editionPrices(book);
  if (editions.length) return Math.min(...editions);
  const base = Number(book.retailPrice) || 0;
  const sale = Number(book.salePrice) || 0;
  const own = !ignoreSale && book.isOnSale && sale > 0 ? sale : base;
  return own;
}

/** Whether a card may show a SALE badge / old price: only books charged their own price. */
export function showsSale(book: any): boolean {
  if (!book || editionPrices(book).length) return false;
  const sale = Number(book.salePrice) || 0;
  return !!book.isOnSale && sale > 0 && sale < (Number(book.retailPrice) || 0);
}
