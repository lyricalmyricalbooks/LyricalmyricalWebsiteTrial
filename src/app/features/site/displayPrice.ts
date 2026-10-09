import { saleActive } from "./promotions";

/**
 * The CAD price a book card shows (and the shop filters/sorts by).
 * A book sold in editions is always charged an edition's own price (CartContext
 * `catalogUnitPrice`, functions/catalogPrice.js), so it shows its lowest-priced edition,
 * like Shopify's "from" price — never the book's own (sale) price, which is never charged.
 * Other books show their own price (the sale price only while the sale is on: positive, inside
 * its optional start/end dates — promotions.saleActive, the same rule the server charges by).
 * Never shows CA$ 0.00 for a book whose editions all cost money.
 */
export function editionPrices(book: any): number[] {
  const variants = Array.isArray(book?.variants) ? book.variants : [];
  return variants
    .map((variant: any) => (variant?.price === undefined || variant?.price === null || variant?.price === "" ? NaN : Number(variant.price)))
    .filter((price: number) => Number.isFinite(price) && price >= 0);
}

export function displayPrice(book: any, ignoreSale = false, now: Date = new Date()): number {
  if (!book) return 0;
  const editions = editionPrices(book);
  if (editions.length) return Math.min(...editions);
  const base = Number(book.retailPrice) || 0;
  return !ignoreSale && saleActive(book, now) ? Number(book.salePrice) : base;
}

/** Whether a card may show a SALE badge / old price: only books charged their own price. */
export function showsSale(book: any, now: Date = new Date()): boolean {
  if (!book || editionPrices(book).length) return false;
  return saleActive(book, now) && Number(book.salePrice) < (Number(book.retailPrice) || 0);
}
