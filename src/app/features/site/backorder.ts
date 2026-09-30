import type { Book } from "./types";

// Sentinel the storefront already treats as "no limit" (see CartContext / BookDetail).
const UNLIMITED = 999;

/**
 * Honours the admin's "Allow backorders when out of stock" switch: a tracked book
 * (or variant) at 0 stays purchasable and is flagged `onBackorder` so the product
 * page can say so. Stock is never mutated server-side for display; the webhook still
 * clamps real stock at 0.
 */
export function applyBackorderPolicy<T extends Partial<Book>>(book: T): T {
  const b = book as any;
  if (!b || !b.trackInventory || !b.allowBackorder) return book;
  const variants = Array.isArray(b.variants)
    ? b.variants.map((v: any) => {
        const n = Number(v.stockLevel ?? v.stock ?? 0);
        return n > 0 ? v : { ...v, stock: UNLIMITED, stockLevel: UNLIMITED, onBackorder: true };
      })
    : b.variants;
  const hasVariants = Array.isArray(variants) && variants.length > 0;
  const soldOut = !hasVariants && Number(b.stockLevel ?? 0) <= 0;
  return {
    ...b,
    variants,
    ...(soldOut ? { stockLevel: UNLIMITED, onBackorder: true } : {}),
  };
}
