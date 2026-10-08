// Pre-orders: a published book sold before its publication date.
// Mirrors functions/preorder.js (preorder.parity.test.ts keeps them identical).
//
// On while Books › edit › Inventory › "Take pre-orders" is on and the Publication date
// (`publishDate`, YYYY-MM-DD) is still ahead in the shop's (Toronto) calendar. No date =
// "release date to be announced" until the switch is turned off. Stock and prices are the
// book's normal ones; only the wording, the order's shipping timing and e-book access change.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Today in the shop's calendar, same as the server's shopDate (functions/paymentGuards.js). */
export function shopDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function releaseDateOf(book: any): string {
  const value = String(book?.publishDate || "").slice(0, 10);
  return DATE_ONLY.test(value) ? value : "";
}

export function preorderActive(book: any, now: Date = new Date()): boolean {
  if (!book || book.preorder !== true) return false;
  const date = releaseDateOf(book);
  return !date || date > shopDate(now);
}

const isDigitalLine = (item: any) => !!item && (item.digital === true || item.isDigital === true || /digital|e-book|ebook|epub|pdf|audiobook/.test(String(item.format || "").toLowerCase()));

/** Physical pre-order lines that still hold the parcel back (none once released by date or by the publisher). */
export function waitingPreorderLines(order: any, operations: any = {}, now: Date = new Date()): any[] {
  if (!order || operations?.preorderReleased) return [];
  const today = shopDate(now);
  return (order.items || []).filter((item: any) => item && item.preorder === true && !isDigitalLine(item) && (!item.releaseDate || String(item.releaseDate) > today));
}

/** Latest release date of the waiting lines, or "" when any of them has no date yet. */
export function shipDateOf(lines: any[]): string {
  if (!lines.length || lines.some((item) => !item.releaseDate)) return "";
  return lines.map((item) => String(item.releaseDate)).sort().pop() || "";
}

/** "12 Nov 2026" in the shopper's language; the date is a calendar day, so it is read as UTC. */
export function formatReleaseDate(date: string, locale?: string): string {
  if (!DATE_ONLY.test(String(date || ""))) return "";
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  } catch {
    return date;
  }
}

/** A bag line saved as a pre-order whose release day hasn't come yet (bags can sit for days). */
export function linePreorderOpen(line: { preorder?: boolean; releaseDate?: string | null } | null | undefined, now: Date = new Date()): boolean {
  return !!line?.preorder && (!line.releaseDate || String(line.releaseDate) > shopDate(now));
}

/** Cart/checkout: the open pre-order lines in a bag, with the date the whole parcel can ship ("" = not announced). */
export function bagPreorder(lines: { preorder?: boolean; releaseDate?: string | null }[], now: Date = new Date()): { count: number; shipDate: string } {
  const pre = (lines || []).filter((l) => linePreorderOpen(l, now));
  return { count: pre.length, shipDate: shipDateOf(pre) };
}

/** The shopper-facing note for one bag/checkout line, or "" (copy keys cartPreorder / cartPreorderTba). */
export function linePreorderNote(line: { preorder?: boolean; releaseDate?: string | null }, copy: (key: string, vars?: Record<string, string>) => string, now: Date = new Date()): string {
  if (!linePreorderOpen(line, now)) return "";
  return line.releaseDate ? copy("cartPreorder", { date: formatReleaseDate(String(line.releaseDate)) }) : copy("cartPreorderTba");
}
