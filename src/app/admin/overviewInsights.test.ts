import { describe, expect, it } from "vitest";
import {
  change, customerMix, dormantStock, formatMix, newsletterSummary, reprintWatch, reviewSummary,
  splitPeriods, stockValue, titleStock, toFulfil, topCountries, totals,
} from "./overviewInsights";

const NOW = new Date("2026-09-29T12:00:00Z").getTime();
const ago = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const order = (o: any) => ({ paymentStatus: "paid", total: 20, subtotal: 22, discount: 2, shipping: 5, items: [], ...o });

describe("overview insights", () => {
  it("only counts paid, non-test orders in periods", () => {
    const orders = [
      order({ createdAt: ago(1) }),
      order({ createdAt: ago(2), paymentStatus: "unpaid" }),
      order({ createdAt: ago(3), isTest: true }),
      order({ createdAt: ago(40) }),
    ];
    const p = splitPeriods(orders, 30, NOW);
    expect(p.current).toHaveLength(1);
    expect(p.previous).toHaveLength(1);
  });

  it("computes totals, AOV and discount rate", () => {
    const t = totals([order({ items: [{ quantity: 2 }] }), order({ total: 40, subtotal: 44, items: [{ quantity: 1 }] })]);
    expect(t).toMatchObject({ orders: 2, revenue: 60, units: 3, aov: 30, shipping: 10, discounts: 4 });
    expect(t.discountRate).toBeCloseTo(6.06, 1);
    expect(totals([]).aov).toBe(0);
  });

  it("change returns null without a baseline", () => {
    expect(change(5, 0)).toBeNull();
    expect(change(0, 0)).toBe(0);
    expect(change(15, 10)).toBe(50);
  });

  it("splits new vs returning customers", () => {
    const a = order({ createdAt: ago(60), customer: { email: "A@x.com" } });
    const b = order({ createdAt: ago(5), customer: { email: "a@x.com" } });
    const c = order({ createdAt: ago(4), customer: { email: "c@x.com" } });
    const { paid, current, start } = splitPeriods([a, b, c], 30, NOW);
    expect(customerMix(paid, current, start)).toMatchObject({ total: 2, returning: 1, fresh: 1, returningRate: 50 });
  });

  it("ranks countries by revenue", () => {
    const rows = topCountries([
      order({ total: 10, customer: { address: { country: "CA" } } }),
      order({ total: 50, customer: { address: { country: "US" } } }),
      order({ total: 5 }),
    ]);
    expect(rows.map(r => r.country)).toEqual(["US", "CA", "Unknown"]);
  });

  it("splits print and digital revenue", () => {
    const books = [{ id: "p", format: "Paperback" }, { id: "e", format: "E-book (PDF)" }];
    const mix = formatMix([order({ items: [{ id: "p", quantity: 1, price: 30 }, { id: "e", quantity: 1, price: 10 }] })], books);
    expect(mix.printShare).toBe(75);
    expect(mix.digitalShare).toBe(25);
  });

  it("flags reprint candidates and dormant stock", () => {
    const books = [
      { id: "hot", title: "Hot", stockLevel: 5, format: "Paperback" },
      { id: "cold", title: "Cold", stockLevel: 40, format: "Paperback" },
      { id: "ebook", title: "Ebook", stockLevel: 0, format: "E-book (PDF)" },
      { id: "draft", title: "Draft", stockLevel: 9, status: "draft" },
    ];
    const paid = [order({ createdAt: ago(3), items: [{ id: "hot", quantity: 15 }] }), order({ createdAt: ago(200), items: [{ id: "cold", quantity: 1 }] })];
    const rows = titleStock(paid, books, NOW);
    expect(rows.map(r => r.id)).toEqual(["hot", "cold"]);
    expect(reprintWatch(rows).map(r => r.id)).toEqual(["hot"]);
    expect(dormantStock(rows).map(r => r.id)).toEqual(["cold"]);
  });

  it("values print stock", () => {
    const s = stockValue([{ stockLevel: 3, retailPrice: 10, format: "Paperback" }, { stockLevel: 0, retailPrice: 8 }, { stockLevel: 99, retailPrice: 5, format: "Audiobook" }]);
    expect(s).toMatchObject({ units: 3, value: 30, soldOut: 1, titles: 2 });
  });

  it("lists unshipped paid orders oldest first", () => {
    const rows = toFulfil([
      order({ id: "new", createdAt: ago(1) }),
      order({ id: "old", createdAt: ago(6) }),
      order({ id: "sent", createdAt: ago(3), fulfillmentStatus: "shipped" }),
      order({ id: "unpaid", createdAt: ago(9), paymentStatus: "unpaid" }),
    ], NOW);
    expect(rows.map(r => r.id)).toEqual(["old", "new"]);
    expect(rows[0].ageDays).toBe(6);
  });

  it("summarises reviews and newsletter", () => {
    expect(reviewSummary([{ status: "pending" }, { status: "approved", rating: 5 }, { status: "approved", rating: 4 }])).toEqual({ pending: 1, approved: 2, average: 4.5 });
    expect(reviewSummary([]).average).toBeNull();
    expect(newsletterSummary([{ subscribedAt: ago(2) }, { subscribedAt: ago(90) }], NOW - 30 * 86_400_000)).toEqual({ total: 2, added: 1 });
  });
});

import { bestSellers } from "./overviewInsights";
describe("bestSellers", () => {
  it("ranks titles by revenue with share and ignores empty lines", () => {
    const orders = [
      { items: [{ id: "a", title: "A", quantity: 2, price: 10 }, { id: "b", title: "B", quantity: 1, price: 5 }] },
      { items: [{ id: "b", title: "B", quantity: 1, price: 5 }, { quantity: 3, price: 9 }, { id: "z", quantity: 0, price: 9 }] },
    ];
    const r = bestSellers(orders, 5);
    expect(r.map(x => x.id)).toEqual(["a", "b"]);
    expect(r[0]).toMatchObject({ units: 2, revenue: 20 });
    expect(Math.round(r[0].share)).toBe(67);
    expect(bestSellers(orders, 1)).toHaveLength(1);
  });
});
