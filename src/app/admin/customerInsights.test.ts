import { describe, expect, it } from "vitest";
import { buildCustomers, customerCountries, customerStats, customersToCsv, segmentOf } from "./customerInsights";

const NOW = new Date("2026-09-29").getTime();
const o = (email: string, total: number, date: string, extra: any = {}) => ({
  paymentStatus: "paid", total, createdAt: date, customer: { email, name: "N" }, ...extra,
});

describe("customerInsights", () => {
  it("groups by case-insensitive email and skips unpaid/test orders", () => {
    const rows = buildCustomers([
      o("A@x.com", 20, "2026-09-01"), o("a@x.com", 30, "2026-09-20"),
      o("b@x.com", 10, "2026-09-01", { paymentStatus: "unpaid" }),
      o("c@x.com", 10, "2026-09-01", { isTest: true }),
    ], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ orderCount: 2, totalSpent: 50, avgOrder: 25, segment: "returning" });
  });
  it("segments", () => {
    expect(segmentOf(1, 300, 1)).toBe("vip");
    expect(segmentOf(1, 20, 200)).toBe("at-risk");
    expect(segmentOf(1, 20, 5)).toBe("new");
  });
  it("stats and csv formula-escaping", () => {
    const rows = buildCustomers([o("a@x.com", 10, "2026-09-01"), o("a@x.com", 10, "2026-09-02"), o("b@x.com", 20, "2026-09-02", { customer: { email: "b@x.com", name: "=cmd" } })], NOW);
    expect(customerStats(rows)).toMatchObject({ total: 2, repeat: 1, repeatRate: 0.5, avgLtv: 20 });
    expect(customersToCsv(rows)).toContain(`"'=cmd"`);
  });
  it("spend is net of partial refunds and countries are listed", () => {
    const rows = buildCustomers([
      o("a@x.com", 100, "2026-09-01", { refundedAmountMinor: 2500, expectedAmountMinor: 10000, shippingAddress: { country: "Canada" } }),
      o("b@x.com", 10, "2026-09-01", { shippingAddress: { country: "Canada" } }),
    ], NOW);
    expect(rows.find((r) => r.key === "a@x.com")!.totalSpent).toBe(75);
    expect(customerCountries(rows)).toEqual([{ country: "Canada", count: 2 }]);
  });
});
