/**
 * Whether shoppers may see and buy a book now. Mirrors the server's
 * `purchaseProblem` (functions/paymentGuards.js): published (or saved before
 * statuses existed) and its release date has arrived. Drafts, archived and
 * scheduled books stay hidden everywhere outside the Studio preview.
 */
export function isLiveBook(book: { status?: string; scheduleDate?: string } | null | undefined, nowISO = new Date().toISOString()): boolean {
  if (!book) return false;
  if (book.status && book.status !== "published") return false;
  return !book.scheduleDate || String(book.scheduleDate) <= nowISO;
}
