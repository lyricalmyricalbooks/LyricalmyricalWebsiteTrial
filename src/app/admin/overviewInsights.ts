import { queueOf } from "./fulfillment";
// Pure publisher-insight calculations for the admin Overview.
// Only recorded data is used: paid, non-test orders, the book catalog, reviews
// and newsletter signups. Nothing here is estimated or simulated.

const DAY = 86_400_000;
export const REORDER_COVER_DAYS = 30;
export const DORMANT_DAYS = 90;
const DIGITAL_FORMATS = ["E-book (PDF)", "E-book (EPUB)", "Audiobook"];

export type Order = Record<string, any>;
export type Book = Record<string, any>;

export const isRealPaidOrder = (o: Order) => o?.isTest !== true && o?.paymentStatus === "paid";
const ts = (v: any) => { const t = new Date(v).getTime(); return Number.isNaN(t) ? 0 : t; };

/** Paid orders inside [now - days, now) and the equally long window before it. */
export function splitPeriods(orders: Order[], days: number, now = Date.now()) {
  const paid = orders.filter(isRealPaidOrder);
  const start = now - days * DAY;
  const prevStart = start - days * DAY;
  return {
    paid,
    current: paid.filter(o => { const t = ts(o.createdAt); return t >= start && t <= now; }),
    previous: paid.filter(o => { const t = ts(o.createdAt); return t >= prevStart && t < start; }),
    start,
  };
}

export interface PeriodTotals {
  orders: number; revenue: number; units: number; aov: number;
  shipping: number; discounts: number; discountRate: number;
}

export function totals(orders: Order[]): PeriodTotals {
  const revenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const units = orders.reduce((s, o) => s + (o.items || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0), 0);
  const shipping = orders.reduce((s, o) => s + (Number(o.shipping) || 0), 0);
  const discounts = orders.reduce((s, o) => s + (Number(o.discount) || 0), 0);
  const subtotal = orders.reduce((s, o) => s + (Number(o.subtotal) || 0), 0);
  return {
    orders: orders.length, revenue, units, shipping, discounts,
    aov: orders.length ? revenue / orders.length : 0,
    discountRate: subtotal > 0 ? (discounts / subtotal) * 100 : 0,
  };
}

/** % change with a stable label; null when there is no baseline to compare with. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

const emailOf = (o: Order) => String(o.customer?.email || "").trim().toLowerCase();

/** Customers in the period who had never bought before it began. */
export function customerMix(paid: Order[], current: Order[], start: number) {
  const seenBefore = new Set(paid.filter(o => ts(o.createdAt) < start).map(emailOf).filter(Boolean));
  const inPeriod = new Set(current.map(emailOf).filter(Boolean));
  let returning = 0;
  inPeriod.forEach(e => { if (seenBefore.has(e)) returning++; });
  const total = inPeriod.size;
  return { total, returning, fresh: total - returning, returningRate: total ? (returning / total) * 100 : 0 };
}

