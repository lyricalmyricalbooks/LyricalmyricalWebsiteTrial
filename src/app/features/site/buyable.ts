/**
 * Which edition a one-click "Add" (wishlist, bag suggestion, bundle) should put
 * in the bag. A book with editions is bought as one of them — never as a bare
 * line at the book's own price — so pick the first edition in stock.
 * Mirrors the stock reading used by BookDetail and CartContext.
 */
export function quickAddChoice(book: any): { variant?: any; inStock: boolean } {
  const variants = Array.isArray(book?.variants) ? book.variants : [];
  if (variants.length) {
    const variant = variants.find((v: any) => (v?.stockLevel ?? v?.stock ?? 0) !== 0);
    return { variant, inStock: Boolean(variant) };
  }
  return { inStock: (book?.stockLevel ?? 999) !== 0 };
}
