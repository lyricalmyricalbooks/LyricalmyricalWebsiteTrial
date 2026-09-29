import { describe, expect, it } from "vitest";
import { discountPerformance, duplicateDiscount } from "./discountPerformance";

describe("discountPerformance", () => {
  it("aggregates paid non-test orders by uppercase code", () => {
    const m = discountPerformance([
      { paymentStatus: "paid", total: 40, discount: 10, appliedDiscount: { code: "save10" } },
      { paymentStatus: "paid", total: 60, discount: 10, appliedDiscount: { code: "SAVE10" } },
      { paymentStatus: "unpaid", total: 99, appliedDiscount: { code: "SAVE10" } },
      { paymentStatus: "paid", total: 5, isTest: true, appliedDiscount: { code: "SAVE10" } },
      { paymentStatus: "paid", total: 5 },
    ]);
    expect(m.get("SAVE10")).toEqual({ orders: 2, revenue: 100, discountGiven: 20, avgOrder: 50 });
    expect(m.size).toBe(1);
  });
  it("duplicates as an inactive, uniquely coded copy without usage", () => {
    const c = duplicateDiscount({ id: "x", code: "SAVE10", usageCount: 4, isActive: true, value: 10 }, ["SAVE10", "SAVE10-COPY"]);
    expect(c).toMatchObject({ code: "SAVE10-COPY2", isActive: false, value: 10 });
    expect(c).not.toHaveProperty("id");
    expect(c).not.toHaveProperty("usageCount");
  });
});