export function topCountries(orders: Order[], limit = 5) {
  const map = new Map<string, { country: string; orders: number; revenue: number }>();
  orders.forEach(o => {
    const country = String(o.customer?.address?.country || "").trim() || "Unknown";
    const row = map.get(country) || { country, orders: 0, revenue: 0 };
    row.orders += 1; row.revenue += Number(o.total) || 0;
    map.set(country, row);
  });
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export const isDigitalBook = (b?: Book) => !!b && DIGITAL_FORMATS.includes(b.format);

/** Revenue and units split by format family (print vs digital) and by exact format. */
export function formatMix(orders: Order[], books: Book[]) {
  const byId = new Map(books.map(b => [b.id, b]));
  const byFormat = new Map<string, { format: string; units: number; revenue: number }>();
  let print = 0, digital = 0;
  orders.forEach(o => (o.items || []).forEach((i: any) => {
    const book = byId.get(i.id);
    const format = book?.format || "Unspecified";
    const rev = (Number(i.quantity) || 0) * (Number(i.price) || 0);
    const row = byFormat.get(format) || { format, units: 0, revenue: 0 };
    row.units += Number(i.quantity) || 0; row.revenue += rev;
    byFormat.set(format, row);
    if (isDigitalBook(book)) digital += rev; else print += rev;
  }));
  const total = print + digital;
  return {
    formats: [...byFormat.values()].sort((a, b) => b.revenue - a.revenue),
    printShare: total ? (print / total) * 100 : 0,
    digitalShare: total ? (digital / total) * 100 : 0,
    total,
  };
}

export interface TitleStock {
  id: string; title: string; stock: number; sold30: number;
  coverDays: number | null; lastSaleDays: number | null;
}

/** Per-title sell-through: 30-day velocity, days of stock cover, and days since last sale. */
export function titleStock(paid: Order[], books: Book[], now = Date.now()): TitleStock[] {
  const sold30 = new Map<string, number>();
  const lastSale = new Map<string, number>();
  paid.forEach(o => {
    const t = ts(o.createdAt);
    (o.items || []).forEach((i: any) => {
      if (now - t <= 30 * DAY) sold30.set(i.id, (sold30.get(i.id) || 0) + (Number(i.quantity) || 0));
      if (t > (lastSale.get(i.id) || 0)) lastSale.set(i.id, t);
    });
  });
  return books.filter(b => b.status !== "draft" && !isDigitalBook(b)).map(b => {
    const stock = Number(b.stockLevel) || 0;
    const s30 = sold30.get(b.id) || 0;
    const last = lastSale.get(b.id);
    return {
      id: b.id, title: b.title || "Untitled", stock, sold30: s30,
      coverDays: s30 > 0 ? Math.floor(stock / (s30 / 30)) : null,
      lastSaleDays: last ? Math.floor((now - last) / DAY) : null,
    };
  });
}

/** Titles selling fast enough that stock runs out within REORDER_COVER_DAYS (reprint watch). */
export const reprintWatch = (rows: TitleStock[]) =>
  rows.filter(r => r.coverDays !== null && r.coverDays <= REORDER_COVER_DAYS).sort((a, b) => (a.coverDays as number) - (b.coverDays as number));

/** Stock sitting on the shelf with no sale in DORMANT_DAYS (or ever). */
export const dormantStock = (rows: TitleStock[]) =>
  rows.filter(r => r.stock > 0 && (r.lastSaleDays === null || r.lastSaleDays >= DORMANT_DAYS)).sort((a, b) => b.stock - a.stock);

/** Retail value of print stock on hand, from each title's retail price. */
export function stockValue(books: Book[]) {
  const print = books.filter(b => b.status !== "draft" && !isDigitalBook(b));
  const units = print.reduce((s, b) => s + (Number(b.stockLevel) || 0), 0);
  const value = print.reduce((s, b) => s + (Number(b.stockLevel) || 0) * (Number(b.retailPrice ?? b.price) || 0), 0);
  return { units, value, soldOut: print.filter(b => (Number(b.stockLevel) || 0) <= 0).length, titles: print.length };
}

/** Paid orders still waiting to ship, oldest first, with age in days. */
export function toFulfil(orders: Order[], now = Date.now()) {
  // Same rule as the Orders work queues: anything not in transit, completed or unpaid
  // (so digital-only orders, collected pickups and out-for-delivery parcels drop off).
  return orders.filter(o => isRealPaidOrder(o) && !["In transit", "Completed", "Unpaid"].includes(queueOf(o)))
    .map(o => ({ ...o, ageDays: Math.max(0, Math.floor((now - ts(o.createdAt)) / DAY)) }))
    .sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
}

export function reviewSummary(reviews: Array<Record<string, any>>) {
  const approved = reviews.filter(r => r.status === "approved");
  const rated = approved.filter(r => Number(r.rating) > 0);
  return {
    pending: reviews.filter(r => r.status === "pending").length,
    approved: approved.length,
    average: rated.length ? rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length : null,
  };
}

export function newsletterSummary(subs: Array<Record<string, any>>, start: number) {
  return { total: subs.length, added: subs.filter(s => ts(s.subscribedAt) >= start).length };
}

export interface BestSeller { id: string; title: string; units: number; revenue: number; share: number }

/** Top titles by revenue in a set of paid orders. `share` is % of the listed revenue across all titles. */
export function bestSellers(orders: Order[], limit = 5): BestSeller[] {
  const map = new Map<string, BestSeller>();
  let total = 0;
  for (const o of orders) {
    for (const i of o.items || []) {
      const qty = Number(i.quantity) || 0;
      const rev = qty * (Number(i.price) || 0);
      if (!i.id || qty <= 0) continue;
      const row = map.get(i.id) || { id: i.id, title: i.title || i.name || "Untitled", units: 0, revenue: 0, share: 0 };
      row.units += qty; row.revenue += rev; total += rev;
      map.set(i.id, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
    .slice(0, limit)
    .map(r => ({ ...r, share: total > 0 ? (r.revenue / total) * 100 : 0 }));
}
